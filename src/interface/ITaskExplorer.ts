

import { ITaskItem } from "./ITaskItem";
import { ITaskFolder } from "./ITaskFolder";
import { Task, TreeDataProvider, TreeItem, Uri } from "vscode";

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type TaskMap = { [id: string]: ITaskItem | undefined };

export interface ITaskExplorer extends TreeDataProvider<TreeItem>
{
    dispose(): void;
    fireTreeRefreshEvent(logPad: string, logLevel: number, taskFile?: TreeItem): void;
    getName(): string;
    getTasks(): Task[];
    getTaskMap(): TaskMap;
    getTaskTree(): ITaskFolder[] | TreeItem[] | undefined | null | void;
    isBusy (): boolean;
    isVisible(): boolean;
    refresh(invalidate: string | boolean | undefined, opt: Uri | false | undefined, logPad: string): Promise<void>;
    setEnabled(enable: boolean, logPad: string): void;
    waitForRefreshComplete(maxWait?: number): Promise<void>;
}
