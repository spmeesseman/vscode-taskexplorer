
import { join } from "path";
import { marked } from "marked";
import { TeWebviewPanel } from "../webviewPanel";
import { TeContainer } from "../../lib/container";
import { readFileAsync } from "../../lib/utils/fs";
import { executeCommand } from "../../lib/command";
import { getInstallPath } from "../../lib/utils/pathUtils";
import { getExtensionContext } from "../../extension";
import { Commands, ContextKeys } from "../../lib/constants";
import { ExecuteCommandType, IpcMessage, onIpc } from "../protocol";

const viewTitle = "Task Explorer Release Notes";
const viewType = "viewReleaseNotes";

interface State {
	pinned: boolean;
};


export class ReleaseNotesPage extends TeWebviewPanel<State>
{
	constructor(container: TeContainer) {
		super(
			container,
			join(container.context.extensionUri.fsPath, "res", "page", "release-notes.html"),
			viewTitle,
			"images/taskExplorer-icon.png",
			"taskExplorer.parsingReport",
			`${ContextKeys.WebviewPrefix}releaseNotes`,
			"releaseNotesPage",
			Commands.ShowReleaseNotesPage
		);
	}


	protected override finalizeHtml = (html: string) =>  this.getPageContent(html);


	private getPageContent = async (html: string) =>
	{
		const installPath = await getInstallPath(),
			  changeLogMd = await readFileAsync(join(installPath, "CHANGELOG.md")),
			  changeLogHtml = await marked(changeLogMd, { async: true }),
			  version = getExtensionContext().extension.packageJSON.version;
		html = html.replace("<!-- changelog -->", changeLogHtml)
				   .replace("<!-- title -->", `Task Explorer ${version} Release Notes`)
				   .replace("<!-- subtitle -->", this.getNewInThisReleaseShortDsc())
				   .replace("<!-- releasenotes -->", this.getNewReleaseNotes(version, changeLogMd));
		html = this.container.webviewManager.cleanLicenseButtons(html);
		return html;
	};


	private getNewInThisReleaseShortDsc = () => "MAJOR RELEASE - A PLETHORA OF NEW FEATURES, BUG FIXES AND PERFORMANCE ENHANCEMENTS !!";


	private getNewReleaseNotes = (version: string, changeLogMd: string) =>
	{
	return `
	<table style="margin-top:15px" width="100%">
		${this.getNewReleaseNotesHdr("Features", "plus")}
		<tr>
			<td>
				${this.getReleaseNotes("Features", version, "feature", changeLogMd)}
			</td>
		</tr>
		${this.getNewReleaseNotesHdr("Bug Fixes", "bug")}
		<tr>
			<td>
				${this.getReleaseNotes("Bug Fixes", version, "bug fix", changeLogMd)}
			</td>
		</tr>
		${this.getNewReleaseNotesHdr("Refactoring", "cog")}
		<tr>
			<td>
				${this.getReleaseNotes("Refactoring", version, "refactoring", changeLogMd)}
			</td>
		</tr>
		${this.getNewReleaseNotesHdr("Miscellaneous", "asterisk")}
		<tr>
			<td>
				${this.getReleaseNotes("Miscellaneous", version, "miscellaneous", changeLogMd)}
			</td>
		</tr>
	</table>`;
	};


	private getNewReleaseNotesHdr = (title: string, icon: string) =>
	{
		return `
		<tr><td width="100%">
			<hr>
		</td></tr>
		<tr class="content-section-header">
			<td class="content-section-header-nowrap" nowrap>&nbsp;<span class=\"far fa-${icon} content-section-fa-img\"></span> &nbsp;${title}</td>
		</tr>
		<tr><td width="100%">
			<hr>
		</td></tr>`;
	};


	private getReleaseNotes = (section: string, version: string, noChangesDsc: string, changeLogMd: string) =>
	{
		let html = "<ul>";
		let match: RegExpExecArray | null;
		const regex = new RegExp(`(?:^## Version ${version.replace(/\./g, "\\.")} (?:\\[([0-9a-zA-Z\\-\\.]{3,})\\])*\\s*\\([a-zA-Z0-9 ,:\\/\\.]+\\)[\\r\\n]+)([^]*?)(?=^## Version|###END###)`, "gm");
		if ((match = regex.exec(changeLogMd + "###END###")) !== null)
		{
			const notes = match[0];
			let match2: RegExpExecArray | null;
			const regex2 = new RegExp(`(?:^### ${section}\\s+)([^]*?)(?=^###? |###END###)`, "gm");
			if ((match2 = regex2.exec(notes + "###END###")) !== null)
			{
				const sectionNotes = match2[0];
				let match3: RegExpExecArray | null;
				const regex3 = new RegExp("\\- ([^]*?)(?=^\\- |###END###)", "gm");
				while ((match3 = regex3.exec(sectionNotes + "###END###")) !== null)
				{
					const note = match3[1];
					html += `<li>${note}</li>`;
				}
			}
			else {
				html += `<li>there are no new ${noChangesDsc} changes in this release</li>`;
			}
		}
		else {
			html += "<li>error - the release notes for this version cannot be found</li>";
		}
		html += "</ul>";
		return html;
	};


	getViewTitle = () => viewTitle;


	getViewType = () => viewType;


	protected override onMessageReceived(e: IpcMessage)
	{
		onIpc(ExecuteCommandType, e, params => executeCommand(("vscode-taskexplorer." + params.command) as Commands, params.args));
	}

}
