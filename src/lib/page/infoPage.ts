
import * as path from "path";
import log from "../log/log";
import { ITaskExplorerApi } from "../../interface";
import { Disposable, ExtensionContext, Task, Uri, WebviewPanel } from "vscode";
import { createTaskCountTable, createWebviewPanel } from "./utils";
import { getWorkspaceProjectName, isWorkspaceFolder, pushIfNotExists } from "../utils/utils";

let panel: WebviewPanel | undefined;


export const displayParsingReport = async(api: ITaskExplorerApi, context: ExtensionContext, logPad: string, uri?: Uri) =>
{
    log.methodStart("display parsing report", 1, logPad);
	const html = await getPageContent(api, logPad, uri);
	panel = await createWebviewPanel("Task Explorer", html, context);
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
		html = await createTaskCountTable(api, tasks, "Task Explorer Parsing Report", project);

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

		let filePath = "N/A";
		/* istanbul ignore else */
		if (t.definition.uri)
		{
			/* istanbul ignore else */
			if (wsFolder) {
				filePath = path.relative(path.dirname(wsFolder.uri.fsPath), t.definition.uri.fsPath);
			}
			else {
				filePath = t.definition.uri.fsPath;
			}
		}
		else if (wsFolder)
		{
			filePath = path.relative(path.dirname(wsFolder.uri.fsPath), t.name);
		}
		else if (t.definition.path)
		{
			filePath = t.definition.path;
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

		/* istanbul ignore else */
		if (wsFolder) {
			pushIfNotExists(projects, wsFolder.name);
		}
		else {
			pushIfNotExists(projects, "User");
		}
	});

	details += "</table>";

	const summary = `<span class="content-text-medium"># of Tasks:</b> ${tasks.length}<br><br><b>Projects:</b> ${projects.join(", ")}</span>`;

	log.methodDone("get body content", 1, logPad);

	return `<tr><td><table><tr><td>${summary}</td></tr></table><table><tr><td>${details}</td></tr></table></td></tr>`;
};