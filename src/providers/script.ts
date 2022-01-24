
import { Task, WorkspaceFolder, ShellExecution, Uri, workspace, ShellExecutionOptions } from "vscode";
import * as path from "path";
import * as util from "../common/utils";
import * as log from "../common/log";
import { configuration } from "../common/configuration";
import { filesCache } from "../cache";
import { TaskExplorerProvider } from "./provider";
import { TaskExplorerDefinition } from "../taskDefinition";


export class ScriptTaskProvider extends TaskExplorerProvider implements TaskExplorerProvider
{

    constructor() { super("script"); }


    private scriptTable: any = {
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


    public createTask(target: string, cmd: string | undefined, folder: WorkspaceFolder, uri: Uri, xArgs?: string[]): Task | undefined
    {
        log.methodStart("create script task", 2, "   ", false, [["target", target], ["cmd", cmd], ["path", uri.fsPath]]);

        const extension = target.toLowerCase(),
              scriptDef = this.scriptTable[extension],
              cwd = path.dirname(uri.fsPath),
              def = this.getDefaultDefinition(target, folder, uri),
              options: ShellExecutionOptions = { cwd },
              args: string[] = [];

        if (!def) {
            log.error(`Script extension type ${target} not found in mapping`);
            return;
        }

        let isWinShell = false,
            exec: string = scriptDef.exec,
            fileName = path.basename(uri.fsPath),
            sep: string = (process.platform === "win32" ? "\\" : "/");

        //
        // If the default terminal cmd/powershell?  On linux and darwin, no, on windows, maybe...
        //
        if (process.platform === "win32")
        {
            isWinShell = true;
            const winShell: string | undefined = workspace.getConfiguration().get("terminal.integrated.shell.windows");
            if (winShell?.includes("bash.exe")) {
                sep = "/";
                isWinShell = false;
            }
        }

        //
        // Handle bash script on windows - set the shell executable as bash.exe if it isnt the default.
        // This can be set by users in settings, otherwise Git Bash will be tried in the default install
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

        //
        // Identify the 'executable'
        //
        const fileNamePathPre = "." + sep + fileName;
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
        if (scriptDef.type === "python" && fileName.toLowerCase() === "setup.py")
        {
            args.push("bdist_egg");
            fileName = "build egg";
        }

        //
        // Add extra arguments is specified
        //
        if (xArgs) {
            args.push(...xArgs);
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
        // TODO - match a problem matcher to script type
        //
        const problemMatcher = "$msCompile";


        log.methodDone("create script task", 2, "   ");
        //
        // Create the shell execution object and task
        //
        const execution = new ShellExecution(exec, args, options);
        return new Task(def, folder, fileName, scriptDef.type, execution, problemMatcher);
    }


    private getDefaultDefinition(target: string, folder: WorkspaceFolder, uri: Uri): TaskExplorerDefinition | undefined
    {
        const tgt = target?.toLowerCase(),
              scriptDef = this.scriptTable[tgt],
              fileName = path.basename(uri.fsPath);

        if (!scriptDef) {
            return;
        }

        const def: TaskExplorerDefinition = {
            type: "script",
            script: target.toLowerCase(),
            target: tgt,
            scriptType: scriptDef.type || "unknown",
            fileName,
            scriptFile: true, // set scriptFile to true to include all scripts in folder instead of grouped at file
            path: util.getRelativePath(folder, uri),
            takesArgs: false,
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
            def.takesArgs = (new RegExp("%[1-9]")).test(contents);
        }

        return def;
    }


    public getDocumentPosition(): number
    {
        return 0;
    }

    /**
     * Override TaskExplorerProvider
     *
     * @param logPad Log padding
     */
    protected async readTasks(logPad: string): Promise<Task[]>
    {
        const allTasks: Task[] = [],
              visitedFiles: Set<string> = new Set(),
              paths = filesCache.get(this.providerName);

        log.methodStart(`detect ${this.providerName} files`, 1, logPad, true, [["path", paths ? paths.size : 0]]);

        if (paths)
        {
            for (const fObj of paths)
            {
                if (!util.isExcluded(fObj.uri.path) && !visitedFiles.has(fObj.uri.fsPath) && util.pathExists(fObj.uri.fsPath))
                {
                    visitedFiles.add(fObj.uri.fsPath);
                    const task = this.createTask(path.extname(fObj.uri.fsPath).substring(1), undefined, fObj.folder, fObj.uri);
                    if (task && configuration.get<boolean>(util.getTaskEnabledSettingName(task.source)))
                    {
                        allTasks.push(task);
                        log.write(`   processed ${this.providerName} file`, 3, logPad);
                        log.value("      script file", fObj.uri.fsPath, 3, logPad);
                    }
                }
            }
        }

        log.methodDone(`detect ${this.providerName} files`, 1, logPad, true, [["# of tasks", allTasks.length]]);
        return allTasks;
    }


    public async readUriTasks(uri: Uri, logPad: string): Promise<Task[]>
    {
        const folder = workspace.getWorkspaceFolder(uri);
        log.methodStart("read script file uri task", 1, logPad, true, [["path", uri?.fsPath], ["project folder", folder?.name]]);
        let task: Task | undefined;
        if (folder) {
            task = this.createTask(path.extname(uri.fsPath).substring(1), undefined, folder, uri);
        }
        log.methodDone("read script file uri task", 1, logPad, true);
        return task ? [ task ] : [];
    }

}
