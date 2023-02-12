
import * as nls from "vscode-nls";
import { TaskTree } from "src/tree/tree";
import { TreeItem, TreeItemCollapsibleState } from "vscode";

const localize = nls.loadMessageBundle();
const initScriptsLabel = localize("initScripts", "Scanning task files");
const loadScriptsLabel = localize("loadScripts", "Building task tree");
const noScriptsLabel = localize("noScripts", "No tasks found");


// abstract class AnimatedTreeItem extends TreeItem
// {
//     private timeout: NodeJS.Timeout | undefined;
//     constructor(label: string, contextName: string, tree: ITaskExplorer)
//     {
//         super(label, TreeItemCollapsibleState.None);
//         this.contextValue = contextName;
//         this.animate(label, tree);
//     }
//     public dispose = () => clearTimeout(this.timeout as NodeJS.Timeout);
//     private animate = (label: string, tree: ITaskExplorer) =>
//     {
//         const statusText = label + "...";
//         const _run = (ct: number) => {
//             this.timeout = setTimeout(() => {
//                 this.label = statusText.substring(0, statusText.length - 3 + (ct % 4));
//                 tree.fireTreeRefreshEvent("", 5, undefined);
//                 _run(++ct);
//             }, 400);
//         };
//         _run(1);
//     };
// }


export class NoScripts extends TreeItem
{
    constructor()
    {
        super(noScriptsLabel, TreeItemCollapsibleState.None);
        this.contextValue = "noscripts";
    }
}


// export class InitScripts extends AnimatedTreeItem
// {
//     constructor(tree: ITaskExplorer)
//     {
//         super(initScriptsLabel, "initscripts", tree);
//     }
// }


export class InitScripts extends TreeItem
{
    constructor(tree: TaskTree)
    {
        super(initScriptsLabel + "...");
        this.contextValue =  "initscripts";
    }
}



// export class LoadScripts extends AnimatedTreeItem
// {
//     constructor(tree: ITaskExplorer)
//     {
//         super(loadScriptsLabel, "loadscripts", tree);
//     }
// }


export class LoadScripts extends TreeItem
{
    constructor(tree: TaskTree)
    {
        super(loadScriptsLabel + "...");
        this.contextValue =  "loadscripts";
    }
}
