
import { Uri, TaskDefinition } from "vscode";
import { TaskItem } from "./tasks";


export interface TaskExplorerDefinition extends TaskDefinition
{
    script?: string;
    path?: string;
    fileName?: string;
    uri?: Uri;
    taskItem?: TaskItem;
    isDefault?: boolean;
    requiresArgs?: boolean;
    taskId?: string;
}
