
import { Task } from "vscode";
import { TeWebviewPanel } from "../webviewPanel";
import { TeContainer } from "../../lib/container";
import { TaskTreeManager } from "../../tree/treeManager";
import { Commands, ContextKeys } from "../../lib/constants";

const viewTitle = "Task Explorer Licensing";
const viewType = "showLicensePage";

interface State {
	pinned: boolean;
};


export class LicensePage extends TeWebviewPanel<State>
{
	constructor(container: TeContainer) {
		super(
			container,
			"license-manager.html",
			viewTitle,
			"res/gears-r-blue.png",
			"taskExplorer.licensePage",
			`${ContextKeys.WebviewPrefix}licensePage`,
			"licensePage",
			Commands.ShowLicensePage
		);
	}


	protected override finalizeHtml = (html: string) => this.getPageContent(html);


	private getPageContent = async (html: string, tasks?: Task[], newKey?: string) =>
	{
		if (!tasks)
		{
			tasks = TaskTreeManager.getTasks();
		}

		/* istanbul ignore else */
		if (tasks)
		{
			html = await TeContainer.instance.webviewManager.createTaskCountTable(tasks, "Task Explorer Licensing", html);

			let infoContent = this.getExtraContent(newKey);
			html = html.replace("<!-- addtlContentTop -->", infoContent);

			infoContent = this.getExtraContent2();
			html = html.replace("<!-- addtlContent -->", infoContent);

			const idx1 = html.indexOf("<!-- startViewLicenseButton -->"),
				idx2 = html.indexOf("<!-- endViewLicenseButton -->") + 29;
			html = html.replace(html.slice(idx1, idx2), "");
		}

		return html;
	};


	private getExtraContent = (newKey?: string) =>
	{
		const licMgr = TeContainer.instance.licenseManager;
		const details = !newKey ?
	(!licMgr.isLicensed() ? `
	<table class="margin-top-15">
		<tr><td class="content-subsection-header">
			Licensing Note
		</td></tr>
		<tr><td>
			This extension is free to use but am considering a small license for an
			unlimited parsed component type of thing (e.g $10 - $20), as the time spent
			and functionality have went way beyond what was at first intended.
			<br><br>Hey Sencha, you can buy it and replace your own product if you want ;).
		</td></tr>
	</table>
	<table class="margin-top-20">
		<tr><td>You can view a detailed parsing report using the "<i>Task Explorer: View Parsing Report</i>"
		command in the Explorer context menu for any project.  It can alternatively be ran from the
		command pallette for "all projects".
		<tr><td height="20"></td></tr>
	</table>
	` : `
	<table class="margin-top-15">
		<tr><td class="content-subsection-header">
			License Key: &nbsp;${newKey}
		</td></tr>
		<tr><td>
			Thank you for your support!
		</td></tr>
	</table>
	<table class="margin-top-20">
		<tr><td>You can view a detailed parsing report using the "<i>Task Explorer: View Parsing Report</i>"
		command in the Explorer context menu for any project.  It can alternatively be ran from the
		command pallette for "all projects" to see how many tasks the extension has parsed.
		<tr><td height="20"></td></tr>
	</table>
	`) : `
	<table class="margin-top-15">
		<tr><td class="content-subsection-header">
			30-Day License Key: &nbsp;${licMgr.getLicenseKey()}
		</td></tr>
		<tr><td>
			This license key is valid for30 days from the time it was issued.  Please show your support for
			the extension and purchase the license <a href="https://license.spmeesseman.com/purchase?key=${encodeURIComponent(`${newKey}&${licMgr.getToken()}`)}">here</a>.
		</td></tr>
	</table>
	<table class="margin-top-20">
		<tr><td>You can view a detailed parsing report using the "<i>Task Explorer: View Parsing Report</i>"
		command in the Explorer context menu for any project.  It can alternatively be ran from the
		command pallette for "all projects" to see how many tasks the extension has parsed.
		<tr><td height="20"></td></tr>
	</table>
	`;

		return `<tr><td>${details}</td></tr>`;
	};


	private getExtraContent2 = () =>
	{;
		const details = `<tr><td>
	<table class="margin-top-15">
		<tr><td class="content-section-header">Example Parsing Report:</td></tr>
		<tr><td>
			<img src="[webview.resourceDir]/readme/parsingreport.png">
		</td></tr>
	</td></tr>`;
		return `<tr><td>${details}</td></tr>`;
	};


	getViewTitle = () => viewTitle;


	getViewType = () => viewType;

}
