
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


    public createTask(target: string, cmd: "webpack" |"cross-env", folder: WorkspaceFolder, uri: Uri, xArgs: string[]): Task
    {
        const def = this.getDefaultDefinition(target, folder, uri);
        const args = [ cmd, ...xArgs, "--config", "./" + def.fileName ];
        const options: ShellExecutionOptions = { cwd: dirname(uri.fsPath) };
        const execution = new ShellExecution("npx", args, options);
        return new Task(def, folder, target, "webpack", execution, "$webpackTe");
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
              groupSep = configuration.get<string>("groupSeparator");

        log.methodStart("read webpack uri tasks", 3, logPad, false, [[ "project folder", folder.name ], [ "path", uri.fsPath ]], this.logQueueId);

        tasks.push(this.createTask(`build${groupSep}dev`, "webpack", folder, uri, [ "--mode", "development", "--env", "environment=dev" ]));
        tasks.push(this.createTask(`build${groupSep}dev*verbose`, "webpack", folder, uri, [ "--stats", "verbose", "--mode", "development", "--env", "environment=dev" ]));
        tasks.push(this.createTask(`build${groupSep}prod`, "webpack", folder, uri, [ "--mode", "production" ]));
        tasks.push(this.createTask(`build${groupSep}prod*verbose`, "webpack", folder, uri, [ "--stats", "verbose", "--mode", "production" ]));
        tasks.push(this.createTask(`build${groupSep}test`, "webpack", folder, uri, [ "--mode", "development", "--env", "environment=test" ]));
        tasks.push(this.createTask(`rebuild${groupSep}dev`, "webpack", folder, uri, [ "--mode", "development", "--env", "environment=dev", "--env", "clean=true" ]));
        tasks.push(this.createTask(`rebuild${groupSep}prod`, "webpack", folder, uri, [ "--mode", "production", "--env", "clean=true" ]));
        tasks.push(this.createTask(`crossenv${groupSep}build${groupSep}dev`, "cross-env", folder, uri, [ "webpack", "--mode", "development", "--env", "environment=dev" ]));
        tasks.push(this.createTask(`crossenv${groupSep}build${groupSep}dev*verbose`, "cross-env", folder, uri, [ "webpack", "--stats", "verbose", "--mode", "development", "--env", "environment=dev" ]));
        tasks.push(this.createTask(`crossenv${groupSep}build${groupSep}prod`, "cross-env", folder, uri, [ "webpack", "--mode", "production" ]));
        tasks.push(this.createTask(`crossenv${groupSep}build${groupSep}prod*verbose`, "cross-env", folder, uri, [ "webpack", "--stats", "verbose", "--mode", "production" ]));
        tasks.push(this.createTask(`crossenv${groupSep}build${groupSep}test`, "cross-env", folder, uri, [ "webpack", "--mode", "development", "--env", "environment=test" ]));
        tasks.push(this.createTask(`crossenv${groupSep}rebuild${groupSep}dev`, "cross-env", folder, uri, [ "webpack", "--mode", "development", "--env", "environment=dev", "--env", "clean=true" ]));
        tasks.push(this.createTask(`crossenv${groupSep}rebuild${groupSep}prod`, "cross-env", folder, uri, [ "webpack", "--mode", "production", "--env", "clean=true" ]));
        tasks.push(this.createTask("watch", "webpack", folder, uri, [ "-w", "--env", "environment=dev" ]));

        log.methodDone("read webpack uri tasks", 4, logPad, [[ "# of tasks found", tasks.length ]], this.logQueueId);
        return tasks;
    }

}
