
import log from "../../lib/log/log";
import TeWebviewPanel from "../webviewPanel";
import { Task, Uri, WebviewPanel } from "vscode";
import { isExtensionBusy } from "../../extension";
import { TeContainer } from "../../lib/container";
import { TaskTreeManager } from "../../tree/treeManager";
import { getWorkspaceProjectName, isWorkspaceFolder, timeout } from "../../lib/utils/utils";

const viewTitle = "Task Explorer Parsing Report";
const viewType = "viewParsingReport";
let panel: TeWebviewPanel | undefined;


export const displayParsingReport = async(logPad: string, uri?: Uri) =>
{
    log.methodStart("display parsing report", 1, logPad);
	const html = await getPageContent(logPad, uri);
	panel =  TeContainer.instance.webviewManager.create(viewTitle, viewType, html);
    log.methodDone("display parsing report", 1, logPad);
    return panel;
};


const getPageContent = async (logPad: string, uri?: Uri) =>
{
	let html = "";
	const project = uri ? getWorkspaceProjectName(uri.fsPath) : undefined;
	const tasks = TaskTreeManager.getTasks() // Filter out 'User' tasks for project/folder reports
				  .filter((t: Task) => !project || (isWorkspaceFolder(t.scope) && project === getWorkspaceProjectName(t.scope.uri.fsPath)));
	html = await TeContainer.instance.webviewManager.createTaskCountTable(tasks, "Task Explorer Parsing Report", project);
	return html;
};


export const getViewTitle = () => viewTitle;


export const getViewType = () => viewType;


export const reviveParsingReport = async(webviewPanel: WebviewPanel, logPad: string, uri?: Uri) =>
{   //
	// Use a timeout so license manager can initialize first
	//
	await new Promise<void>(async(resolve) =>
	{
		while (isExtensionBusy()) {
			await timeout(100);
		}
		setTimeout(async(webviewPanel: WebviewPanel, logPad: string, uri?: Uri) =>
		{
			log.methodStart("revive parsing report", 1, logPad);
			const html = await getPageContent(logPad, uri);
			TeContainer.instance.webviewManager.create(viewTitle, viewType, html, webviewPanel);
			log.methodDone("revive parsing report", 1, logPad);
			resolve();
		}, 10, webviewPanel, logPad, uri);
	});
};
