
import { WorkspaceFolder } from "vscode";
import { ICacheItem } from "./ICacheItem";

export interface ITeFileCache
{
    addWsFolders(wsf: readonly WorkspaceFolder[] | undefined, logPad?: string): Promise<number>;
    buildTaskTypeCache(taskType: string, wsFolder: WorkspaceFolder | undefined, setCacheBuilding: boolean, logPad: string): Promise<number>;
    cancelBuildCache(): Promise<void>;
    getTaskFileCount(): number;
    getTaskFiles(taskType?: string): ICacheItem[];
    rebuildCache(logPad: string, forceForTests?: boolean): Promise<number>;
}