
import { TeWebviewView } from "../../webviewView";
import { IpcMessage, onIpc } from "../../protocol";
import { ContextKeys } from "../../../lib/constants";
import type { TeContainer } from "../../../lib/container";
// import { onDidChangeContext } from "../../../lib/context";
import { StorageChangeEvent } from "../../../interface/IStorage";
import { ConfigurationChangeEvent, Disposable, workspace } from "vscode";
import { createTaskCountTable } from "../../shared/taskCountTable";
import { getTaskFiles } from "../../../lib/fileCache";
import { TaskTreeManager } from "../../../tree/treeManager";


interface State {
	pinStatus: boolean;
}


export class TaskCountView extends TeWebviewView<State>
{

	constructor(container: TeContainer)
	{
		super(container, "Home", "license-manager.html", "taskExplorer.views.taskCount", `${ContextKeys.WebviewViewPrefix}home`, "taskCountView");
		this.disposables.push(
			// workspace.getConfiguration().onDidChange((e: any) => { this.onConfigurationChanged(e); }, this),
			this.container.storage.onDidChange(e => { this.onStorageChanged(e); })
		);
	}


	private onConfigurationChanged(e: ConfigurationChangeEvent)
	{
	}


	private onStorageChanged(e: StorageChangeEvent)
	{
	}


	protected override includeBody = async() =>
	{
		let html = "";
		const tasks = TaskTreeManager.getTasks();
		/* istanbul ignore else */
		if (tasks)
		{
			html = await createTaskCountTable(tasks, "Task Counts", html);
			const idx1 = html.indexOf("<!-- startViewLicenseButton -->"),
				idx2 = html.indexOf("<!-- endViewLicenseButton -->") + 29;
			html = html.replace(html.slice(idx1, idx2), "");
		}
		return html;
	};


	protected override onVisibilityChanged(visible: boolean)
	{
	}


	protected override onWindowFocusChanged(focused: boolean)
	{
	}


	protected override onMessageReceived(e: IpcMessage)
	{
	}

}
