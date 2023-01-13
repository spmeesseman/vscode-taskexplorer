
import { WorkspaceFolder } from "vscode";

export interface IFileCache
{
    addWsFolders(wsf: readonly WorkspaceFolder[] | undefined, logPad?: string): Promise<number>;
    buildTaskTypeCache(taskType: string, fileGlob: string, wsFolder: WorkspaceFolder | undefined, setCacheBuilding: boolean, logPad: string): Promise<number>;
    cancelBuildCache(): Promise<void>;
    rebuildCache(logPad: string): Promise<void>;
}
