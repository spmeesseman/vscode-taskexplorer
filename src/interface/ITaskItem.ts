
import { ITaskFile } from "./ITaskFile";
import { Task, TaskExecution, TreeItem, WorkspaceFolder } from "vscode";

export interface ITaskItem extends TreeItem
{
    groupLevel: number;
    id: string;
    isUser: boolean;
    paused: boolean;
    task: Task;
    taskFile: ITaskFile;
    taskSource: string;
    isExecuting(logPad?: string): TaskExecution | undefined;
    getFolder(): WorkspaceFolder | undefined;
    refreshState(logPad: string, logLevel: number): void;
}
