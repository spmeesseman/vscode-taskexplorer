
import { ProviderResult, Task, Uri, WorkspaceFolder } from "vscode";
import { executeCommand } from "../lib/command";
import { Commands } from "../lib/constants";
import { TeContainer } from "../lib/container";
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

    async provideTasks()
    {
        // const teApi = await executeCommand<ITaskExplorerApi>(Commands.GetApi);
        if (TeContainer.instance.providers[this.providerName])
        {
            return this.getTasks();
        }
    }

    resolveTask(task: Task): ProviderResult<Task>
    {
        return undefined;
    }

}
