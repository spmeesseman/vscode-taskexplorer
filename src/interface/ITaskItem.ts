
import { TaskExecution, TreeItem } from "vscode";
import { ITaskFile } from "./ITaskFile";

export interface ITaskItem extends TreeItem
{
    groupLevel: number;
    id: string;
    isUser: boolean;
    paused: boolean;
    taskFile: ITaskFile;
    taskSource: string;
    isExecuting(logPad?: string): TaskExecution | undefined;
    refreshState(logPad: string, logLevel: number): void;
}
