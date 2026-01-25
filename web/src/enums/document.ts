export enum DocumentCategory {
    FILE = 0,
    WEBSITE = 1,
    QUICK_NOTE = 2,
    AUDIO = 3
}

export enum DocumentMdConvertStatus {
    WAIT_TO = 0,
    CONVERTING = 1,
    SUCCESS = 2,
    FAILED = 3,
}

export enum DocumentEmbeddingStatus {
    WAIT_TO = 0,
    Embedding = 1,
    SUCCESS = 2,
    FAILED = 3,
}

export enum DocumentTranscribeStatus {
    WAIT_TO = 0,
    TRANSCRIBING = 1,
    SUCCESS = 2,
    FAILED = 3,
}

export enum DocumentPodcastStatus {
    WAIT_TO = 0,
    GENERATING = 1,
    SUCCESS = 2,
    FAILED = 3,
}

export enum DocumentProcessStatus {
    WAIT_TO = 0,
    PROCESSING = 1,
    SUCCESS = 2,
    FAILED = 3,
}

export enum DocumentGraphStatus {
    WAIT_TO = 0,
    BUILDING = 1,
    SUCCESS = 2,
    FAILED = 3
}

export enum DocumentSummarizeStatus {
    WAIT_TO = 0,
    SUMMARIZING = 1,
    SUCCESS = 2,
    FAILED = 3
}

export enum SectionDocumentIntegration {
    WAIT_TO = 0,
    SUPPLEMENTING = 1,
    SUCCESS = 2,
    FAILED = 3
}