
import { commands, ProviderResult, Task, Uri, WorkspaceFolder } from "vscode";
import { ITaskExplorerApi } from "./ITaskExplorerApi";
import { ITaskExplorerProvider } from "./ITaskProvider";


export abstract class IExternalProvider implements ITaskExplorerProvider
{
    abstract getTasks(): ProviderResult<Task[]>;
    abstract invalidate(uri?: Uri, logPad?: string): Promise<void>;
    abstract createTask(target: string, cmd: string | undefined, folder: WorkspaceFolder, uri: Uri, xArgs?: string[], logPad?: string): Task | undefined;
    abstract getDocumentPosition(taskName: string | undefined, documentText: string | undefined): number;
    abstract getGlobPattern(): string;

    public providerName = "external";
    public readonly isExternal = true;
    public cachedTasks: Task[] | undefined = [];

    async provideTasks()
    {
        const teApi = await commands.executeCommand<ITaskExplorerApi>("taskexplorer.getApi");
        if (teApi.providers[this.providerName])
        {
            return this.getTasks();
        }
    }

    resolveTask(task: Task): ProviderResult<Task>
    {
        return undefined;
    }

}
