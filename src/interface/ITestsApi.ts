
import { ITaskTree } from "./ITaskTree";
import { IStorage } from "./IStorage";
import { IFileCache } from "./IFileCache";
import { IFilesystemApi } from "./IFilesystemApi";
import { IConfiguration } from "./IConfiguration";
import { ILicenseManager } from "./ILicenseManager";
import { ITaskTreeManager } from "./ITaskTreeManager";
import { ExtensionContext, WorkspaceFolder, WorkspaceFoldersChangeEvent } from "vscode";

export interface ITestsApi
{
    isBusy: boolean;
    config: IConfiguration;
    utilities: any;
    explorer: ITaskTree;
    licenseManager: ILicenseManager;
    treeManager: ITaskTreeManager;
    fileCache: IFileCache; // for tests use only
    fs: IFilesystemApi;
    storage: IStorage;
    wsFolder: WorkspaceFolder;
    extensionContext: ExtensionContext;
    enableConfigWatcher(enable: boolean): void;
    onWsFoldersChange(e: WorkspaceFoldersChangeEvent): Promise<void>;
}
