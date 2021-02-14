
import { Uri, Task, WorkspaceFolder } from "vscode";
import { TaskExplorerDefinition } from "./taskDefinition";

export abstract class TaskExplorerProvider
{
    abstract provideTasks(): Promise<Task[]>;
    abstract resolveTask(_task: Task): Task | undefined;
    abstract invalidateTasksCache(opt?: Uri): Promise<void>;
    abstract getDefaultDefinition(target: string, folder: WorkspaceFolder, uri: Uri): TaskExplorerDefinition;
    abstract createTask(target: string, cmd: string, folder: WorkspaceFolder, uri: Uri, xArgs?: string[]): Task;
}
