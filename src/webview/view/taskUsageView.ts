
import { Disposable } from "vscode";
import { TeWrapper } from "../../lib/wrapper";
import { registerCommand } from "../../lib/command";
import { StorageChangeEvent } from "../../interface";
import { Commands, ContextKeys } from "../../lib/constants";
import { TeWebviewView, WebviewViewIds } from "../webviewView";
import { clearTaskStats, getAvgRunCount, getMostUsedTask, getTaskStats } from "../../tree/task";


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
    	const taskStats = getTaskStats();
		// const taskCountToday = this.wrapper.storage.get<number>("taskStats.today.count", 0),
		//	  taskLastRan = this.wrapper.storage.get<number>("taskStats.today.lastTime", 0);
		html = html.replace(/\#\{taskUsage\.avgPerDay\}/g, getAvgRunCount("d", "").toString())
				   .replace(/\#\{taskUsage\.avgPerWeek\}/g, getAvgRunCount("w", "").toString())
				   .replace(/\#\{taskUsage\.mostUsedTask\}/g, getMostUsedTask(""))
				   .replace(/\#\{taskUsage\.today\}/g, taskStats.todayCount.toString())
				   .replace(/\#\{taskUsage\.lastTaskRanAt\}/g, new Date(taskStats.lastTime).toLocaleTimeString());
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
		return [
			registerCommand(`${this.id}.refresh`, () => this.refresh(), this),
			registerCommand(Commands.ClearTaskStats, () => clearTaskStats, this),
		];
	}

}
