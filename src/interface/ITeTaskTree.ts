import { TreeItem, TreeView } from "vscode";

export interface ITaskTreeView
{
    view: TreeView<TreeItem>;
    tree: ITeTaskTree;
}

export interface ITeTaskTree
{
    isVisible(): boolean;
    getChildren(element?: TreeItem): Promise<TreeItem[]>;
    getName(): string;
    getParent(element: TreeItem): TreeItem | null;
}
