
import { TeWrapper } from "../../lib/wrapper";
import { ContextKeys } from "../../lib/constants";
import { TasksChangeEvent } from "../../interface";
import { TeWebviewView, WebviewViewIds } from "../webviewView";


interface State {
	pinStatus: boolean;
}


export class TaskUsageView extends TeWebviewView<State>
{
	static viewTitle = "Task Usage";
	static viewId: WebviewViewIds = "taskUsage"; // Must match view id in package.jso


	constructor(wrapper: TeWrapper)
	{
		super(
			wrapper,
			TaskUsageView.viewTitle,
			"task-usage.html",
			`taskExplorer.views.${TaskUsageView.viewId}`,
			`${ContextKeys.WebviewViewPrefix}home`,
			`${TaskUsageView.viewId}View`
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


	protected override finalizeHtml = async (html: string) =>
	{
		const taskCountToday = this.wrapper.storage.get<number>("taskCountToday", 0);
		html = html.replace(/\#\{taskUsage\.avgPerDay\}/g, "0")
				   .replace(/\#\{taskUsage\.mostUsedTask\}/g, "n/a")
				   .replace(/\#\{taskUsage\.today\}/g, taskCountToday.toString())
				   .replace(/\#\{taskUsage\.lastTaskRanAt\}/g, new Date().toLocaleTimeString());
		return html;
	};


	protected override onVisibilityChanged(visible: boolean)
	{
	}


	protected override onWindowFocusChanged(focused: boolean)
	{
	}

}
