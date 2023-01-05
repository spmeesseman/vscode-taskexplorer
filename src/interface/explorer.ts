
import { ExtensionContext, Task, TreeItem, Uri } from "vscode";
import { NoScripts } from "../lib/noScripts";
import TaskFolder from "../tree/folder";
import TaskItem from "../tree/item";
import SpecialTaskFolder from "../tree/specialFolder";

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type TaskMap = { [id: string]: TaskItem | undefined };

export interface IExplorerApi
{
    specialFolders: {
        favorites: SpecialTaskFolder;
        lastTasks: SpecialTaskFolder;
    };

    buildTaskTree(tasksList: Task[], logPad: string, logLevel: number, force?: boolean): Promise<TaskFolder[] | NoScripts[]>;
    dispose(context: ExtensionContext): void;
    getTasks(): Task[] | null;
    getTaskMap(): TaskMap;
    isBusy (): boolean;
    isVisible(): boolean;
    invalidateTasksCache(opt1?: string, opt2?: Uri | boolean, logPad?: string): Promise<void>;
    refresh(invalidate?: any, opt?: Uri | boolean, logPad?: string): Promise<void>;
    setEnabled(enable: boolean): void;
    waitForRefreshComplete(maxWait?: number): Promise<void>;
}
