
import { Task, WorkspaceFolder, ShellExecution, Uri, workspace, ShellExecutionOptions } from "vscode";
import * as path from "path";
import * as util from "../common/utils";
import * as log from "../common/log";
import { filesCache } from "../cache";
import { TaskExplorerProvider } from "./provider";
import { TaskExplorerDefinition } from "../taskDefinition";


export class AppPublisherTaskProvider extends TaskExplorerProvider implements TaskExplorerProvider
{

    constructor() { super("app-publisher"); }


    public createTask(target: string, cmd: string, folder: WorkspaceFolder, uri: Uri, xArgs: string[]): Task
    {
        return this.readUriTasks(uri, null, "   ")[0];
    }


    public getDefaultDefinition(target: string, folder: WorkspaceFolder, uri: Uri): TaskExplorerDefinition
    {
        const def: TaskExplorerDefinition = {
            type: "app-publisher",
            script: target,
            target,
            fileName: path.basename(uri.fsPath),
            path: util.getRelativePath(folder, uri),
            cmdLine: "npx app-publisher -p ps --no-ci",
            takesArgs: false,
            uri
        };
        return def;
    }


    public async readTasks(logPad = ""): Promise<Task[]>
    {
        log.methodStart("detect app-publisher files", 1, logPad, true);

        const allTasks: Task[] = [];
        const visitedFiles: Set<string> = new Set();
        const paths = filesCache.get("app-publisher");

        if (workspace.workspaceFolders && paths)
        {
            for (const fobj of paths)
            {
                if (!util.isExcluded(fobj.uri.path) && !visitedFiles.has(fobj.uri.fsPath))
                {
                    visitedFiles.add(fobj.uri.fsPath);
                    allTasks.push(...await this.readUriTasks(fobj.uri));
                }
            }
        }

        log.value(logPad + "   # of tasks", allTasks.length, 2, logPad);
        log.methodDone("detect app-publisher files", 1, logPad, true);

        return allTasks;
    }


    public async readUriTasks(uri: Uri, wsFolder?: WorkspaceFolder, logPad = ""): Promise<Task[]>
    {
        const cwd = path.dirname(uri.fsPath),
        folder = wsFolder || workspace.getWorkspaceFolder(uri),
              defaultDef = this.getDefaultDefinition(null, folder, uri),
              options: ShellExecutionOptions = { cwd };

        log.methodStart("read app-publisher file uri task", 1, logPad, true, [["path", uri?.fsPath], ["project folder", folder?.name]]);

        const kind1: TaskExplorerDefinition = {
            ...defaultDef,
            ...{
                cmdLine: "npx app-publisher -p ps --no-ci --republish"
            }
        };

        const kind2: TaskExplorerDefinition = {
            ...defaultDef,
            ...{
                cmdLine: "npx app-publisher -p ps --no-ci --email-only",
            }
        };

        const kind4: TaskExplorerDefinition = {
            ...defaultDef,
            ...{
                cmdLine: "npx app-publisher -p ps --no-ci --dry-run",
            }
        };

        const kind5: TaskExplorerDefinition = {
            ...defaultDef,
            ...{
                cmdLine: "npx app-publisher -p ps --no-ci --mantis-only",
            }
        };

        const kind6: TaskExplorerDefinition = {
            ...defaultDef,
            ...{
                cmdLine: "npx app-publisher -p ps --no-ci --prompt-version",
            }
        };

        //
        // Create the shell execution objects
        //
        const execution1 = new ShellExecution(kind1.cmdLine, options);
        const execution2 = new ShellExecution(kind2.cmdLine, options);
        const execution3 = new ShellExecution(defaultDef.cmdLine, options);
        const execution4 = new ShellExecution(kind4.cmdLine, options);
        const execution5 = new ShellExecution(kind5.cmdLine, options);
        const execution6 = new ShellExecution(kind6.cmdLine, options);

        log.methodDone("read app-ublisher file uri tasks", 1, logPad, true);

        return [ new Task(kind4, folder, "Dry Run", "app-publisher", execution4, undefined),
                new Task(defaultDef, folder, "Publish", "app-publisher", execution3, undefined),
                new Task(kind1, folder, "Re-publish", "app-publisher", execution1, undefined),
                new Task(kind1, folder, "Publish Mantis Release", "app-publisher", execution5, undefined),
                new Task(kind5, folder, "Send Release Email", "app-publisher", execution2, undefined),
                new Task(kind6, folder, "Publish (Prompt Version)", "app-publisher", execution6, undefined) ];
    }

}
