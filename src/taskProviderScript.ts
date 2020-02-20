
import {
    Task, WorkspaceFolder, RelativePattern, ShellExecution, Uri,
    workspace, TaskProvider, TaskDefinition, ShellExecutionOptions
} from "vscode";
import * as path from "path";
import * as util from "./util";
import { configuration } from "./common/configuration";
import { TaskItem } from "./tasks";
import { filesCache } from "./cache";


let cachedTasks: Task[];

const scriptTable = {
    sh: {
        exec: "",
        type: "bash",
        args: [],
        enabled: configuration.get("enableBash")
    },
    py: {
        exec: configuration.get("pathToPython"),
        type: "python",
        args: [],
        enabled: configuration.get("enablePython")
    },
    rb: {
        exec: configuration.get("pathToRuby"),
        type: "ruby",
        args: [],
        enabled: configuration.get("enableRuby")
    },
    ps1: {
        exec: configuration.get("pathToPowershell"),
        type: "powershell",
        args: [],
        enabled: configuration.get("enablePowershell")
    },
    pl: {
        exec: configuration.get("pathToPerl"),
        type: "perl",
        args: [],
        enabled: configuration.get("enablePerl")
    },
    bat: {
        exec: "cmd",
        type: "batch",
        args: ["/c"],
        enabled: configuration.get("enableBatch")
    },
    cmd: {
        exec: "cmd",
        type: "batch",
        args: ["/c"],
        enabled: configuration.get("enableBatch")
    },
    nsi: {
        exec: configuration.get("pathToNsis"),
        type: "nsis",
        args: [],
        enabled: configuration.get("enableNsis")
    }
};

interface ScriptTaskDefinition extends TaskDefinition
{
    scriptType: string;
    fileName: string;
    scriptFile: boolean;
    path?: string;
    requiresArgs?: boolean;
    uri?: Uri;
    treeItem?: TaskItem;
}

export class ScriptTaskProvider implements TaskProvider
{
    constructor() {
    }

    public provideTasks() {
        return provideScriptFiles();
    }

    public resolveTask(_task: Task): Task | undefined {
        return undefined;
    }
}


function refreshScriptTable()
{
    scriptTable.py.exec = configuration.get("pathToPython");
    scriptTable.rb.exec = configuration.get("pathToRuby");
    scriptTable.pl.exec = configuration.get("pathToPerl");
    scriptTable.nsi.exec = configuration.get("pathToNsis");
    scriptTable.ps1.exec = configuration.get("pathToPowershell");

    scriptTable.py.enabled = configuration.get("enablePython");
    scriptTable.rb.enabled = configuration.get("enableRuby");
    scriptTable.ps1.enabled = configuration.get("enablePerl");
    scriptTable.nsi.enabled = configuration.get("enableNsis");
    scriptTable.nsi.enabled = configuration.get("enablePowershell");
    scriptTable.sh.enabled = configuration.get("enableBash");
    scriptTable.bat.enabled = configuration.get("enableBatch");
}


export async function invalidateTasksCacheScript(opt?: Uri): Promise<void>
{
    util.log("");
    util.log("invalidateTasksCacheScript");
    util.logValue("   uri", opt ? opt.path : (opt === null ? "null" : "undefined"), 2);
    util.logValue("   has cached tasks", cachedTasks ? "true" : "false", 2);

    if (opt && cachedTasks)
    {
        const rmvTasks: Task[] = [];
        const folder = workspace.getWorkspaceFolder(opt);

        await util.asyncForEach(cachedTasks, (each) => {
            const cstDef: ScriptTaskDefinition = each.definition as ScriptTaskDefinition;
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
            await util.asyncForEach(rmvTasks, (each) => {
                util.log("   removing old task " + each.name);
                util.removeFromArray(cachedTasks, each);
            });

            if (util.pathExists(opt.fsPath) && !util.existsInArray(configuration.get("exclude"), opt.path))
            {
                const task = createScriptTask(scriptTable[path.extname(opt.fsPath).substring(1)], folder!,  opt);
                cachedTasks.push(task);
            }

            if (cachedTasks.length > 0) {
                return;
            }
        }
    }

    cachedTasks = undefined;
}


async function provideScriptFiles(): Promise<Task[]>
{
    util.log("");
    util.log("provideScriptFiles");

    if (!cachedTasks) {
        refreshScriptTable();
        cachedTasks = await detectScriptFiles();
    }
    return cachedTasks;
}


async function detectScriptFiles(): Promise<Task[]>
{
    util.log("");
    util.log("detectScriptFiles");

    const allTasks: Task[] = [];
    const visitedFiles: Set<string> = new Set();
    const paths = filesCache.get("script");
    
    if (workspace.workspaceFolders && paths)
    {
        for (const fobj of paths)
        {
            if (!util.isExcluded(fobj.uri.path) && !visitedFiles.has(fobj.uri.fsPath)) {
                visitedFiles.add(fobj.uri.fsPath);
                allTasks.push(createScriptTask(scriptTable[path.extname(fobj.uri.fsPath).substring(1).toLowerCase()], fobj.folder!, fobj.uri));
                util.log("   found script target");
                util.logValue("      script file", fobj.uri.fsPath);
            }
        }
    }

    util.logValue("   # of tasks", allTasks.length, 2);
    return allTasks;
}


function createScriptTask(scriptDef: any, folder: WorkspaceFolder, uri: Uri): Task
{
    function getRelativePath(folder: WorkspaceFolder, uri: Uri): string
    {
        let rtn = "";
        if (folder) {
            const rootUri = folder.uri;
            const absolutePath = uri.path.substring(0, uri.path.lastIndexOf("/") + 1);
            rtn = absolutePath.substring(rootUri.path.length + 1);
        }
        return rtn;
    }

    const cwd = path.dirname(uri.fsPath);
    const fileName = path.basename(uri.fsPath);
    let sep: string = (process.platform === "win32" ? "\\" : "/");

    const kind: ScriptTaskDefinition = {
        type: "script",
        scriptType: scriptDef.type,
        fileName,
        scriptFile: true, // set scriptFile to true to include all scripts in folder instead of grouped at file
        path: getRelativePath(folder, uri),
        //cmdLine: "\"" + scriptDef.exec + "\"",
        requiresArgs: false,
        uri
    };

    //
    // Check if this script might need command line arguments
    //
    // TODO:  Other script types
    //
    if (scriptDef.type === "batch")
    {
        const contents = util.readFileSync(uri.fsPath);
        kind.requiresArgs = (new RegExp("%[1-9]")).test(contents);
    }

    //
    // Set current working dircetory in oprions to relative script dir
    //
    const options: ShellExecutionOptions = {
        cwd
    };

     //
    // If the defualt terminal cmd/powershell?  On linux and darwin, no, on windows, maybe...
    //
    let isWinShell = false;
    if (process.platform === "win32")
    {
        isWinShell = true;
        const winShell: string = workspace.getConfiguration().get("terminal.integrated.shell.windows");
        if (winShell && winShell.includes("bash.exe")) {
            sep = "/";
            isWinShell = false;
        }
    }

    //
    // Handle bash script on windows - set the shell executable as bash.exe if it isnt the default.
    // This can be set by usernin settings, otherwise Git Bash will be tried in the default install
    // location ("C:\Program Files\Git\bin). Otherwise, use "bash.exe" and assume the command and
    // other shell commands are in PATH
    //
    if (isWinShell)
    {
        if (scriptDef.type === "bash")
        {
            let bash = configuration.get<string>("pathToBash");
            if (!bash) {
                bash = "C:\\Program Files\\Git\\bin\\bash.exe";
            }
            if (!util.pathExists(bash)) {
                bash = "bash.exe";
            }
            options.executable = bash;
            sep = "/"; // convert path separator to unix-style
        }
    }

    const pathPre = "." + sep; // ; (scriptDef.type === "powershell" ? "." + sep : "")
    const fileNamePathPre = pathPre + fileName;
    //
    // Build arguments list
    //
    const args: string[] = [];
    //
    // Identify the 'executable'
    //
    let exec: string = scriptDef.exec;
    if (scriptDef.type === "bash")
    {
        exec = fileNamePathPre;
    }
    else { // All scripts except for 'bash'
        //
        // Add any defined arguments to the command line exec
        //
        if (scriptDef.args) {
            args.push(...scriptDef.args);
        }
        //
        // Add the filename as an argument to the script exe (i.e. 'powershell', 'cmd', etc)
        //
        args.push(scriptDef.type !== "powershell" ? fileName : fileNamePathPre);
    }
    //
    // For python setup.py scripts, use the bdist_egg argument - the egg will be built and stored
    // at dist/PackageName-Version.egg
    //
    if (scriptDef.type === "python") {
        args.push("bdist_egg");
    }

    //
    // Make sure there are no windows style slashes in any configured path to an executable
    // if this isnt running in a windows shell
    //
    if (!isWinShell)
    {
        exec = exec.replace(/\\/g, "/");
    }

    //
    // Create the shell execution object and task
    //
    const execution = new ShellExecution(exec, args, options);
    return new Task(kind, folder, scriptDef.type !== "python" ? fileName : "build egg", scriptDef.type, execution, undefined);
}
