
// import * as https from "http";
import * as https from "https";
import log from "./log/log";
import figures from "./figures";
import { IncomingMessage } from "http";
import { storage } from "./utils/storage";
import { refreshTree } from "./refreshTree";
import { isScriptType, isString } from "./utils/utils";
import { ITaskExplorerApi } from "../interface";
import { displayLicenseReport } from "./report/licensePage";
import { ILicenseManager } from "../interface/ILicenseManager";
import { commands, env, ExtensionContext, InputBoxOptions, Task, WebviewPanel, window } from "vscode";


export class LicenseManager implements ILicenseManager
{
	private host = "license.spmeesseman.com";
	private port = 443;
	private token = "1Ac4qiBjXsNQP82FqmeJ5iH7IIw3Bou7eibskqg+Jg0U6rYJ0QhvoWZ+5RpH/Kq0EbIrZ9874fDG9u7bnrQP3zYf69DFkOSnOmz3lCMwEA85ZDn79P+fbRubTS+eDrbinnOdPe/BBQhVW7pYHxeK28tYuvcJuj0mOjIOz+3ZgTY=";
	private maxFreeTasks = 500;
	private maxFreeTaskFiles = 100;
	private maxFreeTasksForTaskType = 100;
	private maxFreeTasksForScriptType = 50;
	private licensed = false;
	private version: string;
	private numTasks = 0;
	private maxTasksReached = false;
	private panel: WebviewPanel | undefined;
	private teApi: ITaskExplorerApi;
	private context: ExtensionContext;


	constructor(context: ExtensionContext, api: ITaskExplorerApi)
    {
		this.context = context;
		this.teApi = api;
        this.version = context.extension.packageJSON.version; // Note that `context.extension` is only VSCode 1.55+
    }


	async checkLicense(logPad = "   ")
	{
		const storedLicenseKey = await this.getLicenseKey();
		log.methodStart("license manager check license", 1, logPad, false, [
			[ "stored license key", storedLicenseKey ? "******************" : "no license key found" ]
		]);
		if (storedLicenseKey) {
			this.licensed = await this.validateLicense(storedLicenseKey, logPad + "   ");
		}
		else {
			this.licensed = false;
		}
		log.methodDone("license manager check license", 1, logPad, [[ "is licensed", this.licensed ]]);
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
			this.panel = await displayLicenseReport(this.teApi, this.context.subscriptions, "   ", tasks);
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
				await commands.executeCommand("vscode-taskexplorer.viewLicense");
			}
		});
	};


	async enterLicenseKey()
	{
		log.methodStart("enter license key", 1);
		const opts: InputBoxOptions = { prompt: "Enter license key" };
		try {
			const input = await window.showInputBox(opts);
			if (input)
			{
				if (input.length > 20)
				{
					this.licensed = await this.validateLicense(input, "   ");
					if (this.licensed)
					{
						window.showInformationMessage("License key validated, thank you for your support!");
						if (this.maxTasksReached) {
							await refreshTree(this.teApi, true, false, "   ");
						}
					}
				}
				else {
					window.showInformationMessage("This does not appear to be a valid license, validation skipped");
				}
			}
		}
		catch (e) {}
		log.methodDone("enter license key", 1);
	}


	private getDefaultServerOptions = (apiEndpoint: string) =>
	{
		return {
			hostname: this.host,
			port: this.port,
			path: apiEndpoint,
			method: "POST",
			timeout: this.host !== "localhost" ? 4000 : /* istanbul ignore next*/1250,
			headers: {
				"token": this.token,
				// eslint-disable-next-line @typescript-eslint/naming-convention
				"Content-Type": "application/json"
			}
		};
	};


	getLicenseKey = async() => storage.getSecret("license_key"); // for now, "1234-5678-9098-7654321" is a valid license


	getMaxNumberOfTasks = (taskType?: string) =>
		(this.licensed ? Infinity : (!taskType ? this.maxFreeTasks :
												 (isScriptType(taskType) ? this.maxFreeTasksForScriptType :
																		   this.maxFreeTasksForTaskType)));


	getMaxNumberOfTaskFiles = () =>  (this.licensed ? Infinity : this.maxFreeTaskFiles);


	getVersion = () => this.version;


	getWebviewPanel = () => this.panel;


	isLicensed = () => this.licensed;


	private logServerResponse = (res: IncomingMessage, jso: any, rspData: string, logPad: string) =>
	{
		log.write("   response received", 1, logPad);
		log.value("      status code", res.statusCode, 2, logPad);
		this.testsLog("   Response received");
		this.testsLog("      Status code : " + res.statusCode);
		log.value("      length", res.statusCode, 2, logPad);
		this.testsLog("      Length      : " + rspData.length);
		log.value("      success", jso.success, 2, logPad);
		log.value("      message", jso.message, 2, logPad);
		this.testsLog("      Success     : " +  jso.success);
	};


	setLicenseKey = async (licenseKey: string | undefined) => storage.updateSecret("license_key", licenseKey);


	private setLicenseKeyFromRsp = async(licensed: boolean, jso: any) =>
	{
		if (licensed && jso.token)
		{
			if (isString(jso.token))
			{
				this.testsLog("      License key : " + jso.token);
				await this.setLicenseKey(jso.token);
			}
			else {
				this.testsLog("      License key : " + jso.token.token);
				this.testsLog("      Issued      : " + jso.token.issuedFmt);
				this.testsLog("      Expires     : " + jso.token.expiresFmt || jso.expires);
				await this.setLicenseKey(jso.token.token);
			}
			this.testsLog("   License key saved to secure storage");
		}
		this.testsLog("Request to license server completed  successfully", figures.color.success);
	};


	setMaxTasksReached = (maxReached: boolean) => this.maxTasksReached = maxReached;


	setTestData = (data: any) =>
	{
		this.maxFreeTasks = data.maxFreeTasks || this.maxFreeTasks;
		this.maxFreeTaskFiles = data.maxFreeTaskFiles || this.maxFreeTaskFiles;
		this.maxFreeTasksForTaskType = data.maxFreeTasksForTaskType || this.maxFreeTasksForTaskType;
		this.maxFreeTasksForScriptType = data.maxFreeTasksForScriptType || this.maxFreeTasksForScriptType;
		this.host = data.host || this.host;
		this.port = data.port || this.port;
		this.token = data.token || this.token;
	};


	private testsLog = (msg: string, symbol: string = figures.color.infoTask) => // for debugging the damn 'decryption failed' error
	{                                                                            // I "think" it's coming from the https request below
		if (this.teApi.isTests()) {
			console.log(`       ${symbol} ${figures.withColor(msg, figures.colors.grey)}`);
		}
	};


	/* istanbul ignore next*/
	private onServerError = (e: any, logPad: string, fn: string, rspData?: string) =>
	{
		this.testsLog("   Error", figures.color.errorTests);
		this.testsLog("   " + e.message, figures.color.errorTests);
		this.testsLog("Request to license server completed w/ a failure", figures.color.errorTests);
		log.error(e);
		log.write("   the license server is down, offline, or there is a connection issue", 1, logPad);
		log.write("      licensed mode will be automatically enabled", 1, logPad);
		if (rspData) {
			log.error(rspData);
			this.testsLog(rspData, figures.color.errorTests);
		}
		log.methodDone(fn + " license", 1, logPad);
	};


	requestLicense = (logPad: string) =>
	{
		return new Promise<string | undefined>(async(resolve) =>
		{
			log.methodStart("request license", 1, logPad, false, [[ "host", this.host ], [ "port", this.port ]]);

			if (await storage.getSecret("license_key_30day") !== undefined)
			{
				log.write("   A 30-day license has already been this machine", 1, logPad);
				log.methodDone("validate license", 1, logPad);
				setTimeout(() => resolve(undefined), 1);
				return;
			}

			let rspData = "";
			log.write("   send get new license request", 1, logPad);
			this.testsLog("Starting https get 30-day license request to license server");

			const req = https.request(this.getDefaultServerOptions("/token"), (res) =>
			{
				res.on("data", (chunk) => { rspData += chunk; });
				res.on("end", async() =>
				{
					try
					{
						const jso = JSON.parse(rspData),
							  licensed = res.statusCode === 200 && jso.success && jso.message === "Success" && jso.token;
						this.logServerResponse(res, jso, rspData, logPad);
						await this.setLicenseKeyFromRsp(licensed, jso);
						/* istanbul ignore else*/
						if (licensed) {
							await storage.updateSecret("license_key_30day", jso.token);
						}
						log.methodDone("request license", 1, logPad, [[ "30-day license key", jso.token ]]);
						resolve(licensed ? jso.token : /* istanbul ignore next*/undefined);
					}
					catch (e)
					{   // Fails if IIS/Apache server is running but the reverse proxied app server is not, maybe
						/* istanbul ignore next*/
						this.onServerError(e, "request", logPad, rspData);
						/* istanbul ignore next*/
						resolve(undefined);
					}
				});
			});

			/* istanbul ignore next*/
			req.on("error", (e) =>
			{   // Not going to fail unless i birth a bug on the server app
				this.onServerError(e, "request", logPad);
				resolve(undefined);
			});

			req.write(JSON.stringify(
			{
				ttl: 30,
				appid: env.machineId,
				appname: "vscode-taskexplorer",
				ip: "*",
				json: true,
				license: true
			}),
			() => {
				log.write("   output stream written, ending request and waiting for response...", 1, logPad);
				this.testsLog("Output stream written, ending request and waiting for response...");
				req.end();
			});
		});
	};


	private validateLicense = (licenseKey: string, logPad: string) =>
	{
		return new Promise<boolean>((resolve) =>
		{
			log.methodStart("validate license", 1, logPad, false, [[ "license key", licenseKey ], [ "host", this.host ], [ "port", this.port ]]);

			let rspData = "";
			log.write("   send validation request", 1, logPad);
			this.testsLog("Starting https validate request to license server");

			const req = https.request(this.getDefaultServerOptions("/api/license/validate/v1"), (res) =>
			{
				res.on("data", (chunk) => { rspData += chunk; });
				res.on("end", async() =>
				{
					try
					{   const jso = JSON.parse(rspData),
							  licensed = res.statusCode === 200 && jso.success && jso.message === "Success";
						this.logServerResponse(res, jso, rspData, logPad);
						jso.token = licenseKey;
						await this.setLicenseKeyFromRsp(licensed, jso);
						log.methodDone("validate license", 1, logPad, [[ "is valid license", licensed ]]);
						resolve(licensed);
					}
					catch (e)
					{   // Fails if IIS/Apache server is running but the reverse proxied app server is not, maybe
						/* istanbul ignore next*/
						this.onServerError(e, "validate", logPad, rspData);
						/* istanbul ignore next*/
						resolve(true);
					}
				});
			});

			/* istanbul ignore next*/
			req.on("error", (e) =>
			{   // Not going to fail unless i birth a bug on the server app
				this.onServerError(e, "validate", logPad);
				resolve(true);
			});

			req.write(JSON.stringify(
			{
				licensekey: licenseKey,
				appid: env.machineId,
				appname: "vscode-taskexplorer-prod",
				ip: "*"
			}),
			() => {
				log.write("   output stream written, ending request and waiting for response...", 1, logPad);
				this.testsLog("Output stream written, ending request and waiting for response...");
				req.end();
			});
		});
	};

}
