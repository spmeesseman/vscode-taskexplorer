
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
        util.log("detect grunt files");

        const allTasks: Task[] = [];
        const visitedFiles: Set<string> = new Set();
        const paths = filesCache.get("grunt");

        if (workspace.workspaceFolders && paths)
        {
            for (const fobj of paths)
            {
                if (!util.isExcluded(fobj.uri.path) && !visitedFiles.has(fobj.uri.fsPath))
                {
                    visitedFiles.add(fobj.uri.fsPath);
                    const tasks = await this.readUriTasks(fobj.uri, null, "   ");
                    util.log("   processed grunt file", 3);
                    util.logValue("      file", fobj.uri.fsPath, 3);
                    util.logValue("      targets in file", tasks.length, 3);
                    allTasks.push(...tasks);
                }
            }
        }

        util.logValue("   # of tasks", allTasks.length, 2);
        return allTasks;
    }


    private findTargets(fsPath: string, logPad = ""): string[]
    {
        const scripts: string[] = [];

        util.logBlank(1);
        util.log(logPad + "find grunt targets", 1);

        const contents = util.readFileSync(fsPath);
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
                            util.log(logPad + "   found grunt target");
                            util.logValue(logPad + "      name", tgtName);
                        }
                    }
                }
            }

            idx = eol + 1;
            eol = contents.indexOf("\n", idx);
        }

        util.logBlank(1);
        util.log(logPad + "find grunt targets complete", 1);

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


    public async readUriTasks(uri: Uri, wsFolder?: WorkspaceFolder, logPad = ""): Promise<Task[]>
    {
        const result: Task[] = [];
        const folder = wsFolder || workspace.getWorkspaceFolder(uri);

        util.logBlank(1);
        util.log(logPad + "read grunt file uri tasks", 1);
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
