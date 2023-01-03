
import { TreeItem, TreeView } from "vscode";
import { IConfigurationApi } from "./configurationApi";
import { IExplorerApi } from "./explorer";
import { ExternalExplorerProvider } from "./externalProvider";
import { TaskExplorerTestsApi } from "./testsApi";
// import { TaskExplorerProvider } from "../providers/provider";
// import { TaskTreeDataProvider } from "../tree/tree";

export interface ITaskExplorerApi
{
    config: IConfigurationApi;
    log: any;
    utilities: any;
    explorer: IExplorerApi | undefined;
    explorerView: TreeView<TreeItem> | undefined;
    sidebar: IExplorerApi | undefined;
    sidebarView: TreeView<TreeItem> | undefined;
    providers: Map<string, any>;
    // explorer: TaskTreeDataProvider | undefined;
    // sidebar: TaskTreeDataProvider | undefined;
    // providers: Map<string, TaskExplorerProvider>;
    providersExternal: Map<string, ExternalExplorerProvider>;
    testsApi: TaskExplorerTestsApi;

    isBusy(): boolean;
    isTests(): boolean;
    refresh(taskSource: string): Promise<void>;
    register(taskSource: string, provider: ExternalExplorerProvider): Promise<void>;
    setTests(): void;
    unregister(taskSource: string): Promise<void>;
    waitForIdle(minWait?: number, maxWait?: number, logPad?: string): Promise<void>;
}