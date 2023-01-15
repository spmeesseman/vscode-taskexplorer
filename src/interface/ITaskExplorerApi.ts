
import { ILog } from "./ILog";
import { ITestsApi } from "./ITestsApi";
import { ITaskExplorer } from "./ITaskExplorer";
import { TreeItem, TreeView } from "vscode";
import { IConfiguration } from "./IConfiguration";
import { IExternalProvider } from "./IExternalProvider";
import { ITaskExplorerProvider } from "./ITaskProvider";
import { IDictionary } from "./IDictionary";

export interface ITaskExplorerApi
{
    config: IConfiguration;
    log: ILog;
    utilities: any;
    explorer: ITaskExplorer | undefined;
    explorerView: TreeView<TreeItem> | undefined;
    sidebar: ITaskExplorer | undefined;
    sidebarView: TreeView<TreeItem> | undefined;
    providers: IDictionary<ITaskExplorerProvider>;
    providersExternal: IDictionary<IExternalProvider>;
    testsApi: ITestsApi;

    isBusy(): boolean;
    isTests(): boolean;
    refreshExternalProvider(taskSource: string, logPad: string): Promise<void>;
    register(taskSource: string, provider: IExternalProvider, logPad: string): Promise<void>;
    setTests(isTests: boolean): void;
    unregister(taskSource: string, logPad: string): Promise<void>;
}