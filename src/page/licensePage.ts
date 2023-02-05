
import log from "../lib/log/log";
import TeWebviewPanel from "./teWebviewPanel";
import { timeout } from "../lib/utils/utils";
import { ITaskExplorerApi } from "../interface";
import { getLicenseManager } from "../extension";
import { TaskTreeManager } from "../tree/treeManager";
import { ExtensionContext, Task, WebviewPanel } from "vscode";

const viewTitle = "Task Explorer Licensing";
const viewType = "viewLicensePage";
let panel: TeWebviewPanel | undefined;


export const displayLicenseReport = async(api: ITaskExplorerApi, context: ExtensionContext, logPad: string, tasks?: Task[], newKey?: string) =>
{
	log.methodStart("display license report", 1, logPad);
	const html = await getPageContent(api, logPad + "   ", tasks, newKey);
	panel = TeWebviewPanel.create(viewTitle, viewType, html, context);
    log.methodDone("display license report", 1, logPad);
    return panel;
};


const getPageContent = async (api: ITaskExplorerApi, logPad: string, tasks?: Task[], newKey?: string) =>
{
	let html = "";

	if (!tasks)
	{
		tasks = TaskTreeManager.getTasks();
	}

	/* istanbul ignore else */
	if (tasks)
	{
		html = await TeWebviewPanel.createTaskCountTable(api, tasks, "Task Explorer Licensing");

		let infoContent = getExtraContent(api, logPad + "   ", newKey);
		html = html.replace("<!-- addtlContentTop -->", infoContent);

		infoContent = getExtraContent2(logPad + "   ");
		html = html.replace("<!-- addtlContent -->", infoContent);

		const idx1 = html.indexOf("<!-- startViewLicenseButton -->"),
			  idx2 = html.indexOf("<!-- endViewLicenseButton -->") + 29;
		html = html.replace(html.slice(idx1, idx2), "");
	}

	return html;
};


const getExtraContent = (api: ITaskExplorerApi, logPad: string, newKey?: string) =>
{
    log.methodStart("get body content", 1, logPad);

	const details = !newKey ?
(!api.isLicensed() ? `
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
		30-Day License Key: &nbsp;${getLicenseManager().getLicenseKey()}
	</td></tr>
	<tr><td>
		This license key is valid for30 days from the time it was issued.  Please show your support for
		the extension and purchase the license <a href="https://license.spmeesseman.com/purchase?key=${encodeURIComponent(`${newKey}&${getLicenseManager().getToken()}`)}">here</a>.
	</td></tr>
</table>
<table class="margin-top-20">
	<tr><td>You can view a detailed parsing report using the "<i>Task Explorer: View Parsing Report</i>"
	command in the Explorer context menu for any project.  It can alternatively be ran from the
	command pallette for "all projects" to see how many tasks the extension has parsed.
	<tr><td height="20"></td></tr>
</table>
`;

	log.methodDone("get body content", 1, logPad);

	return `<tr><td>${details}</td></tr>`;
};


const getExtraContent2 = (logPad: string) =>
{
    log.methodStart("get body content", 1, logPad);

	const details = `<tr><td>
<table class="margin-top-15">
	<tr><td class="content-section-header">Example Parsing Report:</td></tr>
	<tr><td>
		<img src="[webview.resourceDir]/readme/parsingreport.png">
	</td></tr>
</td></tr>`;

	log.methodDone("get body content", 1, logPad);

	return `<tr><td>${details}</td></tr>`;
};


export const getViewTitle = () => viewTitle;


export const getViewType = () => viewType;


export const reviveLicensePage = async(webviewPanel: WebviewPanel, api: ITaskExplorerApi, context: ExtensionContext, logPad: string, tasks?: Task[], newKey?: string) =>
{   //
	// Use a timeout so license manager can initialize first
	//
	await new Promise<void>(async(resolve) =>
	{
		while (api.isBusy()) {
			await timeout(100);
		}
		setTimeout(async (webviewPanel: WebviewPanel, api: ITaskExplorerApi, context: ExtensionContext, logPad: string, tasks?: Task[], newKey?: string) =>
		{
			log.methodStart("revive license report", 1, logPad);
			const html = await getPageContent(api, logPad + "   ", tasks, newKey);
			TeWebviewPanel.create(viewTitle, viewType, html, context, webviewPanel);
			log.methodDone("revive license report", 1, logPad);
			resolve();
		}, 10, webviewPanel, api, context, logPad, tasks, newKey);
	});
};
