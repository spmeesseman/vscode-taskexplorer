
import { ITaskFileApi } from "./taskFile";
import { ITaskItemApi } from "./taskItem";
import { TreeItem } from "vscode";

export interface ITaskFolderApi extends TreeItem
{
    addTaskFile(taskFile: ITaskFileApi|ITaskItemApi): Promise<void>;
    insertTaskFile(taskFile: ITaskFileApi|ITaskItemApi, index: number): void;
    removeTaskFile(taskFile: ITaskFileApi | ITaskItemApi | string): void;
}
