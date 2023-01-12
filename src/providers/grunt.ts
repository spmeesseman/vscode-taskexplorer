
import * as path from "path";
import * as util from "../lib/utils/utils";
import log from "../lib/log/log";
import { TaskExplorerProvider } from "./provider";
import { TaskExplorerDefinition } from "../interface/taskDefinition";
import { Task, TaskGroup, WorkspaceFolder, ShellExecution, Uri, workspace } from "vscode";
import { readFileAsync } from "../lib/utils/fs";


export class GruntTaskProvider extends TaskExplorerProvider implements TaskExplorerProvider
{

    constructor() { super("grunt"); }


    public createTask(target: string, cmd: string, folder: WorkspaceFolder, uri: Uri): Task
    {
        const def = this.getDefaultDefinition(target, folder, uri),
              cwd = path.dirname(uri.fsPath),
              args = [ "grunt", target ],
              options = { cwd },
              execution = new ShellExecution("npx", args, options);

        return new Task(def, folder, target, "grunt", execution, "$msCompile");
    }


    private async findTargets(fsPath: string, logPad: string)
    {
        const scripts: string[] = [];

        log.methodStart("find grunt targets", 4, logPad, false, [[ "path", fsPath ]], this.logQueueId);

        const contents = await readFileAsync(fsPath);
        let idx = 0;
        let eol = contents.indexOf("\n", 0);

        while (eol !== -1)
        {
            let line: string = contents.substring(idx, eol).trim();
            if (line.length > 0 && line.toLowerCase().trimLeft().startsWith("grunt.registertask"))
            {
                let idx1 = line.indexOf("'");
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
                        const tgtName = line.substring(idx1, idx2).trim();
                        /* istanbul ignore else */
                        if (tgtName) {
                            scripts.push(tgtName);
                            log.value("   found grunt task", tgtName, 4, logPad, this.logQueueId);
                        }
                    }
                }
            }

            idx = eol + 1;
            eol = contents.indexOf("\n", idx);
        }

        log.methodDone("find grunt targets", 4, logPad, undefined, this.logQueueId);

        return scripts;
    }


    private getDefaultDefinition(target: string, folder: WorkspaceFolder, uri: Uri): TaskExplorerDefinition
    {
        const def: TaskExplorerDefinition = {
            type: "grunt",
            script: target,
            target,
            path: util.getRelativePath(folder, uri),
            fileName: path.basename(uri.path),
            uri
        };
        return def;
    }


    public getDocumentPosition(taskName: string | undefined, documentText: string | undefined): number
    {
        /* istanbul ignore next */
        if (!taskName || !documentText)
        {   /* istanbul ignore next */
            return 0;
        }
        return this.getDocumentPositionLine("grunt.registerTask(", taskName, documentText);
    }


    public async readUriTasks(uri: Uri, logPad: string): Promise<Task[]>
    {
        const result: Task[] = [],
              folder = workspace.getWorkspaceFolder(uri) as WorkspaceFolder;

        log.methodStart("read grunt file uri task", 3, logPad, false, [
            [ "path", uri.fsPath ], [ "project folder", folder.name ]
        ], this.logQueueId);

        const scripts = await this.findTargets(uri.fsPath, logPad + "   ");
        for (const s of scripts)
        {
            const task = this.createTask(s, s, folder, uri);
            task.group = TaskGroup.Build;
            result.push(task);
        }

        log.methodDone("read grunt file uri tasks", 3, logPad, [[ "#of tasks found", result.length ]], this.logQueueId);
        return result;
    }

}
