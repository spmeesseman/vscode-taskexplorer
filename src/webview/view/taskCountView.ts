
import { Disposable } from "vscode";
import { State } from "../common/state";
import { TeWrapper } from "../../lib/wrapper";
import { ContextKeys } from "../../lib/context";
import { TasksChangeEvent } from "../../interface";
import { TeWebviewView, WebviewViewIds } from "../webviewView";
import { createTaskCountTable } from "../common/taskCountTable";


export class TaskCountView extends TeWebviewView<State>
{
	static viewTitle = "Task Count";
	static viewDescription = "Task Count Details";
	static viewId: WebviewViewIds = "taskCount"; // Must match view id in package.jso


	constructor(wrapper: TeWrapper)
	{
		super(
			wrapper,
			TaskCountView.viewTitle,
			TaskCountView.viewDescription,
			"task-count.html",
			`taskexplorer.view.${TaskCountView.viewId}`,
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


	protected override includeBody = async() => createTaskCountTable(this.wrapper);


	protected override onVisibilityChanged(visible: boolean)
	{
	}


	protected override onWindowFocusChanged(focused: boolean)
	{
	}


	protected override registerCommands(): Disposable[]
	{
		return [];
	}

}
