
import { TaskExecution, TreeItem } from "vscode";
import { ITaskFileApi } from "./taskFile";

export interface ITaskItemApi extends TreeItem
{
    groupLevel: number;
    id: string;
    isUser: boolean;
    paused: boolean;
    taskFile: ITaskFileApi;
    taskSource: string;
    isExecuting(logPad?: string): TaskExecution | undefined;
    isRunning(): boolean;
    refreshState(logPad: string, logLevel: number): void;
}
