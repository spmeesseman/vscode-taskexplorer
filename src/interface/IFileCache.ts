
import { WorkspaceFolder } from "vscode";
import { ICacheItem } from "./ICacheItem";
import { IDictionary } from "./IDictionary";

export interface IFileCache
{
    addWsFolders(wsf: readonly WorkspaceFolder[] | undefined, logPad?: string): Promise<number>;
    buildTaskTypeCache(taskType: string, wsFolder: WorkspaceFolder | undefined, setCacheBuilding: boolean, logPad: string): Promise<number>;
    cancelBuildCache(): Promise<void>;
    getTaskFileCount(): number;
    getTaskFiles(taskType?: string): ICacheItem[];
    rebuildCache(logPad: string, forceForTests?: boolean): Promise<number>;
}
