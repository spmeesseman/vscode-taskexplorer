
import {
    Task, WorkspaceFolder, RelativePattern, ShellExecution, Uri,
    workspace, TaskProvider, TaskDefinition, ShellExecutionOptions
} from "vscode";
import * as path from "path";
import * as util from "./util";
import { configuration } from "./common/configuration";
import { TaskItem } from "./tasks";
import { filesCache } from "./cache";


type StringMap = { [s: string]: string; };
let cachedTasks: Task[];

const scriptTable = {
    sh: {
        exec: "",
        type: "bash",
        args: [],
        enabled: configuration.get("enableBash")
    },
    py: {
        exec: configuration.get("pathToPython") ? configuration.get("pathToPython") : "python",
        type: "python",
        args: [],
        enabled: configuration.get("enablePython")
    },
    rb: {
        exec: configuration.get("pathToRuby") ? configuration.get("pathToRuby") : "ruby",
        type: "ruby",
        args: [],
        enabled: configuration.get("enableRuby")
    },
    ps1: {
        exec: configuration.get("pathToPowershell") ? configuration.get("pathToPowershell") : "powershell",
        type: "powershell",
        args: [],
        enabled: configuration.get("enablePowershell")
    },
    pl: {
        exec: configuration.get("pathToPerl") ? configuration.get("pathToPerl") : "perl",
        type: "perl",
        args: [],
        enabled: configuration.get("enablePerl")
    },
    bat: {
        exec: "cmd.exe",
        type: "batch",
        args: ["/c"],
        enabled: configuration.get("enableBatch")
    },
    cmd: {
        exec: "cmd.exe",
        type: "batch",
        args: ["/c"],
        enabled: configuration.get("enableBatch")
    },
    nsi: {
        exec: configuration.get("pathToNsis") ? configuration.get("pathToNsis") : "makensis",
        type: "nsis",
        args: [],
        enabled: configuration.get("enableNsis")
    }
};

interface ScriptTaskDefinition extends TaskDefinition
{
    scriptType: string;
    cmdLine: string;
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
    scriptTable.py.exec = configuration.get("pathToPython") ? configuration.get("pathToPython") : "python";
    scriptTable.rb.exec = configuration.get("pathToRuby") ? configuration.get("pathToRuby") : "ruby";
    scriptTable.pl.exec = configuration.get("pathToPerl") ? configuration.get("pathToPerl") : "perl";
    scriptTable.nsi.exec = configuration.get("pathToNsis") ? configuration.get("pathToNsis") : "makensis";
    scriptTable.ps1.exec = configuration.get("pathToPowershell") ? configuration.get("pathToPowershell") : "powershell";

    scriptTable.py.enabled = configuration.get("enablePython");
    scriptTable.rb.enabled = configuration.get("enableRuby");
    scriptTable.ps1.enabled = configuration.get("enablePerl");
    scriptTable.nsi.enabled = configuration.get("enableNsis");
    scriptTable.nsi.enabled = configuration.get("enablePowershell");
    scriptTable.sh.enabled = configuration.get("enableBash");
    scriptTable.bat.enabled = configuration.get("enableBatch");
}


export async function invalidateTasksCacheScript(opt?: Uri) : Promise<void>
{
    util.log("");
    util.log("invalidateTasksCacheScript");

    if (opt && cachedTasks)
    {
        const rmvTasks: Task[] = [];
        const folder = workspace.getWorkspaceFolder(opt);

        cachedTasks.forEach(each => {
            const cstDef: ScriptTaskDefinition = each.definition as ScriptTaskDefinition;
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
            const task = createScriptTask(scriptTable[path.extname(opt.fsPath).substring(1)], folder!,  opt);
            if (task) {
                cachedTasks.push(task);
            }
            else {
                util.log("   !!! could not create script task from " + opt.fsPath);
            }
        }

        if (cachedTasks.length > 0) {
            return;
        }
    }

    cachedTasks = undefined;
}


async function provideScriptFiles(): Promise<Task[]>
{
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

    const emptyTasks: Task[] = [];
    const allTasks: Task[] = [];
    const visitedFiles: Set<string> = new Set();
    const paths = filesCache.get("script");

    console.log('0');

    const folders = workspace.workspaceFolders;
    if (!folders) {
        return emptyTasks;
    }
    try {
        if (!paths)
        {
            console.log('1');
            for (const folder of folders)
            {
                console.log('2');
                const relativePattern = new RelativePattern(folder, "{**/*.[Ss][Hh],**/*.[Rr][Bb],**/*.[Pp][Ss]1,**/*.[Pp][Ll],**/*.[Bb][Aa][Tt],**/*.cmd,**/*.[Nn][Ss][Ii],**/[Ss][Ee][Tt][Uu][Pp].[Pp][Yy]}"); //,SH,PY,RB,PS1,PL,BAT,CMD/NSI");
                const paths = await workspace.findFiles(relativePattern, util.getExcludesGlob(folder));
                for (const fpath of paths)
                {
                    console.log('3: ' + fpath);
                    if (!util.isExcluded(fpath.path) && !visitedFiles.has(fpath.fsPath)) {
                        visitedFiles.add(fpath.fsPath);
                        allTasks.push(createScriptTask(scriptTable[path.extname(fpath.fsPath).substring(1).toLowerCase()], folder!, fpath));
                        util.log("   found script target");
                        util.logValue("      script file", fpath.fsPath);
                    }
                }
            }
        }
        else
        {
            console.log('A');
            for (const fobj of paths)
            {
                console.log('B: ' + fobj.uri.fsPath);
                if (!util.isExcluded(fobj.uri.path) && !visitedFiles.has(fobj.uri.fsPath)) {
                    visitedFiles.add(fobj.uri.fsPath);
                    allTasks.push(createScriptTask(scriptTable[path.extname(fobj.uri.fsPath).substring(1).toLowerCase()], fobj.folder!, fobj.uri));
                    util.log("   found script target");
                    util.logValue("      script file", fobj.uri.fsPath);
                }
            }
        }
        return allTasks;
    }
    catch (error) {
        return Promise.reject(error);
    }
}


function createScriptTask(scriptDef: any, folder: WorkspaceFolder, uri: Uri): Task
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
    let sep: string = (process.platform === "win32" ? "\\" : "/");

    const kind: ScriptTaskDefinition = {
        type: "script",
        scriptType: scriptDef.type,
        fileName,
        scriptFile: true, // set scriptFile to true to include all scripts in folder instead of grouped at file
        path: "",
        cmdLine: (scriptDef.exec.indexOf(" ") !== -1 ? "\"" + scriptDef.exec + "\"" : scriptDef.exec),
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
    // Get relative dir to workspace folder
    //
    const relativePath = getRelativePath(folder, uri);
    if (relativePath.length) {
        kind.path = relativePath;
    }

    //
    // Set current working dircetory in oprions to relative script dir
    //
    const options: ShellExecutionOptions = {
        cwd
    };

     //
    // If the defualt terminal is bash, set the separator to non-windows-style
    //
    const winShell: string = workspace.getConfiguration().get("terminal.integrated.shell.windows");
    if (winShell && winShell.includes("bash.exe")) {
        sep = "/";
    }
    //
    // Handle bash script on windows - set the shell executable as bash.exe.  This can be set by user
    // in settings, otherwise Git Bash will be tried in the default install location ("C:\Program Files\Git\bin).
    // Otherwise, use "bash.exe" and assume the command and other shell commands are in PATH
    //
    else if (process.platform === "win32" && scriptDef.type === "bash")
    {
        let bash = configuration.get<string>("pathToBash");
        if (!bash) {
            bash = "C:\\Program Files\\Git\\bin\\bash.exe";
        }
        if (!bash || !util.pathExists(bash)) {
            bash = "bash.exe";
            // return null;
        }
        options.executable = bash;
        sep = "/"; // convert path separator to unix-style
    }

    //
    // Add any defined arguments to the command line for the script type
    //
    if (scriptDef.args)
    {
        for (let i = 0; i < scriptDef.args.length; i++) {
            kind.cmdLine += " ";
            kind.cmdLine += scriptDef.args[i];
        }
    }

    //
    // Add the file name to the command line following the exec.  Quote if ecessary.  Prepend "./" as
    // powershell script requires this.  If this is for a shell/bash/sh task, then skip the space
    // character as the script itself is considered "executable"
    //
    if (scriptDef.type !== "bash") {
        kind.cmdLine += " ";
    }
    kind.cmdLine += (fileName.indexOf(" ") !== -1 ? "\"" + "." + sep + fileName + "\"" : "." + sep + fileName);

    //
    // For python setup.py scripts, use the bdist_egg argument - the egg will be built and stored
    // at dist/PackageName-Version.egg
    //
    if (scriptDef.type === "python") {
        kind.cmdLine += " bdist_egg";
    }

    //
    // Create the shell execution object
    //
    const execution = new ShellExecution(kind.cmdLine, options);

    return new Task(kind, folder, scriptDef.type !== "python" ? fileName : "build egg", scriptDef.type, execution, undefined);
}
