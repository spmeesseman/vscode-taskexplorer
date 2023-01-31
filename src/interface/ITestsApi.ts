
import { ITaskExplorer } from "./ITaskExplorer";
import { IFilesystemApi } from "./IFilesystemApi";
import { ExtensionContext, WorkspaceFolder, WorkspaceFoldersChangeEvent } from "vscode";
import { IFileCache } from "./IFileCache";
import { IStorage } from "./IStorage";

export interface ITestsApi
{
    isBusy: boolean;
    explorer: ITaskExplorer;
    fileCache: IFileCache; // for tests use only
    fs: IFilesystemApi;
    storage: IStorage;
    wsFolder: WorkspaceFolder;
    extensionContext: ExtensionContext;
    enableConfigWatcher(enable: boolean): void;
    onWsFoldersChange(e: WorkspaceFoldersChangeEvent): Promise<void>;
}
