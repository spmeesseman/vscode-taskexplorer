
import TaskMap from "./types/TaskMap";
import { ITaskFolder } from "./ITaskFolder";
import { Task, TreeItem, Uri } from "vscode";

export default interface ITaskTreeManager
{
    enableTaskTree(name: "taskExplorer"|"taskExplorerSideBar", enable: boolean, logPad: string): void;
    fireTreeRefreshEvent(logPad: string, logLevel: number, taskFile?: TreeItem): void;
    getTasks(): Task[];
    getTaskMap(): TaskMap;
    getTaskTree(): ITaskFolder[] | TreeItem[] | undefined | null | void;
    refresh(invalidate: string | boolean | undefined, opt: Uri | false | undefined, logPad: string): Promise<void>;
}
