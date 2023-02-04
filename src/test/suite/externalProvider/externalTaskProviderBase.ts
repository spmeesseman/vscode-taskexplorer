/* eslint-disable import/no-extraneous-dependencies */

import * as path from "path";
import constants from "../../lib/constants";
import { getRelativePath } from "../../lib/utils/pathUtils";
import { Task, WorkspaceFolder, ShellExecution, Uri } from "vscode";
import { IExternalProvider, ITaskDefinition } from "../../interface";


export class ExternalTaskProviderBase extends IExternalProvider implements IExternalProvider
{
    public override providerName = "external2";


    public createTask(target: string, cmd: string, folder: WorkspaceFolder, uri: Uri): Task
    {
        const def: ITaskDefinition = {
            type: "external2",
            script: target,
            target,
            icon: undefined,
            path: getRelativePath(folder, uri),
            fileName: path.basename(uri.path),
            uri
        };

        const execution = new ShellExecution("cmd", [ "/c", "test.bat" ]);
        return new Task(def, folder, target, "external2", execution, "$msCompile");
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
        return undefined;
    }


    async invalidate(uri?: Uri, logPad?: string): Promise<void>
    {
        return undefined;
    }

}

