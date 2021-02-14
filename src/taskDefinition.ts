
import { Uri, TaskDefinition } from "vscode";
import { TaskItem } from "./tasks";


export interface TaskExplorerDefinition extends TaskDefinition
{
    script?: string; // <- deprecated, use 'target'
    target?: string;
    path?: string;
    fileName?: string;
    uri?: Uri;
    isDefault?: boolean;
    //
    // `true` if this is type='script' and argument paremeters were found in the file content
    //
    takesArgs?: boolean;
    taskItemId?: string;
    scriptFile?: boolean;
    scriptType?: string;
    cmdLine?: string;
}
