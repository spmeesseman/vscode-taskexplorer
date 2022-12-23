
import * as path from "path";
import * as util from "../common/utils";
import * as log from "../common/log";
import constants from "../common/constants";
import { configuration } from "../common/configuration";
import { filesCache } from "../cache";
import { TaskExplorerProvider } from "./provider";
import { TaskExplorerDefinition } from "../interface/taskDefinition";
import { Task, WorkspaceFolder, ShellExecution, Uri, workspace, ShellExecutionOptions } from "vscode";


export class ScriptTaskProvider extends TaskExplorerProvider implements TaskExplorerProvider
{

    constructor() { super("script"); }


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


    public createTask(target: string, cmd: string | undefined, folder: WorkspaceFolder, uri: Uri, xArgs?: string[]): Task | undefined
    {
        log.methodStart("create script task", 2, "   ", false, [[ "target", target ], [ "cmd", cmd ], [ "path", uri.fsPath ]]);

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
            sep: string = path.sep;

        //
        // If the default terminal cmd/powershell?  On linux and darwin, no, on windows, maybe...
        //
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


        log.methodDone("create script task", 2, "   ");
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

        if (!scriptDef) {
            return;
        }

        const def: TaskExplorerDefinition = {
            type: "script",
            script: target.toLowerCase(),
            target: tgt,
            scriptType: scriptDef.type || /* istanbul ignore next */ "unknown",
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


    public getGlobPattern(scriptType: string)
    {
        if (scriptType === "bash") {
            return util.getCombinedGlobPattern(constants.GLOB_BASH, configuration.get<string[]>("globPatternsBash", []));
        }
        return constants[`GLOB_${scriptType.replace(/\-/g, "").toUpperCase()}`];
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

        log.methodStart(`detect ${this.providerName} files`, 1, logPad, true, [[ "path", paths ? paths.size : 0 ]]);

        if (paths)
        {
            for (const fObj of paths)
            {
                if (!util.isExcluded(fObj.uri.path) && !visitedFiles.has(fObj.uri.fsPath) && util.pathExists(fObj.uri.fsPath))
                {
                    visitedFiles.add(fObj.uri.fsPath);
                    const task = this.createTask(path.extname(fObj.uri.fsPath).substring(1), undefined, fObj.folder, fObj.uri);
                    if (task && configuration.get<boolean>(util.getTaskTypeEnabledSettingName(task.source)))
                    {
                        allTasks.push(task);
                        log.write(`   processed ${this.providerName} file`, 3, logPad);
                        log.value("      script file", fObj.uri.fsPath, 3, logPad);
                    }
                }
            }
        }

        log.methodDone(`detect ${this.providerName} files`, 1, logPad, true, [[ "# of tasks", allTasks.length ]]);
        return allTasks;
    }


    public async readUriTasks(uri: Uri, logPad: string): Promise<Task[]>
    {
        const folder = workspace.getWorkspaceFolder(uri) as WorkspaceFolder;
        log.methodStart("read script file uri task", 1, logPad, true, [[ "path", uri.fsPath ], [ "project folder", folder.name ]]);
        const task = this.createTask(path.extname(uri.fsPath).substring(1), undefined, folder, uri);
        log.methodDone("read script file uri task", 1, logPad, true);
        /* istanbul ignore next */
        return task ? [ task ] : [];
    }

}
