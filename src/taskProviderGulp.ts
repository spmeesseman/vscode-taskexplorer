
import {
    Task, TaskGroup, WorkspaceFolder, RelativePattern, ShellExecution, Uri,
    workspace, TaskProvider, TaskDefinition
} from "vscode";
import * as path from "path";
import * as util from "./util";
import { TaskItem } from "./tasks";
import { configuration } from "./common/configuration";
import { filesCache } from "./cache";


interface StringMap { [s: string]: string; }
let cachedTasks: Task[];


interface GulpTaskDefinition extends TaskDefinition
{
    script?: string;
    path?: string;
    fileName?: string;
    uri?: Uri;
    treeItem?: TaskItem;
}

export class GulpTaskProvider implements TaskProvider
{
    constructor() {}

    public provideTasks() {
        return provideGulpfiles();
    }

    public resolveTask(_task: Task): Task | undefined {
        return undefined;
    }
}


export async function invalidateTasksCacheGulp(opt?: Uri): Promise<void>
{
    util.log("");
    util.log("invalidateTasksCacheGulp");
    util.logValue("   uri", opt ? opt.path : (opt === null ? "null" : "undefined"), 2);
    util.logValue("   has cached tasks", cachedTasks ? "true" : "false", 2);

    if (opt && cachedTasks)
    {
        const rmvTasks: Task[] = [];

        await util.asyncForEach(cachedTasks, each => {
            const cstDef: GulpTaskDefinition = each.definition;
            if (cstDef.uri.fsPath === opt.fsPath || !util.pathExists(cstDef.uri.fsPath)) {
                rmvTasks.push(each);
            }
        });
        
        //
        // Technically this function can be called back into when waiting for a promise
        // to return on the asncForEach() above, and cachedTask array can be set to undefined,
        // this is happening with a broken await() somewere that I cannot find
        if (cachedTasks)
        {
            await util.asyncForEach(rmvTasks, each => {
                util.log("   removing old task " + each.name);
                util.removeFromArray(cachedTasks, each);
            });

            if (util.pathExists(opt.fsPath) && !util.existsInArray(configuration.get("exclude"), opt.path))
            {
                const tasks = await readGulpfile(opt);
                cachedTasks.push(...tasks);
            }

            if (cachedTasks.length > 0) {
                return;
            }
        }
    }

    cachedTasks = undefined;
}


async function provideGulpfiles(): Promise<Task[]>
{
    util.log("");
    util.log("provideGulpfiles");

    if (!cachedTasks) {
        cachedTasks = await detectGulpfiles();
    }
    return cachedTasks;
}


async function detectGulpfiles(): Promise<Task[]>
{
    util.log("");
    util.log("detectGulpfiles");

    const allTasks: Task[] = [];
    const visitedFiles: Set<string> = new Set();
    const paths = filesCache.get("gulp");
    const folders = workspace.workspaceFolders;

    if (folders)
    {
        try {
            if (paths)
            {
                for (const fobj of paths)
                {
                    if (!util.isExcluded(fobj.uri.path) && !visitedFiles.has(fobj.uri.fsPath)) {
                        visitedFiles.add(fobj.uri.fsPath);
                        const tasks = await readGulpfile(fobj.uri);
                        allTasks.push(...tasks);
                    }
                }
            }
        }
        catch {}
    }

    util.logValue("   # of tasks", allTasks.length, 2);
    return allTasks;
}


async function readGulpfile(uri: Uri): Promise<Task[]>
{
    const result: Task[] = [];
    const folder = workspace.getWorkspaceFolder(uri);

    if (folder)
    {
        const scripts = await findTargets(uri.fsPath);
        if (scripts)
        {
            Object.keys(scripts).forEach(each => {
                const task = createGulpTask(each, `${each}`, folder!, uri);
                if (task) {
                    task.group = TaskGroup.Build;
                    result.push(task);
                }
            });
        }
    }

    return result;
}


async function findTargets(fsPath: string): Promise<StringMap>
{
    const json: any = "";
    const scripts: StringMap = {};

    util.log("");
    util.log("Find gulpfile targets");

    const contents = await util.readFile(fsPath);
    let idx = 0;
    let eol = contents.indexOf("\n", 0);

    while (eol !== -1)
    {
        let line: string = contents.substring(idx, eol).trim();
        if (line.length > 0 && line.toLowerCase().trimLeft().startsWith("gulp.task"))
        {
            let idx1 = line.indexOf("'");
            if (idx1 === -1) {
                idx1 = line.indexOf('"');
            }

            if (idx1 === -1) // check next line for task name
            {
                let eol2 = eol + 1;
                eol2 = contents.indexOf("\n", eol2);
                line = contents.substring(eol + 1, eol2).trim();
                if (line.startsWith("'") || line.startsWith('"'))
                {
                    idx1 = line.indexOf("'");
                    if (idx1 === -1) {
                        idx1 = line.indexOf('"');
                    }
                    if (idx1 !== -1) {
                        eol = eol2;
                    }
                }
            }

            if (idx1 !== -1)
            {
                idx1++;
                let idx2 = line.indexOf("'", idx1);
                if (idx2 === -1) {
                    idx2 = line.indexOf('"', idx1);
                }
                if (idx2 !== -1)
                {
                    const tgtName = line.substring(idx1, idx2).trim();

                    if (tgtName) {
                        scripts[tgtName] = "";
                        util.log("   found target");
                        util.logValue("      name", tgtName);
                    }
                }
            }
        }

        idx = eol + 1;
        eol = contents.indexOf("\n", idx);
    }

    util.log("   done");

    return scripts;
}


function createGulpTask(target: string, cmd: string, folder: WorkspaceFolder, uri: Uri): Task
{
    function getCommand(folder: WorkspaceFolder, relativePath: string, cmd: string): string
    {
        const gulp = "gulp";
        // let gulp = folder.uri.fsPath + "/node_modules/.bin/gulp";
        // if (process.platform === 'win32') {
        //     gulp = folder.uri.fsPath + "\\node_modules\\.bin\\gulp.cmd";
        // }
        // if (relativePath) {
        //     gulp += (' --gulpfile ' + path.join(relativePath, 'gulpfile.js'));
        // }

        // if (workspace.getConfiguration('taskExplorer').get('pathToGulp')) {
        //     gulp = workspace.getConfiguration('taskExplorer').get('pathToGulp');
        // }

        return gulp;
    }

    function getRelativePath(folder: WorkspaceFolder, uri: Uri): string
    {
        if (folder) {
            const rootUri = folder.uri;
            const absolutePath = uri.path.substring(0, uri.path.lastIndexOf("/") + 1);
            return absolutePath.substring(rootUri.path.length + 1);
        }
        return "";
    }

    const kind: GulpTaskDefinition = {
        type: "gulp",
        script: target,
        path: "",
        fileName: path.basename(uri.path),
        uri
    };

    const relativePath = getRelativePath(folder, uri);
    if (relativePath.length) {
        kind.path = relativePath;
    }
    const cwd = path.dirname(uri.fsPath);

    const args = [ getCommand(folder, relativePath, cmd), target ];
    const options = {
        cwd
    };

    const execution = new ShellExecution("npx", args, options);

    return new Task(kind, folder, target, "gulp", execution, undefined);
}
