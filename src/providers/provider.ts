
import { Uri, Task, WorkspaceFolder, workspace, TaskProvider } from "vscode";
import { TaskExplorerDefinition } from "../taskDefinition";
import { configuration } from "../common/configuration";
import * as util from "../common/utils";
import * as log from "../common/log";
import TaskItem from "../tree/item";
import { removeFileFromCache } from "../cache";


export abstract class TaskExplorerProvider implements TaskProvider
{
    abstract getDefaultDefinition(target: string, folder: WorkspaceFolder, uri: Uri): TaskExplorerDefinition;
    abstract createTask(target: string, cmd: string | undefined, folder: WorkspaceFolder, uri: Uri, xArgs?: string[], logPad?: string): Task | undefined;
    abstract getDocumentPosition(taskName: string | undefined, documentText: string | undefined): number;
    abstract readTasks(logPad?: string): Promise<Task[]>;
    abstract readUriTasks(uri: Uri, wsFolder?: WorkspaceFolder, logPad?: string): Promise<Task[]>;


    public cachedTasks: Task[] | undefined;
    public invalidating = false;
    public providerName = "***";

    private queue: Uri[];


    constructor(name: string) {
        this.providerName = name;
        this.queue = [];
    }


    getDocumentPositionLine(lineName: string, scriptName: string | undefined, documentText: string | undefined, advance = 0, start = 0, skipQuotes = false): number
    {
        if (!scriptName || !documentText) {
            return 0;
        }
        //
        // TODO - This is crap, use regex to detect spaces between quotes
        //
        let idx = documentText.indexOf(lineName + (!skipQuotes ? "\"" : "") + scriptName + (!skipQuotes ? "\"" : ""), start);
        if (idx === -1)
        {
            idx = documentText.indexOf(lineName + (!skipQuotes ? "'" : "") + scriptName + (!skipQuotes ? "'" : ""), start);
        }
        if (advance !== 0 && idx !== -1)
        {
            idx += advance;
        }
        return idx;
    }


    public async provideTasks()
    {
        log.methodStart(`provide ${this.providerName} tasks`, 1, "", true);

        if (!this.cachedTasks) {
            this.cachedTasks = await this.readTasks("   ");
        }
        return this.cachedTasks;
    }


    public resolveTask(_task: Task): Task | undefined
    {
        return undefined;
    }


    public async invalidateTasksCache(uri?: Uri, logPad = ""): Promise<void>
    {
        log.methodStart(`invalidate ${this.providerName} tasks cache`, 1, logPad, true,
            [["uri", uri?.path], ["has cached tasks", !!this.cachedTasks]]
        );

        if (uri && this.invalidating) {
            this.queue.push(uri);
            return;
        }
        this.invalidating = true;

        if (uri && this.cachedTasks)
        {
            const rmvTasks: Task[] = [];
            const folder = workspace.getWorkspaceFolder(uri);

            for (const each of this.cachedTasks)
            {
                const cstDef: TaskExplorerDefinition = each.definition;
                if (cstDef.uri && (cstDef.uri.fsPath === uri.fsPath || !util.pathExists(cstDef.uri.fsPath)))
                {
                    rmvTasks.push(each);
                }
            }

            //
            // TODO - Bug
            // Technically this function can be called back into when waiting for a promise
            // to return on the asncForEach() above, and cachedTask array can be set to undefined,
            // this is happening with a broken await() somewere that I cannot find
            //
            if (this.cachedTasks)
            {
                for (const each of rmvTasks) {
                    log.write("   removing old task " + each.name, 2, logPad);
                    util.removeFromArray(this.cachedTasks, each);
                }

                if (util.pathExists(uri.fsPath) && util.existsInArray(configuration.get("exclude") || [], uri.path) === false)
                {
                    const tasks = await this.readUriTasks(uri, folder, logPad + "   ");
                    this.cachedTasks?.push(...tasks);
                }

                if (!util.pathExists(uri.fsPath)) {
                    await removeFileFromCache(this.providerName, uri, "   ");
                }

                if (this.cachedTasks?.length > 0)
                {
                    await this.processQueue();
                    return;
                }
            }
            else if (!util.pathExists(uri.fsPath)) {
                await removeFileFromCache(this.providerName, uri, "   ");
            }
        }

        this.cachedTasks = undefined;
        log.methodDone(`invalidate ${this.providerName} tasks cache`, 1, logPad);
        await this.processQueue();
    }


    private async processQueue()
    {
        this.invalidating = false;
        if (this.queue.length > 0) {
            await this.invalidateTasksCache(this.queue.shift());
        }
    }

}
