
import * as path from "path";
import log from "../log/log";
import TeWebviewPanel from "./teWebviewPanel";
import { ITaskExplorerApi } from "../../interface";
import { ExtensionContext, Task, Uri, WebviewPanel, WorkspaceFolder } from "vscode";
import { getWorkspaceProjectName, isWorkspaceFolder, pushIfNotExists, timeout } from "../utils/utils";

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

	if (explorer)
	{
		const tasks = explorer.getTasks() // Filter out 'User' tasks for project/folder reports
							  .filter((t: Task) => !project || (isWorkspaceFolder(t.scope) &&
					 			  				   project === getWorkspaceProjectName(t.scope.uri.fsPath)));
		html = await TeWebviewPanel.createTaskCountTable(api, tasks, "Task Explorer Parsing Report", project);

		const infoContent = getExtraContent(tasks, logPad + "   ", uri);
		html = html.replace("<!-- addtlContent -->", infoContent);

		const idx1 = html.indexOf("<!-- startParsingReportButton -->"),
			  idx2 = html.indexOf("<!-- endParsingReportButton -->") + 31;
		html = html.replace(html.slice(idx1, idx2), "");
	}

	return html;
};


const getExtraContent = (tasks: Task[], logPad: string, uri?: Uri) =>
{
    log.methodStart("get body content", 1, logPad);

	let project = uri ? getWorkspaceProjectName(uri.fsPath) : undefined;

	let details = `<table class="margin-top-15" width="97%" align="center">
	<tr class="content-section-header">
		<td class="content-section-header-nowrap" nowrap>Source</td>
		<td class="content-section-header-nowrap" nowrap>Name</td>
		<td class="content-section-header-nowrap" nowrap>Project</td>
		<td class="content-section-header-nowrap" nowrap>Default</td>
		<td class="content-section-header-nowrap" nowrap>Provider</td>
		<td class="content-section-header-nowrap" nowrap>File</td>
	</tr><tr><td colspan="6"><hr></td></tr>`;

	const projects: string[] = [];

	tasks.forEach((t: Task) =>
	{
		let wsFolder;
		/* istanbul ignore else */
		if (isWorkspaceFolder(t.scope))
		{
			wsFolder = t.scope;
			project = project || getWorkspaceProjectName(wsFolder.uri.fsPath);
		}
		else {
			project = "User";
		}

		let filePath: string;
		if (wsFolder)
		{
			if (t.definition.uri)
			{
				filePath = path.relative(path.dirname(wsFolder.uri.fsPath), t.definition.uri.fsPath);
			}
			else {
				filePath = path.relative(path.dirname(wsFolder.uri.fsPath), t.name);
			}
		}
		else {
			filePath = "N/A";
		}

		details += `
	<tr class="content-text-small">
		<td valign="top" class="content-section-subheader" nowrap>${t.source}</td>
		<td valign="top" class="content-section-header-nowrap" nowrap>${t.name}</td>
		<td valign="top" class="content-section-header-nowrap" nowrap>${project}</td>
		<td valign="top" class="content-section-header-nowrap" nowrap>${t.definition.isDefault || "N/A"}</td>
		<td valign="top" class="content-section-header-nowrap" nowrap>${t.source}</td>
		<td valign="top" class="content-section-header-nowrap" nowrap>${filePath}</td>
	</tr>
	<tr><td height="10"></td></tr>`;

		if (wsFolder) {
			pushIfNotExists(projects, wsFolder.name);
		}
		else {
			pushIfNotExists(projects, "+ User Tasks");
		}
	});

	details += "</table>";

	const summary = `<table><tr><td class="parsing-report-projects-title">Projects:</td><td class="parsing-report-projects">${projects.join(", &nbsp;")}</td></tr></table>`;

	log.methodDone("get body content", 1, logPad);

	return `<tr><td><table class="margin-top-15"><tr><td>${summary}</td></tr></table><table><tr><td>${details}</td></tr></table></td></tr>`;
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
