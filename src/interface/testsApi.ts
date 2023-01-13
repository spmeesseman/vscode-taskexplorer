
import { IExplorerApi } from "./explorer";
import { IFilesystemApi } from "./fsApi";
import { WorkspaceFoldersChangeEvent } from "vscode";
import { IFileCache } from "./IFileCache";
import { IStorage } from "./IStorage";

export interface TaskExplorerTestsApi
{
    explorer: IExplorerApi;
    fileCache: IFileCache; // for tests use only
    fs: IFilesystemApi;
    storage: IStorage;

    onWsFoldersChange: (e: WorkspaceFoldersChangeEvent) => Promise<void>;
}
