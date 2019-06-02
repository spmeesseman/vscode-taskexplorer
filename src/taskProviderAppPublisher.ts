
import {
    Task, TaskGroup, WorkspaceFolder, RelativePattern, ShellExecution, Uri,
    workspace, TaskProvider, TaskDefinition, ShellExecutionOptions
} from "vscode";
import * as path from "path";
import * as util from "./util";
import { TaskItem } from "./taskItem";
import { configuration } from "./common/configuration";

type StringMap = { [s: string]: string; };

let cachedTasks: Task[] = undefined;


interface AppPublisherTaskDefinition extends TaskDefinition
{
    script?: string;
    path?: string;
    fileName?: string;
    uri?: Uri;
    treeItem?: TaskItem;
}

export class AppPublisherTaskProvider implements TaskProvider
{
    constructor() {
    }

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

    const folders = workspace.workspaceFolders;
    if (!folders) {
        return emptyTasks;
    }
    try {
        for (const folder of folders) 
        {
            //
            // Note - pattern will ignore gruntfiles in root project dir, which would be picked
            // up by VSCoces internal Grunt task provider
            //
            const relativePattern = new RelativePattern(folder, "**/.publishrc*");
            const paths = await workspace.findFiles(relativePattern, util.getExcludesGlob(folder));
            for (const fpath of paths) 
            {
                if (!util.isExcluded(fpath.path) && !visitedFiles.has(fpath.fsPath)) {
                    visitedFiles.add(fpath.fsPath);
                    allTasks.push(...createAppPublisherTask(folder!, fpath));
                }
            }
        }
        return allTasks;
    } catch (error) {
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

    const kind: AppPublisherTaskDefinition = {
        type: "app-publisher",
        fileName,
        path: "",
        //cmdLine: "app-publisher -p node --no-ci",
        cmdLine: "npx ./build/bin/app-publisher.js -p node --no-ci",
        requiresArgs: false,
        uri
    };

    const kind2: AppPublisherTaskDefinition = {
        type: "app-publisher",
        fileName,
        path: "",
        cmdLine: "app-publisher -p node --no-ci --dry-run",
        requiresArgs: false,
        uri
    };

    const kind3: AppPublisherTaskDefinition = {
        type: "app-publisher",
        fileName,
        path: "",
        cmdLine: "app-publisher -p ps --no-ci",
        requiresArgs: false,
        uri
    };

    const kind4: AppPublisherTaskDefinition = {
        type: "app-publisher",
        fileName,
        path: "",
        // cmdLine: "app-publisher -p ps --no-ci --dry-run",
        cmdLine: "npx ./build/bin/app-publisher.js -p ps --no-ci --dry-run",
        requiresArgs: false,
        uri
    };

    //
    // Get relative dir to workspace folder
    //
    const relativePath = getRelativePath(folder, uri);
    if (relativePath.length) {
        kind.path = relativePath;
        kind2.path = relativePath;
        kind3.path = relativePath;
        kind4.path = relativePath;
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
    const execution = new ShellExecution(kind.cmdLine, options);
    const execution2 = new ShellExecution(kind2.cmdLine, options);
    const execution3 = new ShellExecution(kind3.cmdLine, options);
    const execution4 = new ShellExecution(kind4.cmdLine, options);

    return [ new Task(kind, folder, "app-publisher-node", "app-publisher", execution, undefined),
             new Task(kind2, folder, "app-publisher-node-dry", "app-publisher", execution2, undefined),
             new Task(kind3, folder, "app-publisher-ps", "app-publisher", execution3, undefined),
             new Task(kind4, folder, "app-publisher-ps-dry", "app-publisher", execution4, undefined) ];
}
