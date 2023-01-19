
import * as https from "http";
// import * as https from "https";
import log from "./log/log";
import { teApi } from "../extension";
import { storage } from "./utils/storage";
import { isScriptType } from "./utils/utils";
import { ILicenseManager } from "../interface/ILicenseManager";
import { commands, ExtensionContext, InputBoxOptions, Task, WebviewPanel,  window } from "vscode";
import { displayLicenseReport } from "./report/licensePage";


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

		log.methodStart("license manager set tasks", 1, logPad, false, [
			[ "is licensed", this.licensed ], [ "stored version", storedVersion ], [ "current version", storedVersion ],
			[ "is version change", versionChange ], [ "# of tasks", this.numTasks ], [ "last nag", lastNag ]
		]);

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
			this.panel = await displayLicenseReport(tasks, this.licensed, this.context.subscriptions, "   ");
			await storage.update("version", this.version);
			await storage.update("lastLicenseNag", Date.now().toString());
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
