from __future__ import annotations

import asyncio
import json
import os
import re
import tempfile
import time
from pathlib import Path
from typing import Any, cast
from urllib.parse import urlparse

from common.logger import info_logger

from .base import SubtitleSegment, VideoPlugin
from .helpers import build_plain_markdown, build_timeline_markdown, normalize_subtitle_text
from .youtube_auth import YouTubeCookieManager

try:
    from yt_dlp import YoutubeDL
except Exception:
    YoutubeDL = None  # type: ignore[assignment]


class YouTubeSubtitlePlugin(VideoPlugin):
    plugin_name = "youtube_web"
    priority = 30
    _preferred_subtitle_langs: tuple[str, ...] = (
        "zh-Hans",
        "zh-Hant",
        "zh",
        "en",
    )

    def supports(self, url: str) -> bool:
        host = urlparse(url).netloc.lower()
        return (
            host.endswith("youtube.com")
            or host.endswith("youtu.be")
            or host.endswith("youtube-nocookie.com")
        )

    async def extract_subtitle(
        self,
        url: str,
    ) -> str | None:
        started_at = time.monotonic()
        max_segments = 800
        max_chars = 30000

        info_logger.info(f"YouTube subtitle fetch started: url={url}, source=yt-dlp")
        markdown = await self._extract_subtitle_with_ytdlp(
            url=url,
            max_segments=max_segments,
            max_chars=max_chars,
        )

        elapsed = time.monotonic() - started_at
        if markdown is None:
            info_logger.info(
                f"YouTube subtitle fetch finished: no subtitle available, source=yt-dlp, elapsed={elapsed:.2f}s"
            )
        else:
            info_logger.info(
                f"YouTube subtitle fetch finished: source=yt-dlp, elapsed={elapsed:.2f}s"
            )
        return markdown

    async def _extract_subtitle_with_ytdlp(
        self,
        *,
        url: str,
        max_segments: int,
        max_chars: int,
    ) -> str | None:
        if YoutubeDL is None:
            info_logger.info("YouTube subtitle fetch failed: yt_dlp Python package is unavailable.")
            return None

        return await asyncio.to_thread(
            self._extract_subtitle_with_ytdlp_sync,
            url,
            max_segments,
            max_chars,
        )

    @classmethod
    def _extract_subtitle_with_ytdlp_sync(
        cls,
        url: str,
        max_segments: int,
        max_chars: int,
    ) -> str | None:
        with tempfile.TemporaryDirectory(prefix="revornix-youtube-sub-") as temp_dir:
            if YoutubeDL is None:
                return None
            temp_path = Path(temp_dir)

            ydl_options_base: dict[str, object] = {
                "skip_download": True,
                "subtitlesformat": "json3/vtt/srt/best",
                "noplaylist": True,
                "quiet": True,
                "no_warnings": True,
                # Avoid leaking host-level yt-dlp config into plugin runtime.
                "ignoreconfig": True,
                # Subtitle extraction should not fail only because media format is unavailable.
                "ignore_no_formats_error": True,
                # Continue probing subtitle candidates if one attempt fails.
                "ignoreerrors": True,
                "cachedir": False,
                "paths": {"home": temp_dir},
                "outtmpl": "%(id)s.%(ext)s",
            }
            cookie_text = YouTubeCookieManager.get_cookie_text_for_ytdlp()
            if cookie_text:
                runtime_cookie_file = temp_path / "runtime.cookies.txt"
                try:
                    runtime_cookie_file.write_text(cookie_text, encoding="utf-8")
                    os.chmod(runtime_cookie_file, 0o600)
                    ydl_options_base["cookiefile"] = str(runtime_cookie_file)
                    info_logger.info(
                        "YouTube subtitle fetch auth enabled for yt_dlp (ephemeral decrypted cookie)."
                    )
                except Exception:
                    info_logger.warning("Failed to prepare ephemeral YouTube runtime cookie file.")
            else:
                info_logger.info("YouTube subtitle fetch auth cookie unavailable; running unauthenticated.")

            attempt_plan = cls._build_attempt_plan_from_metadata(url=url, ydl_options_base=ydl_options_base)
            if not attempt_plan:
                attempt_plan = cls._subtitle_attempt_plan()
            last_generated_files: list[str] = []
            for subtitles_langs, writesubtitles, writeautomaticsub in attempt_plan:
                with tempfile.TemporaryDirectory(dir=temp_dir, prefix="subtitle-attempt-") as attempt_dir_str:
                    attempt_path = Path(attempt_dir_str)
                    attempt_options: dict[str, object] = dict(ydl_options_base)
                    attempt_options["subtitleslangs"] = subtitles_langs
                    attempt_options["writesubtitles"] = writesubtitles
                    attempt_options["writeautomaticsub"] = writeautomaticsub
                    attempt_options["paths"] = {"home": str(attempt_path)}

                    result_code: int | None = None
                    try:
                        with YoutubeDL(cast(Any, attempt_options)) as ydl:
                            result_code = ydl.download([url])
                    except Exception as e:
                        info_logger.info(
                            "YouTube subtitle fetch attempt failed: "
                            f"langs={subtitles_langs} auto={'on' if writeautomaticsub else 'off'} error={e}"
                        )

                    subtitle_file = cls._pick_ytdlp_subtitle_file(attempt_path)
                    if subtitle_file is None:
                        if result_code not in (0, None):
                            info_logger.info(
                                "YouTube subtitle fetch attempt yielded no subtitle: "
                                f"langs={subtitles_langs} auto={'on' if writeautomaticsub else 'off'} "
                                f"exit_code={result_code}"
                            )
                        last_generated_files = sorted(path.name for path in attempt_path.iterdir())
                        continue

                    markdown = cls._build_markdown_from_subtitle_file(
                        subtitle_file=subtitle_file,
                        max_segments=max_segments,
                        max_chars=max_chars,
                    )
                    if markdown is None:
                        last_generated_files = sorted(path.name for path in attempt_path.iterdir())
                        continue

                    info_logger.info(
                        "YouTube subtitle file selected: "
                        f"file={subtitle_file.name} langs={subtitles_langs} auto={'on' if writeautomaticsub else 'off'}"
                    )
                    return markdown

            if last_generated_files:
                info_logger.info(
                    "YouTube subtitle fetch failed: no supported subtitle files generated, "
                    f"files={last_generated_files[:12]}"
                )
            else:
                info_logger.info("YouTube subtitle fetch failed: no subtitle files generated.")
            return None

    @classmethod
    def _build_attempt_plan_from_metadata(
        cls,
        *,
        url: str,
        ydl_options_base: dict[str, object],
    ) -> list[tuple[list[str], bool, bool]]:
        if YoutubeDL is None:
            return []

        probe_options: dict[str, object] = dict(ydl_options_base)
        probe_options["writesubtitles"] = False
        probe_options["writeautomaticsub"] = False

        try:
            with YoutubeDL(cast(Any, probe_options)) as ydl:
                info = ydl.extract_info(url, download=False)
        except Exception as e:
            info_logger.info(f"YouTube subtitle probe failed: {e}")
            return []

        if not isinstance(info, dict):
            return []

        manual_language = cls._pick_best_subtitle_language(info.get("subtitles"))
        auto_language = cls._pick_best_subtitle_language(info.get("automatic_captions"))

        attempt_plan: list[tuple[list[str], bool, bool]] = []
        if manual_language:
            attempt_plan.append(([manual_language], True, False))
        if auto_language and auto_language != manual_language:
            attempt_plan.append(([auto_language], False, True))
        return attempt_plan

    @classmethod
    def _subtitle_attempt_plan(cls) -> list[tuple[list[str], bool, bool]]:
        attempts: list[tuple[list[str], bool, bool]] = []
        for language in cls._preferred_subtitle_langs:
            attempts.append(([language], True, False))
        for language in cls._preferred_subtitle_langs:
            attempts.append(([language], False, True))
        return attempts

    @classmethod
    def _pick_best_subtitle_language(cls, payload: object) -> str | None:
        if not isinstance(payload, dict):
            return None

        languages: list[str] = []
        for key, value in payload.items():
            if isinstance(key, str) and value:
                languages.append(key)
        if not languages:
            return None

        def rank(language: str) -> tuple[int, int, str]:
            normalized = language.lower()
            for index, preferred in enumerate(cls._preferred_subtitle_langs):
                preferred_normalized = preferred.lower()
                if normalized == preferred_normalized:
                    return (0, index, normalized)
                if normalized.startswith(f"{preferred_normalized}-"):
                    return (1, index, normalized)
            if normalized.startswith("zh"):
                return (2, 0, normalized)
            if normalized.startswith("en"):
                return (3, 0, normalized)
            return (4, 0, normalized)

        return sorted(languages, key=rank)[0]

    @classmethod
    def _pick_ytdlp_subtitle_file(cls, temp_dir: Path) -> Path | None:
        subtitle_files: list[Path] = []
        for pattern in ("*.json3", "*.vtt", "*.srt"):
            subtitle_files.extend(temp_dir.glob(pattern))
        if not subtitle_files:
            return None
        return sorted(subtitle_files, key=cls._ytdlp_file_score)[0]

    @staticmethod
    def _ytdlp_file_score(path: Path) -> tuple[int, int, int, str]:
        language = YouTubeSubtitlePlugin._language_from_ytdlp_file(path).lower()
        language_priority = 2
        if language.startswith("zh"):
            language_priority = 0
        elif language.startswith("en"):
            language_priority = 1

        auto_priority = 0
        file_name = path.name.lower()
        if "auto" in file_name or "-orig" in file_name:
            auto_priority = 1

        extension_priority = 3
        suffix = path.suffix.lower()
        if suffix == ".json3":
            extension_priority = 0
        elif suffix == ".vtt":
            extension_priority = 1
        elif suffix == ".srt":
            extension_priority = 2

        return language_priority, auto_priority, extension_priority, file_name

    @staticmethod
    def _language_from_ytdlp_file(path: Path) -> str:
        name = path.name
        suffix = path.suffix.lower()
        if suffix:
            name = name[: -len(suffix)]
        parts = name.split(".")
        if len(parts) < 2:
            return "unknown"
        return parts[-1] or "unknown"

    @classmethod
    def _build_markdown_from_subtitle_file(
        cls,
        *,
        subtitle_file: Path,
        max_segments: int,
        max_chars: int,
    ) -> str | None:
        language = cls._language_from_ytdlp_file(subtitle_file)
        suffix = subtitle_file.suffix.lower()
        if suffix == ".json3":
            segments = cls._parse_ytdlp_json3_segments(subtitle_file)
            if not segments:
                return None
            return build_timeline_markdown(
                platform="YouTube",
                language=language,
                segments=segments,
                max_segments=max_segments,
                max_chars=max_chars,
            )

        if suffix in (".vtt", ".srt"):
            lines = cls._parse_plain_subtitle_lines(subtitle_file)
            if not lines:
                return None
            return build_plain_markdown(
                platform="YouTube",
                language=language,
                lines=lines,
                max_segments=max_segments,
                max_chars=max_chars,
            )

        return None

    @staticmethod
    def _parse_ytdlp_json3_segments(path: Path) -> list[SubtitleSegment]:
        try:
            payload = json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            return []

        events = payload.get("events") or []
        segments: list[SubtitleSegment] = []
        for event in events:
            event_segments = event.get("segs")
            if not event_segments:
                continue

            text = normalize_subtitle_text(
                "".join(str(item.get("utf8") or "") for item in event_segments)
            )
            if not text:
                continue

            try:
                start_seconds = float(event.get("tStartMs", 0)) / 1000.0
            except (TypeError, ValueError):
                start_seconds = 0.0

            segments.append(SubtitleSegment(start_seconds=start_seconds, text=text))
        return segments

    @staticmethod
    def _parse_plain_subtitle_lines(path: Path) -> list[str]:
        try:
            raw_text = path.read_text(encoding="utf-8")
        except Exception:
            return []

        lines: list[str] = []
        for raw_line in raw_text.splitlines():
            line = raw_line.strip().replace("\ufeff", "")
            if not line:
                continue
            if line.upper().startswith("WEBVTT"):
                continue
            if line.startswith("NOTE"):
                continue
            if "-->" in line:
                continue
            if line.isdigit():
                continue
            line = re.sub(r"<[^>]+>", "", line)
            normalized = normalize_subtitle_text(line)
            if normalized:
                lines.append(normalized)
        return lines
