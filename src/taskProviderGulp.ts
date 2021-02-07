
import {
    Task, TaskGroup, WorkspaceFolder, RelativePattern, ShellExecution, Uri,
    workspace, TaskProvider, TaskDefinition
} from "vscode";
import * as path from "path";
import * as util from "./util";
import { TaskItem } from "./tasks";
import { configuration } from "./common/configuration";
import { filesCache } from "./cache";
import { execSync } from "child_process";


interface StringMap { [s: string]: string }

interface GulpTaskDefinition extends TaskDefinition
{
    script?: string;
    path?: string;
    fileName?: string;
    uri?: Uri;
    treeItem?: TaskItem;
}

let cachedTasks: Task[];

export class GulpTaskProvider implements TaskProvider
{

    constructor() {}


    public provideTasks()
    {
        return this.provideGulpfiles();
    }


    public resolveTask(_task: Task): Task | undefined
    {
        return undefined;
    }


    public async invalidateTasksCache(opt?: Uri): Promise<void>
    {
        util.log("");
        util.log("invalidateTasksCacheGulp");
        util.logValue("   uri", opt ? opt.path : (opt === null ? "null" : "undefined"), 2);
        util.logValue("   has cached tasks", cachedTasks ? "true" : "false", 2);

        if (opt && cachedTasks)
        {
            const rmvTasks: Task[] = [];

            await util.asyncForEach(cachedTasks, each => {
                const cstDef: GulpTaskDefinition = each.definition;
                if (cstDef.uri.fsPath === opt.fsPath || !util.pathExists(cstDef.uri.fsPath)) {
                    rmvTasks.push(each);
                }
            });

            //
            // Technically this function can be called back into when waiting for a promise
            // to return on the asncForEach() above, and cachedTask array can be set to undefined,
            // this is happening with a broken await() somewere that I cannot find
            if (cachedTasks)
            {
                await util.asyncForEach(rmvTasks, each => {
                    util.log("   removing old task " + each.name);
                    util.removeFromArray(cachedTasks, each);
                });

                if (util.pathExists(opt.fsPath) && !util.existsInArray(configuration.get("exclude"), opt.path))
                {
                    const tasks = await this.readGulpfile(opt);
                    cachedTasks.push(...tasks);
                }

                if (cachedTasks.length > 0) {
                    return;
                }
            }
        }

        cachedTasks = undefined;
    }


    public createTask(target: string, cmd: string, folder: WorkspaceFolder, uri: Uri): Task
    {
        const getRelativePath = (folder: WorkspaceFolder, uri: Uri): string =>
        {
            if (folder) {
                const rootUri = folder.uri;
                const absolutePath = uri.path.substring(0, uri.path.lastIndexOf("/") + 1);
                return absolutePath.substring(rootUri.path.length + 1);
            }
            return "";
        };

        const kind: GulpTaskDefinition = {
            type: "gulp",
            script: target,
            path: getRelativePath(folder, uri),
            fileName: path.basename(uri.path),
            uri
        };

        const cwd = path.dirname(uri.fsPath);
        const args = [ this.getCommand(), target ];
        const options = {
            cwd
        };

        const execution = new ShellExecution("npx", args, options);

        return new Task(kind, folder, target, "gulp", execution, "$msCompile");
    }


    private async provideGulpfiles(): Promise<Task[]>
    {
        util.log("");
        util.log("provideGulpfiles");

        if (!cachedTasks) {
            cachedTasks = await this.detectGulpfiles();
        }
        return cachedTasks;
    }


    private async detectGulpfiles(): Promise<Task[]>
    {
        util.log("");
        util.log("detectGulpfiles");

        const allTasks: Task[] = [];
        const visitedFiles: Set<string> = new Set();
        const paths = filesCache.get("gulp");

        if (workspace.workspaceFolders && paths)
        {
            for (const fobj of paths)
            {
                if (!util.isExcluded(fobj.uri.path) && !visitedFiles.has(fobj.uri.fsPath)) {
                    visitedFiles.add(fobj.uri.fsPath);
                    const tasks = await this.readGulpfile(fobj.uri);
                    allTasks.push(...tasks);
                }
            }
        }

        util.logValue("   # of tasks", allTasks.length, 2);
        return allTasks;
    }


    private async readGulpfile(uri: Uri): Promise<Task[]>
    {
        const result: Task[] = [];
        const folder = workspace.getWorkspaceFolder(uri);

        if (folder)
        {
            const scripts = await this.findTargets(uri.fsPath);
            if (scripts)
            {
                Object.keys(scripts).forEach(each => {
                    const task = this.createTask(each, each, folder, uri);
                    task.group = TaskGroup.Build;
                    result.push(task);
                });
            }
        }

        return result;
    }


    private async findTargets(fsPath: string): Promise<StringMap>
    {
        let contents: any;
        const json: any = "";
        const scripts: StringMap = {};

        util.log("");
        util.log("Find gulpfile targets");

        //
        // Try running 'gulp' itself to get the targets.  If fail, just custom parse
        //
        // Sample Output of gulp --tasks :
        //
        //     [13:17:46] Tasks for C:\Projects\vscode-taskexplorer\test-files\gulpfile.js
        //     [13:17:46] ├── hello
        //     [13:17:46] └── build:test
        //
        //     Tasks for C:\Projects\.....\gulpfile.js
        //     [12:28:59] ├─┬ lint
        //     [12:28:59] │ └─┬ <series>
        //     [12:28:59] │   └── lintSCSS
        //     [12:28:59] ├─┬ watch
        //     [12:28:59] │ └─┬ <parallel>
        //     [12:28:59] │   ├── cssWatcher
        //     [12:28:59] │   ├── jsWatcher
        //     [12:28:59] │   └── staticWatcher
        //     [12:28:59] ├── clean
        //     [12:28:59] ├─┬ build
        //     [12:28:59] │ └─┬ <series>
        //     [12:28:59] │   ├── buildCSS
        //     [12:28:59] │   ├── buildStatic
        //     [12:28:59] │   └── buildJS
        //     [12:28:59] ├── init
        //     [12:28:59] ├─┬ dist:copy
        //     [12:28:59] │ └─┬ <series>
        //     [12:28:59] │   ├── cleanDistLibs
        //     [12:28:59] │   └── copyLibs
        //     [12:28:59] ├── dist:normalize
        //     [12:28:59] ├─┬ dev
        //     [12:28:59] │ └─┬ <parallel>
        //     [12:28:59] │   ├─┬ watch
        //     [12:28:59] │   │ └─┬ <parallel>
        //     [12:28:59] │   │   ├── cssWatcher
        //     [12:28:59] │   │   ├── jsWatcher
        //     [12:28:59] │   │   └── staticWatcher
        //     [12:28:59] │   └── devServer
        //     [12:28:59] └─┬ default
        //     [12:28:59]   └─┬ <series>
        //     [12:28:59]     ├─┬ lint
        //     [12:28:59]     │ └─┬ <series>
        //     [12:28:59]     │   └── lintSCSS
        //     [12:28:59]     ├── clean
        //     [12:28:59]     └─┬ build
        //     [12:28:59]       └─┬ <series>
        //     [12:28:59]         ├── buildCSS
        //     [12:28:59]         ├── buildStatic
        //     [12:28:59]         └── buildJS
        //

        let stdout: Buffer;
        if (configuration.get("useGulp") === true)
        {
            try {
                stdout = execSync("npx " + this.getCommand() + " --tasks", {
                    cwd: path.dirname(fsPath)
                });
            }
            catch (e) { util.log(e); }
        }

        if (stdout)
        {   //
            // Loop through all the lines and extract the task names
            //
            contents = stdout.toString().split("\n");
            for (const i in contents)
            {
                const line = contents[i].match(/(\[[\w\W][^\]]+\][ ](├─┬|├──|└──|└─┬) )([\w\-]+)/i);
                if (line && line.length > 3) {
                    util.logValue("   Found target (gulp --tasks)", line[3]);
                    scripts[line[3]] = line[3];
                }
            }
        }
        else
        {
            contents = await util.readFile(fsPath);
            let idx = 0;
            let eol = contents.indexOf("\n", 0);

            while (eol !== -1)
            {
                let line: string = contents.substring(idx, eol).trim();
                if (line.length > 0)
                {
                    let idx1: number;
                    if (line.toLowerCase().trimLeft().startsWith("exports."))
                    {
                        idx1 = line.indexOf(".") + 1;
                        let idx2 = line.indexOf(" ", idx1);
                        if (idx2 === -1) {
                            idx2 = line.indexOf("=", idx1);
                        }
                        if (idx1 !== -1)
                        {
                            const tgtName = line.substring(idx1, idx2).trim();
                            if (tgtName) {
                                scripts[tgtName] = "";
                                util.log("   found target (cst.)");
                                util.logValue("      name", tgtName);
                            }
                        }
                    }
                    else if (line.toLowerCase().trimLeft().startsWith("exports["))
                    {
                        idx1 = line.indexOf("[") + 2; // skip past [ and '/"
                        const idx2 = line.indexOf("]", idx1) - 1;  // move up to "/'
                        if (idx1 !== -1)
                        {
                            const tgtName = line.substring(idx1, idx2).trim();
                            if (tgtName) {
                                scripts[tgtName] = "";
                                util.log("   found target (cst.)");
                                util.logValue("      name", tgtName);
                            }
                        }
                    }
                    else if (line.toLowerCase().trimLeft().startsWith("gulp.task"))
                    {
                        idx1 = line.indexOf("'");
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
                                    scripts[tgtName] = "";
                                    util.log("   found target");
                                    util.logValue("      name", tgtName);
                                }
                            }
                        }
                    }
                }

                idx = eol + 1;
                eol = contents.indexOf("\n", idx);
            }
        }

        util.log("   done");

        return scripts;
    }


    private getCommand(): string
    {
        const gulp = "gulp";
        // let gulp = folder.uri.fsPath + "/node_modules/.bin/gulp";
        // if (process.platform === 'win32') {
        //     gulp = folder.uri.fsPath + "\\node_modules\\.bin\\gulp.cmd";
        // }
        // if (relativePath) {
        //     gulp += (' --gulpfile ' + path.join(relativePath, 'gulpfile.js'));
        // }
        // if (workspace.getConfiguration('taskExplorer').get('pathToGulp')) {
        //     gulp = workspace.getConfiguration('taskExplorer').get('pathToGulp');
        // }
        return gulp;
    }

}
