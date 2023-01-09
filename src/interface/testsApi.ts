
import { IExplorerApi } from "./explorer";
import { IFilesystemApi } from "./fsApi";
import { WorkspaceFoldersChangeEvent } from "vscode";

export interface TaskExplorerTestsApi
{
    explorer: IExplorerApi;
    fileCache: any; // for tests use only
    fs: IFilesystemApi;

    onWsFoldersChange: (e: WorkspaceFoldersChangeEvent) => Promise<void>;
}
