
export interface IFilesystemApi
{
    createDir(dir: string): Promise<void>;
    deleteDir(dir: string): Promise<void>;
    deleteFile(file: string): Promise<void>;
    isDirectory(dirPath: string): boolean;
    numFilesInDirectory(dirPath: string): Promise<number>;
    pathExists(file: string): Promise<boolean>;
    readFileAsync(file: string): Promise<string>;
    readJsonAsync<T>(file: string): Promise<T>;
    writeFile(file: string, data: string): Promise<void>;
}
