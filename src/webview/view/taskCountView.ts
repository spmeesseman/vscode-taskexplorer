
import { Disposable } from "vscode";
import { State } from "../shared/state";
import { TeWrapper } from "../../lib/wrapper";
import { ContextKeys } from "../../lib/constants";
import { TasksChangeEvent } from "../../interface";
import { registerCommand } from "../../lib/command";
import { TeWebviewView, WebviewViewIds } from "../webviewView";
import { createTaskCountTable } from "../shared/taskCountTable";


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


	protected override registerCommands(): Disposable[]
	{
		return [];
	}

}
