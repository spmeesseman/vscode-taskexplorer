
import log from "../lib/log/log";
import { Globs } from "../lib/constants";
import { basename, dirname, sep, extname, join } from "path";
import { TaskExplorerProvider } from "./provider";
import { getRelativePath } from "../lib/utils/pathUtils";
import { configuration } from "../lib/utils/configuration";
import { ITaskDefinition } from "../interface/ITaskDefinition";
import { readFileSync } from "../lib/utils/fs";
import { Task, WorkspaceFolder, ShellExecution, Uri, workspace, ShellExecutionOptions } from "vscode";


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
            pm: "$bashTe",
            enabled: configuration.get("enabledTasks.bash")
        },
        py: {
            exec: configuration.get("pathToPrograms.python"),
            type: "python",
            args: [],
            pm: "$msCompile",
            enabled: configuration.get("enabledTasks.python")
        },
        rb: {
            exec: configuration.get("pathToPrograms.ruby"),
            type: "ruby",
            args: [],
            pm: "$msCompile",
            enabled: configuration.get("enabledTasks.ruby")
        },
        ps1: {
            exec: configuration.get("pathToPrograms.powershell"),
            type: "powershell",
            args: [],
            pm: "$msCompile",
            enabled: configuration.get("enabledTasks.powershell")
        },
        pl: {
            exec: configuration.get("pathToPrograms.perl"),
            type: "perl",
            args: [],
            pm: "$msCompile",
            enabled: configuration.get("enabledTasks.perl")
        },
        bat: {
            exec: "cmd",
            type: "batch",
            args: [ "/c" ],
            pm: "$batchTe",
            enabled: configuration.get("enabledTasks.batch")
        },
        cmd: {
            exec: "cmd",
            type: "batch",
            args: [ "/c" ],
            pm: "$batchTe",
            enabled: configuration.get("enabledTasks.batch")
        },
        nsi: {
            exec: configuration.get("pathToPrograms.nsis"),
            type: "nsis",
            args: [],
            enabled: configuration.get("enabledTasks.nsis")
        }
    };


    public createTask(target: string, cmd: string | undefined, folder: WorkspaceFolder, uri: Uri, xArgs: string[] = [], logPad?: string): Task | undefined
    {
        log.methodStart("create script task", 4, logPad, false, [
            [ "target", target ], [ "cmd", cmd ],  [ "project", folder.name ], [ "path", uri.fsPath ]
        ], this.logQueueId);

        const extension = target.toLowerCase(),
              scriptDef = this.scriptTable[extension],
              cwd = dirname(uri.fsPath),
              def = this.getDefaultDefinition(target, folder, uri),
              options: ShellExecutionOptions = { cwd },
              args: string[] = [];

        if (!def) {
            log.error(`Script extension type ${target} not found in script file mapping`, undefined, this.logQueueId);
            return;
        }

        let exec: string = scriptDef.exec,
            fileName = def.fileName as string;

        const fileNamePathPre = join(".", fileName);
        if (scriptDef.type === "bash")
        {
            exec = fileNamePathPre;
        }
        else // All scripts except for 'bash'
        {   //
            // Add any defined arguments to the command line exec
            //
            args.push(...scriptDef.args);
            //
            // Add the filename as an argument to the script exe (i.e. 'powershell', 'cmd', etc)
            // For Powershell,it must be in '.\...' format (fileNamePathPre)
            //
            args.push(scriptDef.type !== "powershell" ? fileName : fileNamePathPre);
        }
        //
        // For python setup.py scripts, use the bdist_egg argument - the egg will be built and
        // stored at dist/PackageName-Version.egg
        //
        if (scriptDef.type === "python" && fileName.toLowerCase() === "setup.py")
        {
            args.push("bdist_egg");
            fileName = "build egg";
        }
        //
        // Add any additional arguments to the end of the arguments list
        //
        args.push(...xArgs);
        //
        // Make sure there are no windows style slashes in any configured path to an executable
        // if this isnt running in a windows shell
        //
        exec = exec.replace(/\\/g, sep);
        //
        // Create the shell execution object
        //
        const execution = new ShellExecution(exec, args, options);
        //
        // Create the task
        //
        const task = new Task(def, folder, fileName, scriptDef.type, execution, scriptDef.pm);
        //
        // All done
        //
        log.methodDone("create script task", 4, logPad, [
            [ "type", scriptDef.type ], [ "file name", fileName ], [ "project", folder.name ], [ "args", args ]
        ], this.logQueueId);
        return task;
    }


    private getDefaultDefinition(target: string, folder: WorkspaceFolder, uri: Uri): ITaskDefinition | undefined
    {
        /* istanbul ignore next */
        const tgt = target?.toLowerCase(),
              scriptDef = this.scriptTable[tgt],
              fileName = basename(uri.fsPath);

        if (!scriptDef || !scriptDef.type) {
            return;
        }

        const def: ITaskDefinition = {
            type: scriptDef.type,
            script: target.toLowerCase(),
            target: tgt,
            fileName,
            scriptFile: true, // set scriptFile to true to include all scripts in folder instead of grouped at file
            path: getRelativePath(folder, uri),
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


    public override getGlobPattern()
    {
        return Globs[`GLOB_${this.providerName.replace(/\-/g, "").toUpperCase()}`];
    }


    public async readUriTasks(uri: Uri, logPad: string): Promise<Task[]>
    {
        const folder = workspace.getWorkspaceFolder(uri) as WorkspaceFolder;
        log.methodStart("read script file uri task", 3, logPad, false, [
            [ "path", uri.fsPath ], [ "project folder", folder.name ]
        ], this.logQueueId);
        const task = this.createTask(extname(uri.fsPath).substring(1), undefined, folder, uri, undefined, logPad + "   ");
        log.methodDone("read script file uri task", 3, logPad, [[ "# of tasks found", 1 ]], this.logQueueId);
        /* istanbul ignore next */
        return task ? [ task ] : [];
    }

}
