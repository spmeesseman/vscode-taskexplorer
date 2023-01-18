
import { ExtensionContext, Task, TreeItem, Uri } from "vscode";
import { ITaskFolder } from "./ITaskFolder";
import { ITaskItem } from "./ITaskItem";

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type TaskMap = { [id: string]: ITaskItem | undefined };

export interface ITaskExplorer
{
    buildTaskTree(tasksList: Task[], logPad: string, logLevel: number, force?: boolean): Promise<ITaskFolder[] | TreeItem[]>;
    dispose(context: ExtensionContext): void;
    fireTreeRefreshEvent(logPad: string, logLevel: number, taskFile?: TreeItem): void;
    getChildren(element?: TreeItem): Promise<TreeItem[]>;
    getName(): string;
    getTasks(): Task[];
    getTaskMap(): TaskMap;
    getTaskTree(): ITaskFolder[] | TreeItem[] | undefined | null | void;
    isBusy (): boolean;
    isVisible(): boolean;
    refresh(invalidate: string | true | undefined, opt: Uri | false | undefined, logPad: string): Promise<void>;
    setEnabled(enable: boolean): void;
    waitForRefreshComplete(maxWait?: number): Promise<void>;
}
