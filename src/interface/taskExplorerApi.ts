
import { ILog } from "./ILog";
import { ITestsApi } from "./ITestsApi";
import { IExplorerApi } from "./explorer";
import { TreeItem, TreeView } from "vscode";
import { IConfiguration } from "./IConfiguration";
import { IExternalProvider } from "./IExternalProvider";
import { ITaskExplorerProvider } from "./ITaskProvider";
// import { TaskExplorerProvider } from "../providers/provider";
// import { TaskTreeDataProvider } from "../tree/tree";

export interface ITaskExplorerApi
{
    config: IConfiguration;
    log: ILog;
    utilities: any;
    explorer: IExplorerApi | undefined;
    explorerView: TreeView<TreeItem> | undefined;
    sidebar: IExplorerApi | undefined;
    sidebarView: TreeView<TreeItem> | undefined;
    providers: Map<string, ITaskExplorerProvider>;
    providersExternal: Map<string, IExternalProvider>;
    testsApi: ITestsApi;

    isBusy(): boolean;
    isTests(): boolean;
    refreshExternalProvider(taskSource: string, logPad: string): Promise<void>;
    register(taskSource: string, provider: IExternalProvider, logPad: string): Promise<void>;
    setTests(isTests: boolean): void;
    unregister(taskSource: string, logPad: string): Promise<void>;
    waitForIdle(minWait?: number, maxWait?: number, logPad?: string): Promise<void>;
}