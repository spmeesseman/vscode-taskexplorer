import { Task, Uri } from "vscode";
import { IDictionary } from "./IDictionary";
import { ITaskFolder } from "./ITaskFolder";
import { TaskMap } from "./ITeTaskManager";
import { ITaskTreeView } from "./ITeTaskTree";

export interface ITeTreeManager
{
    getTaskMap(): TaskMap;
    getTasks(): Task[];
    getTaskTree(): void | ITaskFolder[] | null | undefined;
    refresh(invalidate: string | false | undefined, opt: Uri | false | undefined, logPad: string): Promise<void>;
    views: IDictionary<ITaskTreeView>;
}
