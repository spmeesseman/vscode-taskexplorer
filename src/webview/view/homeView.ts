
import { ConfigurationChangeEvent, Disposable } from "vscode";
import { TeWebviewView } from "../webviewView";
import { ContextKeys } from "../../lib/constants";
import { TeContainer } from "../../lib/container";
import { registerCommand } from "../../lib/command";
import { StorageChangeEvent } from "../../interface/IStorage";
import { TasksChangeEvent } from "../../interface";

interface State {
	webroot?: string;
}


export class HomeView extends TeWebviewView<State>
{
	private _firstLoadComplete = false;

	constructor(container: TeContainer)
	{
		super(container, "Home", "home.html", "taskExplorer.views.home", `${ContextKeys.WebviewViewPrefix}home`, "homeView");
		this.disposables.push(
			this.container.storage.onDidChange(e => { this.onStorageChanged(e); }),
			this.container.configuration.onDidChange(e => { this.onConfigurationChanged(e); }, this),
			this.container.treeManager.onTasksChanged(e => { this.onTasksChanged(e); }, this)
		);
	}


	private onConfigurationChanged(e: ConfigurationChangeEvent)
	{
	}


	private onStorageChanged(e: StorageChangeEvent)
	{
	}


	private async onTasksChanged(e: TasksChangeEvent)
	{
		if (this._firstLoadComplete) {
			await this.refresh();
		}
	}


	protected override finalizeHtml = async (html: string) =>
	{
		const taskCount = this.container.treeManager.getTasks().length,
			  taskCountToday = this.container.storage.get<number>("taskCountToday", 0);
		this._firstLoadComplete = true;
		return html.replace("#{taskCounts.length}",  taskCount.toString())
				   .replace("#{taskCounts.today}", taskCountToday.toString());
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

	// private async getState(): Promise<State>
	// {
	// 	return {
	// 		webroot: this.getWebRoot()
	// 	};
	// }

}
