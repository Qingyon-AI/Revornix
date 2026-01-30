import re
import uuid
import httpx
import zipfile
import mimetypes
import shutil
import time
from pydantic import BaseModel
from urllib.parse import urlparse
from config.base import BASE_DIR
from common.logger import info_logger, exception_logger
from tenacity import retry, stop_after_attempt, wait_fixed
from pathlib import Path
from data.sql.base import SessionLocal
from proxy.file_system_proxy import FileSystemProxy

async def get_remote_file_signed_url(
    user_id: int,
    file_name: str
):
    """获取远程文件系统中的文件的公网访问URL
    """

    db = SessionLocal()
    try:
        file_service = await FileSystemProxy.create(
            user_id=user_id,
        )
        if file_service is None:
            raise Exception("Failed to get the file_service")
        
        return file_service.presign_get_url(file_name)
    except Exception as e:
        exception_logger.error(f"There is something wrong while getting the remote file signed url: {e}")
        raise
    finally:
        db.close()

def resolve_filename_and_suffix(
    *,
    url: str,
    response: httpx.Response,
    keep_origin_name: bool = False,
) -> tuple[str, str]:
    """
    根据 response 和 url 智能解析文件名与后缀

    返回：
        (file_name, suffix)

    keep_origin_name:
        - True  : 尽量保留原始文件名
        - False : 使用 UUID，仅保留后缀（推荐用于 temp 目录）
    """

    def filename_from_content_disposition() -> str | None:
        cd = response.headers.get("content-disposition")
        if not cd:
            return None
        match = re.search(r'filename\*?="?([^";]+)"?', cd)
        return match.group(1) if match else None

    origin_name: str | None = (
        filename_from_content_disposition()
        or Path(urlparse(url).path).name
        or None
    )

    # 1️⃣ 尝试从原始文件名拿后缀
    suffix = Path(origin_name).suffix if origin_name else ""

    # 2️⃣ URL / CD 都没有后缀 → Content-Type
    if not suffix:
        content_type = response.headers.get("content-type", "").split(";")[0]
        suffix = mimetypes.guess_extension(content_type) or ""

    # 3️⃣ 生成最终文件名
    if keep_origin_name and origin_name:
        file_name = origin_name
    else:
        file_name = f"{uuid.uuid4().hex}{suffix}"

    return file_name, suffix

class DownloadRes(BaseModel):
    file_path: str
    file_name: str

def _remove_path(path: Path) -> None:
    try:
        if path.is_dir():
            shutil.rmtree(path)
        else:
            path.unlink()
    except FileNotFoundError:
        return

def cleanup_temp_dir(
    *,
    max_age_seconds: int = 24 * 60 * 60,
    max_entries: int = 1000
) -> None:
    temp_dir = BASE_DIR / "temp"
    if not temp_dir.exists():
        return
    now = time.time()
    remaining: list[tuple[float, Path]] = []
    for entry in temp_dir.iterdir():
        try:
            stat = entry.stat()
        except FileNotFoundError:
            continue
        age = now - stat.st_mtime
        if age > max_age_seconds:
            _remove_path(entry)
            continue
        remaining.append((stat.st_mtime, entry))
    if len(remaining) > max_entries:
        remaining.sort(key=lambda item: item[0])
        for _, entry in remaining[:-max_entries]:
            _remove_path(entry)

@retry(stop=stop_after_attempt(3), wait=wait_fixed(2))
async def download_file_to_temp(url: str):
    temp_dir = BASE_DIR / "temp"
    temp_dir.mkdir(parents=True, exist_ok=True)
    cleanup_temp_dir()

    async with httpx.AsyncClient(proxy=None, trust_env=False) as client:
        async with client.stream("GET", url) as response:
            response.raise_for_status()

            file_name, _ = resolve_filename_and_suffix(
                url=url,
                response=response,
                keep_origin_name=False,  # temp 文件强烈建议 False
            )

            file_path = temp_dir / file_name

            info_logger.info(f"Downloading file from {url} to {file_path}")

            with open(file_path, "wb") as f:
                async for chunk in response.aiter_bytes():
                    if chunk:
                        f.write(chunk)

    return DownloadRes(
        file_path=str(file_path),
        file_name=file_name,
    )
        
def extract_files_to_temp_from_zip(file_path: str):
    temp_dir = BASE_DIR / "temp"
    temp_dir.mkdir(parents=True, exist_ok=True)
    cleanup_temp_dir()
    extracted_dir = temp_dir / uuid.uuid4().hex
    # 解压文件到指定文件夹
    with zipfile.ZipFile(file_path, 'r') as zip_ref:
        zip_ref.extractall(str(extracted_dir))
    return extracted_dir
