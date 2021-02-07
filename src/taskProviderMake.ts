
import {
    Task, TaskGroup, WorkspaceFolder, RelativePattern, ShellExecution, Uri,
    workspace, TaskProvider, TaskDefinition, ShellExecutionOptions, extensions
} from "vscode";
import * as path from "path";
import * as util from "./util";
import { TaskItem } from "./tasks";
import { configuration } from "./common/configuration";
import { filesCache } from "./cache";


interface StringMap { [s: string]: string; }
let cachedTasks: Task[];


interface MakeTaskDefinition extends TaskDefinition
{
    script?: string;
    path?: string;
    fileName?: string;
    uri?: Uri;
    treeItem?: TaskItem;
}

export class MakeTaskProvider implements TaskProvider
{
    constructor()
    {
    }

    public provideTasks()
    {
        return provideMakefiles();
    }

    public resolveTask(_task: Task): Task | undefined
    {
        return undefined;
    }
}


export async function invalidateTasksCacheMake(opt?: Uri): Promise<void>
{
    util.log("");
    util.log("invalidateTasksCacheMake");
    util.logValue("   uri", opt ? opt.path : (opt === null ? "null" : "undefined"), 2);
    util.logValue("   has cached tasks", cachedTasks ? "true" : "false", 2);

    if (opt && cachedTasks)
    {
        const rmvTasks: Task[] = [];

        await util.asyncForEach(cachedTasks, (each) => {
            const cstDef: MakeTaskDefinition = each.definition;
            if (cstDef.uri.fsPath === opt.fsPath || !util.pathExists(cstDef.uri.fsPath))
            {
                rmvTasks.push(each);
            }
        });

        //
        // Technically this function can be called back into when waiting for a promise
        // to return on the asncForEach() above, and cachedTask array can be set to undefined,
        // this is happening with a broken await() somewere that I cannot find
        if (cachedTasks)
        {
            await util.asyncForEach(rmvTasks, (each) => {
                util.log("   removing old task " + each.name);
                util.removeFromArray(cachedTasks, each);
            });

            if (util.pathExists(opt.fsPath) && !util.existsInArray(configuration.get("exclude"), opt.path))
            {
                const tasks = await readMakefile(opt);
                cachedTasks.push(...tasks);
            }

            if (cachedTasks.length > 0)
            {
                return;
            }
        }
    }

    cachedTasks = undefined;
}


async function detectMakefiles(): Promise<Task[]>
{
    util.log("");
    util.log("detectMakefiles");

    const allTasks: Task[] = [];
    const visitedFiles: Set<string> = new Set();
    const paths = filesCache.get("make");

    if (workspace.workspaceFolders && paths)
    {
        for (const fobj of paths)
        {
            if (!util.isExcluded(fobj.uri.path) && !visitedFiles.has(fobj.uri.fsPath)) {
                visitedFiles.add(fobj.uri.fsPath);
                const tasks = await readMakefile(fobj.uri);
                allTasks.push(...tasks);
            }
        }
    }

    util.logValue("   # of tasks", allTasks.length, 2);
    return allTasks;
}


async function provideMakefiles(): Promise<Task[]>
{
    util.log("");
    util.log("provideMakefiles");

    if (!cachedTasks)
    {
        cachedTasks = await detectMakefiles();
    }
    return cachedTasks;
}


async function readMakefile(uri: Uri): Promise<Task[]>
{
    const result: Task[] = [];
    const folder = workspace.getWorkspaceFolder(uri);

    if (folder)
    {
        const scripts = await findTargets(uri.fsPath);
        if (scripts)
        {
            Object.keys(scripts).forEach(each =>
            {
                const task = createMakeTask(each, `${each}`, folder!, uri);
                task.group = TaskGroup.Build;
                result.push(task);
            });
        }
    }

    return result;
}

// See: https://www.gnu.org/software/make/manual/html_node/Special-Targets.html
const specialTargets = new Set([
    ".PHONY",
    ".SUFFIXES",
    ".DEFAULT",
    ".PRECIOUS",
    ".INTERMEDIATE",
    ".SECONDARY",
    ".SECONDEXPANSION",
    ".DELETE_ON_ERROR",
    ".IGNORE",
    ".LOW_RESOLUTION_TIME",
    ".SILENT",
    ".EXPORT_ALL_VARIABLES",
    ".NOTPARALLEL",
    ".ONESHELL",
    ".POSIX",
    ".MAKE",
]);

const suffixRuleTargets = /^(\.\w+|\.\w+\.\w+)$/;
const patternRuleTargets = /^(%\.\w+|%)$/;

function isNormalTarget(target: string): boolean
{
    if (specialTargets.has(target))
    {
        return false;
    }
    if (suffixRuleTargets.test(target))
    {
        return false;
    }
    if (patternRuleTargets.test(target))
    {
        return false;
    }

    return true;
}

function parseTargetLine(line)
{
    const tgtNames = line.split(":")[0].trim();
    const tgtName = tgtNames.split(" ").slice(-1)[0];

    const dependsName = line.substring(line.indexOf(":") + 1).trim();

    return { tgtName, dependsName };
}

async function findTargets(fsPath: string): Promise<StringMap>
{
    const scripts: StringMap = {};

    util.log("");
    util.log("Find makefile targets");

    const contents = await util.readFile(fsPath);
    let idx = 0;
    let eol = contents.indexOf("\n", 0);

    while (eol !== -1)
    {
        const line: string = contents.substring(idx, eol);
        //
        // Target names always start at position 0 of the line.
        //
        // TODO = Skip targets that are environment variable names, for now.  Need to
        // parse value if set in makefile and apply here for $() target names.
        //
        if (line.length > 0 && !line.startsWith("\t") && !line.startsWith(" ") &&
            !line.startsWith("#") && !line.startsWith("$") && line.indexOf(":") > 0)
        {
            const { tgtName, dependsName } = parseTargetLine(line);

            //
            // Don't include object targets
            //
            if (tgtName.indexOf("/") === -1 && tgtName.indexOf("=") === -1 && tgtName.indexOf("\\") === -1 &&
                tgtName.indexOf("(") === -1 && tgtName.indexOf("$") === -1 && isNormalTarget(tgtName))
            {
                scripts[tgtName] = "";
                util.log("   found target");
                util.logValue("      name", tgtName);
                util.logValue("      depends target", dependsName);
            }
        }

        idx = eol + 1;
        eol = contents.indexOf("\n", idx);
    }

    util.log("   done");

    return scripts;
}


function createMakeTask(target: string, cmd: string, folder: WorkspaceFolder, uri: Uri): Task
{
    function getCommand(folder: WorkspaceFolder, cmd: string): string
    {
        let make = "make";
        if (process.platform === "win32") {
            make = "nmake";
        }
        if (configuration.get("pathToMake")) {
            make = configuration.get("pathToMake");
        }
        return make;
    }

    function getRelativePath(folder: WorkspaceFolder, uri: Uri): string
    {
        if (folder)
        {
            const rootUri = folder.uri;
            const absolutePath = uri.path.substring(0, uri.path.lastIndexOf("/") + 1);
            return absolutePath.substring(rootUri.path.length + 1);
        }
        return "";
    }

    const kind: MakeTaskDefinition = {
        type: "make",
        script: target,
        path: getRelativePath(folder, uri),
        fileName: path.basename(uri.path),
        problemMatcher: "",
        uri
    };

    const cwd = path.dirname(uri.fsPath);
    const args = [target];
    const options: ShellExecutionOptions = {
        cwd
    };

    const execution = new ShellExecution(getCommand(folder, cmd), args, options);
    let problemMatcher = "$gccte";
    const cPlusPlusExtension = extensions.getExtension("spmeesseman.vscode-taskexplorer");
    if (cPlusPlusExtension) {
        problemMatcher = "$gcc";
    }

    return new Task(kind, folder, target, "make", execution, problemMatcher);
}
