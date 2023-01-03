
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

export class InitScripts extends TreeItem
{
    constructor()
    {
        super(localize("initScripts", "Scanning task files..."), TreeItemCollapsibleState.None);
        this.contextValue = "initscripts";
    }
}

export class LoadScripts extends TreeItem
{
    constructor()
    {
        super(localize("loadScripts", "Building task tree..."), TreeItemCollapsibleState.None);
        this.contextValue = "loadscripts";
    }
}

export class NoWorkspace extends TreeItem
{
    constructor()
    {
        super(localize("noWorkspace", "No workspace found"), TreeItemCollapsibleState.None);
        this.contextValue = "noworkspace";
    }
}
