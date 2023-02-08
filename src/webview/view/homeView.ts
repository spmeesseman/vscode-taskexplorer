
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
	static viewId: WebviewViewIds = "home";


	constructor(container: TeWrapper)
	{
		super(
			container,
			HomeView.viewTitle,
			"home.html",
			`taskExplorer.views.${HomeView.viewId}`,
			`${ContextKeys.WebviewViewPrefix}home`,
			"homeView"
		);
		this.disposables.push(
			container.configuration.onDidChange(e => { this.onConfigurationChanged(e); }, this),
			container.storage.onDidChange(e => { this.onStorageChanged(e); }, this),
			container.treeManager.onTasksChanged(e => { this.onTasksChanged(e); }, this)
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
		if (this.isFirstLoadComplete) {
			await this.refresh();
		}
	}


	protected override finalizeHtml = async (html: string) =>
	{
		const taskCount = this.container.treeManager.getTasks().length,
			  taskCountToday = this.container.storage.get<number>("taskCountToday", 0);
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
