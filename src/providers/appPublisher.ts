
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


    public createTask(target: string, cmd: string, folder: WorkspaceFolder, uri: Uri, xArgs: string[]): Task | undefined
    {
        return undefined;
    }


    public getDefaultDefinition(target: string | undefined, folder: WorkspaceFolder, uri: Uri): TaskExplorerDefinition
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


    public getDocumentPosition(scriptName: string | undefined, documentText: string | undefined): number
    {
        return 0;
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
              folder = wsFolder || workspace.getWorkspaceFolder(uri);

        if (!folder) {
            return [];
        }

        const defaultDef = this.getDefaultDefinition(undefined, folder, uri),
              options: ShellExecutionOptions = { cwd };

        log.methodStart("read app-publisher file uri task", 1, logPad, true, [["path", uri?.fsPath], ["project folder", folder?.name]]);

        const kindRepublish: TaskExplorerDefinition = {
            ...defaultDef,
            ...{
                cmdLine: "npx app-publisher -p ps --no-ci --republish"
            }
        };

        const kindEmail: TaskExplorerDefinition = {
            ...defaultDef,
            ...{
                cmdLine: "npx app-publisher -p ps --no-ci --email-only",
            }
        };

        const kindChangeLog: TaskExplorerDefinition = {
            ...defaultDef,
            ...{
                cmdLine: "npx app-publisher -p ps --no-ci --changelog-only",
            }
        };

        const kindDry: TaskExplorerDefinition = {
            ...defaultDef,
            ...{
                cmdLine: "npx app-publisher -p ps --no-ci --dry-run",
            }
        };

        const kindMantis: TaskExplorerDefinition = {
            ...defaultDef,
            ...{
                cmdLine: "npx app-publisher -p ps --no-ci --mantis-only",
            }
        };

        const kindPromptVersion: TaskExplorerDefinition = {
            ...defaultDef,
            ...{
                cmdLine: "npx app-publisher -p ps --no-ci --prompt-version",
            }
        };

        //
        // Create the shell execution objects
        //
        const executionRepublish = kindRepublish.cmdLine ? new ShellExecution(kindRepublish.cmdLine, options) : undefined;
        const executionEmail = kindEmail.cmdLine ? new ShellExecution(kindEmail.cmdLine, options) : undefined;
        const executionChangeLog = kindChangeLog.cmdLine ? new ShellExecution(kindChangeLog.cmdLine, options) : undefined;
        const executionPromptVersion = kindPromptVersion.cmdLine ? new ShellExecution(kindPromptVersion.cmdLine, options) : undefined;
        const executionPublish = defaultDef.cmdLine ? new ShellExecution(defaultDef.cmdLine, options) : undefined;
        const executionMantis = kindMantis.cmdLine ? new ShellExecution(kindMantis.cmdLine, options) : undefined;
        const executionDry = kindDry.cmdLine ? new ShellExecution(kindDry.cmdLine, options) : undefined;

        log.methodDone("read app-ublisher file uri tasks", 1, logPad, true);

        return [ new Task(kindDry, folder, "Dry Run", "app-publisher", executionDry, undefined),
                 new Task(defaultDef, folder, "Publish", "app-publisher", executionPublish, undefined),
                 new Task(kindRepublish, folder, "Re-publish", "app-publisher", executionRepublish, undefined),
                 new Task(kindMantis, folder, "Publish Mantis Release", "app-publisher", executionMantis, undefined),
                 new Task(kindEmail, folder, "Send Release Email", "app-publisher", executionEmail, undefined),
                 new Task(kindPromptVersion, folder, "Publish (Prompt Version)", "app-publisher", executionPromptVersion, undefined),
                 new Task(kindEmail, folder, "View Pending Changelog", "app-publisher", executionChangeLog, undefined) ];
    }

}
