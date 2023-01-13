
import { ExtensionContext, Task, TreeItem, Uri } from "vscode";
import { ITaskFolderApi } from "./taskFolder";
import { ITaskItemApi } from "./taskItem";

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type TaskMap = { [id: string]: ITaskItemApi | undefined };

export interface IExplorerApi
{
    buildTaskTree(tasksList: Task[], logPad: string, logLevel: number, force?: boolean): Promise<ITaskFolderApi[] | TreeItem[]>;
    dispose(context: ExtensionContext): void;
    fireTreeRefreshEvent(logPad: string, logLevel: number, taskFile?: TreeItem): void;
    getChildren(element?: TreeItem): Promise<TreeItem[]>;
    getName(): string;
    getTasks(): Task[];
    getTaskMap(): TaskMap;
    getTaskTree(): ITaskFolderApi[] | TreeItem[] | undefined | null | void;
    isBusy (): boolean;
    isVisible(): boolean;
    refresh(invalidate: string | boolean | undefined, opt: Uri | false | undefined, logPad: string): Promise<void>;
    setEnabled(enable: boolean): void;
    waitForRefreshComplete(maxWait?: number): Promise<void>;
}
