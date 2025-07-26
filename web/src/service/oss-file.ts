import { utils } from "@kinda/utils";
import { getAliyunOSSPresignUploadURL, getUserFileSystemDetail } from "./file-system";
import { getMyInfo } from "./user";
import OSS from 'ali-oss';

export class OSSFileService implements FileServiceProtocol {

    private client: OSS | null = null;
    private sts_config: any = null;
    private file_system_config_json: any = null;

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
        const [res_presign_url, err_presign_url] = await utils.to(getAliyunOSSPresignUploadURL({
            file_path: file_path,
            content_type: finalContentType
        }));
        if (err_presign_url || !res_presign_url) {
            throw err_presign_url || new Error("get presign url failed");
        }
        const { upload_url, fields } = res_presign_url;

        let init: RequestInit = {
            method: 'PUT',
            body: file
        }

        if (content_type) {
            init.headers = {
                "Content-Type": content_type
            };
        }

        const response = await fetch(upload_url, init);

        if (!response.ok) {
            throw new Error('Upload failed: ' + response.statusText);
        }
    }
}