
import { State } from "../common/state";
import { TeWrapper } from "../../lib/wrapper";
import { TeWebviewView } from "../webviewView";
import { StorageChangeEvent } from "../../interface";
import { ContextKeys, WebviewViewIds } from "../../lib/context";


export class TaskUsageView extends TeWebviewView<State>
{
	static viewTitle = "Task Usage";
	static viewDescription = "Task Usage Details";
	static viewId: WebviewViewIds = "taskUsage"; // Must match view id in package.jso


	constructor(wrapper: TeWrapper)
	{
		super(
			wrapper,
			TaskUsageView.viewTitle,
			TaskUsageView.viewDescription,
			"task-usage.html",
			`taskexplorer.view.${TaskUsageView.viewId}`,
			`${ContextKeys.WebviewViewPrefix}home`,
			`${TaskUsageView.viewId}View`
		);
		this.disposables.push(
			wrapper.storage.onDidChange(e => { this.onStorageChanged(e); }, this)
		);
	}


	private async onStorageChanged(e: StorageChangeEvent)
	{
		if (e.key ===  "usages") {
			this.wrapper.log.methodStart("TaskUsageView Event: onStorageChanged", 2, this.wrapper.log.getLogPad());
			await this.refresh();
			this.wrapper.log.methodDone("TaskUsageView Event: onStorageChanged", 2, this.wrapper.log.getLogPad());
		}
	}


	protected override onHtmlFinalize = async (html: string) =>
	{
    	const lastTime = this.wrapper.taskManager.getLastRanTaskTime(""),
			  lastTimeFmt = new Date(lastTime).toLocaleDateString() + " " +
			  			   new Date(lastTime).toLocaleTimeString();
		html = html.replace(/\#\{taskUsage\.avgPerDay\}/g, this.wrapper.taskManager.getAvgRunCount("d", "").toString())
				   .replace(/\#\{taskUsage\.avgPerWeek\}/g, this.wrapper.taskManager.getAvgRunCount("w", "").toString())
				   .replace(/\#\{taskUsage\.mostUsedTask\}/g, this.wrapper.taskManager.getMostUsedTask(""))
				   .replace(/\#\{taskUsage\.today\}/g, this.wrapper.taskManager.getTodayCount("").toString())
				   .replace(/\#\{taskUsage\.lastTaskRanAt\}/g, lastTimeFmt);
		return html;
	};


	protected override includeBody = async() => ""; // For coverage, empty body


	protected override includeHead = async() => ""; // For coverage, empty head


	protected override includeEndOfBody = async() => ""; // For coverage, empty endOfBody

}
