
import * as path from "path";
import * as util from "../common/utils";
import * as log from "../common/log";
import { configuration } from "../common/configuration";
import { TaskExplorerProvider } from "./provider";
import { TaskExplorerDefinition } from "../interface/taskDefinition";
import {
    Task, TaskGroup, WorkspaceFolder, ShellExecution, Uri, workspace, ShellExecutionOptions, extensions
} from "vscode";


export class MakeTaskProvider extends TaskExplorerProvider implements TaskExplorerProvider
{
    private suffixRuleTargets = /^(\.\w+|\.\w+\.\w+)$/;
    private patternRuleTargets = /^(%\.\w+|%)$/;
    private ruleTargetExp = /^([\w-.\/ ]+)\s*:[^=]/mg;  // note does not disallow leading '.', this must be checked separately.
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
        log.methodStart("create make task", 4, logPad, true, [["target", target], ["cmd", cmd]]);

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
        const problemMatcher = extensions.getExtension("ms-vscode.cpptools") ? "$gcc" : "$gccte";

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
        return idx !== -1 ? idx : 0;
    }


    private findTargets(fsPath: string, logPad: string): string[]
    {
        const scripts: string[] = [];
        log.methodStart("find makefile targets", 1, logPad, true, [["path", fsPath]]);

        const contents = util.readFileSync(fsPath);
        let match;
        while (match = this.ruleTargetExp.exec(contents))
        {
            const tgtName = match[1];
            if (tgtName.startsWith(".")) // skip special targets
            {
                continue;
            }
            if (!scripts.includes(tgtName)) // avoid duplicates
            {
                if (this.isNormalTarget(tgtName)) {
                    scripts.push(tgtName);
                    log.write(logPad + "   found makefile target");
                    log.value(logPad + "      name", tgtName);
                }
            }
        }

        log.methodDone("find makefile targets", 1, logPad, true);
        return scripts;
    }


    private getDefaultDefinition(target: string, folder: WorkspaceFolder, uri: Uri): TaskExplorerDefinition
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


    public async readUriTasks(uri: Uri, logPad: string): Promise<Task[]>
    {
        const result: Task[] = [],
              folder = workspace.getWorkspaceFolder(uri) as WorkspaceFolder;

        log.methodStart("read make file uri tasks", 1, logPad, true, [["path", uri?.fsPath], ["project folder", folder?.name]]);
        const scripts = this.findTargets(uri.fsPath, logPad + "   ");
        for (const s of scripts)
        {
            const task = this.createTask(s, s, folder, uri, undefined, logPad);
            task.group = TaskGroup.Build;
            result.push(task);
        }

        log.methodDone("read make file uri tasks", 1, logPad);
        return result;
    }

}
