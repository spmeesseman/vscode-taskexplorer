
import { ExplorerApi } from "./explorer";
import { ExternalExplorerProvider } from "./externalProvider";
import { TaskExplorerTestsApi } from "./testsApi";
// import { TaskExplorerProvider } from "../providers/provider";
// import { TaskTreeDataProvider } from "../tree/tree";

export interface TaskExplorerApi
{
    log: any;
    utilities: any;
    explorer: ExplorerApi | undefined;
    sidebar: ExplorerApi | undefined;
    providers: Map<string, any>;
    // explorer: TaskTreeDataProvider | undefined;
    // sidebar: TaskTreeDataProvider | undefined;
    // providers: Map<string, TaskExplorerProvider>;
    providersExternal: Map<string, ExternalExplorerProvider>;
    testsApi: TaskExplorerTestsApi;

    isBusy(): boolean;
    refresh(taskSource: string): Promise<void>;
    register(taskSource: string, provider: ExternalExplorerProvider): Promise<void>;
    unregister(taskSource: string): Promise<void>;
    waitForIdle(minWait?: number, maxWait?: number, logPad?: string): Promise<void>;
}