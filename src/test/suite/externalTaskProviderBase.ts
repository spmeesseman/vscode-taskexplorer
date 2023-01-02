/* eslint-disable import/no-extraneous-dependencies */

import * as path from "path";
import * as util from "../../lib/utils/utils";
import constants from "../../lib/constants";
import { Task, WorkspaceFolder, ShellExecution, Uri } from "vscode";
import { ExternalExplorerProvider, TaskExplorerDefinition } from "../../interface";


export class ExternalTaskProviderBase extends ExternalExplorerProvider implements ExternalExplorerProvider
{
    public providerName = "external2";


    public createTask(target: string, cmd: string, folder: WorkspaceFolder, uri: Uri): Task
    {
        const def: TaskExplorerDefinition = {
            type: "external2",
            script: target,
            target,
            icon: undefined,
            path: util.getRelativePath(folder, uri),
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
}

