from celery import Celery

from config.redis import REDIS_PORT, REDIS_URL

# Client-side task signatures for the worker tasks in celery-worker.
celery_app = Celery(
    "worker",
    broker=f"redis://{REDIS_URL}:{REDIS_PORT}/0",
    backend=f"redis://{REDIS_URL}:{REDIS_PORT}/0",
)


class TaskProxy:
    def __init__(self, name: str) -> None:
        self.name = name

    def s(self, *args, **kwargs):
        return celery_app.signature(self.name, args=args, kwargs=kwargs)

    def si(self, *args, **kwargs):
        return celery_app.signature(self.name, args=args, kwargs=kwargs, immutable=True)

    def delay(self, *args, **kwargs):
        return celery_app.send_task(self.name, args=args, kwargs=kwargs)

    def apply_async(self, args=None, kwargs=None, **options):
        return celery_app.send_task(self.name, args=args or [], kwargs=kwargs or {}, **options)
    
    def __call__(self, *args, **kwargs):
        # 让它像函数一样被 APScheduler 调用
        return self.delay(*args, **kwargs)


def _task(name: str) -> TaskProxy:
    return TaskProxy(name)


start_process_document = _task("common.celery.app.start_process_document")
start_process_section = _task("common.celery.app.start_process_section")
start_process_document_embedding = _task("common.celery.app.start_process_document_embedding")
start_process_document_graph = _task("common.celery.app.start_process_document_graph")
start_process_document_summarize = _task("common.celery.app.start_process_document_summarize")
start_process_document_podcast = _task("common.celery.app.start_process_document_podcast")
update_document_process_status = _task("common.celery.app.update_document_process_status")
start_process_section_podcast = _task("common.celery.app.start_process_section_podcast")
update_section_process_status = _task("common.celery.app.update_section_process_status")
start_trigger_user_notification_event = _task("common.celery.app.start_trigger_user_notification_event")


__all__ = [
    "celery_app",
    "start_process_document",
    "start_process_section",
    "start_process_document_embedding",
    "start_process_document_graph",
    "start_process_document_summarize",
    "start_process_document_podcast",
    "update_document_process_status",
    "start_process_section_podcast",
    "update_section_process_status",
    "start_trigger_user_notification_event",
]
