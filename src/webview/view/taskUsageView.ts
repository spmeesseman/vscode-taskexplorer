
import { TeWebviewView, WebviewViewIds } from "../webviewView";
import { ContextKeys } from "../../lib/constants";
import { TeWrapper } from "../../lib/wrapper";
import { ConfigurationChangeEvent } from "vscode";
import { TasksChangeEvent } from "../../interface";
import { StorageChangeEvent } from "../../interface/IStorage";
import { createTaskCountTable } from "../shared/taskCountTable";


interface State {
	pinStatus: boolean;
}


export class TaskUsageView extends TeWebviewView<State>
{
	static viewTitle = "Task Usage";
	static viewId: WebviewViewIds = "usage";


	constructor(container: TeWrapper)
	{
		super(
			container,
			TaskUsageView.viewTitle,
			"task-count.html",
			`taskExplorer.views.${TaskUsageView.viewId}`,
			`${ContextKeys.WebviewViewPrefix}home`,
			"taskCountView"
		);
		this.disposables.push(
			container.configuration.onDidChange(e => { this.onConfigurationChanged(e); }, this),
			container.storage.onDidChange(e => { this.onStorageChanged(e); }, this),
			container.treeManager.onTasksChanged(e => { this.onTasksChanged(e); }, this)
		);
	}


	private onConfigurationChanged(e: ConfigurationChangeEvent)
	{
	}


	private onStorageChanged(e: StorageChangeEvent)
	{
	}


	private async onTasksChanged(e: TasksChangeEvent)
	{
		if (this.isFirstLoadComplete) {
			await this.refresh();
		}
	}


	protected override includeBody = async() => createTaskCountTable(this.container.context.extensionUri);


	protected override onVisibilityChanged(visible: boolean)
	{
	}


	protected override onWindowFocusChanged(focused: boolean)
	{
	}

}
