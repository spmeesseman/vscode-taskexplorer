
import log from "../lib/log/log";
import { basename, dirname } from "path";
import { readFileAsync } from "../lib/utils/fs";
import { TaskExplorerProvider } from "./provider";
import { getRelativePath } from "../lib/utils/pathUtils";
import { configuration, } from "../lib/utils/configuration";
import { IDictionary, ITaskDefinition } from "../interface";
import {
    Task, TaskGroup, WorkspaceFolder, ShellExecution, Uri, workspace, ShellExecutionOptions, extensions
} from "vscode";


export class MakeTaskProvider extends TaskExplorerProvider implements TaskExplorerProvider
{
    private suffixRuleTargets = /^(\.\w+|\.\w+\.\w+)$/;
    private patternRuleTargets = /^(%\.\w+|%)$/;
    private ruleTargetExp = /^((?:\/|)[\w\-.]+)\s*:[^=]/gm;  // note does not disallow leading '.', this must be checked separately.
    // See: https://www.gnu.org/software/make/manual/html_node/Special-Targets.html
    private specialTargets = [
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
    ];

    private commands: IDictionary<string> = {
        aix: "make",
        darwin: "make",
        freebsd: "make",
        linux: "make",
        openbsd: "make",
        sunos: "make",
        win32: "nmake"
    };

    constructor() { super("make"); }


    public createTask(target: string, cmd: string, folder: WorkspaceFolder, uri: Uri, xArgs?: string[], logPad = ""): Task
    {
        log.methodStart("create make task", 4, logPad, false, [[ "target", target ], [ "cmd", cmd ]], this.logQueueId);

        const getCommand = (): string =>
        {
             return configuration.get<string>("pathToPrograms.make", this.commands[process.platform]);
        };

        const kind = this.getDefaultDefinition(target, folder, uri);

        const cwd = dirname(uri.fsPath);
        const args = [ target ];
        const options: ShellExecutionOptions = {
            cwd
        };

        const execution = new ShellExecution(getCommand(), args, options);
        const problemMatcher = extensions.getExtension("ms-vscode.cpptools") ? /* istanbul ignore next */"$gcc" : "$gccte";

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
            if (eLine === -1) { eLine = documentText.length; }
            let line = documentText.substring(bLine, eLine).trim();
            while (bLine !== -1 && bLine !== idx && idx !== -1 && line.indexOf(":") === -1)
            {
                idx = documentText.indexOf(taskName, idx + 1);
                bLine = documentText.lastIndexOf("\n", idx) + 1;
                eLine = documentText.indexOf("\n", idx);
                /* istanbul ignore else */
                if (bLine !== -1)
                {
                    /* istanbul ignore if */
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
            if (!scripts.includes(tgtName)) // avoid duplicates
            {
                if (this.isNormalTarget(tgtName)) {
                    scripts.push(tgtName);
                    log.value("   found makefile task", tgtName, 4, logPad, this.logQueueId);
                }
            }
        }

        log.methodDone("find makefile targets", 4, logPad, undefined, this.logQueueId);
        return scripts;
    }


    private getDefaultDefinition(target: string, folder: WorkspaceFolder, uri: Uri): ITaskDefinition
    {
        const def: ITaskDefinition = {
            type: "make",
            script: target,
            target,
            path: getRelativePath(folder, uri),
            fileName: basename(uri.path),
            problemMatcher: "",
            uri
        };
        return def;
    }


    private isNormalTarget(target: string): boolean
    {
        return !this.specialTargets.includes(target) && !this.suffixRuleTargets.test(target) &&
               !this.patternRuleTargets.test(target) && !target.startsWith(".");
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
