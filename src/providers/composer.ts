
import { Task, TaskGroup, WorkspaceFolder, ShellExecution, Uri, workspace } from "vscode";
import * as path from "path";
import * as util from "../common/utils";
import * as log from "../common/log";
import { configuration } from "../common/configuration";
import { filesCache } from "../cache";
import { TaskExplorerProvider } from "./provider";
import { TaskExplorerDefinition } from "../taskDefinition";


export class ComposerTaskProvider extends TaskExplorerProvider implements TaskExplorerProvider
{

    constructor() { super("composer"); }


    public createTask(target: string, cmd: string, folder: WorkspaceFolder, uri: Uri): Task
    {
        const getCommand = (): string =>
        {
            let composer = "composer";
            if (process.platform === "win32") {
                composer = "composer.exe";
            }
            if (configuration.get<string>("pathToComposer")) {
                composer = configuration.get("pathToComposer");
            }
            return composer;
        };

        const def = this.getDefaultDefinition(target, folder, uri);
        const cwd = path.dirname(uri.fsPath);
        const args = ["run-script", target];
        const options = { cwd };
        const execution = new ShellExecution(getCommand(), args, options);

        return new Task(def, folder, target, "composer", execution, undefined);
    }


    private findTargets(fsPath: string, logPad: string): string[]
    {
        const targets: string[] = [];

        log.methodStart("find composer targets", 1, logPad, true);

        try {
            const json = JSON.parse(util.readFileSync(fsPath)),
                scripts = json.scripts;

            if (scripts) {
                Object.keys(scripts).forEach((k) => { targets.push(k); });
            }
        } catch {
            log.error("Invalid JSON found in " + fsPath);
        }

        log.methodDone("Find composer targets", 1, logPad, true);
        return targets;
    }


    private getDefaultDefinition(target: string, folder: WorkspaceFolder, uri: Uri): TaskExplorerDefinition
    {
        const def: TaskExplorerDefinition = {
            type: "composer",
            script: target,
            target,
            path: util.getRelativePath(folder, uri),
            fileName: path.basename(uri.path),
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

        log.methodStart("read composer file uri task", 1, logPad, true, [["path", uri.fsPath], ["project folder", folder.name]]);

        const scripts = this.findTargets(uri.fsPath, logPad + "   ");
        for (const s of scripts)
        {
            const task = this.createTask(s, s, folder, uri);
            task.group = TaskGroup.Build;
            result.push(task);
        }

        log.methodDone("read composer file uri task", 1, logPad, true);
        return result;
    }

}
