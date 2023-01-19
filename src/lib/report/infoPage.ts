
import * as path from "path";
import log from "../log/log";
import { ITaskExplorerApi } from "../../interface";
import { Disposable, Task, Uri, WebviewPanel } from "vscode";
import { createTaskCountTable, createWebviewPanel } from "./utils";
import { getWorkspaceProjectName, isWorkspaceFolder, pushIfNotExists } from "../utils/utils";

let panel: WebviewPanel | undefined;


export const displayParsingReport = async(api: ITaskExplorerApi, disposables: Disposable[], logPad: string, uri?: Uri) =>
{
    log.methodStart("display parsing report", 1, logPad);
	const html = await getHtmlContent(api, logPad, uri);
	panel = await createWebviewPanel(html, disposables);
    log.methodDone("display parsing report", 1, logPad);
    return panel;
};


const getHtmlContent = async (api: ITaskExplorerApi, logPad: string, uri?: Uri) =>
{
	let html = "";
	const project = uri ? getWorkspaceProjectName(uri.fsPath) : undefined;
	const explorer = api.explorer || api.sidebar;

	/* istanbul ignore else */
	if (explorer)
	{
		const tasks = explorer.getTasks()
							  .filter((t: Task) => !project || (isWorkspaceFolder(t.scope) &&
					 			  				   project === getWorkspaceProjectName(t.scope.uri.fsPath)));
		html = await createTaskCountTable(tasks, "Task Explorer", project);

		const infoContent = "<tr><td>" +
								getInfoContent(tasks, logPad + "   ", uri) +
							"</td></tr>";
		html = html.replace("<!-- infoContent -->", infoContent);

		const idx1 = html.indexOf("<!-- startLicenseContent -->"),
			  idx2 = html.indexOf("<!-- endLicenseContent -->") + 26;
		html = html.replace(html.slice(idx1, idx2), "");
	}

	return html;
};


const getInfoContent = (tasks: Task[], logPad: string, uri?: Uri) =>
{
    log.methodStart("get body content", 1, logPad);

	let project = uri ? getWorkspaceProjectName(uri.fsPath) : undefined;

	let details = `<table style="margin-top:15px" width="97%" align="center">
	<tr style="font-size:16px;font-weight:bold">
		<td style="padding-right:20px" nowrap>Source</td>
		<td style="padding-right:20px" nowrap>Name</td>
		<td style="padding-right:20px" nowrap>Project</td>
		<td style="padding-right:20px" nowrap>Default</td>
		<td style="padding-right:20px" nowrap>Provider</td>
		<td style="padding-right:20px" nowrap>File</td>
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
	<tr style="font-size:12px">
		<td valign="top" style="font-size:14px;font-decoration:italic;padding-right:20px" nowrap>${t.source}</td>
		<td valign="top" style="padding-right:20px" nowrap>${t.name}</td>
		<td valign="top" style="padding-right:20px" nowrap>${project}</td>
		<td valign="top" style="padding-right:20px" nowrap>${t.definition.isDefault || "N/A"}</td>
		<td valign="top" style="padding-right:20px" nowrap>${t.source}</td>
		<td valign="top" style="padding-right:20px" nowrap>${filePath}</td>
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

	const summary = `<span style="font-size:14px"># of Tasks:</b> ${tasks.length}<br><br><b>Projects:</b> ${projects.join(", ")}</span>`;

	log.methodDone("get body content", 1, logPad);

	return `<table><tr><td>${summary}</td><?tr></table><table><tr><td>${details}</td><?tr></table>`;
};
