
import * as path from "path";
import * as log  from "../common/log";
import { teApi } from "../extension";
import { Task, Uri, ViewColumn, WebviewPanel, window, workspace, WorkspaceFolder } from "vscode";
import { getHeaderContent, getWorkspaceProjectName, isWorkspaceFolder, pushIfNotExists } from "../common/utils";


let panel: WebviewPanel | undefined;


export async function displayParsingReport(logPad: string, logLevel: number, uri?: Uri)
{
    log.methodStart("display parsing report", logLevel, logPad);

    let content = getHeaderContent("Task Explorer Parsing Report");
	content += getBodyContent(logPad + "   ", logLevel + 1, uri);
    content += getFooterContent();

	panel = window.createWebviewPanel(
		"taskExplorer",                 // Identifies the type of the webview. Used internally
		"Task Explorer Parsing Report", // Title of the panel displayed to the users
		ViewColumn.One,                 // Editor column to show the new webview panel in.
		{}                              // Webview options.
	);
	panel.webview.html = content;
	panel.reveal();

    log.methodDone("display parsing report", logLevel, logPad);

    return panel;
}


// function closeWebView()
// {
//     panel?.dispose();
// }

function getFooterContent()
{
    return "</body></html>";
}


function getBodyContent(logPad: string, logLevel: number, uri?: Uri)
{
    log.methodStart("get body content", logLevel, logPad);

	let project = uri ? getWorkspaceProjectName(uri.fsPath) : undefined;

	let details = `<table style="margin-top:15px" width="97%" align="center">
	<tr style="font-size:16px;font-weight:bold">
		<td style="padding-right:20px">Source</td>
		<td style="padding-right:20px">Name</td>
		<td style="padding-right:20px">Project</td>
		<td style="padding-right:20px">Default</td>
		<td style="padding-right:20px">Provider</td>
		<td style="padding-right:20px">File</td>
	</tr><tr><td colspan="6"><hr></td></tr>`;

	const tasks = teApi.explorer.getTasks().filter((t: Task) => !project || (isWorkspaceFolder(t.scope) && 
                                                    project === getWorkspaceProjectName(t.scope.uri.fsPath))),
		  projects: string[] = [];

	tasks.forEach((t: Task) =>
	{
		const wsFolder = t.scope as WorkspaceFolder;
		project = project || getWorkspaceProjectName(wsFolder.uri.fsPath);

		details += `
	<tr style="font-size:12px">
		<td valign="top" style="font-size:14px;font-decoration:italic;padding-right:20px" nowrap>${t.source}</td>
		<td valign="top" style="padding-right:20px">${t.name}</td>
		<td valign="top" style="padding-right:20px">${project}</td>
		<td valign="top" style="padding-right:20px">${t.definition.isDefault || "N/A"}</td>
		<td valign="top" style="padding-right:20px">${t.source}</td>
		<td valign="top" style="padding-right:20px">${wsFolder ? path.relative(path.dirname(wsFolder.uri.fsPath), t.name) : "N/A"}</td>
	</tr>
	<tr><td height="10"></td></tr>`;

		pushIfNotExists(projects, wsFolder?.name);
	});

	details += "</table>"

	let summary = `# of Tasks: ${tasks.length}<br><br>Projects: ${projects.join(", ")}`;

	log.methodDone("get body content", logLevel, logPad);

	return `<table><tr><td>${summary}</td><?tr></table>
<table><tr><td>${details}</td><?tr></table>`
}
