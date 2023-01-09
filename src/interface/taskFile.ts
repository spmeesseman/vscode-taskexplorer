
import { TaskExplorerDefinition } from "./taskDefinition";
import { ITaskFolderApi } from "./taskFolder";
import { ITaskItemApi } from "./taskItem";
import { TreeItem, Uri } from "vscode";

export interface ITaskFileApi extends TreeItem
{
    fileName: string;
    groupLevel: number;
    readonly isGroup: boolean;
    path: string;
    resourceUri: Uri;
    readonly taskSource: string;
    treeNodes: (ITaskItemApi|ITaskFileApi)[];
    addTreeNode(treeNode: (ITaskFileApi | ITaskItemApi | undefined)): void;
    getFileNameFromSource(source: string, folder: ITaskFolderApi, taskDef: TaskExplorerDefinition, incRelPathForCode?: boolean): string;
    insertTreeNode(treeItem: ITaskFileApi|ITaskItemApi, index: number): void;
    removeTreeNode(treeItem: (ITaskFileApi | ITaskItemApi)): void;
}
