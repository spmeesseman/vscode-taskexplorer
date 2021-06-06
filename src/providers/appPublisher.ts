
import { Task, WorkspaceFolder, ShellExecution, Uri, workspace, ShellExecutionOptions } from "vscode";
import * as path from "path";
import * as util from "../common/utils";
import * as log from "../common/log";
import { filesCache } from "../cache";
import { TaskExplorerProvider } from "./provider";
import { TaskExplorerDefinition } from "../taskDefinition";
import { configuration } from "../common/configuration";


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
            cmdLine: "npx app-publisher --no-ci",
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


    private _getKind(cmdLine: string, defaultDef: TaskExplorerDefinition): TaskExplorerDefinition
    {
        return { ...defaultDef, ...{ cmdLine } };
    }


    public async readUriTasks(uri: Uri, wsFolder?: WorkspaceFolder, logPad = ""): Promise<Task[]>
    {
        const cwd = path.dirname(uri.fsPath),
              folder = wsFolder || workspace.getWorkspaceFolder(uri),
              groupSeparator = configuration.get<string>("groupSeparator");

        if (!folder) {
            return [];
        }

        const defaultDef = this.getDefaultDefinition(undefined, folder, uri),
              options: ShellExecutionOptions = { cwd },
              tasks: Task[] = [],
              taskDefs: any = [];

        //
        // For ap files in the same dir, nsamed with a tag, e.g.:
        //    .publishrc.spm.json
        //
        let apLabel = "";
        const match = uri.fsPath.match(/\.publishrc\.(.+)\.(?:js(?:on)?|ya?ml)$/i);
        if (match && match.length > 1 && match[1])
        {
            apLabel = " (" + match[1].toLowerCase() + ")";
        }

        log.methodStart("read app-publisher file uri task", 1, logPad, true, [["path", uri?.fsPath], ["project folder", folder?.name]]);

        taskDefs.push({
            label: "general" + groupSeparator + "config",
            cmdLine: "npx app-publisher --version"
        });

        taskDefs.push({
            label: "general" + groupSeparator + "help",
            cmdLine: "npx app-publisher --help"
        });

        taskDefs.push({
            label: "general" + groupSeparator + "version",
            cmdLine: "npx app-publisher --version"
        });

        taskDefs.push({
            label: "release" + groupSeparator + "dry" + groupSeparator + "publish",
            cmdLine: "npx app-publisher --no-ci --dry-run"
        });

        taskDefs.push({
            label: "release" + groupSeparator + "dry" + groupSeparator + "publish (prompt version)",
            cmdLine: "npx app-publisher --no-ci --dry-run --prompt-version"
        });

        taskDefs.push({
            label: "release" + groupSeparator + "publish",
            cmdLine: "npx app-publisher --no-ci"
        });

        taskDefs.push({
            label: "release" + groupSeparator + "publish (prompt version)",
            cmdLine: "npx app-publisher --no-ci --prompt-version"
        });

        taskDefs.push({
            label: "release" + groupSeparator + "republish",
            cmdLine: "npx app-publisher --no-ci --republish"
        });

        taskDefs.push({
            label: "tasks" + groupSeparator + "changelog " + groupSeparator + "edit pending",
            cmdLine: "npx app-publisher --no-ci --task-changelog"
        });

        taskDefs.push({
            label: "tasks" + groupSeparator + "changelog " + groupSeparator + "view pending",
            cmdLine: "npx app-publisher --no-ci --task-changelog-view"
        });

        taskDefs.push({
            label: "tasks" + groupSeparator + "changelog " + groupSeparator + "write pending to file",
            cmdLine: "npx app-publisher --no-ci --task-changelog-file changelog.txt"
        });

        taskDefs.push({
            label: "tasks" + groupSeparator + "ci" + groupSeparator + "environment info",
            cmdLine: "npx app-publisher --no-ci --task-ci-env"
        });

        taskDefs.push({
            label: "tasks" + groupSeparator + "ci" + groupSeparator + "build info",
            cmdLine: "npx app-publisher --no-ci --task-ci-env-info"
        });

        taskDefs.push({
            label: "tasks" + groupSeparator + "release" + groupSeparator + "mantis",
            cmdLine: "npx app-publisher --no-ci --task-mantisbt-release"
        });

        taskDefs.push({
            label: "tasks" + groupSeparator + "release" + groupSeparator + "email",
            cmdLine: "npx app-publisher --no-ci --task-email"
        });

        taskDefs.push({
            label: "tasks" + groupSeparator + "version" + groupSeparator + "current",
            cmdLine: "npx app-publisher --no-ci --task-version-current"
        });

        taskDefs.push({
            label: "tasks" + groupSeparator + "version" + groupSeparator + "info",
            cmdLine: "npx app-publisher --no-ci --task-version-info"
        });

        taskDefs.push({
            label: "tasks" + groupSeparator + "version" + groupSeparator + "next",
            cmdLine: "npx app-publisher --no-ci --task-version-next"
        });

        //
        // Create the shell execution objects
        //
        taskDefs.forEach((def: any) => {
            const exec = new ShellExecution(def.cmdLine, options);
            tasks.push(new Task(this._getKind(def.cmdLine, defaultDef), folder, def.label + apLabel, "app-publisher", exec, undefined));
        });

        log.methodDone("read app-ublisher file uri tasks", 1, logPad, true);

        return tasks;
    }

}
