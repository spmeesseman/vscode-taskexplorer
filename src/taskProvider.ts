
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


    constructor(name: string) {
        this.providerName = name;
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


    public async invalidateTasksCache(opt?: Uri): Promise<void>
    {
        util.log("");
        util.log(`invalidate ${this.providerName} tasks cache`);
        util.logValue("   uri", opt?.path, 2);
        util.logValue("   has cached tasks", !!this.cachedTasks, 2);

        await this.wait();
        this.invalidating = true;

        if (opt && this.cachedTasks)
        {
            const rmvTasks: Task[] = [];
            const folder = workspace.getWorkspaceFolder(opt);

            await util.forEachAsync(this.cachedTasks, (each: Task) => {
                const cstDef: TaskExplorerDefinition = each.definition;
                if (cstDef.uri.fsPath === opt.fsPath || !util.pathExists(cstDef.uri.fsPath))
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
                await util.forEachAsync(rmvTasks, each => {
                    util.log("   removing old task " + each.name);
                    util.removeFromArray(this.cachedTasks, each);
                });

                if (util.pathExists(opt.fsPath) && util.existsInArray(configuration.get("exclude"), opt.path) === false)
                {
                    const tasks = await this.readUriTasks(opt, folder, "   ");
                    this.cachedTasks?.push(...tasks);
                }

                if (this.cachedTasks?.length > 0)
                {
                    this.invalidating = false;
                    return;
                }
            }
        }

        this.invalidating = false;
        this.cachedTasks = undefined;
    }


    public async wait()
    {
        while (this.invalidating === true) {
            util.log(`   waiting for ${this.providerName} invalidation to finish...`);
            await util.timeout(100);
        }
    }

}
