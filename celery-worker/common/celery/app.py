from dotenv import load_dotenv
load_dotenv(override=True)

import asyncio
import os
import threading
from datetime import datetime, timezone

from celery import Celery
from celery.signals import (
    task_failure,
    task_postrun,
    task_prerun,
    task_retry,
    worker_process_init,
    worker_ready,
)

from common.env import is_env_enabled
from common.logger import exception_logger, info_logger, log_event
from common.tracing import sentry_before_send_attach_otel, setup_worker_tracing
from config.redis import REDIS_PORT, REDIS_URL
from config.sentry import WORKER_SENTRY_DSN, WORKER_SENTRY_ENABLE


celery_app = Celery(
    "worker",
    broker=f"redis://{REDIS_URL}:{REDIS_PORT}/0",
    backend=f"redis://{REDIS_URL}:{REDIS_PORT}/0",
)


_sentry_initialized_pid: int | None = None


def _initialize_worker_sentry() -> None:
    global _sentry_initialized_pid

    current_pid = os.getpid()
    if _sentry_initialized_pid == current_pid:
        return

    if not is_env_enabled(WORKER_SENTRY_ENABLE):
        return

    if not WORKER_SENTRY_DSN:
        info_logger.warning(
            "WORKER_SENTRY_ENABLE is enabled but WORKER_SENTRY_DSN is empty; worker sentry init skipped."
        )
        return

    try:
        import sentry_sdk
        from sentry_sdk.integrations.celery import CeleryIntegration

        # Sentry handles ERRORS; tracing/performance lives in OTel
        # (see common/tracing.py + Jaeger). traces_sample_rate=0 keeps the
        # two SDKs from double-instrumenting the same code paths.
        sentry_sdk.init(
            dsn=WORKER_SENTRY_DSN,
            send_default_pii=True,
            traces_sample_rate=0.0,
            profiles_sample_rate=0.0,
            integrations=[CeleryIntegration()],
            before_send=sentry_before_send_attach_otel,
        )
        _sentry_initialized_pid = current_pid
        info_logger.info(f"Worker sentry initialized for pid={current_pid}")
    except Exception as e:
        exception_logger.error(f"Failed to initialize worker sentry: {e}")


def _run(coro):
    """Drive ``coro`` on a fresh event loop and clean up per-loop resources.

    Each celery task gets its own loop via ``asyncio.run``. Resources whose
    lifetime is tied to the loop (notably the neo4j async driver, which binds
    to the loop that created it) are closed inside that same loop here, in a
    ``finally`` block, so they never leak across loops.
    """
    async def _wrapped():
        try:
            return await coro
        finally:
            # Imported lazily to avoid a circular import (data.neo4j.base
            # depends on common.logger which is in the same package tree).
            try:
                from data.neo4j.base import close_neo4j_driver_for_current_loop
                await close_neo4j_driver_for_current_loop()
            except Exception as cleanup_exc:  # pragma: no cover — defensive
                exception_logger.warning(
                    f"neo4j per-loop cleanup failed: {cleanup_exc}"
                )

    return asyncio.run(_wrapped())


def _start_background_coroutine(target, *, name: str) -> None:
    def _runner() -> None:
        try:
            _run(target())
        except Exception as e:
            exception_logger.error(f"{name} failed on worker startup: {e}")

    threading.Thread(
        target=_runner,
        name=name,
        daemon=True,
    ).start()


_initialize_worker_sentry()
setup_worker_tracing()


@worker_process_init.connect
def initialize_sentry_when_worker_process_init(**kwargs):
    _initialize_worker_sentry()
    # Re-initialise OTel inside each worker process so spans flow through the
    # right TracerProvider after fork. Idempotent per pid.
    setup_worker_tracing()


_task_start_times: dict[str, float] = {}


@task_prerun.connect
def _log_task_prerun(sender=None, task_id=None, task=None, args=None, kwargs=None, **_):
    import time
    if task_id:
        _task_start_times[task_id] = time.perf_counter()
    log_event(
        info_logger,
        "celery_task_started",
        celery_task_id=task_id,
        celery_task_name=getattr(task, "name", None) or (sender.name if sender else None),
    )


@task_postrun.connect
def _log_task_postrun(
    sender=None,
    task_id=None,
    task=None,
    retval=None,
    state=None,
    **_,
):
    import time
    duration_ms = None
    started = _task_start_times.pop(task_id, None) if task_id else None
    if started is not None:
        duration_ms = round((time.perf_counter() - started) * 1000, 2)
    log_event(
        info_logger,
        "celery_task_finished",
        celery_task_id=task_id,
        celery_task_name=getattr(task, "name", None) or (sender.name if sender else None),
        state=state,
        duration_ms=duration_ms,
    )


@task_failure.connect
def _log_task_failure(
    sender=None,
    task_id=None,
    exception=None,
    traceback=None,
    einfo=None,
    **_,
):
    log_event(
        exception_logger,
        "celery_task_failed",
        level=40,  # logging.ERROR
        celery_task_id=task_id,
        celery_task_name=sender.name if sender else None,
        error=repr(exception) if exception is not None else None,
    )


@task_retry.connect
def _log_task_retry(sender=None, request=None, reason=None, einfo=None, **_):
    log_event(
        info_logger,
        "celery_task_retry",
        level=30,  # logging.WARNING
        celery_task_id=getattr(request, "id", None) if request else None,
        celery_task_name=sender.name if sender else None,
        reason=repr(reason) if reason is not None else None,
    )


@worker_ready.connect
def initialize_bilibili_auth_when_worker_ready(**kwargs):
    from engine.video_plugins.bilibili_auth import initialize_bilibili_auth_on_startup
    from engine.video_plugins.youtube_auth import initialize_youtube_auth_on_startup

    _start_background_coroutine(
        initialize_bilibili_auth_on_startup,
        name="worker-bilibili-auth-init",
    )
    _start_background_coroutine(
        initialize_youtube_auth_on_startup,
        name="worker-youtube-auth-init",
    )


@celery_app.task
def start_process_document(
    document_id: int,
    user_id: int,
    auto_summary: bool = False,
    auto_podcast: bool = False,
    auto_transcribe: bool = False,
    auto_tag: bool = False,
    override: dict | None = None,
):
    from workflow.document_process_workflow import run_document_process_workflow

    _run(
        run_document_process_workflow(
            document_id=document_id,
            user_id=user_id,
            auto_summary=auto_summary,
            auto_podcast=auto_podcast,
            auto_transcribe=auto_transcribe,
            auto_tag=auto_tag,
            override=override,
        )
    )


@celery_app.task
def start_process_section(
    section_id: int,
    user_id: int,
    auto_podcast: bool = False,
    force_full_rebuild: bool = False,
    model_id: int | None = None,
    image_engine_id: int | None = None,
    podcast_engine_id: int | None = None,
):
    import crud
    from data.sql.base import async_session_context
    from enums.section import SectionPodcastStatus, SectionProcessStatus
    from workflow.section_process_workflow import run_section_process_workflow

    async def _prepare_section_podcast_task() -> bool:
        async with async_session_context() as db:
            now = datetime.now(timezone.utc)
            db_section_process_task = await crud.task.get_section_process_task_by_section_id_async(
                db=db,
                section_id=section_id,
            )
            if (
                db_section_process_task is not None
                and db_section_process_task.status == SectionProcessStatus.CANCELLED
            ):
                return False
            db_podcast_task = await crud.task.get_section_podcast_task_by_section_id_async(
                db=db,
                section_id=section_id,
            )
            if db_podcast_task is None:
                await crud.task.create_section_podcast_task_async(
                    db=db,
                    user_id=user_id,
                    section_id=section_id,
                    status=SectionPodcastStatus.WAIT_TO,
                )
            else:
                db_podcast_task.status = SectionPodcastStatus.WAIT_TO
                db_podcast_task.podcast_file_name = None
                db_podcast_task.update_time = now
            await db.commit()
            return True

    _run(
        run_section_process_workflow(
            section_id=section_id,
            user_id=user_id,
            auto_podcast=auto_podcast,
            force_full_rebuild=force_full_rebuild,
            model_id=model_id,
            image_engine_id=image_engine_id,
            podcast_engine_id=podcast_engine_id,
        )
    )
    if auto_podcast and _run(_prepare_section_podcast_task()):
        start_process_section_podcast.delay(
            section_id,
            user_id,
            engine_id=podcast_engine_id,
        )


@celery_app.task
def finalize_section_images(
    section_id: int,
    user_id: int,
    md_file_name: str,
    markdown_with_markers: str,
    image_plans_payload: list[dict],
    engine_id: int,
):
    from workflow.section_process_workflow import run_finalize_section_images

    _run(
        run_finalize_section_images(
            section_id=section_id,
            user_id=user_id,
            md_file_name=md_file_name,
            markdown_with_markers=markdown_with_markers,
            image_plans_payload=image_plans_payload,
            engine_id=engine_id,
        )
    )


@celery_app.task
def start_process_document_embedding(
    document_id: int,
    user_id: int,
    start_chunk_idx: int = 0,
    chunk_snapshot_path: str | None = None,
):
    from workflow.document_embedding_workflow import run_document_embedding_workflow

    _run(
        run_document_embedding_workflow(
            document_id=document_id,
            user_id=user_id,
            start_chunk_idx=start_chunk_idx,
            chunk_snapshot_path=chunk_snapshot_path,
        )
    )


@celery_app.task
def start_process_document_graph(
    document_id: int,
    user_id: int,
    chunk_snapshot_path: str | None = None,
    model_id: int | None = None,
):
    from workflow.document_graph_task_workflow import run_document_graph_task_workflow

    _run(
        run_document_graph_task_workflow(
            document_id=document_id,
            user_id=user_id,
            chunk_snapshot_path=chunk_snapshot_path,
            model_id=model_id,
        )
    )


@celery_app.task
def start_process_document_summarize(
    document_id: int,
    user_id: int,
    chunk_snapshot_path: str | None = None,
    model_id: int | None = None,
):
    from workflow.document_summarize_workflow import run_document_summarize_workflow

    _run(
        run_document_summarize_workflow(
            document_id=document_id,
            user_id=user_id,
            chunk_snapshot_path=chunk_snapshot_path,
            model_id=model_id,
        )
    )

@celery_app.task
def start_process_document_transcribe(
    document_id: int,
    user_id: int,
    engine_id: int | None = None,
):
    from workflow.document_transcribe_workflow import run_document_transcribe_workflow

    _run(
        run_document_transcribe_workflow(
            document_id=document_id,
            user_id=user_id,
            engine_id=engine_id,
        )
    )

@celery_app.task
def start_process_document_podcast(
    document_id: int,
    user_id: int,
    engine_id: int | None = None,
):
    from workflow.document_podcast_workflow import run_document_podcast_workflow

    _run(
        run_document_podcast_workflow(
            document_id=document_id,
            user_id=user_id,
            engine_id=engine_id,
        )
    )


@celery_app.task
def start_prepare_document_chunk_snapshot(
    document_id: int,
    user_id: int,
):
    from data.common import ensure_document_chunk_snapshot

    try:
        _run(
            ensure_document_chunk_snapshot(
                doc_id=document_id,
                user_id=user_id,
            )
        )
    except Exception as e:
        info_logger.warning(
            f"Document chunk snapshot preparation failed, fallback to raw chunk stream. "
            f"document_id={document_id}, user_id={user_id}, error={e}"
        )


@celery_app.task
def update_document_process_status(
    document_id: int,
    status: int,
):
    from workflow.document_process_status_workflow import run_document_process_status_workflow

    _run(
        run_document_process_status_workflow(
            document_id=document_id,
            status=status,
        )
    )


@celery_app.task
def start_process_section_podcast(
    section_id: int,
    user_id: int,
    engine_id: int | None = None,
):
    from workflow.section_podcast_workflow import run_section_podcast_workflow

    _run(
        run_section_podcast_workflow(
            section_id=section_id,
            user_id=user_id,
            engine_id=engine_id,
        )
    )


@celery_app.task
def start_process_section_ppt(
    section_id: int,
    user_id: int,
    model_id: int | None = None,
    image_engine_id: int | None = None,
):
    from workflow.section_ppt_workflow import run_section_ppt_workflow

    _run(
        run_section_ppt_workflow(
            section_id=section_id,
            user_id=user_id,
            model_id=model_id,
            image_engine_id=image_engine_id,
        )
    )


@celery_app.task
def update_section_process_status(
    section_id: int,
    status: int,
):
    from workflow.section_process_status_workflow import run_section_process_status_workflow

    _run(
        run_section_process_status_workflow(
            section_id=section_id,
            status=status,
        )
    )


@celery_app.task
def start_trigger_user_notification_event(
    user_id: int,
    trigger_event_uuid: str,
    params: dict | None = None,
):
    from notification.dispatch import run_notification_event_workflow

    _run(
        run_notification_event_workflow(
            user_id=user_id,
            trigger_event_uuid=trigger_event_uuid,
            params=params,
        )
    )


if __name__ == "__main__":
    from workflow.section_process_workflow import run_section_process_workflow

    _run(
        run_section_process_workflow(
            section_id=1,
            user_id=1,
            auto_podcast=True
        )
    )
