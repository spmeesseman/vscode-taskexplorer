
import log from "../lib/log/log";
import TeWebviewPanel from "../page/teWebviewPanel";
import { ITaskExplorerApi } from "../interface";
import { ExtensionContext, Task, Uri, WebviewPanel } from "vscode";
import { getWorkspaceProjectName, isWorkspaceFolder, timeout } from "../lib/utils/utils";
import TaskTree from "../tree/tree";
import { TaskTreeManager } from "../tree/treeManager";

const viewTitle = "Task Explorer Parsing Report";
const viewType = "viewParsingReport";
let panel: TeWebviewPanel | undefined;


export const displayParsingReport = async(api: ITaskExplorerApi, context: ExtensionContext, logPad: string, uri?: Uri) =>
{
    log.methodStart("display parsing report", 1, logPad);
	const html = await getPageContent(api, logPad, uri);
	panel = TeWebviewPanel.create(viewTitle, viewType, html, context);
    log.methodDone("display parsing report", 1, logPad);
    return panel;
};


const getPageContent = async (api: ITaskExplorerApi, logPad: string, uri?: Uri) =>
{
	let html = "";
	const project = uri ? getWorkspaceProjectName(uri.fsPath) : undefined;
	const explorer = api.explorer || api.sidebar;
	const tasks = TaskTreeManager.getTasks() // Filter out 'User' tasks for project/folder reports
				  .filter((t: Task) => !project || (isWorkspaceFolder(t.scope) && project === getWorkspaceProjectName(t.scope.uri.fsPath)));
	html = await TeWebviewPanel.createTaskCountTable(api, tasks, "Task Explorer Parsing Report", project);
	return html;
};


export const getViewTitle = () => viewTitle;


export const getViewType = () => viewType;


export const reviveParsingReport = async(webviewPanel: WebviewPanel, api: ITaskExplorerApi, context: ExtensionContext, logPad: string, uri?: Uri) =>
{   //
	// Use a timeout so license manager can initialize first
	//
	await new Promise<void>(async(resolve) =>
	{
		while (api.isBusy()) {
			await timeout(100);
		}
		setTimeout(async(webviewPanel: WebviewPanel, api: ITaskExplorerApi, context: ExtensionContext, logPad: string, uri?: Uri) =>
		{
			log.methodStart("revive parsing report", 1, logPad);
			const html = await getPageContent(api, logPad, uri);
			TeWebviewPanel.create(viewTitle, viewType, html, context, webviewPanel);
			log.methodDone("revive parsing report", 1, logPad);
			resolve();
		}, 10, webviewPanel, api, context, logPad, uri);
	});
};
