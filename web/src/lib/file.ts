import { AWSS3FileService } from "@/service/aws-s3-file";
import { BuiltInFileService } from "@/service/built-in-file";
import { GenericFileService } from "@/service/generic-s3-file";
import { OSSFileService } from "@/service/oss-file";

export class FileService {

    private file_system_id: number | null = null;
    private client: FileServiceProtocol | null = null;

    constructor(file_system_id: number) {
        this.file_system_id = file_system_id;
        switch (this.file_system_id) {
            case 1:
                this.client = new BuiltInFileService();
                break;
            case 2:
                this.client = new OSSFileService()
                break;
            case 3:
                this.client = new AWSS3FileService()
                break;
            case 4:
                this.client = new GenericFileService()
                break;
            default:
                break;
        }
    }

    async getFileContent(file_path: string): Promise<string | Blob | ArrayBuffer> {
        if (!this.client) {
            throw new Error("No file service found");
        }
        await this.client.initFileSystemConfig()
        return await this.client.getFileContent(file_path);
    }

    async uploadFile(file_path: string, file: File): Promise<any> {
        if (!this.client) {
            throw new Error("No file service found");
        }
        await this.client.initFileSystemConfig()
        return await this.client.uploadFile(file_path, file);
    }

}