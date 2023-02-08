
import { TeWrapper } from "../../lib/wrapper";
import { ContextKeys } from "../../lib/constants";
import { TasksChangeEvent } from "../../interface";
import { TeWebviewView, WebviewViewIds } from "../webviewView";
import { createTaskCountTable } from "../shared/taskCountTable";


interface State {
	pinStatus: boolean;
}


export class TaskCountView extends TeWebviewView<State>
{
	static viewTitle = "Task Count";
	static viewId: WebviewViewIds = "taskCount"; // Must match view id in package.jso


	constructor(wrapper: TeWrapper)
	{
		super(
			wrapper,
			TaskCountView.viewTitle,
			"task-count.html",
			`taskExplorer.views.${TaskCountView.viewId}`,
			`${ContextKeys.WebviewViewPrefix}home`,
			`${TaskCountView.viewId}View`
		);
		this.disposables.push(
			wrapper.treeManager.onTasksChanged(e => { this.onTasksChanged(e); }, this)
		);
	}


	private async onTasksChanged(e: TasksChangeEvent)
	{
		if (this.isFirstLoadComplete) {
			await this.refresh();
		}
	}


	protected override includeBody = async() => createTaskCountTable(this.wrapper.context.extensionUri);


	protected override onVisibilityChanged(visible: boolean)
	{
	}


	protected override onWindowFocusChanged(focused: boolean)
	{
	}

}
