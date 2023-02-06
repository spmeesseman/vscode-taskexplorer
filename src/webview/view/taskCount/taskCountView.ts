
import { TeWebviewView } from "../../webviewView";
import { IpcMessage, onIpc } from "../../protocol";
import { ContextKeys } from "../../../lib/constants";
import type { TeContainer } from "../../../lib/container";
// import { onDidChangeContext } from "../../../lib/context";
import { StorageChangeEvent } from "../../../interface/IStorage";
import { ConfigurationChangeEvent, Disposable, workspace } from "vscode";
import { State } from "./protocol";


export class TaskCountView extends TeWebviewView<State>
{

	constructor(container: TeContainer)
	{
		super(container, "Home", "license-manager.html", "taskExplorer.views.taskCount", `${ContextKeys.WebviewViewPrefix}home`, "taskCountView");
		this.disposables.push(
			workspace.getConfiguration().onDidChange((e: any) => { this.onConfigurationChanged(e); }, this),
			this.container.storage.onDidChange(e => { this.onStorageChanged(e); })
		);
	}


	private onConfigurationChanged(e: ConfigurationChangeEvent)
	{
	}


	private onStorageChanged(e: StorageChangeEvent)
	{
		// if (e.key === "views:layout") {
		// 	this.notifyDidChangeLayout();
		// }
	}


	protected override onVisibilityChanged(visible: boolean)
	{
		if (!visible) {
			// this._validateSubscriptionDebounced?.cancel();
			return;
		}
		// queueMicrotask(() => void this.validateSubscription());
	}


	protected override onWindowFocusChanged(focused: boolean)
	{
		if (!focused || !this.visible) {
			// this._validateSubscriptionDebounced?.cancel();
			return;
		}
		// queueMicrotask(() => void this.validateSubscription());
	}


	protected override registerCommands(): Disposable[]
	{
		return [];
	}


	protected override onMessageReceived(e: IpcMessage)
	{
	}


	private getPinStatus()
	{
		return this.container.storage.get<boolean>("taskCount:status:pinned", true);
	}


	private async getState(subscription?: any): Promise<State>
	{
		return {
			pinStatus: this.getPinStatus()
		};
	}


	private getLayout()
	{
		const layout = this.container.storage.get("views:layout");
		return layout;
	}


	// private notifyDidChangeLayout()
	// {
	// 	if (!this.isReady) return;
	// 	void this.notify(DidChangeLayoutType, { layout: this.getLayout() });
	// }

}
