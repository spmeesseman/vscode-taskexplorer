
import { ITaskExplorer } from "./ITaskExplorer";
import { IFilesystemApi } from "./IFilesystemApi";
import { WorkspaceFoldersChangeEvent } from "vscode";
import { IFileCache } from "./IFileCache";
import { IStorage } from "./IStorage";

export interface ITestsApi
{
    explorer: ITaskExplorer;
    fileCache: IFileCache; // for tests use only
    fs: IFilesystemApi;
    storage: IStorage;

    onWsFoldersChange: (e: WorkspaceFoldersChangeEvent) => Promise<void>;
}
