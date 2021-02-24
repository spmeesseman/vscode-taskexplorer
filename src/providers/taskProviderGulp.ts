
import { Task, TaskGroup, WorkspaceFolder, RelativePattern, ShellExecution, Uri, workspace } from "vscode";
import * as path from "path";
import * as util from "../common/utils";
import * as log from "../common/log";
import { configuration } from "../common/configuration";
import { filesCache } from "../cache";
import { execSync } from "child_process";
import { TaskExplorerProvider } from "./taskProvider";
import { TaskExplorerDefinition } from "../taskDefinition";


export class GulpTaskProvider extends TaskExplorerProvider implements TaskExplorerProvider
{

    constructor() { super("gulp"); }


    public createTask(target: string, cmd: string, folder: WorkspaceFolder, uri: Uri): Task
    {
        const def = this.getDefaultDefinition(target, folder, uri);
        const cwd = path.dirname(uri.fsPath);
        const args = [ this.getCommand(), target ];
        const options = { cwd };
        const execution = new ShellExecution("npx", args, options);

        return new Task(def, folder, target, "gulp", execution, "$msCompile");
    }


    private findTargets(fsPath: string, logPad = ""): string[]
    {
        let scripts: string[];

        log.blank(1);
        log.write(logPad + "Find gulp targets", 1);

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
            catch (e) { log.write(e); }
            //
            // Loop through all the lines and extract the task names
            //
            const contents = stdout?.toString().split("\n");
            for (const c of contents)
            {
                const line = c.match(/(\[[\w\W][^\]]+\][ ](├─┬|├──|└──|└─┬) )([\w\-]+)/i);
                if (line && line.length > 3)
                {
                    log.value(logPad + "   Found target (gulp --tasks)", line[3]);
                    scripts[line[3]] = line[3];
                }
            }
        }
        else {
            scripts = this.parseGulpTasks(fsPath);
        }

        log.blank(1);
        log.write(logPad + "find gulp targets complete", 1);

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


    private parseGulpTasks(fsPath: string): string[]
    {
        const scripts: string[] = [];
        const contents = util.readFileSync(fsPath);
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
                    log.write("   found gulp target");
                    log.value("      name", tgtName);
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


    public async readTasks(logPad = ""): Promise<Task[]>
    {
        log.methodStart("detect gulp files", 1, logPad, true);

        const allTasks: Task[] = [];
        const visitedFiles: Set<string> = new Set();
        const paths = filesCache.get("gulp");

        if (workspace.workspaceFolders && paths)
        {
            for (const fobj of paths)
            {
                if (!util.isExcluded(fobj.uri.path) && !visitedFiles.has(fobj.uri.fsPath)) {
                    visitedFiles.add(fobj.uri.fsPath);
                    const tasks = await this.readUriTasks(fobj.uri, null, logPad + "   ");
                    log.write("   processed gulp file", 3, logPad);
                    log.value("      file", fobj.uri.fsPath, 3, logPad);
                    log.value("      targets in file", tasks.length, 3, logPad);
                    allTasks.push(...tasks);
                }
            }
        }

        log.value("   # of gulp tasks", allTasks.length, 2, logPad);
        log.methodDone("detect gulp files", 1, logPad, true);
        return allTasks;
    }


    public async readUriTasks(uri: Uri, wsFolder?: WorkspaceFolder, logPad = ""): Promise<Task[]>
    {
        const result: Task[] = [];
        const folder = wsFolder || workspace.getWorkspaceFolder(uri);

        log.methodStart("read gulp file uri task", 1, logPad, true, [["path", uri?.fsPath], ["project folder", folder.name]]);

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

        log.methodDone("read gulp file uri tasks", 1, logPad, true);
        return result;
    }

}
