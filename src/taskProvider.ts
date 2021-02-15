
import { Uri, Task, WorkspaceFolder, workspace } from "vscode";
import { TaskExplorerDefinition } from "./taskDefinition";
import { configuration } from "./common/configuration";
import * as path from "path";
import * as util from "./util";

export abstract class TaskExplorerProvider implements TaskExplorerProvider
{
    abstract getDefaultDefinition(target: string, folder: WorkspaceFolder, uri: Uri): TaskExplorerDefinition;
    abstract createTask(target: string, cmd: string, folder: WorkspaceFolder, uri: Uri, xArgs?: string[]): Task;
    abstract readTasks(): Promise<Task[]>;
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
        util.logBlank();
        util.log(`provide ${this.providerName} tasks`);

        if (!this.cachedTasks) {
            this.cachedTasks = await this.readTasks();
        }
        return this.cachedTasks;
    }


    public resolveTask(_task: Task): Task | undefined
    {
        return undefined;
    }


    public async invalidateTasksCache(uri?: Uri): Promise<void>
    {
        util.log("");
        util.log(`invalidate ${this.providerName} tasks cache`);
        util.logValue("   uri", uri?.path, 2);
        util.logValue("   has cached tasks", !!this.cachedTasks, 2);

        if (this.invalidating) {
            this.queue.push(uri);
            return;
        }
        this.invalidating = true;

        if (uri && this.cachedTasks)
        {
            const rmvTasks: Task[] = [];
            const folder = workspace.getWorkspaceFolder(uri);

            this.cachedTasks.forEach((each: Task) => {
                const cstDef: TaskExplorerDefinition = each.definition;
                if (cstDef.uri.fsPath === uri.fsPath || !util.pathExists(cstDef.uri.fsPath))
                {
                    rmvTasks.push(each);
                }
            });

            //
            // TODO - Bug
            // Technically this function can be called back into when waiting for a promise
            // to return on the asncForEach() above, and cachedTask array can be set to undefined,
            // this is happening with a broken await() somewere that I cannot find
            //
            if (this.cachedTasks)
            {
                rmvTasks.forEach(each => {
                    util.log("   removing old task " + each.name);
                    util.removeFromArray(this.cachedTasks, each);
                });

                if (util.pathExists(uri.fsPath) && util.existsInArray(configuration.get("exclude"), uri.path) === false)
                {
                    const tasks = await this.readUriTasks(uri, folder, "   ");
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
