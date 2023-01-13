
import { TreeItem, TreeView } from "vscode";
import { IConfigurationApi } from "./configurationApi";
import { IExplorerApi } from "./explorer";
import { IExternalProvider } from "./IExternalProvider";
import { ILog } from "./ILog";
import { ITestsApi } from "./ITestsApi";
// import { TaskExplorerProvider } from "../providers/provider";
// import { TaskTreeDataProvider } from "../tree/tree";

export interface ITaskExplorerApi
{
    config: IConfigurationApi;
    log: ILog;
    utilities: any;
    explorer: IExplorerApi | undefined;
    explorerView: TreeView<TreeItem> | undefined;
    sidebar: IExplorerApi | undefined;
    sidebarView: TreeView<TreeItem> | undefined;
    providers: Map<string, any>;
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