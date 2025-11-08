export enum UserSectionAuthority {
    FULL_ACCESS = 0,
    READ_AND_WRITE = 1,
    READ_ONLY = 2,
}

export enum UserSectionRole {
    CERATOR = 0,
    MEMBER = 1,
    SUBSCRIBER = 2
}

export enum SectionPodcastStatus {
    WAIT_TO = 0,
    GENERATING = 1,
    SUCCESS = 2,
    FAILED = 3,
}

export enum SectionProcessStatus {
    WAIT_TO = 0,
    PROCESSING = 1,
    SUCCESS = 2,
    FAILED = 3,
}