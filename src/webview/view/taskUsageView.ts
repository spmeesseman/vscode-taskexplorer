
import { Disposable } from "vscode";
import { State } from "../common/state";
import { TeWrapper } from "../../lib/wrapper";
import { ContextKeys } from "../../lib/context";
import { StorageChangeEvent } from "../../interface";
import { TeWebviewView, WebviewViewIds } from "../webviewView";


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
			wrapper.storage.onDidChange(e => { this.onStorageChanged(e); }, this)
		);
	}


	private async onStorageChanged(e: StorageChangeEvent)
	{
		if (e.key ===  "taskStats") {
			this.wrapper.log.methodStart("TaskUsageView Event: onStorageChanged", 2, this.wrapper.log.getLogPad());
			await this.refresh();
			this.wrapper.log.methodDone("TaskUsageView Event: onStorageChanged", 2, this.wrapper.log.getLogPad());
		}
	}


	protected override finalizeHtml = async (html: string) =>
	{
    	const taskStats = this.wrapper.taskManager.getTaskStats(),
			  lastTime = new Date(taskStats.lastTime).toLocaleDateString() + " " +
			  			 new Date(taskStats.lastTime).toLocaleTimeString();
		html = html.replace(/\#\{taskUsage\.avgPerDay\}/g, this.wrapper.taskManager.getAvgRunCount("d", "").toString())
				   .replace(/\#\{taskUsage\.avgPerWeek\}/g, this.wrapper.taskManager.getAvgRunCount("w", "").toString())
				   .replace(/\#\{taskUsage\.mostUsedTask\}/g, this.wrapper.taskManager.getMostUsedTask(""))
				   .replace(/\#\{taskUsage\.today\}/g, taskStats.todayCount.toString())
				   .replace(/\#\{taskUsage\.lastTaskRanAt\}/g, lastTime);
		return html;
	};


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
