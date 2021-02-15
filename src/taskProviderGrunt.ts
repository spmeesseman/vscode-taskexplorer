
import {
    Task, TaskGroup, WorkspaceFolder, RelativePattern, ShellExecution, Uri,
    workspace, TaskProvider, TaskDefinition
} from "vscode";
import * as path from "path";
import * as util from "./util";
import { configuration } from "./common/configuration";
import { filesCache } from "./cache";
import { TaskExplorerProvider } from "./taskProvider";
import { TaskExplorerDefinition } from "./taskDefinition";


export class GruntTaskProvider extends TaskExplorerProvider implements TaskExplorerProvider
{

    constructor() { super("grunt"); }


    public createTask(target: string, cmd: string, folder: WorkspaceFolder, uri: Uri): Task
    {
        const getCommand = (folder: WorkspaceFolder, cmd: string): string =>
        {
            // let grunt = 'folder.uri.fsPath + "/node_modules/.bin/grunt";
            const grunt = "grunt";
            // if (process.platform === 'win32') {
            //     grunt = folder.uri.fsPath + "\\node_modules\\.bin\\grunt.cmd";
            // }
            // if (workspace.getConfiguration('taskExplorer').get('pathToGrunt')) {
            //     grunt = workspace.getConfiguration('taskExplorer').get('pathToGrunt');
            // }
            return grunt;
        };

        const def = this.getDefaultDefinition(target, folder, uri);
        const cwd = path.dirname(uri.fsPath);
        const args = [ getCommand(folder, cmd), target ];
        const options = { cwd };
        const execution = new ShellExecution("npx", args, options);

        return new Task(def, folder, target, "grunt", execution, "$msCompile");
    }


    public async readTasks(): Promise<Task[]>
    {
        util.log("");
        util.log("detectGruntfiles");

        const allTasks: Task[] = [];
        const visitedFiles: Set<string> = new Set();
        const paths = filesCache.get("grunt");

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
        const scripts: string[] = [];

        util.log("");
        util.log("Find gruntfile targets");

        const contents = await util.readFile(fsPath);
        let idx = 0;
        let eol = contents.indexOf("\n", 0);

        while (eol !== -1)
        {
            let line: string = contents.substring(idx, eol).trim();
            if (line.length > 0 && line.toLowerCase().trimLeft().startsWith("grunt.registertask"))
            {
                let idx1 = line.indexOf("'");
                if (idx1 === -1) {
                    idx1 = line.indexOf('"');
                }

                if (idx1 === -1) // check next line for task name
                {
                    let eol2 = eol + 1;
                    eol2 = contents.indexOf("\n", eol2);
                    line = contents.substring(eol + 1, eol2).trim();
                    if (line.startsWith("'") || line.startsWith('"'))
                    {
                        idx1 = line.indexOf("'");
                        if (idx1 === -1) {
                            idx1 = line.indexOf('"');
                        }
                        if (idx1 !== -1) {
                            eol = eol2;
                        }
                    }
                }

                if (idx1 !== -1)
                {
                    idx1++;
                    let idx2 = line.indexOf("'", idx1);
                    if (idx2 === -1) {
                        idx2 = line.indexOf('"', idx1);
                    }
                    if (idx2 !== -1)
                    {
                        const tgtName = line.substring(idx1, idx2).trim();
                        if (tgtName) {
                            scripts.push(tgtName);
                            util.log("   found target");
                            util.logValue("      name", tgtName);
                        }
                    }
                }
            }

            idx = eol + 1;
            eol = contents.indexOf("\n", idx);
        }

        util.log("   done");

        return scripts;
    }


    public getDefaultDefinition(target: string, folder: WorkspaceFolder, uri: Uri): TaskExplorerDefinition
    {
        const def: TaskExplorerDefinition = {
            type: "grunt",
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
                scripts.forEach(each => {
                    const task = this.createTask(each, each, folder, uri);
                    task.group = TaskGroup.Build;
                    result.push(task);
                });
            }
        }

        return result;
    }

}
