
import { Task } from "vscode";
import { State } from "../common/state";
import { TeWrapper } from "../../lib/wrapper";
import { TeWebviewPanel } from "../webviewPanel";
import { Commands } from "../../lib/command/command";
import { ContextKeys, WebviewIds } from "../../lib/context";
import { ITeTasksChangeEvent, ITeTaskStatusChangeEvent } from "../../interface";
import { DidChangeRunningTasksType, DidChangeTaskStatusType, DidChangeTaskType, ITask } from "../common/ipc";


export class MonitorPage extends TeWebviewPanel<State>
{
	static viewTitle = "Task Monitor";
	static viewId: WebviewIds = "taskMonitor"; // Must match view id in package.json


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
			wrapper.treeManager.onDidTasksChange(e => { this.onTasksChanged(e); }, this),
			wrapper.treeManager.onDidTaskStatusChange(e => this.onTaskStatusChanged(e), this)
		);
	}


	private prepareTasksForTransport = (tasks: Task[]): ITask[] =>
	{
		return tasks.map<ITask>(t => ({
			name: t.name,
			definition: t.definition,
			source: t.source,
			treeId: ""
		}));
	};


	protected override getState = async() =>
	{
		return {
			...(await super.getState()),
			last: this.prepareTasksForTransport(this.wrapper.treeManager.lastTasks),
			favorites: this.prepareTasksForTransport(this.wrapper.treeManager.favoriteTasks),
			running: this.prepareTasksForTransport(this.wrapper.treeManager.runningTasks),
			famous: this.prepareTasksForTransport(this.wrapper.treeManager.famousTasks),
			tasks: this.prepareTasksForTransport(this.wrapper.treeManager.getTasks())
		};
	};


	protected override includeBootstrap = (): Promise<State> => this.getState();


	protected override includeFontAwesome = () => ({ duotone: true, regular: true, icons: [ "gears", "gear", "gears", "star" ] });


    private onTasksChanged = async (_e: ITeTasksChangeEvent) => this.notify(DidChangeTaskType, await this.getState());


	private onTaskStatusChanged = (_e: ITeTaskStatusChangeEvent) =>
	{
		// return this.notify(DidChangeRunningTasksType, {
		// 	tasks: this.prepareTasksForTransport(this.wrapper.treeManager.runningTasks)
		// });
		// return !! await (Promise.all([
		// 	this.notify(DidChangeRunningTasksType, {
		// 		tasks: this.prepareTasksForTransport(this.wrapper.treeManager.runningTasks)
		// 	}),
		// 	this.notify(DidChangeTaskStatusType, {
		// 		task: {
		// 			name: e.task.name,
		// 			definition: e.task.definition,
		// 			source: e.task.source,
		// 			treeId: e.taskItemId
		// 		}
		// 	})
		// ]));
	};


	protected override onVisibilityChanged = (visible: boolean) =>
	{
		// this.wrapper.log.methodStart("MonitorPage Event: onVisibilityChanged", 2, this.wrapper.log.getLogPad(), false, [[ "visible", visible ]]);
		// this.wrapper.log.methodDone("MonitorPage Event: onVisibilityChanged", 2, this.wrapper.log.getLogPad());
	};


	protected override onFocusChanged = (focused: boolean): void =>
	{
		// this.wrapper.log.methodStart("MonitorPage Event: onFocusChanged", 2, this.wrapper.log.getLogPad(), false, [[ "focus", focused ]]);
		// this.wrapper.log.methodDone("MonitorPage Event: onFocusChanged", 2, this.wrapper.log.getLogPad());
	};

}
