
import { Task, Uri } from "vscode";
import { dirname, relative } from "path";
import { TeWebviewPanel } from "../webviewPanel";
import { TeContainer } from "../../lib/container";
import { TaskTreeManager } from "../../tree/treeManager";
import { Commands, ContextKeys } from "../../lib/constants";
import { getWorkspaceProjectName, isWorkspaceFolder, pushIfNotExists } from "../../lib/utils/utils";

const viewTitle = "Task Explorer Parsing Report";
const viewType = "viewParsingReport";

interface State {
	pinned: boolean;
};


export class ParsingReportPage extends TeWebviewPanel<State>
{
	constructor(container: TeContainer) {
		super(
			container,
			"license-manager.html",
			viewTitle,
			"res/gears-r-blue.png",
			"taskExplorer.parsingReport",
			`${ContextKeys.WebviewPrefix}parsingReport`,
			"parsingReportPage",
			Commands.ShowParsingReportPage
		);
	}


	protected override finalizeHtml = (html: string, ...args: any[]) => this.getPageContent(html, ...args);


	// protected override includeBootstrap(): State {
	// 	return {
	// 		// Make sure to get the raw config, not from the container which has the modes mixed in
	// 		config: configuration.getAll(true),
	// 	};
	// }


	private getPageContent = async(html: string, ...args: any[]) =>
	{
		const uri = args[0] as Uri | undefined;
		const project = uri ? getWorkspaceProjectName(uri.fsPath) : undefined;
		const tasks = TaskTreeManager.getTasks() // Filter out 'User' tasks for project/folder reports
									 .filter((t: Task) => !project || (isWorkspaceFolder(t.scope) &&
											  project === getWorkspaceProjectName(t.scope.uri.fsPath)));
		html = await TeContainer.instance.webviewManager.createTaskCountTable(tasks, "Task Explorer Parsing Report", html, project);
		const infoContent = this.getExtraContent(tasks, uri);
		html = html.replace("<!-- addtlContent -->", infoContent);
		const idx1 = html.indexOf("<!-- startParsingReportButton -->"),
			  idx2 = html.indexOf("<!-- endParsingReportButton -->") + 31;
		html = html.replace(html.slice(idx1, idx2), "");
		return html;
	};


	private getExtraContent = (tasks: Task[], uri?: Uri) =>
	{
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
					filePath = relative(dirname(wsFolder.uri.fsPath), t.definition.uri.fsPath);
				}
				else {
					filePath = relative(dirname(wsFolder.uri.fsPath), t.name);
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

		return `<tr><td><table class="margin-top-15"><tr><td>${summary}</td></tr></table><table><tr><td>${details}</td></tr></table></td></tr>`;
	};


	getViewTitle = () => viewTitle;


	getViewType = () => viewType;

}
