
import * as nls from "vscode-nls";
import { TreeItem, TreeItemCollapsibleState } from "vscode";

const localize = nls.loadMessageBundle();

export class NoScripts extends TreeItem
{
    constructor()
    {
        super(localize("noScripts", "No scripts found"), TreeItemCollapsibleState.None);
        this.contextValue = "noscripts";
    }
}
