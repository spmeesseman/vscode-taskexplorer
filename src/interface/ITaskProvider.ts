
import { ProviderResult, Task, TaskProvider, Uri, WorkspaceFolder } from "vscode";


export abstract class ITaskExplorerProvider implements TaskProvider
{

    abstract createTask(target: string, cmd: string | undefined, folder: WorkspaceFolder, uri: Uri, xArgs?: string[], logPad?: string): Task | undefined;
    abstract getDocumentPosition(taskName?: string, documentText?: string): number;
    abstract getGlobPattern(): string;

    public providerName = "external";
    public cachedTasks: Task[] | undefined;
    public readonly isExternal: boolean = false;

    provideTasks(): ProviderResult<Task[]>
    {
        return undefined;
    }

    resolveTask(task: Task): ProviderResult<Task>
    {
        return undefined;
    }

    async invalidate(uri?: Uri, logPad?: string): Promise<void>
    {
        return;
    }

}
