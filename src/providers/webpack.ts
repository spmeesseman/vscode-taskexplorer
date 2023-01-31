
import log from "../lib/log/log";
import { basename, dirname } from "path";
import { TaskExplorerProvider } from "./provider";
import { getRelativePath } from "../lib/utils/pathUtils";
import { ITaskDefinition } from "../interface/ITaskDefinition";
import { Task, WorkspaceFolder, ShellExecution, Uri, workspace, ShellExecutionOptions } from "vscode";
import { configuration } from "../lib/utils/configuration";


export class WebpackTaskProvider extends TaskExplorerProvider implements TaskExplorerProvider
{

    constructor() { super("webpack"); }


    public createTask(target: string, cmd: "npx", folder: WorkspaceFolder, uri: Uri, xArgs: string[]): Task
    {
        const def = this.getDefaultDefinition(target, folder, uri);
        const args = [ "webpack", ...xArgs ];
        const options: ShellExecutionOptions = { cwd: dirname(uri.fsPath) };
        const execution = new ShellExecution(cmd, args, options);
        return new Task(def, folder, target, "webpack", execution, "$webpackte");
    }


    private getDefaultDefinition(target: string, folder: WorkspaceFolder, uri: Uri): ITaskDefinition
    {
        const def: ITaskDefinition =
        {
            type: "webpack",
            script: target,
            target,
            fileName: basename(uri.fsPath),
            path: getRelativePath(folder, uri),
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
        const tasks: Task[] = [],
              folder = workspace.getWorkspaceFolder(uri) as WorkspaceFolder,
              groupSep = configuration.get<string>("groupSeparator"),
              path = getRelativePath(folder, uri);

        log.methodStart("read webpack uri task", 3, logPad, false, [[ "project folder", folder.name ], [ "path", uri.fsPath ]], this.logQueueId);

        tasks.push(this.createTask(`build${groupSep}dev`, "npx", folder, uri, [ "--env", "environment=dev", "--config", "./" + path ]));
        tasks.push(this.createTask(`build${groupSep}prod`, "npx", folder, uri, [ "--mode", "production", "--env", "environment=dev", "--config", "./" + path ]));
        tasks.push(this.createTask(`build${groupSep}test`, "npx", folder, uri, [ "--env", "environment=test", "--config", "./" + path ]));
        tasks.push(this.createTask(`rebuild${groupSep}dev`, "npx", folder, uri, [ "-w", "--env", "environment=dev", "--config", "./" + path ]));
        tasks.push(this.createTask(`rebuild${groupSep}prod`, "npx", folder, uri, [ "--mode", "production", "--env", "environment=dev", "--config", "./" + path ]));
        tasks.push(this.createTask("watch", "npx", folder, uri, [ "-w", "--env", "environment=dev", "--config", "./" + path ]));

        log.methodDone("read webpack uri tasks", 4, logPad, [[ "# of tasks found", tasks.length ]], this.logQueueId);
        return tasks;
    }

}
