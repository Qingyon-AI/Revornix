interface FileProtocol {
    getFileContent(file_path: string): Promise<string>;
    uploadFile(file_path: string, file: File): Promise<any>;
}