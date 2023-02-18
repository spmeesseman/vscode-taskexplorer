
import { WorkspaceFoldersChangeEvent } from "vscode";

export interface ITeFileWatcher
{
    init(logPad: string): void;
    isBusy(): boolean;
    onWsFoldersChange(e: WorkspaceFoldersChangeEvent): Promise<void>;
    registerFileWatcher(taskType: string, firstRun: boolean, enabled: boolean, logPad: string): Promise<void>;
}
