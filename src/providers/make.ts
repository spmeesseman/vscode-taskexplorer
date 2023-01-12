
import * as path from "path";
import * as util from "../lib/utils/utils";
import log from "../lib/log/log";
import { configuration } from "../lib/utils/configuration";
import { TaskExplorerProvider } from "./provider";
import { TaskExplorerDefinition } from "../interface/taskDefinition";
import {
    Task, TaskGroup, WorkspaceFolder, ShellExecution, Uri, workspace, ShellExecutionOptions, extensions
} from "vscode";
import { readFileAsync } from "../lib/utils/fs";


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
        log.methodStart("create make task", 4, logPad, false, [[ "target", target ], [ "cmd", cmd ]], this.logQueueId);

        const getCommand = (): string =>
        {
            let make = "make";
            /* istanbul ignore else */   // I don't text on anythingbut windows
            if (process.platform === "win32") {
                make = "nmake";
            }
            /* istanbul ignore else */
            if (configuration.get("pathToPrograms.make")) {
                make = configuration.get("pathToPrograms.make");
                //
                // Ref ticket #138 - temp logging
                //
                log.value("   set make program from settings", make, 5, logPad, this.logQueueId);
            }
            log.value("   make program", make, 5, logPad, this.logQueueId);
            return make;
        };

        const kind = this.getDefaultDefinition(target, folder, uri);

        const cwd = path.dirname(uri.fsPath);
        const args = [ target ];
        const options: ShellExecutionOptions = {
            cwd
        };

        const execution = new ShellExecution(getCommand(), args, options);
        /* istanbul ignore next */
        const problemMatcher = extensions.getExtension("ms-vscode.cpptools") ? "$gcc" : "$gccte";

        log.methodDone("create make task", 4, logPad, undefined, this.logQueueId);
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
            /* istanbul ignore if */
            if (eLine === -1) { eLine = documentText.length; }
            let line = documentText.substring(bLine, eLine).trim();
            while (bLine !== -1 && bLine !== idx && idx !== -1 && line.indexOf(":") === -1)
            {
                idx = documentText.indexOf(taskName, idx + 1);
                bLine = documentText.lastIndexOf("\n", idx) + 1;
                eLine = documentText.indexOf("\n", idx);
                /* istanbul ignore else */
                if (bLine !== -1)
                {   /* istanbul ignore if */
                    if (eLine === -1) { eLine = documentText.length; }
                    line = documentText.substring(bLine, eLine).trim();
                }
            }
        }
        return idx !== -1 ? idx : 0;
    }


    private async findTargets(fsPath: string, logPad: string)
    {
        const scripts: string[] = [];
        log.methodStart("find makefile targets", 4, logPad, false, [[ "path", fsPath ]], this.logQueueId);

        const contents = await readFileAsync(fsPath);
        let match;
        while (match = this.ruleTargetExp.exec(contents))
        {
            const tgtName = match[1];
            if (tgtName.startsWith(".")) // skip special targets
            {
                continue;
            }
            /* istanbul ignore else */
            if (!scripts.includes(tgtName)) // avoid duplicates
            {   /* istanbul ignore else */
                if (this.isNormalTarget(tgtName)) {
                    scripts.push(tgtName);
                    log.value("   found makefile task", tgtName, 4, logPad, this.logQueueId);
                }
            }
        }

        log.methodDone("find makefile targets", 4, logPad, undefined, this.logQueueId);
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
        /* istanbul ignore if */
        if (this.specialTargets.has(target))
        {
            return false;
        }
        /* istanbul ignore if */
        if (this.suffixRuleTargets.test(target))
        {
            return false;
        }
        /* istanbul ignore if */
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

        log.methodStart("read make file uri tasks", 3, logPad, false, [
            [ "path", uri.fsPath ], [ "project folder", folder.name ]
        ], this.logQueueId);
        const scripts = await this.findTargets(uri.fsPath, logPad + "   ");
        for (const s of scripts)
        {
            const task = this.createTask(s, s, folder, uri, undefined, logPad);
            task.group = TaskGroup.Build;
            result.push(task);
        }

        log.methodDone("read make file uri tasks", 3, logPad, [[ "#of tasks found", result.length ]], this.logQueueId);
        return result;
    }

}
