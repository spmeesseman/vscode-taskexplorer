
import ITaskTree from "./ITaskTree";
import { ILog } from "./ILog";
import { ITestsApi } from "./ITestsApi";
import { TreeItem, TreeView } from "vscode";
import { IExternalProvider } from "./IExternalProvider";
import { ITaskExplorerProvider } from "./ITaskProvider";
import { IDictionary } from "./IDictionary";

export interface ITaskExplorerApi
{
    log: ILog;
    explorer: ITaskTree | undefined;
    explorerView: TreeView<TreeItem> | undefined;
    sidebar: ITaskTree | undefined;
    sidebarView: TreeView<TreeItem> | undefined;
    providers: IDictionary<ITaskExplorerProvider>;
    testsApi: ITestsApi;

    isBusy(): boolean;
    isLicensed(): boolean;
    isTests(): boolean;
    refreshExternalProvider(taskSource: string, logPad: string): Promise<void>;
    register(taskSource: string, provider: IExternalProvider, logPad: string): Promise<void>;
    setTests(isTests: boolean): void;
    unregister(taskSource: string, logPad: string): Promise<void>;
}