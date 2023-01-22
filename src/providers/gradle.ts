
import log from "../lib/log/log";
import { basename, dirname } from "path";
import { readFileAsync } from "../lib/utils/fs";
import { TaskExplorerProvider } from "./provider";
import { getRelativePath } from "../lib/utils/utils";
import { configuration } from "../lib/utils/configuration";
import { IDictionary, ITaskDefinition } from "../interface";
import { Task, TaskGroup, WorkspaceFolder, ShellExecution, Uri, workspace } from "vscode";


export class GradleTaskProvider extends TaskExplorerProvider implements TaskExplorerProvider
{
    private commands: IDictionary<string> = {
        aix: "gradlew",
        darwin: "gradlew",
        freebsd: "gradlew",
        linux: "gradlew",
        openbsd: "gradlew",
        sunos: "gradlew",
        win32: "gradlew.bat"
    };

    constructor() { super("gradle"); }


    public createTask(target: string, cmd: string, folder: WorkspaceFolder, uri: Uri): Task
    {
        const getCommand = (): string => configuration.get<string>("pathToPrograms.gradle", this.commands[process.platform]);
        const def = this.getDefaultDefinition(target, folder, uri);
        const cwd = dirname(uri.fsPath);
        const args = [ target ];
        const options = { cwd };
        const execution = new ShellExecution(getCommand(), args, options);
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
                const idx1 = line.trimLeft().indexOf(" ") + 1;
                let idx2 = line.indexOf("(", idx1);
                if (idx2 === -1) {
                    idx2 = line.indexOf("{", idx1);
                }
                if (idx2 > idx1)
                {
                    const tgtName = line.substring(idx1, idx2).trim();
                    scripts.push(tgtName);
                    log.value("   found gradle task", tgtName, 4, logPad, this.logQueueId);
                }
            }
            idx = eol + 1;
            eol = contents.indexOf("\n", idx);
        }

        log.methodDone("Find gradle targets", 4, logPad, undefined, this.logQueueId);
        return scripts;
    }


    private getDefaultDefinition(target: string, folder: WorkspaceFolder, uri: Uri): ITaskDefinition
    {
        const def: ITaskDefinition = {
            type: "gradle",
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
        const idx = documentText?.indexOf("task " + (scriptName || ""));
        return idx && idx !== -1 ? idx : 0;
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
