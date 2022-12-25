
import { ProviderResult, Task, TaskProvider, Uri, WorkspaceFolder } from "vscode";


export abstract class ExternalExplorerProvider implements TaskProvider
{

    abstract createTask(target: string, cmd: string | undefined, folder: WorkspaceFolder, uri: Uri, xArgs?: string[], logPad?: string): Task | undefined;
    abstract getDocumentPosition(taskName: string | undefined, documentText: string | undefined): number;
    abstract getGlobPattern(): string;

    public providerName = "external";

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
