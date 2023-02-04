/* eslint-disable import/no-extraneous-dependencies */

import * as path from "path";
import constants from "../../../lib/constants";
import { getDevPath } from "../../utils/sharedUtils";
import { getRelativePath } from "../../../lib/utils/pathUtils";
import { IExternalProvider, ITaskDefinition } from "../../../interface";
import { Task, TaskGroup, WorkspaceFolder, ShellExecution, Uri, workspace } from "vscode";
// import { ExternalExplorerProvider, TaskExplorerDefinition } from "@spmeesseman/vscode-taskexplorer-types";
//  Test bombs with this reference ^^^


/**
 * Test class for external task providers
 */
export class ExternalTaskProvider extends IExternalProvider implements IExternalProvider
{
    public override providerName = "external3";


    public createTask(target: string, cmd: string, folder: WorkspaceFolder, uri: Uri): Task
    {
        const def: ITaskDefinition = {
            type: this.providerName,
            script: target,
            target,
            icon: getDevPath("res/sources/missing_icon.svg"),
            path: getRelativePath(folder, uri),
            fileName: path.basename(uri.path),
            uri
        };

        const execution = new ShellExecution("cmd", [ "/c", "test.bat" ]);
        return new Task(def, folder, target, this.providerName, execution, "$msCompile");
    }


    public getDocumentPosition(taskName: string | undefined, documentText: string | undefined): number
    {
        return 0;
    }


    public getGlobPattern(): string
    {
        return constants.GLOB_EXTERNAL;
    }


    public async getTasks()
    {
        const result: Task[] = [],
              uri = Uri.file("/dummy_path"),
              folder = (workspace.workspaceFolders as WorkspaceFolder[])[0]; // for tests only!

        const task = this.createTask("ext3_1_task_name", "ext3_1_task_name", folder, uri);
        task.group = TaskGroup.Build;
        result.push(task);

        const task2 = this.createTask("ext3_2_task_name", "ext3_2_task_name", folder, uri);
        task.group = TaskGroup.Build;
        result.push(task2);

        return result;
    }

    async invalidate(uri?: Uri, logPad?: string): Promise<void>
    {
        return;
    }

}
