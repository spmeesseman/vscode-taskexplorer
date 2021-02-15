
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


    private async findTargets(fsPath: string): Promise<string[]>
    {
        const scripts: string[] = [];

        util.log("");
        util.log("Find makefile targets");

        const contents = await util.readFile(fsPath);
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
                    util.log("   found target");
                    util.logValue("      name", tgtName);
                    util.logValue("      depends target", dependsName);
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
        util.log("");
        util.log("detectMakefiles");

        const allTasks: Task[] = [];
        const visitedFiles: Set<string> = new Set();
        const paths = filesCache.get("make");

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


    public async readUriTasks(uri: Uri, wsFolder?: WorkspaceFolder): Promise<Task[]>
    {
        const result: Task[] = [];
        const folder = wsFolder || workspace.getWorkspaceFolder(uri);

        if (folder)
        {
            const scripts = await this.findTargets(uri.fsPath);
            if (scripts)
            {
                Object.keys(scripts).forEach(each =>
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
