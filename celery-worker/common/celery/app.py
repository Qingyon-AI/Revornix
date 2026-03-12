import psycopg
from dotenv import load_dotenv
load_dotenv(override=True)

import asyncio
import os

from celery import Celery
from celery.signals import worker_process_init, worker_ready

from common.env import is_env_enabled
from common.logger import exception_logger, info_logger
from config.redis import REDIS_PORT, REDIS_URL
from config.sentry import WORKER_SENTRY_DSN, WORKER_SENTRY_ENABLE
from engine.video_plugins.bilibili_auth import initialize_bilibili_auth_on_startup
from engine.video_plugins.youtube_auth import initialize_youtube_auth_on_startup
from workflow.document_embedding_workflow import run_document_embedding_workflow
from workflow.document_graph_task_workflow import run_document_graph_task_workflow
from workflow.document_podcast_workflow import run_document_podcast_workflow
from workflow.document_process_status_workflow import run_document_process_status_workflow
from workflow.document_process_workflow import run_document_process_workflow
from workflow.document_summarize_workflow import run_document_summarize_workflow
from workflow.notification_event_workflow import run_notification_event_workflow
from workflow.section_podcast_workflow import run_section_podcast_workflow
from workflow.section_process_status_workflow import run_section_process_status_workflow
from workflow.section_process_workflow import run_section_process_workflow
from workflow.document_transcribe_workflow import run_document_transcribe_workflow

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

        sentry_sdk.init(
            dsn=WORKER_SENTRY_DSN,
            send_default_pii=True,
            integrations=[CeleryIntegration()],
        )
        _sentry_initialized_pid = current_pid
        info_logger.info(f"Worker sentry initialized for pid={current_pid}")
    except Exception as e:
        exception_logger.error(f"Failed to initialize worker sentry: {e}")


def _run(coro):
    return asyncio.run(coro)


_initialize_worker_sentry()


@worker_process_init.connect
def initialize_sentry_when_worker_process_init(**kwargs):
    _initialize_worker_sentry()


@worker_ready.connect
def initialize_bilibili_auth_when_worker_ready(**kwargs):
    try:
        _run(initialize_bilibili_auth_on_startup())
    except Exception as e:
        exception_logger.error(f"Failed to initialize bilibili auth on worker startup: {e}")
    try:
        _run(initialize_youtube_auth_on_startup())
    except Exception as e:
        exception_logger.error(f"Failed to initialize youtube auth on worker startup: {e}")


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
):
    _run(
        run_section_process_workflow(
            section_id=section_id,
            user_id=user_id,
            auto_podcast=auto_podcast,
        )
    )


@celery_app.task
def start_process_document_embedding(
    document_id: int,
    user_id: int,
):
    _run(
        run_document_embedding_workflow(
            document_id=document_id,
            user_id=user_id,
        )
    )


@celery_app.task
def start_process_document_graph(
    document_id: int,
    user_id: int,
):
    _run(
        run_document_graph_task_workflow(
            document_id=document_id,
            user_id=user_id,
        )
    )


@celery_app.task
def start_process_document_summarize(
    document_id: int,
    user_id: int,
):
    _run(
        run_document_summarize_workflow(
            document_id=document_id,
            user_id=user_id,
        )
    )

@celery_app.task
def start_process_document_transcribe(
    document_id: int,
    user_id: int,
):
    _run(
        run_document_transcribe_workflow(
            document_id=document_id,
            user_id=user_id,
        )
    )

@celery_app.task
def start_process_document_podcast(
    document_id: int,
    user_id: int,
):
    _run(
        run_document_podcast_workflow(
            document_id=document_id,
            user_id=user_id,
        )
    )


@celery_app.task
def update_document_process_status(
    document_id: int,
    status: int,
):
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
):
    _run(
        run_section_podcast_workflow(
            section_id=section_id,
            user_id=user_id,
        )
    )


@celery_app.task
def update_section_process_status(
    section_id: int,
    status: int,
):
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
    _run(
        run_notification_event_workflow(
            user_id=user_id,
            trigger_event_uuid=trigger_event_uuid,
            params=params,
        )
    )


if __name__ == "__main__":
    _run(
        run_section_process_workflow(
            section_id=1,
            user_id=1,
            auto_podcast=True
        )
    )
