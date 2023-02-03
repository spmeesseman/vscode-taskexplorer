
import ITaskTree from "./ITaskTree";
import ITaskTreeManager from "./ITaskTreeManager";
import { IStorage } from "./IStorage";
import { IFileCache } from "./IFileCache";
import { IFilesystemApi } from "./IFilesystemApi";
import { IConfiguration } from "./IConfiguration";
import { ExtensionContext, WorkspaceFolder, WorkspaceFoldersChangeEvent } from "vscode";

export interface ITestsApi
{
    isBusy: boolean;
    config: IConfiguration;
    utilities: any;
    explorer: ITaskTree;
    treeManager: ITaskTreeManager;
    fileCache: IFileCache; // for tests use only
    fs: IFilesystemApi;
    storage: IStorage;
    wsFolder: WorkspaceFolder;
    extensionContext: ExtensionContext;
    enableConfigWatcher(enable: boolean): void;
    onWsFoldersChange(e: WorkspaceFoldersChangeEvent): Promise<void>;
}
