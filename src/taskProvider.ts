
import { Uri } from "vscode";

export abstract class TaskExplorerProvider
{
    abstract invalidateTasksCache(opt?: Uri): Promise<void>;
}

