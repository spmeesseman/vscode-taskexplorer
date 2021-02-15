
import {
    Task, TaskGroup, WorkspaceFolder, RelativePattern, ShellExecution, Uri,
    workspace, TaskProvider, TaskDefinition
} from "vscode";
import * as path from "path";
import * as util from "./util";
import { configuration } from "./common/configuration";
import { filesCache } from "./cache";
import { execSync } from "child_process";
import { TaskExplorerProvider } from "./taskProvider";
import { TaskExplorerDefinition } from "./taskDefinition";


export class GulpTaskProvider implements TaskExplorerProvider
{
    private cachedTasks: Task[];
    private invalidating = false;


    constructor() {}


    public async provideTasks()
    {
        util.log("");
        util.log("provide gulp tasks");
        if (!this.cachedTasks) {
            this.cachedTasks = await this.detectGulpfiles();
        }
        return this.cachedTasks;
    }


    public resolveTask(_task: Task): Task | undefined
    {
        return undefined;
    }


    public createTask(target: string, cmd: string, folder: WorkspaceFolder, uri: Uri): Task
    {
        const def = this.getDefaultDefinition(target, folder, uri);
        const cwd = path.dirname(uri.fsPath);
        const args = [ this.getCommand(), target ];
        const options = { cwd };
        const execution = new ShellExecution("npx", args, options);

        return new Task(def, folder, target, "gulp", execution, "$msCompile");
    }


    private async detectGulpfiles(): Promise<Task[]>
    {
        util.logBlank(1);
        util.log("detect gulp files", 1);

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


    private async findTargets(fsPath: string): Promise<string[]>
    {
        let scripts: string[];

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

        if (configuration.get("useGulp") === true)
        {
            let stdout: Buffer;
            try {
                stdout = execSync("npx " + this.getCommand() + " --tasks", {
                    cwd: path.dirname(fsPath)
                });
            }
            catch (e) { util.log(e); }
            //
            // Loop through all the lines and extract the task names
            //
            const contents = stdout?.toString().split("\n");
            for (const i in contents)
            {
                if (contents.hasOwnProperty(i)) {
                    const line = contents[i].match(/(\[[\w\W][^\]]+\][ ](├─┬|├──|└──|└─┬) )([\w\-]+)/i);
                    if (line && line.length > 3) {
                        util.logValue("   Found target (gulp --tasks)", line[3]);
                        scripts[line[3]] = line[3];
                    }
                }
            }
        }
        else {
            scripts = await this.parseGulpTasks(fsPath);
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


    public getDefaultDefinition(target: string, folder: WorkspaceFolder, uri: Uri): TaskExplorerDefinition
    {
        const def: TaskExplorerDefinition = {
            type: "gulp",
            script: target,
            target,
            path: util.getRelativePath(folder, uri),
            fileName: path.basename(uri.path),
            uri
        };
        return def;
    }


    public async invalidateTasksCache(opt?: Uri): Promise<void>
    {
        util.log("");
        util.log("invalidate gulp tasks cache");
        util.logValue("   uri", opt?.path, 2);
        util.logValue("   has cached tasks", !!this.cachedTasks, 2);

        await this.wait();
        this.invalidating = true;

        if (opt && this.cachedTasks)
        {
            const rmvTasks: Task[] = [];

            await util.forEachAsync(this.cachedTasks, each => {
                const cstDef: TaskExplorerDefinition = each.definition;
                if (cstDef.uri.fsPath === opt.fsPath || !util.pathExists(cstDef.uri.fsPath)) {
                    rmvTasks.push(each);
                }
            });

            //
            // TODO - Bug
            // Technically this function can be called back into when waiting for a promise
            // to return on the asncForEach() above, and cachedTask array can be set to undefined,
            // this is happening with a broken await() somewere that I cannot find
            //
            if (this.cachedTasks)
            {
                await util.forEachAsync(rmvTasks, (each: Task) => {
                    util.log("   removing old task " + each.name);
                    util.removeFromArray(this.cachedTasks, each);
                });

                if (util.pathExists(opt.fsPath) && util.existsInArray(configuration.get("exclude"), opt.path) === false)
                {
                    const tasks = await this.readGulpfile(opt, "   ");
                    this.cachedTasks?.push(...tasks);
                }

                if (this.cachedTasks?.length > 0) {
                    this.invalidating = false;
                    return;
                }
            }
        }

        this.invalidating = false;
        this.cachedTasks = undefined;
    }


    private async parseGulpTasks(fsPath: string): Promise<string[]>
    {
        const scripts: string[] = [];
        const contents = await util.readFile(fsPath);
        let idx = 0;
        let eol = contents.indexOf("\n", 0);

        while (eol !== -1)
        {
            let tgtName: string;
            const line = contents.substring(idx, eol).trim();

            if (line.length > 0)
            {
                if (line.toLowerCase().trimLeft().startsWith("exports"))
                {
                    tgtName = this.parseGulpExport(line);
                }
                else if (line.toLowerCase().trimLeft().startsWith("gulp.task"))
                {
                    tgtName = this.parseGulpTask(line, contents, eol);
                }
                if (tgtName) {
                    scripts.push(tgtName);
                    util.log("   found target");
                    util.logValue("      name", tgtName);
                }
            }

            idx = eol + 1;
            eol = contents.indexOf("\n", idx);
        }

        return scripts;
    }


    private parseGulpExport(line: string)
    {
        let idx1: number, idx2: number;
        let tgtName: string;

        if (line.toLowerCase().trimLeft().startsWith("exports."))
        {
            idx1 = line.indexOf(".") + 1;
            idx2 = line.indexOf(" ", idx1);
            if (idx2 === -1) {
                idx2 = line.indexOf("=", idx1);
            }
            if (idx1 !== -1)
            {
                tgtName = line.substring(idx1, idx2).trim();
            }
        }
        else if (line.toLowerCase().trimLeft().startsWith("exports["))
        {
            idx1 = line.indexOf("[") + 2; // skip past [ and '/"
            idx2 = line.indexOf("]", idx1) - 1;  // move up to "/'
            if (idx1 !== -1)
            {
                tgtName = line.substring(idx1, idx2).trim();
            }
        }

        return tgtName;
    }


    private parseGulpTask(line: string, contents: string, eol: number)
    {
        let idx1: number;
        let tgtName: string;

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
                tgtName = line.substring(idx1, idx2).trim();
            }
        }

        return tgtName;
    }


    private async readGulpfile(uri: Uri, logPad = ""): Promise<Task[]>
    {
        const result: Task[] = [];
        const folder = workspace.getWorkspaceFolder(uri);

        util.logBlank(1);
        util.log(logPad + "read gulp file", 1);
        util.logValue(logPad + "   path", uri?.fsPath, 1);

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


    private async wait()
    {
        while (this.invalidating === true) {
            util.log("   waiting for current invalidation to finish...");
            await util.timeout(100);
        }
    }

}
