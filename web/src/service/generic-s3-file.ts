import fileSystemApi from '@/api/file_system';
import { utils } from "@kinda/utils";
import { getMyInfo } from "./user";
import { request } from '@/lib/request';

export class GenericFileService implements FileServiceProtocol {

    public async initFileSystemConfig() {
        const [res_user, err_user] = await utils.to(getMyInfo());
        if (err_user || !res_user) {
            throw err_user || new Error("init file system config failed");
        }
        if (!res_user.default_user_file_system) {
            throw new Error("You have not set the default file system");
        }
    }

    async getFileContent(file_path: string): Promise<string | Blob | ArrayBuffer> {
        const url = `${file_path}`;
        const res = await fetch(url);
        if (!res.ok) {
            const errorText = await res.text().catch(() => "Unknown error");
            throw new Error(`Request failed with status ${res.status}: ${errorText}`);
        }
        const contentType = res.headers.get("Content-Type") || "";
        if (contentType.includes("application/json")) {
            return await res.json();
        }
        if (contentType.includes("text/")) {
            return await res.text();
        }
        if (contentType.includes("application/octet-stream") || contentType.includes("image/") || contentType.includes("audio/") || contentType.includes("video/")) {
            return await res.blob(); // 可用作下载、预览等
        }
        // 默认用 ArrayBuffer 处理
        return await res.arrayBuffer();
    }

    async uploadFile(file_path: string, file: File, content_type?: string): Promise<any> {
        const finalContentType = content_type || file.type || 'application/octet-stream';
        const formData = new FormData();

        formData.append('file_path', file_path);
        formData.append('content_type', finalContentType);

        // 最后 append 文件
        formData.append('file', file);

        await request(fileSystemApi.uploadFileToGenericFileSystem, {
            method: 'POST',
            formData: formData
        });

    }
}