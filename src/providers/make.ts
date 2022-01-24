
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


    private findTargets(fsPath: string, logPad: string): string[]
    {
        const scripts: string[] = [];

        log.blank(1);
        log.write(logPad + "find makefile targets");

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

        log.write(logPad + "find makefile targets complete", 1);

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


    public async readTasks(logPad: string): Promise<Task[]>
    {
        const allTasks: Task[] = [];
        const visitedFiles: Set<string> = new Set();
        const paths = filesCache.get(this.providerName),
              enabled = configuration.get<boolean>(util.getTaskEnabledSettingName(this.providerName));

        log.methodStart(`detect ${this.providerName} files`, 1, logPad, true, [["enabled", enabled]]);

        if (enabled && paths)
        {
            for (const fObj of paths)
            {
                if (!util.isExcluded(fObj.uri.path) && !visitedFiles.has(fObj.uri.fsPath) && util.pathExists(fObj.uri.fsPath))
                {
                    visitedFiles.add(fObj.uri.fsPath);
                    const tasks = await this.readUriTasks(fObj.uri, logPad + "   ");
                    log.write(`   processed ${this.providerName} file`, 3, logPad);
                    log.value("      file", fObj.uri.fsPath, 3, logPad);
                    log.value("      targets in file", tasks.length, 3, logPad);
                    allTasks.push(...tasks);
                }
            }
        }

        log.methodDone(`detect ${this.providerName} files`, 1, logPad, true, [["# of tasks", allTasks.length]]);

        return allTasks;
    }


    public async readUriTasks(uri: Uri, logPad: string): Promise<Task[]>
    {
        const result: Task[] = [];
        const folder = workspace.getWorkspaceFolder(uri);

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
