
import { State } from "../common/state";
import { TeWrapper } from "../../lib/wrapper";
import { ContextKeys } from "../../lib/context";
import { TasksChangeEvent } from "../../interface";
import { Commands } from "../../lib/command/command";
import { TeWebviewPanel, WebviewIds } from "../webviewPanel";


export class MonitorPage extends TeWebviewPanel<State>
{
	static viewTitle = "Task Monitor";
	static viewId: WebviewIds = "taskMonitor"; // Must match view id in package.jso


	constructor(wrapper: TeWrapper)
	{
		super(
			wrapper,
			"monitor.html",
			MonitorPage.viewTitle,
			"res/img/logo-bl.png",
			`taskexplorer.view.${MonitorPage.viewId}`,
			`${ContextKeys.WebviewPrefix}taskMonitor`,
			`${MonitorPage.viewId}View`,
			Commands.ShowMonitorPage
		);
		this.disposables.push(
			wrapper.treeManager.onTasksChanged(e => { this.onTasksChanged(e); }, this)
		);
	}


	private async getState(): Promise<State>
	{
		return {
			extensionEnabled: this.wrapper.views.taskExplorer.enabled || this.wrapper.views.taskExplorerSideBar.enabled,
			pinned: false,
			seconds: 0,
			taskType: "grunt",
			webroot: this.getWebRoot()
		};
	}


	protected override includeBootstrap = (): Promise<State> => this.getState();


	protected override includeCodicon = () => true;


	protected override includeFontAwesome = () => ({ duotone: true, regular: true });


    private async onTasksChanged(e: TasksChangeEvent)
	{
		if (this.isFirstLoadComplete) {
			await this.refresh();
		}
	}


	protected override onVisibilityChanged(_visible: boolean)
	{
		this.wrapper.log.methodStart("MonitorPage Event: onVisibilityChanged", 2, this.wrapper.log.getLogPad());
		this.wrapper.log.methodDone("MonitorPage Event: onVisibilityChanged", 2, this.wrapper.log.getLogPad());
	}


	protected override onFocusChanged(focused: boolean): void
	{
		this.wrapper.log.methodStart("MonitorPage Event: onFocusChanged", 2, this.wrapper.log.getLogPad());
		this.wrapper.log.methodDone("MonitorPage Event: onFocusChanged", 2, this.wrapper.log.getLogPad());
	}

}
