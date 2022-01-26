
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
    providers: Map<string, TaskExplorerProvider>;
    providersExternal: Map<string, TaskProvider>;
    registerProvider(providerName: string, provider: TaskProvider): Promise<void>;
    unregisterProvider(providerName: string): Promise<void>;
}
