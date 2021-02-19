
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
        util.logBlank(1);
        util.log("detect gradle files", 1);

        const allTasks: Task[] = [];
        const visitedFiles: Set<string> = new Set();
        const paths = filesCache.get("gradle");

        if (workspace.workspaceFolders && paths)
        {
            for (const fobj of paths)
            {
                if (!util.isExcluded(fobj.uri.path) && !visitedFiles.has(fobj.uri.fsPath)) {
                    visitedFiles.add(fobj.uri.fsPath);
                    const tasks = await this.readUriTasks(fobj.uri, null, "   ");
                    util.log("   processed gradle file", 3);
                    util.logValue("      file", fobj.uri.fsPath, 3);
                    util.logValue("      targets in file", tasks.length, 3);
                    allTasks.push(...tasks);
                }
            }
        }

        util.logBlank(1);
        util.logValue("   # of tasks", allTasks.length, 2);
        util.log("detect gradle files complete", 1);
        return allTasks;
    }


    private findTargets(fsPath: string, logPad = ""): string[]
    {
        const json: any = "";
        const scripts: string[] = [];

        util.logBlank(1);
        util.log(logPad + "find gradle targets", 1);

        const contents = util.readFileSync(fsPath);
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
                            util.log(logPad + "      found gradle target", 1);
                            util.logValue(logPad + "         name", tgtName, 1);
                        }
                    }
                }
            }

            idx = eol + 1;
            eol = contents.indexOf("\n", idx);
        }


        util.logBlank(1);
        util.log(logPad + "Find gradle targets complete", 1);
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


    public async readUriTasks(uri: Uri, wsFolder?: WorkspaceFolder, logPad = ""): Promise<Task[]>
    {
        const result: Task[] = [];
        const folder = wsFolder || workspace.getWorkspaceFolder(uri);

        util.logBlank(1);
        util.log(logPad + "read gulp file uri tasks", 1);
        util.logValue(logPad + "   path", uri?.fsPath, 1);

        if (folder)
        {
            const scripts = this.findTargets(uri.fsPath, "   ");
            if (scripts)
            {
                for (const s of scripts)
                {
                    const task = this.createTask(s, s, folder, uri);
                    task.group = TaskGroup.Build;
                    result.push(task);
                }
            }
        }

        util.log(logPad + "read grunt file uri tasks complete", 1);
        return result;
    }

}
