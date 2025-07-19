import { utils } from "@kinda/utils";
import { getAliyunOSSSts, getFileSystemDetail } from "./file_system";
import { getMyInfo } from "./user";
import OSS from 'ali-oss';

export class OSSFileService implements FileServiceProtocol {

    private client: OSS | null = null;
    private file_system_config_json: any = null;
    private sts_config: any = null;

    private async initFileSystemConfig() {
        const [res_user, err_user] = await utils.to(getMyInfo());
        if (err_user || !res_user) {
            throw err_user || new Error("Not support");
        }
        if (res_user.default_file_system !== 2) {
            throw new Error("Not support");
        }
        const [res_sts, err_sts] = await utils.to(
            getAliyunOSSSts()
        );
        if (err_sts || !res_sts) {
            throw err_sts || new Error("Not support");
        }
        this.sts_config = res_sts;
        const [res_oss_file_system_config, err_oss_file_system_config] = await utils.to(
            getFileSystemDetail({
                file_system_id: res_user.default_file_system
            })
        )
        if (err_oss_file_system_config || !res_oss_file_system_config) {
            throw err_oss_file_system_config || new Error("Not support");
        }
        if (!res_oss_file_system_config.config_json) {
            throw new Error("Not support");
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

    async getFileContent(file_path: string): Promise<string> {
        const url = `${process.env.NEXT_PUBLIC_FILE_API_PREFIX}/uploads/${file_path}`
        return await fetch(url).then(res => res.text())
    }

    async uploadFile(file_path: string, file: File): Promise<any> {
        if (!this.client) {
            await this.initOSSClient();
        }
        if (!this.client) throw new Error("OSS client not initialized");
        this.client.put(file_path, file);
    }
}