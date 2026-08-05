from protocol.notification_trigger import NotificationTriggerEventProtocol


class DocumentProcessCompletedNotificationTriggerEvent(NotificationTriggerEventProtocol):

    def __init__(
        self
    ):
        super().__init__(
            uuid='3e6b9a1c5d2847f0a8c4b7e9f2d3a4b5',
            name = "DocumentProcessCompleted",
            name_zh = "文档处理完成",
            description = "When the document processing pipeline (convert, summarize, embedding, tagging, graph) finishes",
            description_zh = "当文档的处理流水线(转换、摘要、向量化、打标签、构图)完成的时候"
        )
