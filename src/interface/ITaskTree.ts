
import { TreeDataProvider, TreeItem } from "vscode";

export interface ITaskTree extends TreeDataProvider<TreeItem>
{
    fireTreeRefreshEvent(logPad: string, logLevel: number, treeItem?: TreeItem): void;
    getName(): string;
    isBusy(): boolean;
    isVisible(): boolean;
}
