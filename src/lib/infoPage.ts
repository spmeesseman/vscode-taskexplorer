
import * as path from "path";
import log from "./utils/log";
import { teApi } from "../extension";
import { Task, Uri, ViewColumn, WebviewPanel, window, workspace, WorkspaceFolder } from "vscode";
import { getHeaderContent, getBodyContent, getWorkspaceProjectName, isWorkspaceFolder, pushIfNotExists } from "./utils/utils";
import { IExplorerApi } from "../interface";


let panel: WebviewPanel | undefined;


export const displayParsingReport = async(logPad: string, logLevel: number, uri?: Uri) =>
{
    log.methodStart("display parsing report", logLevel, logPad);

    let content = getHeaderContent();

	content += "<table align=\"center\">";
	content += ("<tr><td>" + getBodyContent("Welcome to Task Explorer") + "</td></tr>");
	content += ("<tr><td>" + getInfoContent(logPad + "   ", logLevel + 1, uri) + "</td></tr>");
	content += "</table>";
    content += getFooterContent();

	panel = window.createWebviewPanel(
		"taskExplorer",                 // Identifies the type of the webview. Used internally
		"Task Explorer Parsing Report", // Title of the panel displayed to the users
		ViewColumn.One,                 // Editor column to show the new webview panel in.
		{
			enableScripts: true
		}
	);
	panel.webview.html = content;
	panel.reveal();

    log.methodDone("display parsing report", logLevel, logPad);

    return panel;
};


// function closeWebView()
// {
//     panel?.dispose();
// }

const getFooterContent = () => "</body></html>";


const getInfoContent = (logPad: string, logLevel: number, uri?: Uri) =>
{
    log.methodStart("get body content", logLevel, logPad);

	const api = (teApi.explorer || teApi.sidebar) as IExplorerApi;
	/* istanbul ignore next */
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

	const tasks = api.getTasks()?.filter((t: Task) => !project || (isWorkspaceFolder(t.scope) &&
                                         project === getWorkspaceProjectName(t.scope.uri.fsPath))),
		  projects: string[] = [];

	tasks?.forEach((t: Task) =>
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

	const summary = `# of Tasks: ${tasks?.length}<br><br>Projects: ${projects.join(", ")}`;

	log.methodDone("get body content", logLevel, logPad);

	return `<table><tr><td>${summary}</td><?tr></table>
<table><tr><td>${details}</td><?tr></table>`;
};
