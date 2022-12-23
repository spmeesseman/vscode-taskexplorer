
import { Task } from "vscode";
import { NoScripts } from "../lib/noScripts";
import TaskFolder from "../tree/folder";

export interface ExplorerApi
{
    buildTaskTree(tasksList: Task[], logPad: string, logLevel: number): Promise<TaskFolder[] | NoScripts[]>;
}
