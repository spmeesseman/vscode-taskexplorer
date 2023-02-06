
import { TaskMap } from "./types/TaskMap";
import { ITaskFolder } from "./ITaskFolder";
import { Task, TreeItem, Uri } from "vscode";
import { IDictionary } from "./IDictionary";
import { ITaskTreeView } from "./ITaskTreeView";

export interface ITaskTreeManager
{
    views: IDictionary<ITaskTreeView|undefined>;
    enableTaskTree(name: "taskExplorer"|"taskExplorerSideBar", enable: boolean, logPad: string): void;
    fireTreeRefreshEvent(logPad: string, logLevel: number, treeItem?: TreeItem): void;
    getTasks(): Task[];
    getTaskMap(): TaskMap;
    getTaskTree(): ITaskFolder[] | TreeItem[] | undefined | null | void;
    refresh(invalidate: string | boolean | undefined, opt: Uri | false | undefined, logPad: string): Promise<void>;
}
