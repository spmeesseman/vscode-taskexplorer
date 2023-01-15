
export interface IFilesystemApi
{
    copyDir(src: string, dst: string, filter?: RegExp, copyWithBaseFolder?: boolean): Promise<boolean>;
    copyFile(src: string, dst: string): Promise<void>;
    createDir(dir: string): Promise<void>;
    deleteDir(dir: string): Promise<void>;
    deleteFile(file: string): Promise<void>;
    isDirectory(dirPath: string): boolean;
    getDateModified(file: string): Promise<Date|undefined>;
    numFilesInDirectory(dirPath: string): Promise<number>;
    pathExists(file: string): Promise<boolean>;
    pathExistsSync (file: string): boolean;
    readFileAsync(file: string): Promise<string>;
    readFileSync(file: string): string;
    readJsonAsync<T>(file: string): Promise<T>;
    writeFile(file: string, data: string): Promise<void>;
}
