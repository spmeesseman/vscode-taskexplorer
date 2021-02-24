
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


    public async readTasks(logPad = ""): Promise<Task[]>
    {
        util.logMethodStart("detect gradle files", 1, logPad, true);

        const allTasks: Task[] = [];
        const visitedFiles: Set<string> = new Set();
        const paths = filesCache.get("gradle");

        if (workspace.workspaceFolders && paths)
        {
            for (const fobj of paths)
            {
                if (!util.isExcluded(fobj.uri.path) && !visitedFiles.has(fobj.uri.fsPath)) {
                    visitedFiles.add(fobj.uri.fsPath);
                    const tasks = await this.readUriTasks(fobj.uri, null, logPad + "   ");
                    util.log("   processed gradle file", 3, logPad);
                    util.logValue("      file", fobj.uri.fsPath, 3, logPad);
                    util.logValue("      targets in file", tasks.length, 3, logPad);
                    allTasks.push(...tasks);
                }
            }
        }

        util.logValue("   # of tasks", allTasks.length, 2, logPad);
        util.logMethodDone("detect gradle files", 1, logPad, true);
        return allTasks;
    }


    private findTargets(fsPath: string, logPad = ""): string[]
    {
        const json: any = "";
        const scripts: string[] = [];

        util.logMethodStart("find gradle targets", 1, logPad, true);

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
                            util.log("      found gradle target", 1, logPad);
                            util.logValue("         name", tgtName, 1, logPad);
                        }
                    }
                }
            }

            idx = eol + 1;
            eol = contents.indexOf("\n", idx);
        }

        util.logMethodDone("Find gradle targets", 1, logPad, true);
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

        util.logMethodStart("read gulp file uri task", 1, logPad, true, [["path", uri?.fsPath], ["project folder", folder.name]]);

        if (folder)
        {
            const scripts = this.findTargets(uri.fsPath, logPad + "   ");
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

        util.logMethodDone("read gulp file uri task", 1, logPad, true);
        return result;
    }

}
