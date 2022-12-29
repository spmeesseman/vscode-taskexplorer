/* eslint-disable prefer-arrow/prefer-arrow-functions */

import * as log from "../common/log";
import { storage } from "../common/storage";
import { commands, ExtensionContext, InputBoxOptions, Task, ViewColumn, WebviewPanel,  window, workspace } from "vscode";
import { ILicenseManager } from "../interface/licenseManager";
import { getHeaderContent, getBodyContent } from "../common/utils";
import { TaskExplorerApi } from "../interface";


export class LicenseManager implements ILicenseManager
{

	private licensed = false;
	private version: string;;
	private panel: WebviewPanel | undefined;
	private teApi: TaskExplorerApi;
	private context: ExtensionContext;


	constructor(teApi: TaskExplorerApi, context: ExtensionContext)
    {
		this.context = context;
		this.teApi = teApi;
        //
        // Store extension version
		// Note context.extension depends on VSCode 1.55+
        //
        this.version = context.extension.packageJSON.version;
    }


	async initialize(components: Task[])
	{
		let displayInfo = false, displayPopup = false;
		const storedVersion = storage.get<string>("version");

		log.methodStart("display info startup page", 1, "", false, [["stored version", storedVersion]]);

		let content = getHeaderContent();

		content += "<table align=\"center\" width=\"900\">";

		content += ("<tr><td>" + getBodyContent("Welcome to Task Explorer") + "</td></tr>");

		if (this.version === storedVersion)
		{
			content += ("<tr><td>" + this.getInfoContent(components) + "</td></tr>");
			displayInfo = true;
		}

		const hasLicense = await this.checkLicenseKey();
		if (!hasLicense)
		{
			content += ("<tr><td>" + this.getLicenseContent() + "</td></tr>");
			displayPopup = !displayInfo;
			// displayInfo = true; // temp
		}

		content + "</table>";

		content += this.getFooterContent();

		if (displayInfo)
		{
			this.panel = window.createWebviewPanel(
				"taskExplorer",   // Identifies the type of the webview. Used internally
				"Task Explorer",  // Title of the panel displayed to the users
				ViewColumn.One,   // Editor column to show the new webview panel in.
				{
					enableScripts: true
				}
			);
			this.panel.webview.html = content;
			this.panel.reveal();
			await storage.update("version", this.version);

			this.panel.webview.onDidReceiveMessage
			(
				message =>
				{
					switch (message.command)
					{
						case 'enterLicense':
							commands.executeCommand("taskExplorer.enterLicense");
							return;
						case 'viewReport':
							commands.executeCommand("taskExplorer.viewReport");
							return;
						default:
							return;
					}
				}, undefined, this.context.subscriptions
			);
		}
		else if (displayPopup)
		{
			const msg = "Purchase a license to unlock unlimited parsed tasks.",
				  action = await window.showInformationMessage(msg, "Enter License Key", "Info", "Not Now"); // don't await

			if (action === "Enter License Key")
			{
				this.enterLicenseKey(); // don't await
			}
			else if (action === "Info")
			{
				window.showInformationMessage("License Info page not implemented yet"); // don't await
			}
		}

		log.methodDone("display info startup page", 1, "", false, [["has license", hasLicense]]);
	}


	private async checkLicenseKey()
	{
		let validLicense = false;
		const storedLicenseKey = this.getLicenseKey();

		log.methodStart("check license", 1, "   ", false, [["stored license key", storedLicenseKey]]);

		if (storedLicenseKey)
		{
			validLicense = await this.validateLicense(storedLicenseKey);
		}

		log.methodDone("check license", 1, "   ", false, [["valid license", validLicense]]);
		return validLicense;
	}


	async enterLicenseKey()
	{
		const opts: InputBoxOptions = { prompt: "Enter license key" };
		try {
			const input = await window.showInputBox(opts);
			if (input) {
				return this.validateLicense(input);
			}
		}
		catch (e) {}
		return false;
	}


	// function closeWebView()
	// {
	//     panel?.dispose();
	// }


	getLicenseKey()
	{
		return storage.get<string>("license_key");
	}


	private getFooterContent()
	{
		return "</body></html>";
	}


	private getLicenseContent()
	{
		return `<table style="margin-top:15px;width:inherit">
		<tr><td style="font-weight:bold;font-size:14px">
			Licensing Note
		</td></tr>
		<tr><td>
			This extension is free to use but am considering a small license for an
			unlimited parsed component type of thing (e.g $10 - $20), as the time spent
			and functionality have went way beyond what was at first intended.
			<br><br>Hey Sencha, you can buy it and replace your own product if you want ;).
		</td></tr></table>
		<table style="margin-top:30px">
			<tr><td>You can view a detailed parsing report using the "<i>Task Explorer: View Parsing Report</i>"
			command in the Explorer context menu for any project.  It can alternatively be ran from the
			command pallette for "all projects".
			<tr><td height="20"></td></tr>
			<tr><td>
				<img src="https://raw.githubusercontent.com/spmeesseman/vscode-extjs/master/res/readme/ast-report.png">
			</td></tr>
		</table>`;
	}


	private getInfoContent(tasks: Task[])
	{
		const projects: string[] = [];
		const taskCounts: any = {
			ant: 0,
			apppublisher: 0,
			bash: 0,
			batch: 0,
			composer: 0,
			gradle: 0,
			grunt: 0,
			gulp: 0,
			make: 0,
			maven: 0,
			npm: 0,
			nsis: 0,
			powershell: 0,
			python: 0,
			ruby: 0,
			tsc: 0,
			Workspace: 0
		};

		tasks.forEach((t) =>
		{
			if (!taskCounts[t.source]) {
				taskCounts[t.source] = 0;
			}
			taskCounts[t.source]++;
		});

		/** istanbul ignore else */
		if (workspace.workspaceFolders)
		{
			for (const wf of workspace.workspaceFolders)
			{
				projects.push(wf.name)
			}
		}

		return `<table style="margin-top:15px;display:flexbox;width:-webkit-fill-available">
		<tr>
		<td>
			<table>
			<tr>
				<td style="font-size:16px;font-weight:bold" nowrap>
					Task Explorer has parsed ${taskCounts.length} components in
					${projects.length} project${ /** istanbul ignore next */ projects.length > 1 ? "s" : ""}.
				</td>
			</tr>
			<tr>
				<td nowrap>
					<ul>
						<li>${tasks.length} Total tasks</li>
						<li>${taskCounts.ant} Ant tasks</li>
						<li>${taskCounts.apppublisher} App-Publisher tasks</li>
						<li>${taskCounts.bash} Bash scripts</li>
						<li>${taskCounts.batch} Batch scripts</li>
						<li>${taskCounts.composer} Composer tasks</li>
						<li>${taskCounts.gradle} Gradle tasks</li>
						<li>${taskCounts.grunt} Grunt tasks</li>
						<li>${taskCounts.gulp} Gulp tasks</li>
						<li>${taskCounts.make} Make tasks</li>
						<li>${taskCounts.maven} Maven tasks</li>
						<li>${taskCounts.npm} NPM tasks</li>
						<li>${taskCounts.nsis} NSIS tasks</li>
						<li>${taskCounts.powershell} Powershell scripts</li>
						<li>${taskCounts.python} Python scripts</li>
						<li>${taskCounts.ruby} Ruby scripts</li>
						<li>${taskCounts.tsc} Typescript tasks</li>
						<li>${taskCounts.Workspace} VSCode tasks</li>
					</ul>
				</td>
			</tr>
			</table>
		</td>
		<td valign="top" align="right" style="padding-left:100px;padding-top:7px;width:-webkit-fill-available">
			<div>
				<button style="cursor:pointer;width:150px" onclick="getLicense();">Get License Now</button>
			</div>
			<div  style="margin-top:10px">
				<button style="cursor:pointer;width:150px" onclick="viewReport();">View Parsing Report</button>
			</div>
		</td></tr>
	</table>`;
	}


	getVersion()
	{
		return this.version;
	}


	async setLicenseKey(licenseKey: string | undefined)
	{
		await storage.update("license_key", licenseKey);
	}


	private async validateLicense(licenseKey: string)
	{
		this.licensed = !!licenseKey;
		/** istanbul ignore else */
		if (this.licensed) {
			await this.setLicenseKey(licenseKey);
		}
		return this.licensed;
	}
}
