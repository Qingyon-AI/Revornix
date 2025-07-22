import { utils } from "@kinda/utils";
import { getBuiltInSts } from "./file-system";
import { getMyInfo } from "./user";
import { S3Client } from "@aws-sdk/client-s3";
import { PutObjectCommand } from "@aws-sdk/client-s3";

export class BuiltInFileService implements FileServiceProtocol {

    private client: S3Client | null = null;
    private sts_config: any = null;
    private bucket: string | null = null;

    private async initFileSystemConfig() {
        const [res_user, err_user] = await utils.to(getMyInfo());
        if (err_user || !res_user) {
            throw err_user || new Error("Not support");
        }
        if (res_user.default_file_system !== 1) {
            throw new Error("Not support");
        }
        this.bucket = res_user.uuid
        const [res_sts, err_sts] = await utils.to(
            getBuiltInSts()
        );
        if (err_sts || !res_sts) {
            throw err_sts || new Error("Not support");
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
            forcePathStyle: true, // MinIO 需要这个
            requestChecksumCalculation: "WHEN_REQUIRED"
        });
        this.client = client;
    }

    async getFileContent(file_path: string): Promise<string> {
        if (!this.client) {
            await this.initS3Client();
        }
        const url = `${process.env.NEXT_PUBLIC_FILE_API_PREFIX}/${file_path}`
        return await fetch(url).then(res => res.text())
    }

    async uploadFile(file_path: string, file: File): Promise<any> {
        if (!this.client) {
            await this.initS3Client();
        }
        if (!this.client) throw new Error("OSS client not initialized");
        if (!this.bucket) throw new Error("Bucket not initialized");
        const cmd = new PutObjectCommand({
            Bucket: this.bucket,
            Key: file_path,
            Body: file,
            ContentType: file.type,
        });
        const [_, err] = await utils.to(this.client.send(cmd));
        if (err) {
            throw new Error(`上传失败：${err.message}`);
        }
    }
}