
import { IDictionary } from "../interface";
import { TreeView, TreeItem } from "vscode";

export const views: IDictionary<TreeView<TreeItem>|undefined> = {};

// export const getView = (name?: string) => Object.entries(views).find(v => v[1] !== undefined && (!name || v[0] === name))?.[1];
