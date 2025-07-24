import { utils } from "@kinda/utils";
import { getAliyunOSSSts, getUserFileSystemDetail } from "./file-system";
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
        const [res_sts, err_sts] = await utils.to(
            getAliyunOSSSts()
        );
        if (err_sts || !res_sts) {
            throw err_sts || new Error("get aliyun oss sts failed");
        }
        this.sts_config = res_sts;
        const [res_oss_file_system_config, err_oss_file_system_config] = await utils.to(
            getUserFileSystemDetail({
                user_file_system_id: res_user.default_user_file_system
            })
        )
        if (err_oss_file_system_config || !res_oss_file_system_config) {
            throw err_oss_file_system_config || new Error("get oss file system config failed");
        }
        if (!res_oss_file_system_config.config_json) {
            throw new Error("You have not set the config json for the oss file system");
        }
        const config_json = JSON.parse(res_oss_file_system_config.config_json);
        this.file_system_config_json = config_json;
    }

    private async initOSSClient() {
        await this.initFileSystemConfig();
        const client = new OSS({
            region: `oss-${this.file_system_config_json.region_id}`,
            accessKeyId: this.sts_config.access_key_id,
            accessKeySecret: this.sts_config.access_key_secret,
            stsToken: this.sts_config.security_token,
            refreshSTSToken: async () => {
                const resp = await getAliyunOSSSts();
                return {
                    accessKeyId: resp.access_key_id,
                    accessKeySecret: resp.access_key_secret,
                    stsToken: resp.security_token
                };
            },
            refreshSTSTokenInterval: 300000,
            bucket: this.file_system_config_json.bucket
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
            await this.initOSSClient();
        }
        if (!this.client) throw new Error("OSS client not initialized");
        const finalContentType = content_type || file.type || 'application/octet-stream';
        const [_, err] = await utils.to(
            this.client.put(file_path, file, {
                headers: {
                    'Content-Type': finalContentType
                }
            })
        );
        if (err) {
            throw new Error(`Upload failed: ${err.message}`);
        }
    }
}