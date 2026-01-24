from enum import IntEnum


class UserDocumentAuthority(IntEnum):
    OWNER = 0

class DocumentCategory(IntEnum):
    FILE = 0
    WEBSITE = 1
    QUICK_NOTE = 2
    AUDIO = 3

class DocumentMdConvertStatus(IntEnum):
    WAIT_TO = 0
    CONVERTING = 1
    SUCCESS = 2
    FAILED = 3

class DocumentEmbeddingStatus(IntEnum):
    WAIT_TO = 0
    EMBEDDING = 1
    SUCCESS = 2
    FAILED = 3

class DocumentGraphStatus(IntEnum):
    WAIT_TO = 0
    BUILDING = 1
    SUCCESS = 2
    FAILED = 3

class DocumentPodcastStatus(IntEnum):
    WAIT_TO = 0
    GENERATING = 1
    SUCCESS = 2
    FAILED = 3

class DocumentTranscribeStatus(IntEnum):
    WAIT_TO = 0
    TRANSCRIBING = 1
    SUCCESS = 2
    FAILED = 3

class DocumentSummarizeStatus(IntEnum):
    WAIT_TO = 0
    SUMMARIZING = 1
    SUCCESS = 2
    FAILED = 3

class DocumentProcessStatus(IntEnum):
    WAIT_TO = 0
    PROCESSING = 1
    SUCCESS = 2
    FAILED = 3
