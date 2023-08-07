
import { execFile } from "child_process";
import * as path from "path";
import { promisify } from "util";
import { ShellExecution, Task, TaskGroup, Uri, WorkspaceFolder, workspace } from "vscode";
import { configuration } from "../common/configuration";
import * as log from "../common/log";
import * as util from "../common/utils";
import { TaskExplorerDefinition } from "../interface/taskDefinition";
import { TaskExplorerProvider } from "./provider";

interface Command {
    name: string;
    description: string;
    hidden: boolean;
}

const _execFile = promisify(execFile);

export class LaravelTaskProvider extends TaskExplorerProvider implements TaskExplorerProvider
{

    constructor() { super("laravel"); }


    public createTask(target: string, cmd: string, folder: WorkspaceFolder, uri: Uri): Task
    {
        const getCommand = (): string =>
        {
            let artisan = "./artisan";
            /* istanbul ignore else */
            if (configuration.get<string>("pathToPrograms.laravel")) {
                artisan = configuration.get("pathToPrograms.laravel");
            }
            return artisan;
        };

        const def = this.getDefaultDefinition(target, folder, uri);
        const cwd = path.dirname(uri.fsPath);
        const args = [ cmd ];
        const options = { cwd };
        const execution = new ShellExecution(getCommand(), args, options);

        return new Task(def, folder, target.replace(":", "-"), "laravel", execution, undefined);
    }


    private async findTargets(fsPath: string, logPad: string): Promise<string[]>
    {
        let targets: string[] = [];

        log.methodStart("find laravel targets", 1, logPad, true, [[ "path", fsPath ]]);

        try {
            // laravel list --format=json --short
            // .commands filter hidden === false
            const { stdout } = await _execFile(fsPath, [ "list", "--format=json", "--short" ], {
                cwd: path.dirname(fsPath),
            });
            const data = JSON.parse(stdout);
            const commands = data.commands as Command[];
            targets = commands.filter(cmd => !cmd.hidden).map(cmd => cmd.name);
        } catch {
            log.error("Invalid JSON found in " + fsPath);
        }

        log.methodDone("find laravel targets", 1, logPad, true);
        return targets;
    }


    private getDefaultDefinition(target: string, folder: WorkspaceFolder, uri: Uri): TaskExplorerDefinition
    {
        return {
            type: "laravel",
            script: target,
            target,
            path: util.getRelativePath(folder, uri),
            fileName: path.basename(uri.path),
            uri
        };
    }


    public getDocumentPosition(scriptName: string | undefined, documentText: string | undefined): number
    {
        if (documentText)
        {
            const idx = documentText.indexOf("\"scripts\"");
            if (idx !== -1 && scriptName)
            {
                const idx2 = documentText.indexOf(`"${scriptName}"`);
                /* istanbul ignore next */
                return idx2 !== -1 ? idx2 : idx;
            }
        }
        return 0;
    }


    public async readUriTasks(uri: Uri, logPad: string): Promise<Task[]>
    {
        const result: Task[] = [],
              folder = workspace.getWorkspaceFolder(uri) as WorkspaceFolder;

        log.methodStart("read laravel file uri task", 1, logPad, true, [["path", uri.fsPath], ["project folder", folder.name]]);

        const scripts = await this.findTargets(uri.fsPath, logPad + "   ");
        for (const s of scripts)
        {
            const task = this.createTask(s, s, folder, uri);
            task.group = TaskGroup.Build;
            result.push(task);
        }

        log.methodDone("read laravel file uri task", 1, logPad, true);
        return result;
    }

}
