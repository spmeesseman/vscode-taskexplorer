
import {
    Task, WorkspaceFolder, RelativePattern, ShellExecution, Uri,
    workspace, TaskProvider, TaskDefinition, ShellExecutionOptions
} from "vscode";
import * as path from "path";
import * as util from "./util";
import { configuration } from "./common/configuration";
import { filesCache } from "./cache";
import { TaskExplorerProvider } from "./taskProvider";
import { TaskExplorerDefinition } from "./taskDefinition";


export class AppPublisherTaskProvider implements TaskExplorerProvider
{
    private cachedTasks: Task[];


    constructor() {}


    public async provideTasks()
    {
        util.log("");
        util.log("provide app-publisher tasks");
        if (!this.cachedTasks) {
            this.cachedTasks = await this.detectAppPublisherfiles();
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
        util.log("invalidate app publisher tasks cache ");
        util.logValue("   uri", opt?.path, 2);
        util.logValue("   has cached tasks", !!this.cachedTasks, 2);

        if (opt && this.cachedTasks)
        {
            const rmvTasks: Task[] = [];
            const folder = workspace.getWorkspaceFolder(opt);

            await util.forEachAsync(this.cachedTasks, (each: Task) => {
                const cstDef: TaskExplorerDefinition = each.definition;
                if (cstDef.uri.fsPath === opt.fsPath || !util.pathExists(cstDef.uri.fsPath)) {
                    rmvTasks.push(each);
                }
            });

            //
            // Technically this function can be called back into when waiting for a promise
            // to return on the asncForEach() above, and cachedTask array can be set to undefined,
            // this is happening with a broken await() somewere that I cannot find
            if (this.cachedTasks)
            {
                await util.forEachAsync(rmvTasks, each => {
                    util.log("   removing old task " + each.name);
                    util.removeFromArray(this.cachedTasks, each);
                });

                if (util.pathExists(opt.fsPath) && util.existsInArray(configuration.get("exclude"), opt.path) === false)
                {
                    const tasks = this.createTasks(folder, opt);
                    this.cachedTasks.push(...tasks);
                }

                if (this.cachedTasks.length > 0) {
                    return;
                }
            }
        }

        this.cachedTasks = undefined;
    }


    private async detectAppPublisherfiles(): Promise<Task[]>
    {
        util.log("");
        util.log("detectAppPublisherfiles");

        const allTasks: Task[] = [];
        const visitedFiles: Set<string> = new Set();
        const paths = filesCache.get("app-publisher");

        if (workspace.workspaceFolders && paths)
        {
            for (const fobj of paths)
            {
                if (!util.isExcluded(fobj.uri.path) && !visitedFiles.has(fobj.uri.fsPath)) {
                    visitedFiles.add(fobj.uri.fsPath);
                    allTasks.push(...this.createTasks(fobj.folder, fobj.uri));
                }
            }
        }

        util.logValue("   # of tasks", allTasks.length, 2);
        return allTasks;
    }


    public createTask(target: string, cmd: string, folder: WorkspaceFolder, uri: Uri, xArgs: string[]): Task
    {
        return this.createTasks(folder, uri)[0];
    }


    public createTasks(folder: WorkspaceFolder, uri: Uri): Task[]
    {
        const getRelativePath = (folder: WorkspaceFolder, uri: Uri): string =>
        {
            if (folder) {
                const rootUri = folder.uri;
                const absolutePath = uri.path.substring(0, uri.path.lastIndexOf("/") + 1);
                return absolutePath.substring(rootUri.path.length + 1);
            }
            return "";
        };

        const cwd = path.dirname(uri.fsPath);
        const fileName = path.basename(uri.fsPath);
        const relativePath = getRelativePath(folder, uri);

        const kind1: TaskExplorerDefinition = {
            type: "app-publisher",
            fileName,
            path: relativePath,
            cmdLine: "npx app-publisher -p ps --no-ci --republish",
            requiresArgs: false,
            uri
        };

        const kind2: TaskExplorerDefinition = {
            type: "app-publisher",
            fileName,
            path: relativePath,
            cmdLine: "npx app-publisher -p ps --no-ci --email-only",
            uri
        };

        const kind3: TaskExplorerDefinition = {
            type: "app-publisher",
            fileName,
            path: relativePath,
            cmdLine: "npx app-publisher -p ps --no-ci",
            uri
        };

        const kind4: TaskExplorerDefinition = {
            type: "app-publisher",
            fileName,
            path: relativePath,
            cmdLine: "npx app-publisher -p ps --no-ci --dry-run",
            uri
        };

        const kind5: TaskExplorerDefinition = {
            type: "app-publisher",
            fileName,
            path: relativePath,
            cmdLine: "npx app-publisher -p ps --no-ci --mantis-only",
            uri
        };

        const kind6: TaskExplorerDefinition = {
            type: "app-publisher",
            fileName,
            path: relativePath,
            cmdLine: "npx app-publisher -p ps --no-ci --prompt-version",
            uri
        };

        //
        // Set current working dircetory in oprions to relative script dir
        //
        const options: ShellExecutionOptions = {
            cwd
        };

        //
        // Create the shell execution objects
        //
        const execution1 = new ShellExecution(kind1.cmdLine, options);
        const execution2 = new ShellExecution(kind2.cmdLine, options);
        const execution3 = new ShellExecution(kind3.cmdLine, options);
        const execution4 = new ShellExecution(kind4.cmdLine, options);
        const execution5 = new ShellExecution(kind5.cmdLine, options);
        const execution6 = new ShellExecution(kind6.cmdLine, options);

        return [ new Task(kind4, folder, "Dry Run", "app-publisher", execution4, undefined),
                new Task(kind3, folder, "Publish", "app-publisher", execution3, undefined),
                new Task(kind1, folder, "Re-publish", "app-publisher", execution1, undefined),
                new Task(kind1, folder, "Publish Mantis Release", "app-publisher", execution5, undefined),
                new Task(kind5, folder, "Send Release Email", "app-publisher", execution2, undefined),
                new Task(kind6, folder, "Publish (Prompt Version)", "app-publisher", execution6, undefined) ];
    }
}
