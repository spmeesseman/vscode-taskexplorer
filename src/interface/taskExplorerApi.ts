
import { TaskProvider } from "vscode";
import { TaskExplorerProvider } from "../providers/provider";
import { TaskTreeDataProvider } from "../tree/tree";


export interface TaskExplorerApi
{
    log: any;
    utilities: any;
    fileCache: any;
    explorerProvider: TaskTreeDataProvider | undefined;
    sidebarProvider: TaskTreeDataProvider | undefined;
    taskProviders: Map<string, TaskExplorerProvider>;
    registerProvider(providerName: string, provider: TaskProvider): void;
    unregisterProvider(providerName: string): void;
}
