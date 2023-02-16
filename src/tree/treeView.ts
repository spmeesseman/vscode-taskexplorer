
import { TaskTree } from "./tree";
import { TeWrapper } from "src/lib/wrapper";
import { ContextKeys } from "src/lib/context";
import { TaskTreeManager } from "./treeManager";
import { TrackedUsageFeatures } from "src/lib/watcher/usageWatcher";
import {
    Disposable, TreeItem, TreeView, TreeViewExpansionEvent, TreeViewSelectionChangeEvent,
    TreeViewVisibilityChangeEvent, window
} from "vscode";


export type TreeViewIds = "taskTreeExplorer" | "taskTreeSideBar";

export interface ITaskTreeView
{
    view: TreeView<TreeItem>;
    tree: TaskTree;
}


export class TeTreeView implements ITaskTreeView, Disposable
{
	private readonly disposables: Disposable[] = [];
	private readonly _tree: TaskTree;
    private readonly _view: TreeView<TreeItem>;
    private _visible = false;


	constructor(
		private readonly wrapper: TeWrapper,
        treeManager: TaskTreeManager,
		title: string,
		description: string,
		private readonly id: TreeViewIds,
		private readonly contextKeyPrefix: `${ContextKeys.TreeViewPrefix}${TreeViewIds}`,
		private readonly trackingFeature: TrackedUsageFeatures)
	{
        this._tree = new TaskTree(id, treeManager);
        this._view = window.createTreeView("taskexplorer.view." + id, { treeDataProvider: this._tree, showCollapseAll: true });
        this._view.title = title;
        this._view.description = description;
		this.disposables.push(
            this._tree,
            this._view,
            this._view.onDidChangeVisibility(this.onVisibilityChanged, this),
            this._view.onDidCollapseElement(this.onElementCollapsed, this),
            this._view.onDidExpandElement(this.onElementExpanded, this),
            this._view.onDidChangeSelection(this.onElementSelectionChanged, this)
        );
	}

	dispose()
	{
		this.disposables.forEach((d) => {
            d.dispose();
        });
        this.disposables.splice(0);
	}

    get tree(): TaskTree {
        return this._tree;
    }

    get view(): TreeView<TreeItem> {
        return this._view;
    }

    get enabled(): boolean {
        return this.wrapper.config.get<boolean>(this.id === "taskTreeExplorer" ? "enableExplorerView" : "enableSideBar");
    }

    get visible(): boolean {
        return this._visible;
    }

    onElementCollapsed(e: TreeViewExpansionEvent<TreeItem>)
    {
    }

    onElementExpanded(e: TreeViewExpansionEvent<TreeItem>)
    {
    }

    onElementSelectionChanged(e: TreeViewSelectionChangeEvent<TreeItem>)
    {
    }

    onVisibilityChanged(e: TreeViewVisibilityChangeEvent)
    {
        this._visible = e.visible;
        this._tree.onVisibilityChanged(e.visible, true);
    }

}
