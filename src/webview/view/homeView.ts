
import { ConfigurationChangeEvent, Disposable } from "vscode";
import { TeWebviewView } from "../webviewView";
import { ContextKeys } from "../../lib/constants";
import { TeContainer } from "../../lib/container";
import { registerCommand } from "../../lib/command";
import { StorageChangeEvent } from "../../interface/IStorage";

interface State {
	webroot?: string;
}


export class HomeView extends TeWebviewView<State>
{

	constructor(container: TeContainer)
	{
		super(container, "Home", "home.html", "taskExplorer.views.home", `${ContextKeys.WebviewViewPrefix}home`, "homeView");
		this.disposables.push(
			this.container.configuration.onDidChange(e => { this.onConfigurationChanged(e); }, this),
			this.container.storage.onDidChange(e => { this.onStorageChanged(e); })
		);
	}


	private onConfigurationChanged(e: ConfigurationChangeEvent)
	{
	}


	private onStorageChanged(e: StorageChangeEvent)
	{
	}


	protected override onVisibilityChanged(visible: boolean)
	{
		if (!visible) {
			return;
		}
		// queueMicrotask(() => aaa());
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
