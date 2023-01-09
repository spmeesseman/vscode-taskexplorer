
import { ExtensionContext, Task, TreeItem, Uri } from "vscode";
import { ITaskFolderApi } from "./taskFolder";
import { ITaskItemApi } from "./taskItem";

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type TaskMap = { [id: string]: ITaskItemApi | undefined };

export interface IExplorerApi
{
    buildTaskTree(tasksList: Task[], logPad: string, logLevel: number, force?: boolean): Promise<ITaskFolderApi[] | TreeItem[]>;
    dispose(context: ExtensionContext): void;
    fireTreeRefreshEvent(taskItem?: TreeItem, logPad?: string, logLevel?: number): void;
    getChildren(element?: TreeItem): Promise<TreeItem[]>;
    getName(): string;
    getTasks(): Task[] | null;
    getTaskMap(): TaskMap;
    getTaskTree(): ITaskFolderApi[] | TreeItem[] | undefined | null | void;
    isBusy (): boolean;
    isVisible(): boolean;
    invalidateTasksCache(opt1?: string, opt2?: Uri | boolean, logPad?: string): Promise<void>;
    refresh(invalidate?: any, opt?: Uri | boolean, logPad?: string): Promise<void>;
    setEnabled(enable: boolean): void;
    waitForRefreshComplete(maxWait?: number): Promise<void>;
}
