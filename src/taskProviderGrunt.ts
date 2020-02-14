
import {
    Task, TaskGroup, WorkspaceFolder, RelativePattern, ShellExecution, Uri,
    workspace, TaskProvider, TaskDefinition
} from "vscode";
import * as path from "path";
import * as util from "./util";
import { TaskItem } from "./tasks";
import { configuration } from "./common/configuration";
import { filesCache } from "./cache";


type StringMap = { [s: string]: string; };
let cachedTasks: Task[];


interface GruntTaskDefinition extends TaskDefinition
{
    script?: string;
    path?: string;
    fileName?: string;
    uri?: Uri;
    treeItem?: TaskItem;
}

export class GruntTaskProvider implements TaskProvider
{
    constructor() {}

    public provideTasks() {
        return provideGruntfiles();
    }

    public resolveTask(_task: Task): Task | undefined {
        return undefined;
    }
}


export async function invalidateTasksCacheGrunt(opt?: Uri) : Promise<void>
{
    util.log("");
    util.log("invalidateTasksCacheGrunt");

    if (opt && cachedTasks)
    {
        const rmvTasks: Task[] = [];

        cachedTasks.forEach(each => {
            const cstDef: GruntTaskDefinition = each.definition;
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
            const tasks = await readGruntfile(opt);
            cachedTasks.push(...tasks);
        }

        if (cachedTasks.length > 0) {
            return;
        }
    }

    cachedTasks = undefined;
}


async function provideGruntfiles(): Promise<Task[]>
{
    if (!cachedTasks) {
        cachedTasks = await detectGruntfiles();
    }
    return cachedTasks;
}


async function detectGruntfiles(): Promise<Task[]>
{
    util.log("");
    util.log("detectGruntfiles");

    const emptyTasks: Task[] = [];
    const allTasks: Task[] = [];
    const visitedFiles: Set<string> = new Set();
    const paths = filesCache.get("grunt");

    const folders = workspace.workspaceFolders;
    if (!folders) {
        return emptyTasks;
    }
    try {
        if (!paths)
        {
            for (const folder of folders)
            {
                //
                // Note - pattern will ignore gruntfiles in root project dir, which would be picked
                // up by VSCoces internal Grunt task provider
                //
                const relativePattern = new RelativePattern(folder, "**/[Gg][Rr][Uu][Nn][Tt][Ff][Ii][Ll][Ee].[Jj][Ss]");
                const paths = await workspace.findFiles(relativePattern, util.getExcludesGlob(folder));
                for (const fpath of paths)
                {
                    if (!util.isExcluded(fpath.path) && !visitedFiles.has(fpath.fsPath)) {
                        const tasks = await readGruntfile(fpath);
                        visitedFiles.add(fpath.fsPath);
                        allTasks.push(...tasks);
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
                    const tasks = await readGruntfile(fobj.uri);
                    allTasks.push(...tasks);
                }
            }
        }
        return allTasks;
    } catch (error) {
        return Promise.reject(error);
    }
}


async function readGruntfile(uri: Uri): Promise<Task[]>
{
    const emptyTasks: Task[] = [];

    const folder = workspace.getWorkspaceFolder(uri);
    if (!folder) {
        return emptyTasks;
    }

    const scripts = await findTargets(uri.fsPath);
    if (!scripts) {
        return emptyTasks;
    }

    const result: Task[] = [];

    Object.keys(scripts).forEach(each => {
        const task = createGruntTask(each, `${each}`, folder!, uri);
        if (task) {
            task.group = TaskGroup.Build;
            result.push(task);
        }
    });

    return result;
}


async function findTargets(fsPath: string): Promise<StringMap>
{
    const json: any = "";
    const scripts: StringMap = {};

    util.log("");
    util.log("Find gruntfile targets");

    const contents = await util.readFile(fsPath);
    let idx = 0;
    let eol = contents.indexOf("\n", 0);

    while (eol !== -1)
    {
        let line: string = contents.substring(idx, eol).trim();
        if (line.length > 0 && line.toLowerCase().trimLeft().startsWith("grunt.registertask"))
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


function createGruntTask(target: string, cmd: string, folder: WorkspaceFolder, uri: Uri): Task
{
    function getCommand(folder: WorkspaceFolder, relativePath: string, cmd: string): string
    {
        // let grunt = 'folder.uri.fsPath + "/node_modules/.bin/grunt";
        const grunt = "grunt";

        // if (process.platform === 'win32') {
        //     grunt = folder.uri.fsPath + "\\node_modules\\.bin\\grunt.cmd";
        // }

        // if (workspace.getConfiguration('taskExplorer').get('pathToGrunt')) {
        //     grunt = workspace.getConfiguration('taskExplorer').get('pathToGrunt');
        // }

        return grunt;
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

    const kind: GruntTaskDefinition = {
        type: "grunt",
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

    return new Task(kind, folder, target, "grunt", execution, undefined);
}
