/* eslint-disable prefer-arrow/prefer-arrow-functions */

import * as log from "../common/log";
import { storage } from "../common/storage";
import { ExtensionContext, InputBoxOptions, ViewColumn, WebviewPanel, window } from "vscode";
import { ILicenseManager } from "../interface/licenseManager";
import { TaskExplorerApi } from "../interface";


export class LicenseManager implements ILicenseManager
{

	private version: string;
	private context: ExtensionContext;
	private panel: WebviewPanel | undefined;
	private teApi: TaskExplorerApi;


	constructor(teApi: TaskExplorerApi, context: ExtensionContext)
    {
        this.teApi = teApi;
		this.context = context;
        //
        // Store  extensionversion
		// Note context.extension depends on VSCode 1.55+
        //
        this.version = context.extension.packageJSON.version;
		this.initialize().then().catch();
    }


	async initialize()
	{
		let displayInfo = false, displayPopup = false;
		const storedVersion = storage.get<string>("version");

		log.methodStart("display info startup page", 1, "", false, [["stored version", storedVersion]]);

		let content = this.getHeaderContent("ExtJs Intellisense Licensing");

		if (this.version !== storedVersion)
		{
			content += this.getInfoContent();
			displayInfo = true;
		}

		const hasLicense = this.checkLicenseKey();
		if (!hasLicense)
		{
			content += this.getLicenseContent();
			displayPopup = !displayInfo;
			// displayInfo = true; // temp
		}

		content += this.getFooterContent();

		if (displayInfo)
		{
			this.panel = window.createWebviewPanel(
				"extjsIntellisense",  // Identifies the type of the webview. Used internally
				"ExtJs Intellisense", // Title of the panel displayed to the users
				ViewColumn.One,       // Editor column to show the new webview panel in.
				{}                    // Webview options.
			);
			this.panel.webview.html = content;
			this.panel.reveal();
			// await storage.update("version", this.version);
		}
		else if (displayPopup)
		{
			const msg = "Purchase a license to unlock unlimited parsed components.",
				  action = await window.showInformationMessage(msg, "Enter License Key", "Info", "Not Now");

			if (action === "Purchase")
			{
				this.enterLicenseKey();
			}
			else if (action === "Info")
			{
				window.showInformationMessage("License Info page not implemented yet");
			}
		}

		log.methodDone("display info startup page", 1, "", false, [["has license", hasLicense]]);
	}


	private checkLicenseKey()
	{
		let validLicense = false;
		const storedLicenseKey = this.getLicenseKey();

		log.methodStart("check license", 1, "   ", false, [["stored license key", storedLicenseKey]]);

		if (storedLicenseKey)
		{
			validLicense = this.validateLicense(storedLicenseKey);
		}

		log.methodDone("check license", 1, "   ", false, [["valid license", validLicense]]);
		return validLicense;
	}


	// function closeWebView()
	// {
	//     panel?.dispose();
	// }


	private getLicenseKey()
	{
		return storage.get<string>("license_key");
	}


	private getHeaderContent(title: string)
	{
    	return `<!DOCTYPE html>
<html lang="en">
    <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ExtJs Intellisense</title>
    </head>
    <body style="padding:20px">
    <table>
        <tr>
            <td>
                <img src="https://raw.githubusercontent.com/spmeesseman/vscode-extjs/master/res/icon.png" height="45" />
            </td>
            <td valign="middle" style="font-size:36px;font-weight:bold"> &nbsp;${title}</td>
        </tr>
    </table>`;
	}


	private getFooterContent()
	{
		return "</body></html>";
	}


	private getLicenseContent()
	{
		return '<table style="margin-top:15px"><tr><td>Purchase a license!!</td></tr></table>';
	}


	private getInfoContent()
	{
		return `<table style="margin-top:15px">
			<tr>
				<td style="font-size:16px;font-weight:bold">
					What's new in v3.0
				</td>
			</tr>
			<tr>
				<td>
					<ul>
						<li></li>
						<li></li>
						<li></li>
					</ul>
				</td>
			</tr>
			</tr>
		</table>`;
	}


	private async setLicenseKey(licenseKey: string | undefined)
	{
		await storage.update("license_key", licenseKey);
	}


	async enterLicenseKey()
	{
		const opts: InputBoxOptions = { prompt: "Enter license key" };
		try {
			const input = await window.showInputBox(opts);
			if (input !== undefined)
			{
				await this.setLicenseKey(input);
				return true;
			}
		}
		catch (e) {}
		return false;
	}


	validateLicense(licenseKey: string)
	{
		return !!licenseKey;
	}
}
