
import { IExplorerApi } from "./explorer";
import { IFilesystemApi } from "./fsApi";
import { WorkspaceFoldersChangeEvent } from "vscode";
import { IFileCache } from "./IFileCache";

export interface TaskExplorerTestsApi
{
    explorer: IExplorerApi;
    fileCache: IFileCache; // for tests use only
    fs: IFilesystemApi;

    onWsFoldersChange: (e: WorkspaceFoldersChangeEvent) => Promise<void>;
}
