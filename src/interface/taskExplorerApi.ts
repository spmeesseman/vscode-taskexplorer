
import { ExternalTaskProvider } from "../providers/external";
import { TaskExplorerProvider } from "../providers/provider";
import { TaskTreeDataProvider } from "../tree/tree";


export interface TaskExplorerApi
{
    log: any;
    utilities: any;
    fileCache: any; // for tests use only
    explorer: TaskTreeDataProvider | undefined;
    sidebar: TaskTreeDataProvider | undefined;
    providers: Map<string, TaskExplorerProvider>;
    providersExternal: Map<string, ExternalTaskProvider>;
    registerProvider(providerName: string, provider: ExternalTaskProvider): Promise<void>;
    unregisterProvider(providerName: string): Promise<void>;
}
