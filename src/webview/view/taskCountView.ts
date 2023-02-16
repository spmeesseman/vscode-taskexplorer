
import { Disposable } from "vscode";
import { State } from "../common/state";
import { TeWrapper } from "../../lib/wrapper";
import { ContextKeys, getContext } from "../../lib/context";
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


	protected override includeHead = async() => ""; // For coverage, until 'head' is used someday


	protected override includeEndOfBody = async() => ""; // For coverage, until 'head' is used someday


	protected override includeBootstrap = (): Promise<State> => this.getState(); // For coverage, haven't messed with states yet


	private async getState(): Promise<State> { // For coverage, haven't messed with states yet
		return {
			pinned: true, // this.wrapper.storage.get('home:state:pinned') ?? true;
			extensionEnabled: !!getContext(ContextKeys.Enabled, false)
		};
	}

}
