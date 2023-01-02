/* eslint-disable import/no-extraneous-dependencies */

import * as path from "path";
import * as log from "../../lib/utils/log";
import * as util from "../../lib/utils/utils";
import constants from "../../lib/constants";
import { Task, TaskGroup, WorkspaceFolder, ShellExecution, Uri, workspace } from "vscode";
import { ExternalExplorerProvider, TaskExplorerDefinition } from "../../interface";
// import { ExternalExplorerProvider, TaskExplorerDefinition } from "@spmeesseman/vscode-taskexplorer-types";
//  Test bombs with this reference ^^^


/**
 * Test class for external task providers
 */
export class ExternalTaskProvider extends ExternalExplorerProvider implements ExternalExplorerProvider
{
    public providerName = "external";


    public createTask(target: string, cmd: string, folder: WorkspaceFolder, uri: Uri): Task
    {
        const def: TaskExplorerDefinition = {
            type: "external",
            script: target,
            target,
            icon: undefined,
            path: util.getRelativePath(folder, uri),
            fileName: path.basename(uri.path),
            uri
        };

        const execution = new ShellExecution("cmd", [ "/c", "test.bat" ]);
        return new Task(def, folder, target, "external", execution, "$msCompile");
    }


    public getDocumentPosition(taskName: string | undefined, documentText: string | undefined): number
    {
        return 0;
    }


    public getGlobPattern(): string
    {
        return constants.GLOB_EXTERNAL;
    }


    public async provideTasks()
    {
        const result: Task[] = [],
              uri = Uri.file("/dummy_path"),
              folder = (workspace.workspaceFolders as WorkspaceFolder[])[0]; // for tests only!

        log.methodStart("read external tasks", 1, "", true, [[ "path", uri.fsPath ], [ "project folder", folder.name ]]);

        const task = this.createTask("test_1_task_name", "test_1_task_name", folder, uri);
        task.group = TaskGroup.Build;
        result.push(task);

        const task2 = this.createTask("test_2_task_name", "test_2_task_name", folder, uri);
        task.group = TaskGroup.Build;
        result.push(task2);

        log.methodDone("read external tasks", 1, "", true);
        return result;
    }


    public resolveTask(_task: Task): Task | undefined
    {
        return undefined;
    }
}
