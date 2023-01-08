
import * as bombadil from "@sgarciac/bombadil";
import * as log from "../lib/utils/log";
import * as util from "../lib/utils/utils";
import { TaskExplorerProvider } from "./provider";
import { TaskExplorerDefinition } from "../interface/taskDefinition";
import { configuration } from "../lib/utils/configuration";
import { readFileAsync } from "../lib/utils/fs";
import { Task, TaskGroup, WorkspaceFolder, ShellExecution, Uri, workspace, ShellExecutionOptions } from "vscode";
import { basename, dirname } from "path";


/**
 * Parses [scripts] from the pipenv Python package manager's Pipfile.
 */
export class PipenvTaskProvider extends TaskExplorerProvider implements TaskExplorerProvider
{

    constructor() { super("pipenv"); }


    public createTask(target: string, cmd: string, folder: WorkspaceFolder, uri: Uri): Task
    {
        const pipenv = configuration.get<string>("pathToPrograms.pipenv");
        let pythonPath = pipenv;

        /* istanbul ignore else */
        if (pipenv === "pipenv") {
            // If the user didn't explicitly set a pathToPrograms.pipenv (meaning it is the default value),
            // then use the python path from the environment to run pipenv as a module. This way it
            // has the best chance of using the correct Python environment (virtual, global,...).
            pythonPath = workspace.getConfiguration("python").get("pythonPath", "python");
        }

        const def = this.getDefaultDefinition(target, folder, uri);
        const cwd = dirname(uri.fsPath);
        const args = [ "run", target ];
        /* istanbul ignore else */
        if (pythonPath) {
            // If using python path, run pipenv as a module.
            args.unshift(...[ "-m", "pipenv" ]);
        }
        const options: ShellExecutionOptions = { cwd };
        const execution = new ShellExecution(pythonPath, args, options);

        return new Task(def, folder, target, "pipenv", execution, "$msCompile");
    }


    private async findTargets(fsPath: string, logPad: string)
    {
        const scripts: string[] = [];

        log.methodStart("find pipenv Pipfile targets", 4, logPad, false, [[ "path", fsPath ]], this.logQueueId);

        const contents = await readFileAsync(fsPath);

        // Using @sgarciac/bombadil package to parse the TOML Pipfile.
        const pipfile = new bombadil.TomlReader();
        pipfile.readToml(contents);

        Object.entries(/* istanbul ignore next */pipfile.result?.scripts ?? {}).forEach(([ scriptName, _scriptCmd ]) => {
            // Only need the script name, not the whole command, since it is run as `pipenv run <scriptName>`
            scripts.push(scriptName);
            log.value("   found pipenv pipfile task", scriptName, 4, logPad, this.logQueueId);
        });

        log.methodDone("find pipenv Pipfile targets", 4, logPad, undefined, this.logQueueId);

        return scripts;
    }


    private getDefaultDefinition(target: string, folder: WorkspaceFolder, uri: Uri): TaskExplorerDefinition
    {
        const def: TaskExplorerDefinition = {
            type: "pipenv",
            script: target,
            target,
            path: util.getRelativePath(folder, uri),
            fileName: basename(uri.path),
            uri
        };
        return def;
    }


    public getDocumentPosition(taskName: string | undefined, documentText: string | undefined): number
    {
        /* istanbul ignore if */
        if (!taskName || !documentText) {
            return 0;
        }
        return this.getDocumentPositionLine("", taskName, documentText, 0 , 0, true);
    }


    public async readUriTasks(uri: Uri, logPad: string): Promise<Task[]>
    {
        const result: Task[] = [],
              folder = workspace.getWorkspaceFolder(uri) as WorkspaceFolder;

        log.methodStart("read pipenv Pipfile file uri tasks", 3, logPad, false, [
            [ "path", uri.fsPath ], [ "project folder", folder.name ]
        ], this.logQueueId);

        const scripts = await this.findTargets(uri.fsPath, logPad + "   ");
        for (const s of scripts)
        {
            const task = this.createTask(s, s, folder, uri);
            task.group = TaskGroup.Build;
            result.push(task);
        }

        log.methodDone("read pipenv Pipfile file uri tasks", 3, logPad, [[ "#of tasks found", result.length ]], this.logQueueId);
        return result;
    }
}
