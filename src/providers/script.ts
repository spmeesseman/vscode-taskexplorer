
import * as path from "path";
import * as util from "../lib/utils/utils";
import * as log from "../lib/utils/log";
import constants from "../lib/constants";
import { configuration } from "../lib/utils/configuration";
import { getTaskFiles } from "../cache";
import { TaskExplorerProvider } from "./provider";
import { TaskExplorerDefinition } from "../interface/taskDefinition";
import { Task, WorkspaceFolder, ShellExecution, Uri, workspace, ShellExecutionOptions } from "vscode";
import { pathExistsSync, readFileSync } from "../lib/utils/fs";


/**
 * @class ScriptTaskProvider
 *
 * Provides `script type` tasks of different `task types`.  A `script` type task is where the
 * file itself is the task, differing from other task providers in that other task providers
 * have one or more tasks defined within the file that need to be parsed.  Examples of `script
 * type` tasks are `bat, `bash, `powershell`, `python`, etc.
 *
 * This provider provides several different `task types`.  Note that `script` is not in itself
 * a `task type`.  It is a `provider type`.  The supported script types are defined in the
 * class property `scriptTable`.
 */
export class ScriptTaskProvider extends TaskExplorerProvider implements TaskExplorerProvider
{

    constructor(name = "script") { super(name); }


    private scriptTable: any = {
        sh: {
            exec: "",
            type: "bash",
            args: [],
            enabled: configuration.get("enabledTasks.bash")
        },
        py: {
            exec: configuration.get("pathToPrograms.python"),
            type: "python",
            args: [],
            enabled: configuration.get("enabledTasks.python")
        },
        rb: {
            exec: configuration.get("pathToPrograms.ruby"),
            type: "ruby",
            args: [],
            enabled: configuration.get("enabledTasks.ruby")
        },
        ps1: {
            exec: configuration.get("pathToPrograms.powershell"),
            type: "powershell",
            args: [],
            enabled: configuration.get("enabledTasks.powershell")
        },
        pl: {
            exec: configuration.get("pathToPrograms.perl"),
            type: "perl",
            args: [],
            enabled: configuration.get("enabledTasks.perl")
        },
        bat: {
            exec: "cmd",
            type: "batch",
            args: [ "/c" ],
            enabled: configuration.get("enabledTasks.batch")
        },
        cmd: {
            exec: "cmd",
            type: "batch",
            args: [ "/c" ],
            enabled: configuration.get("enabledTasks.batch")
        },
        nsi: {
            exec: configuration.get("pathToPrograms.nsis"),
            type: "nsis",
            args: [],
            enabled: configuration.get("enabledTasks.nsis")
        }
    };


    public createTask(target: string, cmd: string | undefined, folder: WorkspaceFolder, uri: Uri, xArgs?: string[], logPad?: string): Task | undefined
    {
        log.methodStart("create script task", 2, logPad, false, [[ "target", target ], [ "cmd", cmd ], [ "path", uri.fsPath ]], this.logQueueId);

        const extension = target.toLowerCase(),
              scriptDef = this.scriptTable[extension],
              cwd = path.dirname(uri.fsPath),
              def = this.getDefaultDefinition(target, folder, uri),
              options: ShellExecutionOptions = { cwd },
              args: string[] = [];

        if (!def) {
            log.error(`Script extension type ${target} not found in mapping`, undefined, this.logQueueId);
            return;
        }

        let isWinShell = false,
            exec: string = scriptDef.exec,
            fileName = path.basename(uri.fsPath),
            sep: string = path.sep;

        //
        // If the default terminal cmd/powershell?  On linux and darwin, no, on windows, maybe...
        //
        /* istanbul ignore else */
        if (process.platform === "win32")
        {
            isWinShell = true;
            const winShell = configuration.getVs<string>("terminal.integrated.shell.windows", "");
            /* istanbul ignore if */ /* istanbul ignore next */
            if (winShell && winShell.includes("bash.exe")) {
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
        /* istanbul ignore else */
        if (isWinShell)
        {
            if (scriptDef.type === "bash")
            {
                let bash = configuration.get<string>("pathToPrograms.bash");
                /* istanbul ignore if */
                if (!bash) {
                    bash = "C:\\Program Files\\Git\\bin\\bash.exe";
                }
                /* istanbul ignore else */
                if (!pathExistsSync(bash)) {
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
            /* istanbul ignore else */
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
        /* istanbul ignore if */
        if (!isWinShell)
        {
            exec = exec.replace(/\\/g, "/");
        }

        //
        // TODO - match a problem matcher to script type
        //
        const problemMatcher = "$msCompile";


        log.methodDone("create script task", 2, logPad, false, undefined, this.logQueueId);
        //
        // Create the shell execution object and task
        //
        const execution = new ShellExecution(exec, args, options);
        return new Task(def, folder, fileName, scriptDef.type, execution, problemMatcher);
    }


    private getDefaultDefinition(target: string, folder: WorkspaceFolder, uri: Uri): TaskExplorerDefinition | undefined
    {
        /* istanbul ignore next */
        const tgt = target?.toLowerCase(),
              scriptDef = this.scriptTable[tgt],
              fileName = path.basename(uri.fsPath);

        if (!scriptDef || !scriptDef.type) {
            return;
        }

        const def: TaskExplorerDefinition = {
            type: scriptDef.type,
            script: target.toLowerCase(),
            target: tgt,
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
            const contents = readFileSync(uri.fsPath);
            def.takesArgs = (new RegExp("%[1-9]")).test(contents);
        }

        return def;
    }


    public getDocumentPosition(): number
    {
        return 0;
    }


    public getGlobPattern()
    {
        return constants[`GLOB_${this.providerName.replace(/\-/g, "").toUpperCase()}`];
    }


    public async readUriTasks(uri: Uri, logPad: string): Promise<Task[]>
    {
        const folder = workspace.getWorkspaceFolder(uri) as WorkspaceFolder;
        log.methodStart("read script file uri task", 1, logPad, false, [
            [ "path", uri.fsPath ], [ "project folder", folder.name ]
        ], this.logQueueId);
        const task = this.createTask(path.extname(uri.fsPath).substring(1), undefined, folder, uri, undefined, logPad + "   ");
        log.methodDone("read script file uri task", 1, logPad, false, [[ "# of tasks found", 1 ]], this.logQueueId);
        /* istanbul ignore next */
        return task ? [ task ] : [];
    }

}
