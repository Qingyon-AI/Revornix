from enum import Enum
from typing import NamedTuple

class FileSystemMeta(NamedTuple):
    id: str
    title: str

class RemoteFileService(Enum):
    AliyunOSS = FileSystemMeta(
        id='41be24fa741f4716b8dc0ccef3980655',
        title='Aliyun OSS'
    )
    AWS_S3 = FileSystemMeta(
        id='01eef562970243af8ba12f6f4ddad3b1',
        title='AWS S3'
    )
    Built_In = FileSystemMeta(
        id='3ea378364a2d4a65be25085a47835d80',
        title='Built Inf Minio'
    )
    Generic_S3 = FileSystemMeta(
        id='3e9993b6722244969db2c27670cefdac',
        title='Generic S3'
    )
    @property
    def meta(self) -> FileSystemMeta:
        return self.value