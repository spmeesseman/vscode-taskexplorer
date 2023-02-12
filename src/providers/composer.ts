
import { log } from "../lib/log/log";
import { basename, dirname } from "path";
import { IDictionary } from "../interface";
import { TeWrapper } from "src/lib/wrapper";
import { getRelativePath } from "../lib/utils/pathUtils";
import { configuration } from "../lib/utils/configuration";
import { TaskExplorerProvider } from "./provider";
import { ITaskDefinition } from "../interface/ITaskDefinition";
import { readJsonAsync } from "../lib/utils/fs";
import { Task, TaskGroup, WorkspaceFolder, ShellExecution, Uri, workspace } from "vscode";


export class ComposerTaskProvider extends TaskExplorerProvider implements TaskExplorerProvider
{
    private commands: IDictionary<string> = {
        aix: "composer",
        darwin: "composer",
        freebsd: "composer",
        linux: "composer",
        openbsd: "composer",
        sunos: "composer",
        win32: "composer.exe"
    };


    constructor(wrapper: TeWrapper) { super(wrapper, "composer"); }


    public createTask(target: string, cmd: string, folder: WorkspaceFolder, uri: Uri): Task
    {
        const getCommand = (): string =>
        {
            return configuration.get<string>("pathToPrograms.composer", this.commands[process.platform]);
        };

        const def = this.getDefaultDefinition(target, folder, uri);
        const cwd = dirname(uri.fsPath);
        const args = [ "run-script", target ];
        const options = { cwd };
        const execution = new ShellExecution(getCommand(), args, options);

        return new Task(def, folder, target, "composer", execution, undefined);
    }


    private async findTargets(fsPath: string, logPad: string)
    {
        const targets: string[] = [];

        log.methodStart("find composer targets", 4, logPad, false, [[ "path", fsPath ]], this.logQueueId);

        try {
            const json = await readJsonAsync<any>(fsPath),
                  scripts = json.scripts;
            if (scripts) {
                Object.keys(scripts).forEach((k) => {
                    targets.push(k);
                    log.value("   found composer task", k, 4, logPad, this.logQueueId);
                });
            }
        } catch {
            log.error("Invalid JSON found in " + fsPath, undefined, this.logQueueId);
        }

        log.methodDone("Find composer targets", 4, logPad, undefined, this.logQueueId);
        return targets;
    }


    private getDefaultDefinition(target: string, folder: WorkspaceFolder, uri: Uri): ITaskDefinition
    {
        const def: ITaskDefinition = {
            type: "composer",
            script: target,
            target,
            path: getRelativePath(folder, uri),
            fileName: basename(uri.path),
            uri
        };
        return def;
    }


    public getDocumentPosition(scriptName: string | undefined, documentText: string | undefined): number
    {
        if (documentText)
        {
            const idx = documentText.indexOf("\"scripts\"");
            if (idx !== -1 && scriptName)
            {
                const idx2 = documentText.indexOf(`"${scriptName}"`);
                return idx2 !== -1 ? idx2 : idx;
            }
        }
        return 0;
    }


    public async readUriTasks(uri: Uri, logPad: string): Promise<Task[]>
    {
        const result: Task[] = [],
              folder = workspace.getWorkspaceFolder(uri) as WorkspaceFolder;

        log.methodStart("read composer file uri task", 3, logPad, false, [
            [ "path", uri.fsPath ], [ "project folder", folder.name ]
        ], this.logQueueId);

        const scripts = await this.findTargets(uri.fsPath, logPad + "   ");
        for (const s of scripts)
        {
            const task = this.createTask(s, s, folder, uri);
            task.group = TaskGroup.Build;
            result.push(task);
        }

        log.methodDone("read composer file uri task", 3, logPad, [[ "#of tasks found", result.length ]], this.logQueueId);
        return result;
    }

}
