
import * as https from "http";
// import * as https from "https";
import log from "./utils/log";
import { join } from "path";
import { storage } from "./utils/storage";
import { ILicenseManager } from "../interface/licenseManager";
import { teApi } from "../extension";
import { readFileAsync } from "./utils/fs";
import { isScriptType, getInstallPath } from "./utils/utils";
import { commands, ExtensionContext, InputBoxOptions, Task, ViewColumn, WebviewPanel,  window, workspace } from "vscode";


export class LicenseManager implements ILicenseManager
{

	private useGlobalLicense = true; // Temp
	private maxFreeTasks = 500;
	private maxFreeTaskFiles = 100;
	private maxFreeTasksForTaskType = 100;
	private maxFreeTasksForScriptType = 50;
	private licensed = false;
	private version: string;
	private numTasks = 0;
	private panel: WebviewPanel | undefined;
	private context: ExtensionContext;


	constructor(context: ExtensionContext)
    {
		this.context = context;
        //
        // Store extension version
		// Note context.extension is only in VSCode 1.55+
        //
        this.version = context.extension.packageJSON.version;
    }


	async checkLicense(logPad = "   ")
	{
		const storedLicenseKey = this.getLicenseKey();
		log.methodStart("license manager check license", 1, logPad, false, [[ "stored license key", storedLicenseKey ]]);
		if (storedLicenseKey) {
			try {
				this.licensed = await this.validateLicense(storedLicenseKey, logPad + "   ");
			}
			catch {}
		}
		else {
			this.licensed = false;
		}
		log.methodDone("license manager check license", 1, logPad, [[ "is valid license", this.licensed ]]);
	}


	async setTasks(tasks: Task[], logPad = "   ")
	{
		let displayPopup = !this.licensed;
		const storedVersion = storage.get<string>("version"),
			  lastNag = storage.get<string>("lastLicenseNag"),
			  versionChange = this.version !== storedVersion;

		if (this.numTasks === tasks.length) {
			return;
		}
		this.numTasks = tasks.length;

		// if (this.numTasks < this.maxFreeTasks) {
		// 	return;
		// }

		log.methodStart("license manager set tasks", 1, logPad, false, [
			[ "is licensed", this.licensed ], [ "stored version", storedVersion ], [ "current version", storedVersion ],
			[ "is version change", versionChange ], [ "# of tasks", this.numTasks ], [ "last nag", lastNag ]
		]);

		// if (this.numTasks !== 0)
		// {
		// 	// task count changed
		// 	return;
		// }

		//
		// Only display the nag on startup once every 30 days.  If the version
		// changed, the webview will be shown instead regardless of the nag state.
		//
		if (!this.licensed && lastNag)
		{
			const now = Date.now();
			let lastNagDate = now;
			lastNagDate = parseInt(lastNag, 10);
			displayPopup = ((now - lastNagDate)  / 1000 / 60 / 60 / 24) > 30;
		}

		if (versionChange)
		{
			this.panel = this.panel || window.createWebviewPanel(
				"taskExplorer",   // Identifies the type of the webview. Used internally
				"Task Explorer",  // Title of the panel displayed to the users
				ViewColumn.One,   // Editor column to show the new webview panel in.
				{
					enableScripts: true
				}
			);

			this.panel.webview.html = await this.getHtmlContent(tasks);
			this.panel.reveal();
			await storage.update("version", this.version);
			await storage.update("lastLicenseNag", Date.now().toString());

			this.panel.webview.onDidReceiveMessage
			(
				message =>
				{
					switch (message.command)
					{
						case "enterLicense":
							commands.executeCommand("taskExplorer.enterLicense");
							return;
						case "viewReport":
							commands.executeCommand("taskExplorer.viewReport");
							return;
					}
				}, undefined, this.context.subscriptions
			);
		}
		else if (displayPopup)
		{
			this.displayPopup("Purchase a license to unlock unlimited parsed tasks.");
		}

		log.methodDone("license manager set tasks", 1, logPad);
	}


	dispose()
	{
	    this.panel?.dispose();
		this.numTasks = 0;
		this.licensed = false;
		this.panel = undefined;
	}


	private displayPopup = async (message: string) =>
	{
		await storage.update("lastLicenseNag", Date.now().toString());
		window.showInformationMessage(message, "Enter License Key", "Info", "Not Now")
		.then(async (action) =>
		{
			if (action === "Enter License Key")
			{
				await this.enterLicenseKey(); // don't await
			}
			else if (action === "Info")
			{
				await commands.executeCommand("taskExplorer.viewReport");
			}
		});
	};


	async enterLicenseKey()
	{
		const opts: InputBoxOptions = { prompt: "Enter license key" };
		try {
			const input = await window.showInputBox(opts);
			if (input) {
				this.licensed = await this.validateLicense(input);
			}
		}
		catch (e) {}
	}


	/* istanbul ignore next */
	getLicenseKey = () => !this.useGlobalLicense || teApi.isTests() ? storage.get<string>("license_key") : "1234-5678-9098-7654321";


	private getHtmlContent = async (tasks: Task[]) =>
	{
		const installPath = await getInstallPath();
		let html = await readFileAsync(join(installPath, "res/license-manager.html"));

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
			// eslint-disable-next-line @typescript-eslint/naming-convention
			Workspace: 0
		};

		tasks.forEach((t) =>
		{
			if (!taskCounts[t.source]) {
				taskCounts[t.source] = 0;
			}
			taskCounts[t.source]++;
		});

		/* istanbul ignore else */
		if (workspace.workspaceFolders)
		{
			for (const wf of workspace.workspaceFolders)
			{
				projects.push(wf.name);
			}
		}

		html = html.replace("<!-- title -->", "Welcome to Task Explorer");
		Object.keys(taskCounts).forEach((tcKey) =>
		{
			html = html.replace(`\${taskCounts.${tcKey}}`, taskCounts[tcKey]);
		});
		// if (!versionChange)
		// {
		// 	const idx1 = html.indexOf("<!-- startInfoContent -->");
		// 	const idx2 = html.indexOf("<!-- endInfoContent -->") + 23;
		// 	html = html.replace(html.slice(idx1, idx2), "");
		// }
		if (this.licensed)
		{
			const idx1 = html.indexOf("<!-- startLicenseContent -->");
			const idx2 = html.indexOf("<!-- endLicenseContent -->") + 26;
			html = html.replace(html.slice(idx1, idx2), "");
		}

		return html;
	};


	getMaxNumberOfTasks = (taskType?: string) =>
		(this.licensed ? Infinity : (!taskType ? this.maxFreeTasks :
												 (isScriptType(taskType) ? this.maxFreeTasksForScriptType :
																		   this.maxFreeTasksForTaskType)));

	getMaxNumberOfTaskFiles = () =>  (this.licensed ? Infinity : this.maxFreeTaskFiles);


	getVersion = () => this.version;


	getWebviewPanel = () => this.panel;


	isLicensed = () => this.licensed;


	setLicenseKey = async (licenseKey: string | undefined) =>
	{
		await storage.update("license_key", licenseKey);
	};


	private validateLicense = async (licenseKey: string, logPad = "   ") =>
	{
		return new Promise<boolean>((resolve) =>
		{
			log.methodStart("validate license", 1, logPad, false, [[ "license key", licenseKey ]]);

			let rspData = "";
			const options = {
				hostname: "localhost",
				port: 1924,
				path: "/api/license/validate/v1",
				method: "POST",
				timeout: 5000,
				headers: {
					"token": "HjkSgsR55WepsaWYtFoNmRMLiTJS4nKOhgXoPIuhd8zL3CVK694UXNw/n9e1GXiG9U5WiAmjGxAoETapHCjB67G0DkDZnXbbzYICr/tfpVc4NKNy1uM3GHuAVXLeKJQLtUMLfxgXYTJFNMU7H/vTaw==",
					// eslint-disable-next-line @typescript-eslint/naming-convention
					"Content-Type": "application/json"
				}
			};

			const _onError = (e: any)  =>
			{
				/* istanbul ignore else */
				if (e.message && e.message.includes("ECONNREFUSED"))
				{
					log.write("   it appears that the license server is down or offline", 1, logPad);
					if (!teApi.isTests()) {
						log.write("      licensed mode will be automatically enabled", 1, logPad);
					}
				}
				else { log.error(e); }
				log.methodDone("validate license", 1, logPad, [[ "is valid license", !teApi.isTests() ]]);
				resolve(!teApi.isTests());
			};

			log.write("   send validation request", 1, logPad);

			const req = https.request(options, (res) =>
			{
				log.write("   response received", 1, logPad);
				log.value("      status code", res.statusCode, 2, logPad);
				res.on("data", (chunk) => { rspData += chunk; });
				res.on("end", async() =>
				{
					try
					{   const jso = JSON.parse(rspData),
							  licensed = res.statusCode === 200 && jso.success && jso.message === "Success";
						log.value("      success", jso.success, 3, logPad);
						log.value("      message", jso.message, 3, logPad);
						if (licensed) {
							await this.setLicenseKey(licenseKey);
						}
						log.methodDone("validate license", 1, logPad, [[ "is valid license", licensed ]]);
						resolve(licensed);
					}
					catch (e) { /* istanbul ignore next */ _onError(e); }
				});
			});
			req.on("error", (e) => { _onError(e); });
			req.write(JSON.stringify({ licensekey: licenseKey }));
			req.end();
		});
	};

}
