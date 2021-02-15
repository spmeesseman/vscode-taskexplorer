
import {
    Task, TaskGroup, WorkspaceFolder, RelativePattern, ShellExecution, Uri,
    workspace, TaskProvider, TaskDefinition
} from "vscode";
import * as path from "path";
import * as util from "./util";
import { filesCache } from "./cache";
import { TaskExplorerProvider } from "./taskProvider";
import { TaskExplorerDefinition } from "./taskDefinition";


export class GradleTaskProvider extends TaskExplorerProvider implements TaskExplorerProvider
{

    constructor() { super("gradle"); }


    public createTask(target: string, cmd: string, folder: WorkspaceFolder, uri: Uri): Task
    {
        const getCommand = (folder: WorkspaceFolder, cmd: string): string =>
        {
            let gradle = "gradlew";
            if (process.platform === "win32") {
                gradle = "gradlew.bat";
            }
            if (workspace.getConfiguration("taskExplorer").get("pathToGradle")) {
                gradle = workspace.getConfiguration("taskExplorer").get("pathToGradle");
            }
            return gradle;
        };

        const def = this.getDefaultDefinition(target, folder, uri);
        const cwd = path.dirname(uri.fsPath);
        const args = [target];
        const options = { cwd };
        const execution = new ShellExecution(getCommand(folder, cmd), args, options);

        return new Task(def, folder, target, "gradle", execution, undefined);
    }


    public async readTasks(): Promise<Task[]>
    {
        util.log("");
        util.log("detectGradlefiles");

        const allTasks: Task[] = [];
        const visitedFiles: Set<string> = new Set();
        const paths = filesCache.get("gradle");

        if (workspace.workspaceFolders && paths)
        {
            for (const fobj of paths)
            {
                if (!util.isExcluded(fobj.uri.path) && !visitedFiles.has(fobj.uri.fsPath)) {
                    visitedFiles.add(fobj.uri.fsPath);
                    const tasks = await this.readUriTasks(fobj.uri);
                    allTasks.push(...tasks);
                }
            }
        }

        util.logValue("   # of tasks", allTasks.length, 2);
        return allTasks;
    }


    private async findTargets(fsPath: string): Promise<string[]>
    {
        const json: any = "";
        const scripts: string[] = [];

        util.log("   Find gradlefile targets");

        const contents = await util.readFile(fsPath);
        let idx = 0;
        let eol = contents.indexOf("\n", 0);

        while (eol !== -1)
        {
            const line: string = contents.substring(idx, eol).trim();
            if (line.length > 0 && line.toLowerCase().trimLeft().startsWith("task "))
            {
                let idx1 = line.trimLeft().indexOf(" ");
                if (idx1 !== -1)
                {
                    idx1++;
                    let idx2 = line.indexOf("(", idx1);
                    if (idx2 === -1) {
                        idx2 = line.indexOf("{", idx1);
                    }
                    if (idx2 !== -1)
                    {
                        const tgtName = line.substring(idx1, idx2).trim();

                        if (tgtName)
                        {
                            scripts.push(tgtName);
                            util.log("      found target");
                            util.logValue("         name", tgtName);
                        }
                    }
                }
            }

            idx = eol + 1;
            eol = contents.indexOf("\n", idx);
        }

        return scripts;
    }


    public getDefaultDefinition(target: string, folder: WorkspaceFolder, uri: Uri): TaskExplorerDefinition
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


    public async readUriTasks(uri: Uri, wsFolder?: WorkspaceFolder): Promise<Task[]>
    {
        const result: Task[] = [];
        const folder = wsFolder || workspace.getWorkspaceFolder(uri);

        if (folder)
        {
            const scripts = await this.findTargets(uri.fsPath);
            if (scripts)
            {
                scripts.forEach(each =>
                {
                    const task = this.createTask(each, each, folder, uri);
                    task.group = TaskGroup.Build;
                    result.push(task);
                });
            }
        }

        return result;
    }

}
