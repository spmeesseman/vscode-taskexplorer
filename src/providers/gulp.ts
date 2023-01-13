
import log from "../lib/log/log";
import { basename, dirname } from "path";
import { execSync } from "child_process";
import { readFileAsync } from "../lib/utils/fs";
import { TaskExplorerProvider } from "./provider";
import { configuration } from "../lib/utils/configuration";
import { ITaskDefinition } from "../interface/ITaskDefinition";
import { Task, TaskGroup, WorkspaceFolder, ShellExecution, Uri, workspace } from "vscode";
import { getRelativePath } from "../lib/utils/utils";


export class GulpTaskProvider extends TaskExplorerProvider implements TaskExplorerProvider
{

    constructor() { super("gulp"); }


    public createTask(target: string, cmd: string, folder: WorkspaceFolder, uri: Uri): Task
    {
        const def = this.getDefaultDefinition(target, folder, uri);
        const cwd = dirname(uri.fsPath);
        const args = [ "gulp", target ];
        const options = { cwd };
        const execution = new ShellExecution("npx", args, options);

        return new Task(def, folder, target, "gulp", execution, "$msCompile");
    }


    public getDocumentPosition(scriptName: string | undefined, documentText: string | undefined): number
    {
        if (!scriptName || !documentText) {
            return 0;
        }

        let idx = this.getDocumentPositionLine("gulp.task(", scriptName, documentText);
        if (idx === -1) {
            idx = this.getDocumentPositionLine("exports[", scriptName, documentText);
        }
        if (idx === -1) {
            idx = this.getDocumentPositionLine("exports.", scriptName, documentText, 0, 0, true);
        }
        return idx;
    }


    private async findTargets(fsPath: string, logPad: string)
    {
        let scripts: string[] = [];

        log.methodStart("find gulp targets", 4, logPad, false, [[ "path", fsPath ]], this.logQueueId);
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

        /* istanbul ignore if */
        if (configuration.get("useGulp") === true)
        {
            let stdout: Buffer | undefined;
            try {
                stdout = execSync("npx gulp --tasks", {
                    cwd: dirname(fsPath)
                });
            }
            catch (e: any) { log.error(e, undefined, this.logQueueId); }
            //
            // Loop through all the lines and extract the task names
            //
            const contents = stdout?.toString().split("\n");
            if (contents) {
                for (const c of contents)
                {
                    const line = c.match(/(\[[\w\W][^\]]+\][ ](├─┬|├──|└──|└─┬) )([\w\-]+)/i);
                    if (line && line.length > 3 && line[3])
                    {
                        scripts.push(line[3].toString());
                        log.write("found gulp task", 4, logPad, this.logQueueId);
                        log.value("   name", line[3].toString(), 4, logPad, this.logQueueId);
                    }
                }
            }
        }
        else {
            scripts = await this.parseGulpTasks(fsPath, logPad + "   ");
        }

        log.methodDone("find gulp targets", 4, logPad, undefined, this.logQueueId);
        return scripts;
    }


    private getDefaultDefinition(target: string, folder: WorkspaceFolder, uri: Uri): ITaskDefinition
    {
        const def: ITaskDefinition = {
            type: "gulp",
            script: target,
            target,
            path: getRelativePath(folder, uri),
            fileName: basename(uri.path),
            uri
        };
        return def;
    }


    private async parseGulpTasks(fsPath: string, logPad: string)
    {
        const scripts: string[] = [];
        const contents = await readFileAsync(fsPath);
        let idx = 0;
        let eol = contents.indexOf("\n", 0);

        log.methodStart("parse gulp tasks", 4, logPad, false, [[ "path", fsPath ]], this.logQueueId);

        while (eol !== -1)
        {
            let tgtName: string | undefined;
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
                    log.value("   found gulp task", tgtName, 4, logPad, this.logQueueId);
                }
            }

            idx = eol + 1;
            eol = contents.indexOf("\n", idx);
        }

        log.methodDone("parse gulp tasks", 4, logPad, undefined, this.logQueueId);
        return scripts;
    }


    private parseGulpExport(line: string)
    {
        let idx1: number, idx2: number;
        let tgtName: string | undefined;

        /* istanbul ignore else */
        if (line.toLowerCase().trimLeft().startsWith("exports."))
        {
            idx1 = line.indexOf(".") + 1;
            idx2 = line.indexOf(" ", idx1);
            /* istanbul ignore if */
            if (idx2 === -1) {
                idx2 = line.indexOf("=", idx1);
            }
            /* istanbul ignore else */
            if (idx1 !== -1)
            {
                tgtName = line.substring(idx1, idx2).trim();
            }
        }
        /* istanbul ignore else */
        else if (line.toLowerCase().trimLeft().startsWith("exports["))
        {
            idx1 = line.indexOf("[") + 2; // skip past [ and '/"
            idx2 = line.indexOf("]", idx1) - 1;  // move up to "/'
            /* istanbul ignore else */
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
        let tgtName: string | undefined;

        idx1 = line.indexOf("'");
        if (idx1 === -1) {
            idx1 = line.indexOf('"');
        }

        if (idx1 === -1) // check next line for task name
        {
            let eol2 = eol + 1;
            eol2 = contents.indexOf("\n", eol2);
            line = contents.substring(eol + 1, eol2).trim();
            /* istanbul ignore else */
            if (line.startsWith("'") || line.startsWith('"'))
            {
                idx1 = line.indexOf("'");
                if (idx1 === -1) {
                    idx1 = line.indexOf('"');
                }
                /* istanbul ignore else */
                if (idx1 !== -1) {
                    eol = eol2;
                }
            }
        }

        /* istanbul ignore else */
        if (idx1 !== -1)
        {
            idx1++;
            let idx2 = line.indexOf("'", idx1);
            if (idx2 === -1) {
                idx2 = line.indexOf('"', idx1);
            }
            /* istanbul ignore else */
            if (idx2 !== -1)
            {
                tgtName = line.substring(idx1, idx2).trim();
            }
        }

        return tgtName;
    }


    public async readUriTasks(uri: Uri, logPad: string): Promise<Task[]>
    {
        const result: Task[] = [],
              folder = workspace.getWorkspaceFolder(uri) as WorkspaceFolder;

        log.methodStart("read gulp file uri tasks", 3, logPad, false, [[ "path", uri.fsPath ], [ "project folder", folder.name ]], this.logQueueId);

        const scripts = await this.findTargets(uri.fsPath, logPad + "   ");
        for (const s of scripts)
        {
            const task = this.createTask(s, s, folder, uri);
            task.group = TaskGroup.Build;
            result.push(task);
        }

        log.methodDone("read gulp file uri tasks", 3, logPad, [[ "#of tasks found", result.length ]], this.logQueueId);
        return result;
    }

}
