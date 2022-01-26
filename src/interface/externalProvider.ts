
import { ProviderResult, Task, TaskProvider, Uri, WorkspaceFolder } from "vscode";


export abstract class ExternalExplorerProvider implements TaskProvider
{

    abstract createTask(target: string, cmd: string | undefined, folder: WorkspaceFolder, uri: Uri, xArgs?: string[], logPad?: string): Task | undefined;
    abstract getDocumentPosition(taskName: string | undefined, documentText: string | undefined): number;

    public providerName = "external";

    provideTasks(): ProviderResult<Task[]>
    {
        throw new Error("Method not implemented.");
    }

    resolveTask(task: Task): ProviderResult<Task>
    {
        throw new Error("Method not implemented.");
    }

}
