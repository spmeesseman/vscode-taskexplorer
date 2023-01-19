
import { commands, ProviderResult, Task, TaskProvider, Uri, WorkspaceFolder } from "vscode";
import { ITaskExplorerApi } from "./ITaskExplorerApi";


export abstract class IExternalProvider implements TaskProvider
{
    abstract getTasks(): ProviderResult<Task[]>;
    abstract invalidate(uri?: Uri, logPad?: string): Promise<void>;
    abstract createTask(target: string, cmd: string | undefined, folder: WorkspaceFolder, uri: Uri, xArgs?: string[], logPad?: string): Task | undefined;
    abstract getDocumentPosition(taskName: string | undefined, documentText: string | undefined): number;
    abstract getGlobPattern(): string;

    public providerName = "external";

    async provideTasks()
    {
        const teApi = await commands.executeCommand("taskExplorer.getApi") as ITaskExplorerApi;
        if (teApi.providersExternal[this.providerName])
        {
            return this.getTasks();
        }
    }

    resolveTask(task: Task): ProviderResult<Task>
    {
        return undefined;
    }

}
