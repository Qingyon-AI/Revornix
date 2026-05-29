"""Backfill document_audio_transcribe_task.md_file_name from legacy ``transcribed_text``.

For every transcribe task whose ``md_file_name`` is NULL but whose
``transcribed_text`` is populated, this script uploads the transcript to the
document creator's default file system and persists the resulting path. After
it finishes successfully, run a follow-up Alembic revision to drop the legacy
``transcribed_text`` column.

Run from the ``api/`` directory:

    PYTHONPATH=. python scripts/backfill_audio_transcribed_md.py            # dry-run summary
    PYTHONPATH=. python scripts/backfill_audio_transcribed_md.py --apply    # perform writes
"""

from __future__ import annotations

from dotenv import load_dotenv
load_dotenv()

import argparse
import asyncio
import logging
import os
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path

# Allow running as a top-level script: ``python scripts/backfill_audio_transcribed_md.py``
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from sqlalchemy import text, update  # noqa: E402

import crud  # noqa: E402
import models  # noqa: E402
from data.sql.base import async_session_context  # noqa: E402
from proxy.file_system_proxy import FileSystemProxy  # noqa: E402


logger = logging.getLogger("backfill_audio_transcribed_md")


async def _fetch_legacy_rows(db) -> list[tuple[int, int, str]]:
    """Return (transcribe_task_id, document_id, transcribed_text) for unmigrated rows."""
    result = await db.execute(
        text(
            """
            SELECT t.id, t.document_id, t.transcribed_text
            FROM document_audio_transcribe_task AS t
            WHERE t.delete_at IS NULL
              AND t.md_file_name IS NULL
              AND t.transcribed_text IS NOT NULL
            """
        )
    )
    return [(row[0], row[1], row[2]) for row in result.fetchall()]


async def _backfill_row(
    *,
    transcribe_task_id: int,
    document_id: int,
    content: str,
    apply: bool,
    file_service_cache: dict[int, object],
) -> tuple[bool, str]:
    async with async_session_context() as db:
        document = await crud.document.get_document_by_document_id_async(
            db=db,
            document_id=document_id,
        )
        if document is None:
            if apply:
                await db.execute(
                    update(models.task.DocumentAudioTranscribeTask)
                    .where(models.task.DocumentAudioTranscribeTask.id == transcribe_task_id)
                    .values(delete_at=datetime.now(timezone.utc))
                )
                await db.commit()
                return False, (
                    f"document {document_id} missing; soft-deleted orphan transcribe row"
                )
            return False, (
                f"document {document_id} missing; would soft-delete orphan transcribe row"
            )
        creator_id = document.creator_id
        user = await crud.user.get_user_by_id_async(db=db, user_id=creator_id)
        if user is None:
            return False, f"creator {creator_id} missing"
        if user.default_user_file_system is None:
            return False, (
                f"creator {creator_id} has no default_user_file_system; "
                "cannot mirror legacy transcript"
            )

    md_file_name = f"audio_transcripts/{uuid.uuid4().hex}.md"
    if not apply:
        return True, f"would write {len(content)} bytes -> {md_file_name}"

    file_service = file_service_cache.get(creator_id)
    if file_service is None:
        file_service = await FileSystemProxy.create(user_id=creator_id)
        file_service_cache[creator_id] = file_service

    await file_service.upload_raw_content_to_path(
        file_path=md_file_name,
        content=content.encode("utf-8"),
        content_type="text/plain",
    )

    async with async_session_context() as db:
        await db.execute(
            update(models.task.DocumentAudioTranscribeTask)
            .where(models.task.DocumentAudioTranscribeTask.id == transcribe_task_id)
            .values(md_file_name=md_file_name)
        )
        await db.commit()

    return True, f"wrote {len(content)} bytes -> {md_file_name}"


async def main(apply: bool) -> int:
    async with async_session_context() as db:
        rows = await _fetch_legacy_rows(db)

    if not rows:
        logger.info("Nothing to backfill; all transcribe tasks already use md_file_name.")
        return 0

    logger.info(
        "Found %d transcribe row(s) to backfill (apply=%s).",
        len(rows),
        apply,
    )

    file_service_cache: dict[int, object] = {}
    success = 0
    skipped = 0
    failed = 0
    for transcribe_task_id, document_id, content in rows:
        try:
            ok, message = await _backfill_row(
                transcribe_task_id=transcribe_task_id,
                document_id=document_id,
                content=content,
                apply=apply,
                file_service_cache=file_service_cache,
            )
        except Exception as exc:  # noqa: BLE001
            failed += 1
            logger.error(
                "backfill failed for transcribe_task_id=%s document_id=%s: %s",
                transcribe_task_id,
                document_id,
                exc,
            )
            continue

        if ok:
            success += 1
            logger.info(
                "transcribe_task_id=%s document_id=%s %s",
                transcribe_task_id,
                document_id,
                message,
            )
        else:
            skipped += 1
            logger.warning(
                "skipped transcribe_task_id=%s document_id=%s: %s",
                transcribe_task_id,
                document_id,
                message,
            )

    logger.info(
        "Backfill complete: success=%d skipped=%d failed=%d total=%d",
        success,
        skipped,
        failed,
        len(rows),
    )
    return 0 if failed == 0 else 1


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Perform writes. Without this flag the script only previews actions.",
    )
    parser.add_argument(
        "--log-level",
        default=os.environ.get("BACKFILL_LOG_LEVEL", "INFO"),
    )
    return parser.parse_args()


if __name__ == "__main__":
    args = _parse_args()
    logging.basicConfig(
        level=args.log_level.upper(),
        format="%(asctime)s %(levelname)s %(message)s",
    )
    raise SystemExit(asyncio.run(main(apply=args.apply)))
