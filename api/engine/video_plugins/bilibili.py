from __future__ import annotations

import hashlib
import re
import time
from urllib.parse import parse_qs, quote, urlencode, urlparse

import httpx

from common.logger import info_logger

from .base import SubtitleSegment, VideoPlugin
from .bilibili_auth import BilibiliCredentialManager
from .helpers import build_timeline_markdown, normalize_subtitle_text

MIXIN_KEY_ENC_TAB = [
    46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35,
    27, 43, 5, 49, 33, 9, 42, 19, 29, 28, 14, 39, 12, 38, 41, 13,
    37, 48, 7, 16, 24, 55, 40, 61, 26, 17, 0, 1, 60, 51, 30, 4,
    22, 25, 54, 21, 56, 59, 6, 63, 57, 62, 11, 36, 20, 34, 44, 52,
]


class BilibiliSubtitlePlugin(VideoPlugin):
    plugin_name = "bilibili_api"
    priority = 20

    def supports(self, url: str) -> bool:
        host = urlparse(url).netloc.lower()
        return host.endswith("bilibili.com") or host.endswith("b23.tv")

    async def extract_subtitle(
        self,
        url: str,
    ) -> str | None:
        info_logger.info(f"Bilibili subtitle fetch started: url={url}")
        bilibili_cookie = await self._get_bilibili_cookie()
        if not bilibili_cookie:
            info_logger.info(
                "Bilibili subtitle fetch blocked: login credential unavailable. "
                "This engine requires Bilibili login."
            )
            return None

        markdown = await self._extract_subtitle_once(
            url=url,
            bilibili_cookie=bilibili_cookie,
        )
        if markdown is not None:
            info_logger.info("Bilibili subtitle fetch succeeded with authenticated request.")
        else:
            info_logger.info("Bilibili subtitle fetch failed with authenticated request.")
        return markdown

    async def _extract_subtitle_once(
        self,
        *,
        url: str,
        bilibili_cookie: str | None,
    ) -> str | None:
        started_at = time.monotonic()
        request_headers = {
            "User-Agent": (
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36"
            ),
            "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
        }
        request_timeout = httpx.Timeout(20.0, connect=8.0)
        max_segments = 800
        max_chars = 30000

        base_headers = dict(request_headers)
        if bilibili_cookie:
            base_headers["Cookie"] = bilibili_cookie

        async with httpx.AsyncClient(
            timeout=request_timeout,
            follow_redirects=True,
        ) as client:
            resolved_res = await client.get(url, headers=base_headers)
            resolved_url = str(resolved_res.url)

            bvid, aid, page = self._extract_video_identifiers(resolved_url)
            if bvid is None and aid is None:
                bvid, aid, page = self._extract_video_identifiers(url)
            if bvid is None and aid is None:
                info_logger.info("Bilibili subtitle fetch aborted: failed to parse video identifiers.")
                return None
            info_logger.info(
                "Bilibili subtitle identifiers parsed: "
                f"bvid={bvid or '-'} aid={aid or '-'} page={page} auth={'on' if bilibili_cookie else 'off'}"
            )

            view_params: dict[str, str] = {}
            if bvid is not None:
                view_params["bvid"] = bvid
            else:
                view_params["aid"] = str(aid)

            view_res = await client.get(
                "https://api.bilibili.com/x/web-interface/view",
                params=view_params,
                headers=base_headers,
            )
            if view_res.status_code >= 400:
                info_logger.info(f"Bilibili subtitle view request failed: status={view_res.status_code}")
                return None

            view_json = view_res.json()
            if view_json.get("code") != 0:
                info_logger.info(f"Bilibili subtitle view api rejected: code={view_json.get('code')}")
                return None

            view_data = view_json.get("data") or {}
            cid = self._pick_cid(view_data=view_data, page=page)
            if cid is None:
                info_logger.info("Bilibili subtitle fetch aborted: failed to resolve cid.")
                return None
            info_logger.info(f"Bilibili subtitle cid selected: cid={cid}")

            player_params: dict[str, str | int] = {"cid": cid}
            if bvid is not None:
                player_params["bvid"] = bvid
            elif aid is not None:
                player_params["aid"] = int(aid)

            referer_video_id = bvid if bvid is not None else f"av{aid}"
            player_headers = {
                **base_headers,
                "Referer": f"https://www.bilibili.com/video/{referer_video_id}",
            }
            img_key, sub_key = await self._get_wbi_keys(client=client, headers=base_headers)
            if img_key is None or sub_key is None:
                info_logger.info("Bilibili subtitle fetch aborted: failed to get WBI keys.")
                return None
            signed_player_params = self._sign_wbi_params(
                params=player_params,
                img_key=img_key,
                sub_key=sub_key,
            )
            player_res = await client.get(
                "https://api.bilibili.com/x/player/wbi/v2",
                params=signed_player_params,
                headers=player_headers,
            )
            if player_res.status_code >= 400:
                info_logger.info(f"Bilibili subtitle player request failed: status={player_res.status_code}")
                return None

            player_json = player_res.json()
            if player_json.get("code") != 0:
                info_logger.info(f"Bilibili subtitle player api rejected: code={player_json.get('code')}")
                return None

            player_data = player_json.get("data") or {}
            if not self._ensure_identity_match(
                request_bvid=bvid,
                request_aid=aid,
                request_cid=cid,
                player_data=player_data,
            ):
                info_logger.info("Bilibili subtitle fetch aborted: response identity mismatch.")
                return None

            subtitle_tracks = (
                player_data
                .get("subtitle", {})
                .get("subtitles")
            ) or []
            if not subtitle_tracks:
                subtitle_tracks = (
                    (view_data.get("subtitle") or {}).get("list")
                ) or []
            subtitle_tracks = self._filter_tracks_by_cid(subtitle_tracks=subtitle_tracks, cid=cid)
            info_logger.info(f"Bilibili subtitle tracks discovered: count={len(subtitle_tracks)}")

            if not subtitle_tracks:
                info_logger.info("Bilibili subtitle fetch finished: no subtitle tracks available.")
                return None

            selected_track = self._select_subtitle_track(subtitle_tracks)
            if not selected_track:
                info_logger.info("Bilibili subtitle fetch aborted: failed to select subtitle track.")
                return None

            subtitle_url = selected_track.get("subtitle_url") or selected_track.get("url")
            if not subtitle_url:
                info_logger.info("Bilibili subtitle fetch aborted: subtitle url is empty.")
                return None
            subtitle_url = str(subtitle_url)
            if subtitle_url.startswith("//"):
                subtitle_url = f"https:{subtitle_url}"
            info_logger.info(
                "Bilibili subtitle track selected: "
                f"lan={selected_track.get('lan') or '-'} lan_doc={selected_track.get('lan_doc') or '-'}"
            )

            subtitle_res = await client.get(subtitle_url, headers=player_headers)
            if subtitle_res.status_code >= 400:
                info_logger.info(f"Bilibili subtitle file request failed: status={subtitle_res.status_code}")
                return None

        subtitle_json = subtitle_res.json()
        body = subtitle_json.get("body") or []

        segments: list[SubtitleSegment] = []
        for item in body:
            text = normalize_subtitle_text(str(item.get("content") or ""))
            if not text:
                continue

            try:
                start_seconds = float(item.get("from", 0))
            except (TypeError, ValueError):
                start_seconds = 0.0

            segments.append(SubtitleSegment(start_seconds=start_seconds, text=text))

        markdown = build_timeline_markdown(
            platform="Bilibili",
            language=str(selected_track.get("lan") or selected_track.get("lan_doc") or ""),
            segments=segments,
            max_segments=max_segments,
            max_chars=max_chars,
        )
        elapsed = time.monotonic() - started_at
        info_logger.info(
            "Bilibili subtitle fetch finished: "
            f"segments={len(segments)} elapsed={elapsed:.2f}s auth={'on' if bilibili_cookie else 'off'}"
        )
        return markdown

    async def _get_bilibili_cookie(self) -> str | None:
        return await BilibiliCredentialManager.get_cookie_header_for_login_required_subtitle()

    @staticmethod
    def _extract_video_identifiers(url: str) -> tuple[str | None, str | None, int]:
        parsed = urlparse(url)
        query = parse_qs(parsed.query)

        page = 1
        page_candidates = query.get("p")
        if page_candidates:
            try:
                page = max(1, int(page_candidates[0]))
            except (TypeError, ValueError):
                page = 1

        bvid_match = re.search(r"/video/(BV[0-9A-Za-z]+)", parsed.path, flags=re.IGNORECASE)
        if bvid_match:
            return bvid_match.group(1), None, page

        aid_match = re.search(r"/video/av(\d+)", parsed.path, flags=re.IGNORECASE)
        if aid_match:
            return None, aid_match.group(1), page

        return None, None, page

    @staticmethod
    def _pick_cid(view_data: dict, page: int) -> int | None:
        pages = view_data.get("pages") or []
        if isinstance(pages, list) and pages:
            idx = page - 1
            if 0 <= idx < len(pages):
                try:
                    page_dict = pages[idx] or {}
                    cid_val = page_dict.get("cid")
                    if cid_val is not None:
                        return int(cid_val)
                except (TypeError, ValueError):
                    pass

            for page_item in pages:
                try:
                    page_dict = page_item or {}
                    cid_val = page_dict.get("cid")
                    if cid_val is not None:
                        return int(cid_val)
                except (TypeError, ValueError):
                    continue

        try:
            cid = view_data.get("cid")
            return int(cid) if cid is not None else None
        except (TypeError, ValueError):
            return None

    @staticmethod
    def _select_subtitle_track(subtitle_tracks: list[dict]) -> dict | None:
        if not subtitle_tracks:
            return None

        def score(track: dict) -> tuple[int, int]:
            language = str(track.get("lan") or "").lower()
            language_doc = str(track.get("lan_doc") or "").lower()

            language_priority = 2
            if language.startswith("zh"):
                language_priority = 0
            elif language.startswith("en"):
                language_priority = 1

            auto_priority = 0
            if "auto" in language_doc or "自动" in language_doc:
                auto_priority = 1

            return language_priority, auto_priority

        return sorted(subtitle_tracks, key=score)[0]

    @staticmethod
    def _ensure_identity_match(
        request_bvid: str | None,
        request_aid: str | None,
        request_cid: int,
        player_data: dict,
    ) -> bool:
        response_cid = player_data.get("cid")
        if response_cid is not None:
            try:
                if int(response_cid) != int(request_cid):
                    return False
            except (TypeError, ValueError):
                return False

        if request_bvid is not None:
            response_bvid = str(player_data.get("bvid") or "").upper()
            if response_bvid and response_bvid != request_bvid.upper():
                return False

        if request_aid is not None:
            response_aid = str(player_data.get("aid") or "")
            if response_aid and response_aid != str(request_aid):
                return False

        return True

    @staticmethod
    def _filter_tracks_by_cid(subtitle_tracks: list[dict], cid: int) -> list[dict]:
        cid_str = str(cid)
        tracks_with_cid: list[dict] = []

        for track in subtitle_tracks:
            subtitle_url = str(track.get("subtitle_url") or track.get("url") or "")
            if subtitle_url and cid_str in subtitle_url:
                tracks_with_cid.append(track)

        return tracks_with_cid if tracks_with_cid else subtitle_tracks

    @staticmethod
    async def _get_wbi_keys(
        client: httpx.AsyncClient,
        headers: dict[str, str],
    ) -> tuple[str | None, str | None]:
        nav_res = await client.get(
            "https://api.bilibili.com/x/web-interface/nav",
            headers=headers,
        )
        if nav_res.status_code >= 400:
            return None, None

        nav_json = nav_res.json()
        if nav_json.get("code") != 0:
            return None, None

        wbi_img = (nav_json.get("data") or {}).get("wbi_img") or {}
        img_url = str(wbi_img.get("img_url") or "")
        sub_url = str(wbi_img.get("sub_url") or "")
        if not img_url or not sub_url:
            return None, None

        img_key = img_url.rsplit("/", 1)[-1].split(".", 1)[0]
        sub_key = sub_url.rsplit("/", 1)[-1].split(".", 1)[0]
        if not img_key or not sub_key:
            return None, None

        return img_key, sub_key

    @staticmethod
    def _get_mixin_key(raw_key: str) -> str:
        mixed_chars: list[str] = []
        for index in MIXIN_KEY_ENC_TAB:
            if index < len(raw_key):
                mixed_chars.append(raw_key[index])
        return "".join(mixed_chars)[:32]

    @classmethod
    def _sign_wbi_params(
        cls,
        params: dict[str, str | int],
        img_key: str,
        sub_key: str,
    ) -> dict[str, str]:
        mixin_key = cls._get_mixin_key(f"{img_key}{sub_key}")
        signed_params: dict[str, str] = {key: str(value) for key, value in params.items()}
        signed_params["wts"] = str(int(time.time()))

        filtered_params: dict[str, str] = {}
        for key in sorted(signed_params.keys()):
            value = signed_params[key]
            filtered_params[key] = "".join(ch for ch in value if ch not in "!'()*")

        query = urlencode(filtered_params, quote_via=quote)
        filtered_params["w_rid"] = hashlib.md5(
            f"{query}{mixin_key}".encode("utf-8")
        ).hexdigest()
        return filtered_params
