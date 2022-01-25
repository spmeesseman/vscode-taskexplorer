
import { TaskProvider } from "vscode";
import { TaskExplorerProvider } from "../providers/provider";
import { TaskTreeDataProvider } from "../tree/tree";


export interface TaskExplorerApi
{
    explorerProvider: TaskTreeDataProvider | undefined;
    sidebarProvider: TaskTreeDataProvider | undefined;
    utilities: any;
    fileCache: any;
    taskProviders: Map<string, TaskExplorerProvider>;
    logging: any;
    registerProvider(providerName: string, provider: TaskProvider): void;
}
