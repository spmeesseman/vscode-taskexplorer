
import { ExtensionContext, Task, TreeItem, Uri } from "vscode";
import { NoScripts } from "../lib/noScripts";
import TaskFile from "../tree/file";
import TaskFolder from "../tree/folder";
import TaskItem from "../tree/item";
import SpecialTaskFolder from "../tree/specialFolder";
import TreeUtils from "../tree/treeUtils";

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type TaskMap = { [id: string]: TaskItem };

export interface IExplorerApi
{
    treeUtils: TreeUtils;

    specialFolders: {
        favorites: SpecialTaskFolder;
        lastTasks: SpecialTaskFolder;
    };

    buildTaskTree(tasksList: Task[], logPad: string, logLevel: number, force?: boolean): Promise<TaskFolder[] | NoScripts[]>;
    dispose(context: ExtensionContext): void;
    getChildren(element?: TreeItem, logPad?: string, logLevel?: number): Promise<TreeItem[]>;
    getParent(element: TreeItem): TreeItem | null;
    getTasks(): Task[] | null;
    getTreeItem(element: TaskItem | TaskFile | TaskFolder): TreeItem;
    isBusy (): boolean;
    isVisible(): boolean;
    invalidateTasksCache(opt1?: string, opt2?: Uri | boolean, logPad?: string): Promise<void>;
    refresh(invalidate?: any, opt?: Uri | boolean, logPad?: string): Promise<void>;
    setEnabled(enable: boolean): void;
    waitForRefreshComplete(maxWait?: number): Promise<void>;
}
