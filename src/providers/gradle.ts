
import * as path from "path";
import * as util from "../lib/utils/utils";
import log from "../lib/log/log";
import { configuration } from "../lib/utils/configuration";
import { TaskExplorerProvider } from "./provider";
import { TaskExplorerDefinition } from "../interface/taskDefinition";
import { Task, TaskGroup, WorkspaceFolder, ShellExecution, Uri, workspace } from "vscode";
import { readFileAsync } from "../lib/utils/fs";


export class GradleTaskProvider extends TaskExplorerProvider implements TaskExplorerProvider
{

    constructor() { super("gradle"); }


    public createTask(target: string, cmd: string, folder: WorkspaceFolder, uri: Uri): Task
    {
        const getCommand = (folder: WorkspaceFolder, cmd: string): string =>
        {
            let gradle = "gradlew";
            /* istanbul ignore else */
            if (process.platform === "win32") {
                gradle = "gradlew.bat";
            }
            /* istanbul ignore else */
            if (configuration.get<string>("pathToPrograms.gradle")) {
                gradle = configuration.get("pathToPrograms.gradle");
            }
            return gradle;
        };

        const def = this.getDefaultDefinition(target, folder, uri);
        const cwd = path.dirname(uri.fsPath);
        const args = [ target ];
        const options = { cwd };
        const execution = new ShellExecution(getCommand(folder, cmd), args, options);

        return new Task(def, folder, target, "gradle", execution, undefined);
    }


    private async findTargets(fsPath: string, logPad: string)
    {
        const scripts: string[] = [];

        log.methodStart("find gradle targets", 4, logPad, false, [[ "path", fsPath ]], this.logQueueId);

        const contents = await readFileAsync(fsPath);
        let idx = 0;
        let eol = contents.indexOf("\n", 0);

        while (eol !== -1)
        {
            const line: string = contents.substring(idx, eol).trim();
            if (line.length > 0 && line.toLowerCase().trimLeft().startsWith("task "))
            {
                let idx1 = line.trimLeft().indexOf(" ");
                /* istanbul ignore else */
                if (idx1 !== -1)
                {
                    idx1++;
                    let idx2 = line.indexOf("(", idx1);
                    /* istanbul ignore if */
                    if (idx2 === -1) {
                        idx2 = line.indexOf("{", idx1);
                    }
                    /* istanbul ignore else */
                    if (idx2 !== -1)
                    {
                        const tgtName = line.substring(idx1, idx2).trim();
                        /* istanbul ignore else */
                        if (tgtName)
                        {
                            scripts.push(tgtName);
                            log.value("   found gradle task", tgtName, 4, logPad, this.logQueueId);
                        }
                    }
                }
            }

            idx = eol + 1;
            eol = contents.indexOf("\n", idx);
        }

        log.methodDone("Find gradle targets", 4, logPad, undefined, this.logQueueId);
        return scripts;
    }


    private getDefaultDefinition(target: string, folder: WorkspaceFolder, uri: Uri): TaskExplorerDefinition
    {
        const def: TaskExplorerDefinition = {
            type: "gradle",
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
        return 0;
    }


    public async readUriTasks(uri: Uri, logPad: string): Promise<Task[]>
    {
        const result: Task[] = [],
              folder = workspace.getWorkspaceFolder(uri) as WorkspaceFolder;

        log.methodStart("read gradle file uri task", 3, logPad, false, [
            [ "path", uri.fsPath ], [ "project folder", folder.name ]
        ], this.logQueueId);

        const scripts = await this.findTargets(uri.fsPath, logPad + "   ");
        for (const s of scripts)
        {
            const task = this.createTask(s, s, folder, uri);
            task.group = TaskGroup.Build;
            result.push(task);
        }

        log.methodDone("read gradle file uri task", 3, logPad, [[ "#of tasks found", result.length ]], this.logQueueId);
        return result;
    }

}
