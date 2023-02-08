
import { TeWebviewView } from "../webviewView";
import { ContextKeys } from "../../lib/constants";
import { TeContainer } from "../../lib/container";
import { ConfigurationChangeEvent } from "vscode";
import { TaskTreeManager } from "../../tree/treeManager";
import { StorageChangeEvent } from "../../interface/IStorage";
import { createTaskCountTable } from "../shared/taskCountTable";


interface State {
	pinStatus: boolean;
}


export class TaskCountView extends TeWebviewView<State>
{

	constructor(container: TeContainer)
	{
		super(container, "Home", "license-manager.html", "taskExplorer.views.taskCount", `${ContextKeys.WebviewViewPrefix}home`, "taskCountView");
		this.disposables.push(
			this.container.configuration.onDidChange(e => { this.onConfigurationChanged(e); }, this),
			this.container.storage.onDidChange(e => { this.onStorageChanged(e); }, this)
		);
	}


	private onConfigurationChanged(e: ConfigurationChangeEvent)
	{
	}


	private onStorageChanged(e: StorageChangeEvent)
	{
	}


	protected override includeBody = async() => createTaskCountTable(this.container.context.extensionUri);


	protected override onVisibilityChanged(visible: boolean)
	{
	}


	protected override onWindowFocusChanged(focused: boolean)
	{
	}

}
