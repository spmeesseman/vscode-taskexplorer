
import {
    Task, TaskGroup, WorkspaceFolder, RelativePattern, ShellExecution, Uri,
    workspace, TaskProvider, TaskDefinition
} from "vscode";
import * as path from "path";
import * as util from "./util";
import { parseString } from "xml2js";
import { configuration } from "./common/configuration";
import { TaskItem } from "./tasks";
import { filesCache } from "./cache";

interface StringMap { [s: string]: string; }
let cachedTasks: Task[];


interface AntTaskDefinition extends TaskDefinition
{
    script?: string;
    path?: string;
    fileName?: string;
    uri?: Uri;
    treeItem?: TaskItem;
}

export class AntTaskProvider implements TaskProvider
{
    constructor() {}

    public provideTasks() {
        return provideAntScripts();
    }

    public resolveTask(_task: Task): Task | undefined {
        return undefined;
    }
}


export async function invalidateTasksCacheAnt(opt?: Uri): Promise<void>
{
    util.log("");
    util.log("invalidateTasksCacheAnt");
    util.logValue("   uri", opt ? opt.path : (opt === null ? "null" : "undefined"), 2);
    util.logValue("   has cached tasks", cachedTasks ? "true" : "false", 2);

    if (opt && cachedTasks)
    {
        const rmvTasks: Task[] = [];

        await util.asyncForEach(cachedTasks, each => {
            const cstDef: AntTaskDefinition = each.definition;
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

            //
            // If this isn't a 'delete file' event then read the file for tasks
            //
            if (util.pathExists(opt.fsPath) && !util.existsInArray(configuration.get("exclude"), opt.path))
            {
                const tasks = await readAntfile(opt);
                cachedTasks.push(...tasks);
            }

            if (cachedTasks.length > 0) {
                return;
            }
        }
    }

    cachedTasks = undefined;
}


async function detectAntScripts(): Promise<Task[]>
{
    util.log("");
    util.log("detectAntScripts");

    const allTasks: Task[] = [];
    const visitedFiles: Set<string> = new Set();
    const paths = filesCache.get("ant");
    const folders = workspace.workspaceFolders;

    if (folders && paths)
    {
        for (const fobj of paths)
        {
            if (!util.isExcluded(fobj.uri.path) && !visitedFiles.has(fobj.uri.fsPath)) {
                visitedFiles.add(fobj.uri.fsPath);
                const tasks = await readAntfile(fobj.uri);
                allTasks.push(...tasks);
            }
        }
    }

    util.logValue("   # of tasks", allTasks.length, 2);
    return allTasks;
}


export async function provideAntScripts(): Promise<Task[]>
{
    if (!cachedTasks) {
        cachedTasks = await detectAntScripts();
    }
    return cachedTasks;
}


async function readAntfile(uri: Uri): Promise<Task[]>
{
    const result: Task[] = [];

    const folder = workspace.getWorkspaceFolder(uri);
    if (folder) {
        const contents = await util.readFile(uri.fsPath);
        const scripts = await findAllAntScripts(contents);
        if (scripts) {
            Object.keys(scripts).forEach(each => {
                const task = createAntTask(scripts[`${each}`] ? scripts[`${each}`] : `${each}`, each, folder!, uri);
                if (task) {
                    task.group = TaskGroup.Build;
                    result.push(task);
                }
            });
        }
    }

    return result;
}


async function findAllAntScripts(buffer: string): Promise<StringMap>
{
    let json: any = "";
    const scripts: StringMap = {};

    util.log("");
    util.log("FindAllAntScripts");

    try {
        parseString(buffer, (err, result) => {
            if (err) {
                util.log("   Script file cannot be parsed");
                return scripts;
            }
            json = result;
        });
    }
    catch (e) {
        util.log("   Script file cannot be parsed");
                return scripts;
    }

    if (!json || !json.project)
    {
        util.log("   Script file does not contain a <project> root");
        return scripts;
    }

    if (!json.project.target)
    {
        util.log("   Script file does not contain any targets");
        return scripts;
    }

    const defaultTask = json.project.$.default;

    // if (json.project.$.default) {
    // util.logValue('   Found default target', json.project.$.default);
    //     scripts["Default (" + json.project.$.default + ")"] = json.project.$.default;
    // }

    const targets = json.project.target;
    for (const tgt in targets)
    {
        if (targets[tgt].$ && targets[tgt].$.name) {
            util.logValue("   Found target", targets[tgt].$.name);
            scripts[defaultTask === targets[tgt].$.name ? targets[tgt].$.name + " - Default" : targets[tgt].$.name] = targets[tgt].$.name;
        }
    }

    return scripts;
}


function createAntTask(target: string, cmdName: string, folder: WorkspaceFolder, uri: Uri): Task
{
    function getCommand(folder: WorkspaceFolder): string
    {
        let ant = "ant";

        if (process.platform === "win32") {
            ant = "ant.bat";
        }

        if (workspace.getConfiguration("taskExplorer").get("pathToAnt")) {
            ant = workspace.getConfiguration("taskExplorer").get("pathToAnt");
            if (process.platform === "win32" && ant.endsWith("\\ant")) {
                ant += ".bat";
            }
        }

        return ant;
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

    const antFile = path.basename(uri.path);

    const kind: AntTaskDefinition = {
        type: "ant",
        script: target,
        path: "", // populated below if relativePath is non-empty
        fileName: antFile,
        uri
    };

    const relativePath = getRelativePath(folder, uri);
    if (relativePath.length) {
        kind.path = relativePath;
    }
    const cwd = path.dirname(uri.fsPath);

    let args = [ target ];
    let options = null;

    if (process.platform === "win32" && configuration.get("enableAnsiconForAnt") === true)
    {
        let ansicon = "ansicon.exe";
        const ansiPath: string = configuration.get("pathToAnsicon");
        if (ansiPath && util.pathExists(ansiPath)) {
            ansicon = ansiPath;
            if (!ansicon.endsWith("ansicon.exe") && !ansicon.endsWith("\\")) {
                ansicon = path.join(ansicon, "ansicon.exe");
            }
            else if (!ansicon.endsWith("ansicon.exe")) {
                ansicon += "ansicon.exe";
            }
        }

        args = [ "-logger", "org.apache.tools.ant.listener.AnsiColorLogger", target ];
        options = {
            cwd,
            executable: ansicon
        };
    }
    else
    {
        options = {
            cwd
        };
    }

    if (antFile.toLowerCase() !== "build.xml")
    {
        args.push("-f");
        args.push(antFile);
    }

    const execution = new ShellExecution(getCommand(folder), args, options);

    return new Task(kind, folder, cmdName ? cmdName : target, "ant", execution, undefined);
}
