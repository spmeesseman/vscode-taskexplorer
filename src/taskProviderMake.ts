
import {
    Task, TaskGroup, WorkspaceFolder, RelativePattern, ShellExecution, Uri,
    workspace, TaskProvider, TaskDefinition, ShellExecutionOptions, extensions
} from "vscode";
import * as path from "path";
import * as util from "./util";
import { configuration } from "./common/configuration";
import { filesCache } from "./cache";
import { TaskExplorerProvider } from "./taskProvider";
import { TaskExplorerDefinition } from "./taskDefinition";


export class MakeTaskProvider extends TaskExplorerProvider implements TaskExplorerProvider
{

    private suffixRuleTargets = /^(\.\w+|\.\w+\.\w+)$/;
    private patternRuleTargets = /^(%\.\w+|%)$/;
    // See: https://www.gnu.org/software/make/manual/html_node/Special-Targets.html
    private specialTargets = new Set([
        ".PHONY",
        ".SUFFIXES",
        ".DEFAULT",
        ".PRECIOUS",
        ".INTERMEDIATE",
        ".SECONDARY",
        ".SECONDEXPANSION",
        ".DELETE_ON_ERROR",
        ".IGNORE",
        ".LOW_RESOLUTION_TIME",
        ".SILENT",
        ".EXPORT_ALL_VARIABLES",
        ".NOTPARALLEL",
        ".ONESHELL",
        ".POSIX",
        ".MAKE",
    ]);


    constructor() { super("make"); }


    public createTask(target: string, cmd: string, folder: WorkspaceFolder, uri: Uri): Task
    {
        const getCommand = (folder: WorkspaceFolder, cmd: string): string =>
        {
            let make = "make";
            if (process.platform === "win32") {
                make = "nmake";
            }
            if (configuration.get("pathToMake")) {
                make = configuration.get("pathToMake");
            }
            return make;
        };

        const kind = this.getDefaultDefinition(target, folder, uri);

        const cwd = path.dirname(uri.fsPath);
        const args = [target];
        const options: ShellExecutionOptions = {
            cwd
        };

        const execution = new ShellExecution(getCommand(folder, cmd), args, options);
        let problemMatcher = "$gccte";
        const cPlusPlusExtension = extensions.getExtension("spmeesseman.vscode-taskexplorer");
        if (cPlusPlusExtension) {
            problemMatcher = "$gcc";
        }

        return new Task(kind, folder, target, "make", execution, problemMatcher);
    }


    private findTargets(fsPath: string, logPad = ""): string[]
    {
        const scripts: string[] = [];

        util.logBlank(1);
        util.log(logPad + "find makefile targets");

        const contents = util.readFileSync(fsPath);
        let idx = 0;
        let eol = contents.indexOf("\n", 0);

        while (eol !== -1)
        {
            const line: string = contents.substring(idx, eol);
            //
            // Target names always start at position 0 of the line.
            //
            // TODO = Skip targets that are environment variable names, for now.  Need to
            // parse value if set in makefile and apply here for $() target names.
            //
            if (line.length > 0 && !line.startsWith("\t") && !line.startsWith(" ") &&
                !line.startsWith("#") && !line.startsWith("$") && line.indexOf(":") > 0)
            {
                const { tgtName, dependsName } = this.parseTargetLine(line);

                //
                // Don't include object targets
                //
                if (tgtName.indexOf("/") === -1 && tgtName.indexOf("=") === -1 && tgtName.indexOf("\\") === -1 &&
                    tgtName.indexOf("(") === -1 && tgtName.indexOf("$") === -1 && this.isNormalTarget(tgtName))
                {
                    scripts.push(tgtName);
                    util.log(logPad + "   found makefile target");
                    util.logValue(logPad + "      name", tgtName);
                    util.logValue(logPad + "      depends target", dependsName);
                }
            }

            idx = eol + 1;
            eol = contents.indexOf("\n", idx);
        }

        util.log(logPad + "find makefile targets complete", 1);

        return scripts;
    }


    public getDefaultDefinition(target: string, folder: WorkspaceFolder, uri: Uri): TaskExplorerDefinition
    {
        const def: TaskExplorerDefinition = {
            type: "make",
            script: target,
            target,
            path: util.getRelativePath(folder, uri),
            fileName: path.basename(uri.path),
            problemMatcher: "",
            uri
        };
        return def;
    }


    private isNormalTarget(target: string): boolean
    {
        if (this.specialTargets.has(target))
        {
            return false;
        }
        if (this.suffixRuleTargets.test(target))
        {
            return false;
        }
        if (this.patternRuleTargets.test(target))
        {
            return false;
        }

        return true;
    }


    private parseTargetLine(line)
    {
        const tgtNames = line.split(":")[0].trim();
        const tgtName = tgtNames.split(" ").slice(-1)[0];

        const dependsName = line.substring(line.indexOf(":") + 1).trim();

        return { tgtName, dependsName };
    }


    public async readTasks(): Promise<Task[]>
    {
        util.logBlank();
        util.log("detect make files");

        const allTasks: Task[] = [];
        const visitedFiles: Set<string> = new Set();
        const paths = filesCache.get("make");

        if (workspace.workspaceFolders && paths)
        {
            for (const fobj of paths)
            {
                if (!util.isExcluded(fobj.uri.path) && !visitedFiles.has(fobj.uri.fsPath))
                {
                    visitedFiles.add(fobj.uri.fsPath);
                    const tasks = await this.readUriTasks(fobj.uri, null, "   ");
                    util.log("   processed make file", 3);
                    util.logValue("      file", fobj.uri.fsPath, 3);
                    util.logValue("      targets in file", tasks.length, 3);
                    allTasks.push(...tasks);
                }
            }
        }

        util.logBlank();
        util.logValue("   # of make tasks", allTasks.length, 2);
        util.log("detect make files complete", 1);

        return allTasks;
    }


    public async readUriTasks(uri: Uri, wsFolder?: WorkspaceFolder, logPad = ""): Promise<Task[]>
    {
        const result: Task[] = [];
        const folder = wsFolder || workspace.getWorkspaceFolder(uri);

        util.logBlank(1);
        util.log(logPad + "read make file uri tasks", 1);
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

        util.log(logPad + "read make file uri tasks complete", 1);
        return result;
    }

}
