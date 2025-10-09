export enum DocumentCategory {
    FILE = 0,
    WEBSITE = 1,
    QUICK_NOTE = 2,
}

export enum DocumentMdConvertStatus {
    WAIT_TO = 0,
    CONVERTING = 1,
    SUCCESS = 2,
    FAILED = 3,
}

export enum DocumentEmbeddingConvertStatus {
    WAIT_TO = 0,
    Embedding = 1,
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