
import { ContextKeys } from "../../lib/constants";
import { TeWrapper } from "../../lib/wrapper";
import { TasksChangeEvent } from "../../interface";
import { registerCommand } from "../../lib/command";
import { ConfigurationChangeEvent, Disposable } from "vscode";
import { StorageChangeEvent } from "../../interface/IStorage";
import { TeWebviewView, WebviewViewIds } from "../webviewView";
import { removeLicenseButtons } from "../shared/removeLicenseButtons";

interface State {
	webroot?: string;
}


export class HomeView extends TeWebviewView<State>
{
	static viewTitle = "Home";
	static viewId: WebviewViewIds = "home"; // Must match view id in package.json


	constructor(wrapper: TeWrapper)
	{
		super(
			wrapper,
			HomeView.viewTitle,
			"home.html",
			`taskExplorer.views.${HomeView.viewId}`,
			`${ContextKeys.WebviewViewPrefix}home`,
			`${HomeView.viewId}View`
		);
		this.disposables.push(
			wrapper.configuration.onDidChange(e => { this.onConfigurationChanged(e); }, this),
			wrapper.storage.onDidChange(e => { this.onStorageChanged(e); }, this),
			wrapper.treeManager.onTasksChanged(e => { this.onTasksChanged(e); }, this)
		);
	}


	private onConfigurationChanged(e: ConfigurationChangeEvent)
	{
		this.wrapper.log.methodStart("Homeview Event: onConfigurationChanged", 2, this.wrapper.log.getLogPad());
		this.wrapper.log.methodDone("Homeview Event: onConfigurationChanged", 2, this.wrapper.log.getLogPad());
	}


	private onStorageChanged(e: StorageChangeEvent)
	{
		this.wrapper.log.methodStart("Homeview Event: onStorageChanged", 2, this.wrapper.log.getLogPad());
		this.wrapper.log.methodDone("Homeview Event: onStorageChanged", 2, this.wrapper.log.getLogPad());
	}


	private async onTasksChanged(e: TasksChangeEvent)
	{
		this.wrapper.log.methodStart("Homeview Event: onTasksChanged", 2, this.wrapper.log.getLogPad());
		if (this.isFirstLoadComplete) {
			await this.refresh();
		}
		this.wrapper.log.methodDone("Homeview Event: onTasksChanged", 2, this.wrapper.log.getLogPad());
	}


	protected override finalizeHtml = async (html: string) =>
	{
		const taskCount = this.wrapper.treeManager.getTasks().length,
			  taskCountToday = this.wrapper.storage.get<number>("taskCountToday", 0);
		html = html.replace("#{taskCounts.length}",  taskCount.toString())
				   .replace("#{taskCounts.today}", taskCountToday.toString());
		return removeLicenseButtons(html);
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
			registerCommand("taskExplorer.home.toggleWelcome", async () => {
				void this.refresh();
			}),
			registerCommand("taskExplorer.home.restoreWelcome", async () => {
				void this.refresh();
			}),
		];
	}


	// protected override async includeBootstrap(): Promise<State>
	// {
	// 	return this.getState();
	// }
}
