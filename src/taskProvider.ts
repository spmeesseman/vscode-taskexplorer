
import { Uri, Task, WorkspaceFolder, workspace, TaskProvider } from "vscode";
import { TaskExplorerDefinition } from "./taskDefinition";
import { configuration } from "./common/configuration";
import * as util from "./util";
import * as log from "./common/log";

export abstract class TaskExplorerProvider implements TaskProvider
{
    abstract getDefaultDefinition(target: string, folder: WorkspaceFolder, uri: Uri): TaskExplorerDefinition;
    abstract createTask(target: string, cmd: string, folder: WorkspaceFolder, uri: Uri, xArgs?: string[]): Task;
    abstract readTasks(logPad?: string): Promise<Task[]>;
    abstract readUriTasks(uri: Uri, wsFolder?: WorkspaceFolder, logPad?: string): Promise<Task[]>;


    public cachedTasks: Task[];
    public invalidating = false;
    public providerName = "***";

    private queue: Uri[];


    constructor(name: string) {
        this.providerName = name;
        this.queue = [];
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

        if (this.invalidating) {
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
                if (cstDef.uri.fsPath === uri.fsPath || !util.pathExists(cstDef.uri.fsPath))
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

                if (util.pathExists(uri.fsPath) && util.existsInArray(configuration.get("exclude"), uri.path) === false)
                {
                    const tasks = await this.readUriTasks(uri, folder, logPad + "   ");
                    this.cachedTasks?.push(...tasks);
                }

                if (this.cachedTasks?.length > 0)
                {
                    await this.processQueue();
                    return;
                }
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
