import { TreeItem, TreeView } from "vscode";

export interface ITaskTreeView
{
    view: TreeView<TreeItem>;
    tree: ITeTaskTree;
    readonly enabled: boolean;
    readonly visible: boolean;
}

export interface ITeTaskTree
{
    isVisible(): boolean;
    getChildren(element?: TreeItem): Promise<TreeItem[]>;
    getName(): string;
    getParent(element: TreeItem): TreeItem | null;
}
