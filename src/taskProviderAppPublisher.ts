
import {
    Task, WorkspaceFolder, RelativePattern, ShellExecution, Uri,
    workspace, TaskProvider, TaskDefinition, ShellExecutionOptions
} from "vscode";
import * as path from "path";
import * as util from "./util";
import { TaskItem } from "./tasks";
import { configuration } from "./common/configuration";
import { filesCache } from "./cache";


let cachedTasks: Task[];


interface AppPublisherTaskDefinition extends TaskDefinition
{
    script?: string;
    path?: string;
    fileName?: string;
    uri?: Uri;
    treeItem?: TaskItem;
    cmdLine?: string;
}

export class AppPublisherTaskProvider implements TaskProvider
{
    constructor() {}

    public provideTasks() {
        return provideAppPublisherfiles();
    }

    public resolveTask(_task: Task): Task | undefined {
        return undefined;
    }
}


export async function invalidateTasksCacheAppPublisher(opt?: Uri) : Promise<void>
{
    util.log("");
    util.log("invalidateTasksCacheAppPublisher");

    if (opt && cachedTasks)
    {
        const rmvTasks: Task[] = [];
        const folder = workspace.getWorkspaceFolder(opt);

        cachedTasks.forEach(each => {
            const cstDef: AppPublisherTaskDefinition = each.definition as AppPublisherTaskDefinition;
            if (cstDef.uri.fsPath === opt.fsPath || !util.pathExists(cstDef.uri.fsPath)) {
                rmvTasks.push(each);
            }
        });

        rmvTasks.forEach(each => {
            util.log("   removing old task " + each.name);
            util.removeFromArray(cachedTasks, each);
        });

        if (util.pathExists(opt.fsPath) && !util.existsInArray(configuration.get("exclude"), opt.path))
        {
            const tasks = createAppPublisherTask(folder!, opt);
            if (tasks) {
                cachedTasks.push(...tasks);
                // cachedTasks.push(task2);
            }
            else {
                util.log("   !!! could not create app-publisher task from " + opt.fsPath);
            }
        }

        if (cachedTasks.length > 0) {
            return;
        }
    }

    cachedTasks = undefined;
}


async function provideAppPublisherfiles(): Promise<Task[]>
{
    if (!cachedTasks) {
        cachedTasks = await detectAppPublisherfiles();
    }
    return cachedTasks;
}


async function detectAppPublisherfiles(): Promise<Task[]>
{

    const emptyTasks: Task[] = [];
    const allTasks: Task[] = [];
    const visitedFiles: Set<string> = new Set();
    const paths = filesCache.get("app-publisher");

    try
    {
        if (!paths)
        {
            const folders = workspace.workspaceFolders;
            if (!folders) {
                return emptyTasks;
            }

            for (const folder of folders)
            {
                //
                // Note - pattern will ignore gruntfiles in root project dir, which would be picked
                // up by VSCoces internal Grunt task provider
                //
                const relativePattern = new RelativePattern(folder, "**/.publishrc.json");
                const paths = await workspace.findFiles(relativePattern, util.getExcludesGlob(folder));
                for (const fpath of paths)
                {
                    if (!util.isExcluded(fpath.path) && !visitedFiles.has(fpath.fsPath)) {
                        visitedFiles.add(fpath.fsPath);
                        allTasks.push(...createAppPublisherTask(folder!, fpath));
                    }
                }
            }
        }
        else
        {
            for (const fobj of paths)
            {
                if (!util.isExcluded(fobj.uri.path) && !visitedFiles.has(fobj.uri.fsPath)) {
                    visitedFiles.add(fobj.uri.fsPath);
                    allTasks.push(...createAppPublisherTask(fobj.folder!, fobj.uri));
                }
            }
        }

        return allTasks;
    }
    catch (error)
    {
        return Promise.reject(error);
    }
}


function createAppPublisherTask(folder: WorkspaceFolder, uri: Uri): Task[]
{
    function getRelativePath(folder: WorkspaceFolder, uri: Uri): string
    {
        if (folder) {
            const rootUri = folder.uri;
            const absolutePath = uri.path.substring(0, uri.path.lastIndexOf("/") + 1);
            return absolutePath.substring(rootUri.path.length + 1);
        }
        return "";
    }

    const cwd = path.dirname(uri.fsPath);
    const fileName = path.basename(uri.fsPath);


    const kind1: AppPublisherTaskDefinition = {
        type: "app-publisher",
        fileName,
        path: "",
        cmdLine: "npx app-publisher -p ps --no-ci --republish",
        requiresArgs: false,
        uri
    };

    const kind2: AppPublisherTaskDefinition = {
        type: "app-publisher",
        fileName,
        path: "",
        cmdLine: "npx app-publisher -p ps --no-ci --email-only",
        uri
    };

    const kind3: AppPublisherTaskDefinition = {
        type: "app-publisher",
        fileName,
        path: "",
        cmdLine: "npx app-publisher -p ps --no-ci",
        uri
    };

    const kind4: AppPublisherTaskDefinition = {
        type: "app-publisher",
        fileName,
        path: "",
        cmdLine: "npx app-publisher -p ps --no-ci --dry-run",
        uri
    };

    const kind5: AppPublisherTaskDefinition = {
        type: "app-publisher",
        fileName,
        path: "",
        cmdLine: "npx app-publisher -p ps --no-ci --mantis-only",
        uri
    };

    const kind6: AppPublisherTaskDefinition = {
        type: "app-publisher",
        fileName,
        path: "",
        cmdLine: "npx app-publisher -p ps --no-ci --prompt-version",
        uri
    };

    //
    // Get relative dir to workspace folder
    //
    const relativePath = getRelativePath(folder, uri);
    if (relativePath.length) {
        kind1.path = relativePath;
        kind2.path = relativePath;
        kind3.path = relativePath;
        kind4.path = relativePath;
        kind5.path = relativePath;
        kind6.path = relativePath;
    }

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
    const execution6 = new ShellExecution(kind5.cmdLine, options);

    return [ new Task(kind4, folder, "Dry Run", "app-publisher", execution4, undefined),
             new Task(kind3, folder, "Publish", "app-publisher", execution3, undefined),
             new Task(kind1, folder, "Re-publish", "app-publisher", execution1, undefined),
             new Task(kind1, folder, "Publish Mantis Release", "app-publisher", execution1, undefined),
             new Task(kind5, folder, "Send Release Email", "app-publisher", execution5, undefined),
             new Task(kind6, folder, "Publish (Prompt Version)", "app-publisher", execution6, undefined) ];
}
