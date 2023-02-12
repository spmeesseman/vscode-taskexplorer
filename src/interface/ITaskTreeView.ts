
import { TreeItem, TreeView } from "vscode";

export interface ITaskTreeView
{
    view: TreeView<TreeItem>;
    tree: any; // TreeItem;
}
