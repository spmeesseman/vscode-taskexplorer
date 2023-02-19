
import { Task, Uri } from "vscode";
import { State } from "../common/state";
import { dirname, relative } from "path";
import { Commands } from "../../lib/command/command";
import { TeWrapper } from "../../lib/wrapper";
import { ContextKeys } from "../../lib/context";
import { TeWebviewPanel, WebviewIds } from "../webviewPanel";
import { createTaskCountTable } from "../common/taskCountTable";
import { getWorkspaceProjectName, isWorkspaceFolder, pushIfNotExists } from "../../lib/utils/utils";


export class ParsingReportPage extends TeWebviewPanel<State>
{
	static viewTitle = "Task Explorer Parsing Report";
	static viewId: WebviewIds = "parsingReport";


	constructor(wrapper: TeWrapper)
	{
		super(
			wrapper,
			"parsing-report.html",
			ParsingReportPage.viewTitle,
			"res/img/logo-bl.png",
			`taskexplorer.${ParsingReportPage.viewId}`,
			`${ContextKeys.WebviewPrefix}parsingReport`,
			"parsingReportPage",
			Commands.ShowParsingReportPage
		);
	}


	// protected override includeBody = async(...args: any[]) => this.getExtraContent(args[0]);
	protected override onHtmlPreview = async(html: string, ...args: any[]) =>
	{
		const uri = args[0] as Uri | undefined;
		const project = uri ? getWorkspaceProjectName(uri.fsPath || uri.path) : undefined;
		html = await createTaskCountTable(this.wrapper, project, html);
		html = html.replace("#{parsingReportTable}", this.getExtraContent(uri));
		return html;
	};


	private getExtraContent = (uri?: Uri) =>
	{
		let project = uri ? getWorkspaceProjectName(uri.fsPath || uri.path) : undefined;

		let details = `<table class="margin-top-15" width="97%" align="center">
		<tr class="content-section-header">
			<td class="content-section-header-nowrap" nowrap>Source</td>
			<td class="content-section-header-nowrap" nowrap>Name</td>
			<td class="content-section-header-nowrap" nowrap>Project</td>
			<td class="content-section-header-nowrap" nowrap>Default</td>
			<td class="content-section-header-nowrap" nowrap>Provider</td>
			<td class="content-section-header-nowrap" nowrap>File</td>
		</tr><tr><td colspan="6"><hr></td></tr>`;

		const projects: string[] = [],
			  tasks = this.wrapper.treeManager.getTasks();

		tasks.forEach((t: Task) =>
		{
			let wsFolder;
			/* istanbul ignore else */
			if (isWorkspaceFolder(t.scope))
			{
				wsFolder = t.scope;
				project = getWorkspaceProjectName(wsFolder.uri.fsPath);
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

}
