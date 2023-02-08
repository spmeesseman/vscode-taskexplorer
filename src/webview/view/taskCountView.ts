
import { TeWebviewView, WebviewViewIds } from "../webviewView";
import { ContextKeys } from "../../lib/constants";
import { TeContainer } from "../../lib/container";
import { ConfigurationChangeEvent } from "vscode";
import { TasksChangeEvent } from "../../interface";
import { StorageChangeEvent } from "../../interface/IStorage";
import { createTaskCountTable } from "../shared/taskCountTable";


interface State {
	pinStatus: boolean;
}


export class TaskCountView extends TeWebviewView<State>
{
	static viewTitle = "Task Counts";
	static viewId: WebviewViewIds = "taskCount";


	constructor(container: TeContainer)
	{
		super(
			container,
			TaskCountView.viewTitle,
			"task-count.html",
			`taskExplorer.views.${TaskCountView.viewId}`,
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
