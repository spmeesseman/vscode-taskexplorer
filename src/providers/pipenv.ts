
import { Task, TaskGroup, WorkspaceFolder, ShellExecution, Uri, workspace, ShellExecutionOptions } from "vscode";
import * as path from "path";
import * as util from "../common/utils";
import * as log from "../common/log";
import { TaskExplorerProvider } from "./provider";
import { TaskExplorerDefinition } from "../taskDefinition";
import { configuration } from "../common/configuration";
import * as bombadil from "@sgarciac/bombadil";

/**
 * Parses [scripts] from the pipenv Python package manager's Pipfile.
 */
export class PipenvTaskProvider extends TaskExplorerProvider implements TaskExplorerProvider
{

    constructor() { super("pipenv"); }


    public createTask(target: string, cmd: string, folder: WorkspaceFolder, uri: Uri): Task
    {
        const pipenv = configuration.get<string>("pathToPipenv");
        let pythonPath: string | null = null;

        if (pipenv === "pipenv") {
            // If the user didn't explicitly set a pathToPipenv (meaning it is the default value),
            // then use the python path from the environment to run pipenv as a module. This way it
            // has the best chance of using the correct Python environment (virtual, global,...).
            pythonPath = workspace.getConfiguration("python").get("pythonPath") ?? "python";
        }

        const def = this.getDefaultDefinition(target, folder, uri);
        const cwd = path.dirname(uri.fsPath);
        const args = [ "run", target ];
        if (pythonPath) {
            // If using python path, run pipenv as a module.
            args.unshift(...["-m", "pipenv"]);
        }
        const options: ShellExecutionOptions = { cwd };
        const execution = new ShellExecution(pythonPath ?? pipenv, args, options);

        return new Task(def, folder, target, "pipenv", execution, "$msCompile");
    }


    private findTargets(fsPath: string, logPad: string): string[]
    {
        const scripts: string[] = [];

        log.methodStart("find pipenv Pipfile targets", 1, logPad, true);

        const contents = util.readFileSync(fsPath);

        // Using @sgarciac/bombadil package to parse the TOML Pipfile.
        const pipfile = new bombadil.TomlReader();
        pipfile.readToml(contents);

        Object.entries(pipfile.result?.scripts ?? {}).forEach(([scriptName, _scriptCmd]) => {
            // Only need the script name, not the whole command, since it is run as `pipenv run <scriptName>`
            scripts.push(scriptName);
            log.write("   found pipenv Pipfile target", 3, logPad);
            log.value("      name", scriptName, 3, logPad);
        });

        log.methodDone("find pipenv Pipfile targets", 1, logPad, true);

        return scripts;
    }


    private getDefaultDefinition(target: string, folder: WorkspaceFolder, uri: Uri): TaskExplorerDefinition
    {
        const def: TaskExplorerDefinition = {
            type: "pipenv",
            script: target,
            target,
            path: util.getRelativePath(folder, uri),
            fileName: path.basename(uri.path),
            uri
        };
        return def;
    }


    public getDocumentPosition(taskName: string | undefined, documentText: string | undefined): number
    {
        if (!taskName || !documentText) {
            return 0;
        }
        return this.getDocumentPositionLine("", taskName, documentText, 0 , 0, true);
    }


    public async readUriTasks(uri: Uri, logPad: string): Promise<Task[]>
    {
        const result: Task[] = [],
              folder = workspace.getWorkspaceFolder(uri) as WorkspaceFolder;

        log.methodStart("read pipenv Pipfile file uri task", 1, logPad, true, [["path", uri.fsPath], ["project folder", folder.name]]);

        const scripts = this.findTargets(uri.fsPath, logPad + "   ");
        for (const s of scripts)
        {
            const task = this.createTask(s, s, folder, uri);
            task.group = TaskGroup.Build;
            result.push(task);
        }

        log.methodDone("read pipenv Pipfile file uri tasks", 1, logPad, true);
        return result;
    }
}
