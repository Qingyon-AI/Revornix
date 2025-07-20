import { BuiltInFileService } from "@/service/built-in-file";
import { OSSFileService } from "@/service/oss-file";

export class FileService {

    private file_system_id: number;
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
            default:
                break;
        }
    }

    async getFileContent(file_path: string) {
        if (!this.client) {
            throw new Error("No file service found");
        }
        return await this.client.getFileContent(file_path);
    }

    async uploadFile(file_path: string, file: File) {
        if (!this.client) {
            throw new Error("No file service found");
        }
        return await this.client.uploadFile(file_path, file);
    }

}