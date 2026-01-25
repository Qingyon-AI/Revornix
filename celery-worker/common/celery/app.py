from dotenv import load_dotenv
load_dotenv(override=True)

import asyncio

from celery import Celery

from config.redis import REDIS_PORT, REDIS_URL
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
    asyncio.run(
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
    asyncio.run(
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
    asyncio.run(
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
    asyncio.run(
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
    asyncio.run(
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
    asyncio.run(
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
    asyncio.run(
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
    asyncio.run(
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
    asyncio.run(
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
    asyncio.run(
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
    asyncio.run(
        run_notification_event_workflow(
            user_id=user_id,
            trigger_event_uuid=trigger_event_uuid,
            params=params,
        )
    )


if __name__ == "__main__":
    asyncio.run(
        run_section_process_workflow(
            section_id=1,
            user_id=1,
            auto_podcast=True
        )
    )
