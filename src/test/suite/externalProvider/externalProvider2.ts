/* eslint-disable import/no-extraneous-dependencies */

import * as path from "path";
import { Globs } from "../../../lib/constants";
import { getDevPath } from "../../utils/sharedUtils";
import { getRelativePath } from "../../../lib/utils/pathUtils";
import { IExternalProvider, ITaskDefinition } from "../../../interface";
import { Task, WorkspaceFolder, ShellExecution, Uri, workspace, TaskGroup } from "vscode";


export class ExternalTaskProvider2 extends IExternalProvider implements IExternalProvider
{
    public override providerName = "external2";


    public createTask(target: string, cmd: string, folder: WorkspaceFolder, uri: Uri): Task
    {
        const def: ITaskDefinition = {
            type: this.providerName,
            script: target,
            target,
            icon: getDevPath("res/sources/light/composer.svg"),
            iconDark: getDevPath("res/sources/dark/composer.svg"),
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
        return Globs.GLOB_EXTERNAL;
    }


    public async getTasks()
    {
        const result: Task[] = [],
              uri = Uri.file("/dummy_path"),
              folder = (workspace.workspaceFolders as WorkspaceFolder[])[0]; // for tests only!

        const task = this.createTask("ext2_1_task_name", "ext2_1_task_name", folder, uri);
        task.group = TaskGroup.Build;
        result.push(task);

        const task2 = this.createTask("ext2_2_task_name", "ext2_2_task_name", folder, uri);
        task.group = TaskGroup.Build;
        result.push(task2);

        return result;
    }


    async invalidate(uri?: Uri, logPad?: string): Promise<void>
    {
        return undefined;
    }

}

