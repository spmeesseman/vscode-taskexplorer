
import { Task, TreeItem, Uri } from "vscode";
import { NoScripts } from "../lib/noScripts";
import TaskFolder from "../tree/folder";
import TaskItem from "../tree/item";

export interface ExplorerApi
{
    buildTaskTree(tasksList: Task[], logPad: string, logLevel: number): Promise<TaskFolder[] | NoScripts[]>;
    getChildren(element?: TreeItem, logPad?: string, logLevel?: number): Promise<TreeItem[]>;
    getTasks(): Task[] | null;
    getTaskItems(taskId: string | undefined, logPad?: string, executeOpenForTests?: boolean, logLevel?: number): Promise<Map<string, TaskItem> | TaskItem | undefined>;
    refresh(invalidate?: any, opt?: Uri | boolean, logPad?: string): Promise<void>;
    showSpecialTasks(show: boolean, isFavorite?: boolean, forceChange?: boolean): Promise<void>;
}
