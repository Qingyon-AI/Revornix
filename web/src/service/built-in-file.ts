import { utils } from "@kinda/utils";
import { getBuiltInSts } from "./file-system";
import { getMyInfo } from "./user";
import { S3Client } from "@aws-sdk/client-s3";
import { PutObjectCommand } from "@aws-sdk/client-s3";

export class BuiltInFileService implements FileServiceProtocol {

    private client: S3Client | null = null;
    private sts_config: any = null;
    private file_system_config_json: any = null;

    private async initFileSystemConfig() {
        const [res_user, err_user] = await utils.to(getMyInfo());
        if (err_user || !res_user) {
            throw err_user || new Error("init file system config failed");
        }
        if (res_user.default_file_system !== 1) {
            throw new Error("You can't use the oss file system with the default file system equals to 2");
        }
        this.file_system_config_json = { "bucket": res_user.uuid }
        const [res_sts, err_sts] = await utils.to(
            getBuiltInSts()
        );
        if (err_sts || !res_sts) {
            throw err_sts || new Error("get aliyun oss sts failed");
        }
        this.sts_config = res_sts;
    }

    private async initS3Client() {
        await this.initFileSystemConfig();
        const client = new S3Client({
            region: this.sts_config.region || "main",
            endpoint: this.sts_config.endpoint_url,
            credentials: {
                accessKeyId: this.sts_config.access_key_id,
                secretAccessKey: this.sts_config.access_key_secret,
                sessionToken: this.sts_config.security_token,
            },
            forcePathStyle: true, // MinIO 需要这个 因为minio的文件索引是路径方式而不是virtual方式
            requestChecksumCalculation: "WHEN_REQUIRED"
        });
        this.client = client;
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
        if (!this.client) {
            await this.initS3Client();
        }
        if (!this.client) throw new Error("OSS client not initialized");
        if (!this.file_system_config_json.bucket) throw new Error("Bucket not initialized");
        const finalContentType = content_type || file.type || 'application/octet-stream';
        const cmd = new PutObjectCommand({
            Bucket: this.file_system_config_json.bucket,
            Key: file_path,
            Body: file,
            ContentType: finalContentType,
        });
        const [_, err] = await utils.to(this.client.send(cmd));
        if (err) {
            throw new Error(`Upload failed ${err.message}`);
        }
    }
}