
import { ITaskExplorer } from "./ITaskExplorer";
import { IFilesystemApi } from "./IFilesystemApi";
import { WorkspaceFolder, WorkspaceFoldersChangeEvent } from "vscode";
import { IFileCache } from "./IFileCache";
import { IStorage } from "./IStorage";

export interface ITestsApi
{
    explorer: ITaskExplorer;
    fileCache: IFileCache; // for tests use only
    fs: IFilesystemApi;
    storage: IStorage;
    wsFolder: WorkspaceFolder;

    enableConfigWatcher(enable: boolean): void;
    onWsFoldersChange(e: WorkspaceFoldersChangeEvent): Promise<void>;
}
