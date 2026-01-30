import uuid
import httpx
import hashlib
import asyncio
import crud
import aiofiles
import time
import io
import os
from pathlib import Path
from typing import Tuple, Any

from common.file import download_file_to_temp, extract_files_to_temp_from_zip
from config.base import BASE_DIR
from common.common import extract_title_and_summary
from base_implement.markdown_engine_base import MarkdownEngineBase, WebsiteInfo, FileInfo
from enums.engine_enums import EngineProvided, EngineCategory
from playwright.async_api import async_playwright
from data.sql.base import session_scope
from common.logger import info_logger, exception_logger
from proxy.file_system_proxy import FileSystemProxy


class MineruApiEngine(MarkdownEngineBase):

    MINERU_BASE = "https://mineru.net"
    TERMINAL_STATES = {"done", "failed"}

    def __init__(self):
        super().__init__(
            engine_uuid=EngineProvided.MinerU_API.meta.uuid,
            engine_category=EngineCategory.Markdown,
            engine_name="MinerU API",
            engine_name_zh="MinerU API",
            engine_description=(
                "MinerU API is an AI-driven file parser provided by MinerU official, which can parse files "
                "such as webpages, PDFs, and images into Markdown format while retaining the original layout well."
            ),
            engine_description_zh=(
                "MinerU API 是 MinerU官方提供的AI驱动的文件解析器，可以将网页、PDF、图片等文件解析为 Markdown 格式并且较好地保留原来的排版。"
            ),
            engine_demo_config='{"token": "******", "uid": "******"}',
        )

    def _require_engine_config(self) -> tuple[str, str]:
        engine_config = self.get_engine_config()
        if not engine_config:
            raise Exception("The engine is not initialized yet. Please initialize the engine first.")
        token = engine_config.get("token")
        uid = engine_config.get("uid")
        if not token or not uid:
            raise Exception("There is something wrong with the user's configuration of the mineru api engine")
        return token, uid

    def _generate_checksum(self, uid: str, seed: str, content: str) -> str:
        data = f"{uid}{seed}{content}"
        sha256_hash = hashlib.sha256()
        sha256_hash.update(data.encode("utf-8"))
        return sha256_hash.hexdigest()

    async def _get_batch_status(self, batch_id: str) -> dict[str, Any]:
        token, _uid = self._require_engine_config()
        url = f"{self.MINERU_BASE}/api/v4/extract-results/batch/{batch_id}"
        headers = {"Content-Type": "application/json", "Authorization": f"Bearer {token}"}

        async with httpx.AsyncClient(proxy=None, trust_env=False, timeout=30) as client:
            resp = await client.get(url, headers=headers)
            resp.raise_for_status()
            return resp.json()

    async def _get_task_status(self, task_id: str) -> dict[str, Any]:
        token, _uid = self._require_engine_config()
        url = f"{self.MINERU_BASE}/api/v4/extract/task/{task_id}"
        headers = {"Content-Type": "application/json", "Authorization": f"Bearer {token}"}

        async with httpx.AsyncClient(proxy=None, trust_env=False, timeout=30) as client:
            resp = await client.get(url, headers=headers)
            resp.raise_for_status()
            return resp.json()

    def _verify_callback(self, back_checksum: str, seed: str, content: Any) -> bool:
        _token, uid = self._require_engine_config()
        computed_checksum = self._generate_checksum(uid=uid, seed=seed, content=content)
        return back_checksum == computed_checksum

    def _validate_local_files(self, file_paths: list[str]) -> None:
        for p in file_paths:
            if not os.path.exists(p):
                raise Exception(f"Local file not found: {p}")
            size = os.path.getsize(p)
            if size <= 0:
                raise Exception(f"Local file is empty (0 bytes): {p}")

    async def _extract_files(self, file_paths: list[str]) -> list[Tuple[str, str, str]]:
        token, _uid = self._require_engine_config()
        user_id = self.user_id
        if not user_id:
            raise Exception("Engine is not initialized. Please initialize first.")

        self._validate_local_files(file_paths)

        db = session_scope()
        try:
            db_user = crud.user.get_user_by_id(db=db, user_id=user_id)
            if not db_user:
                raise Exception("The owner of the engine is not found.")
            if db_user.default_user_file_system is None:
                raise Exception("The owner of the engine has not set a default file system yet.")

            # 1) Apply upload URLs (batch)
            request_url = f"{self.MINERU_BASE}/api/v4/file-urls/batch"
            headers = {"Content-Type": "application/json", "Authorization": f"Bearer {token}"}

            files_payload = [
                {
                    "name": Path(path).name,
                    "is_ocr": True,
                    "data_id": str(uuid.uuid4()),
                }
                for path in file_paths
            ]

            batch_payload = {
                "enable_formula": True,
                "language": "ch",
                "enable_table": True,
                "files": files_payload,
            }

            async with httpx.AsyncClient(proxy=None, trust_env=False, timeout=30) as client:
                resp = await client.post(request_url, headers=headers, json=batch_payload)
                # raise_for_status helps catch 4xx/5xx quickly
                resp.raise_for_status()

                result = resp.json()
                if result.get("code") != 0:
                    raise Exception(f"MinerU apply upload URL failed: {result.get('msg', 'Unknown error')}; resp={result}")

                data = result.get("data") or {}
                batch_id = data.get("batch_id")
                upload_urls = data.get("file_urls")

                if not batch_id or not upload_urls or len(upload_urls) != len(file_paths):
                    raise Exception(
                        f"MinerU upload URL response malformed: batch_id={batch_id}, "
                        f"urls_len={0 if not upload_urls else len(upload_urls)}, files_len={len(file_paths)}; resp={result}"
                    )

            # 2) Upload files concurrently (PUT to presigned URLs)
            async with httpx.AsyncClient(proxy=None, trust_env=False, timeout=60) as client:
                async def upload_file(idx: int, file_path: str) -> None:
                    async with aiofiles.open(file_path, "rb") as f:
                        data = await f.read()
                    if not data:
                        raise Exception(f"Read empty data from file: {file_path}")

                    upload_resp = await client.put(upload_urls[idx], content=data)
                    # Some object stores return 200/201/204; accept any 2xx
                    if upload_resp.status_code < 200 or upload_resp.status_code >= 300:
                        raise Exception(
                            f"File upload failed: {file_path}, status={upload_resp.status_code}, body={upload_resp.text[:500]}"
                        )

                await asyncio.gather(*(upload_file(i, p) for i, p in enumerate(file_paths)))

            # 3) Poll extraction results until all terminal (done/failed)
            async def poll_result() -> list[dict[str, Any]]:
                timeout_sec = 300  # 5 minutes
                interval_sec = 2
                start_time = time.monotonic()
                last_state_snapshot: str | None = None

                while True:
                    status_res = await self._get_batch_status(batch_id)

                    if status_res.get("code") != 0:
                        # MinerU returned an application-level error
                        raise Exception(
                            f"MinerU batch status error: {status_res.get('msg', 'Unknown error')}; resp={status_res}"
                        )

                    extract_list = (status_res.get("data") or {}).get("extract_result") or []
                    if not isinstance(extract_list, list):
                        raise Exception(f"MinerU batch status malformed (extract_result not list): resp={status_res}")

                    # Helpful state log (only when changes)
                    states = [(it.get("state"), it.get("data_id") or it.get("task_id")) for it in extract_list]
                    snapshot = str(states)
                    if snapshot != last_state_snapshot:
                        last_state_snapshot = snapshot
                        info_logger.info(f"[MinerU] batch_id={batch_id} states={states}")

                    # Wait until every item is terminal
                    all_terminal = all((it.get("state") in self.TERMINAL_STATES) for it in extract_list) and len(extract_list) > 0
                    if all_terminal:
                        return extract_list

                    # Timeout
                    if time.monotonic() - start_time >= timeout_sec:
                        raise Exception(
                            f"Timeout waiting for MinerU extraction results (>{timeout_sec}s). "
                            f"batch_id={batch_id}, states={states}"
                        )

                    await asyncio.sleep(interval_sec)

            extract_result = await poll_result()

            # 4) Process results
            final_data: list[Tuple[str, str, str]] = []

            for item in extract_result:
                state = item.get("state")

                if state == "failed":
                    raise Exception(f"MinerU extraction failed: {item.get('err_msg')}; item={item}")

                if state != "done":
                    # In theory we should never reach here because poll_result waits terminal,
                    # but keep it defensive.
                    continue

                full_zip_url = item.get("full_zip_url")
                if not full_zip_url:
                    raise Exception(f"MinerU returned done but missing full_zip_url: item={item}")

                # Download zip -> extract to temp dir
                download_res = await download_file_to_temp(full_zip_url)
                extracted_dir = extract_files_to_temp_from_zip(download_res.file_path)

                # Read full.md (validate existence)
                md_path = extracted_dir / "full.md"
                if not md_path.exists():
                    # Sometimes folder structure differs; help diagnose by listing.
                    try:
                        files = [str(p.relative_to(extracted_dir)) for p in extracted_dir.rglob("*")][:50]
                    except Exception:
                        files = []
                    raise Exception(f"full.md not found in extracted zip; extracted_dir={extracted_dir}, sample_files={files}")

                async with aiofiles.open(md_path, "r", encoding="utf-8") as f:
                    content = await f.read()

                if not content.strip():
                    raise Exception(f"Extracted full.md is empty; extracted_dir={extracted_dir}")

                title, summary = extract_title_and_summary(content)

                # Upload image assets (optional)
                images_dir = extracted_dir / "images"
                if images_dir.exists() and images_dir.is_dir():
                    remote_file_service = await FileSystemProxy.create(
                        user_id=user_id
                    )

                    async def upload_img(p: Path) -> None:
                        if not p.is_file():
                            return
                        async with aiofiles.open(p, "rb") as f:
                            data = await f.read()
                        if not data:
                            return
                        # Ideally detect mime by extension; keep your original default.
                        await remote_file_service.upload_file_to_path(
                            file_path=f"images/{p.name}",
                            file=io.BytesIO(data),
                            content_type="image/png",
                        )

                    await asyncio.gather(*(upload_img(img) for img in images_dir.iterdir()))

                final_data.append((title, summary, content))

            # IMPORTANT: if all were done but we still got nothing, that's an internal inconsistency.
            if not final_data:
                raise Exception(f"No results produced after processing MinerU output; batch_id={batch_id}, raw={extract_result}")

            return final_data

        except Exception as e:
            exception_logger.error(f"MinerU extraction failed: {e}", exc_info=True)
            raise
        finally:
            db.close()

    async def analyse_website(self, url: str) -> WebsiteInfo:
        temp_dir_name = f"{uuid.uuid4()}"
        temp_dir = BASE_DIR / "temp" / temp_dir_name
        temp_dir.mkdir(parents=True, exist_ok=True)

        temp_shot_pdf_path = temp_dir / "scene-snap.pdf"

        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()
            await page.goto(url)
            await page.pdf(path=str(temp_shot_pdf_path))
            await browser.close()

        results = await self._extract_files([str(temp_shot_pdf_path)])

        if not results:
            raise Exception("No results returned from file extraction")

        title, description, content = results[0]

        return WebsiteInfo(
            url=url,
            title=title,
            description=description,
            content=content,
            cover=await self.get_website_cover_by_playwright(url),
        )

    async def analyse_file(self, file_path: str) -> FileInfo:
        results = await self._extract_files([file_path])

        if not results:
            raise Exception("No results returned from file extraction")

        title, description, content = results[0]

        return FileInfo(title=title, description=description, content=content)