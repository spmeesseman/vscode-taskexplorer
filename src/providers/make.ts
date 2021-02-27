
import {
    Task, TaskGroup, WorkspaceFolder, ShellExecution, Uri, workspace, ShellExecutionOptions, extensions
} from "vscode";
import * as path from "path";
import * as util from "../common/utils";
import * as log from "../common/log";
import { configuration } from "../common/configuration";
import { filesCache } from "../cache";
import { TaskExplorerProvider } from "./provider";
import { TaskExplorerDefinition } from "../taskDefinition";


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


    public createTask(target: string, cmd: string, folder: WorkspaceFolder, uri: Uri, xArgs?: string[], logPad = ""): Task
    {
        log.methodStart("create make task", 4, logPad, true);

        const getCommand = (): string =>
        {
            let make = "make";
            if (process.platform === "win32") {
                make = "nmake";
            }
            if (configuration.get("pathToMake")) {
                make = configuration.get("pathToMake");
                //
                // Ref ticket #138 - temp logging
                //
                log.value("   set make program from settings", make, 5, logPad);
            }
            log.value("   make program", make, 5, logPad);
            return make;
        };

        const kind = this.getDefaultDefinition(target, folder, uri);

        const cwd = path.dirname(uri.fsPath);
        const args = [target];
        const options: ShellExecutionOptions = {
            cwd
        };

        const execution = new ShellExecution(getCommand(), args, options);
        let problemMatcher = "$gccte";
        const cPlusPlusExtension = extensions.getExtension("spmeesseman.vscode-taskexplorer");
        if (cPlusPlusExtension) {
            problemMatcher = "$gcc";
        }

        log.methodDone("create make task", 4, logPad, true);

        return new Task(kind, folder, target, "make", execution, problemMatcher);
    }


    public getDocumentPosition(taskName: string | undefined, documentText: string | undefined): number
    {
        if (!taskName || !documentText) {
            return 0;
        }
        let idx = documentText.indexOf(taskName + ":");
        if (idx === -1)
        {
            idx = documentText.indexOf(taskName);
            let bLine = documentText.lastIndexOf("\n", idx) + 1;
            let eLine = documentText.indexOf("\n", idx);
            if (eLine === -1) { eLine = documentText.length; }
            let line = documentText.substring(bLine, eLine).trim();
            while (bLine !== -1 && bLine !== idx && idx !== -1 && line.indexOf(":") === -1)
            {
                idx = documentText.indexOf(taskName, idx + 1);
                bLine = documentText.lastIndexOf("\n", idx) + 1;
                eLine = documentText.indexOf("\n", idx);
                if (bLine !== -1)
                {
                    if (eLine === -1) { eLine = documentText.length; }
                    line = documentText.substring(bLine, eLine).trim();
                }
            }
        }
        return idx;
    }


    private findTargets(fsPath: string, logPad = ""): string[]
    {
        const scripts: string[] = [];

        log.blank(1);
        log.write(logPad + "find makefile targets");

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
                    log.write(logPad + "   found makefile target");
                    log.value(logPad + "      name", tgtName);
                    log.value(logPad + "      depends target", dependsName);
                }
            }

            idx = eol + 1;
            eol = contents.indexOf("\n", idx);
        }

        log.write(logPad + "find makefile targets complete", 1);

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


    private parseTargetLine(line: string)
    {
        const tgtNames = line.split(":")[0].trim();
        const tgtName = tgtNames.split(" ").slice(-1)[0];

        const dependsName = line.substring(line.indexOf(":") + 1).trim();

        return { tgtName, dependsName };
    }


    public async readTasks(logPad = ""): Promise<Task[]>
    {
        log.methodStart("detect make files", 1, logPad, true);

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
                    const tasks = await this.readUriTasks(fobj.uri, undefined, logPad + "   ");
                    log.write("   processed make file", 3, logPad);
                    log.value("      file", fobj.uri.fsPath, 3, logPad);
                    log.value("      targets in file", tasks.length, 3, logPad);
                    allTasks.push(...tasks);
                }
            }
        }

        log.blank();
        log.value("   # of make tasks", allTasks.length, 2, logPad);
        log.methodDone("detect make files", 1, logPad, true);

        return allTasks;
    }


    public async readUriTasks(uri: Uri, wsFolder?: WorkspaceFolder, logPad = ""): Promise<Task[]>
    {
        const result: Task[] = [];
        const folder = wsFolder || workspace.getWorkspaceFolder(uri);

        log.methodStart("read make file uri tasks", 1, logPad, true, [["path", uri?.fsPath], ["project folder", folder?.name]]);

        if (folder)
        {
            const scripts = this.findTargets(uri.fsPath, logPad + "   ");
            if (scripts)
            {
                for (const s of scripts)
                {
                    const task = this.createTask(s, s, folder, uri, undefined, logPad);
                    task.group = TaskGroup.Build;
                    result.push(task);
                }
            }
        }

        log.methodDone("read make file uri tasks", 1, logPad);
        return result;
    }

}
