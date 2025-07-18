// TODO
export class OSSFileService implements FileProtocol {
    async uploadFile(file_path: string, file: File): Promise<any> {
        throw new Error("Method not implemented.");
    }
    async getFileContent(file_path: string): Promise<string> {
        throw new Error("Method not implemented.");
    }
}