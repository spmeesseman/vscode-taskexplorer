
import { State } from "../common/state";
import { Commands } from "../../lib/command";
import { TeWrapper } from "../../lib/wrapper";
import { ContextKeys } from "../../lib/context";
import { TeWebviewPanel, WebviewIds } from "../webviewPanel";
import { createTaskCountTable } from "../common/taskCountTable";
import { removeViewLicenseButton } from "../common/removeLicenseButtons";


export class LicensePage extends TeWebviewPanel<State>
{
	static viewTitle = "Task Explorer Licensing";
	static viewId: WebviewIds = "licensePage";


	constructor(wrapper: TeWrapper)
	{
		super(
			wrapper,
			"license.html",
			LicensePage.viewTitle,
			"res/img/logo-bl.png",
			`taskExplorer.${LicensePage.viewId}`,
			`${ContextKeys.WebviewPrefix}licensePage`,
			"licensePage",
			Commands.ShowLicensePage
		);
	}


	protected override onHtmlPreview = async (html: string, ...args: any[]) =>
	{
		const newKey = args[0] as string | undefined;
		html = await createTaskCountTable(this.wrapper, undefined, html);
		html = removeViewLicenseButton(html);
		let infoContent = await this.getExtraContent(newKey);
		html = html.replace("<!-- addtlContentTop -->", infoContent);
		infoContent = this.getExtraContent2();
		html = html.replace("<!-- addtlContent -->", infoContent);
		return html;
	};


	private getExtraContent = async (newKey?: string) =>
	{
		const licMgr = this.wrapper.licenseManager;
		const key = await licMgr.getLicenseKey();
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
			License Key: &nbsp;${key}
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
			30-Day License Key: &nbsp;${key}
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
			<img src="#{webroot}/readme/parsingreport.png">
		</td></tr>
	</td></tr>`;
		return `<tr><td>${details}</td></tr>`;
	};

}
