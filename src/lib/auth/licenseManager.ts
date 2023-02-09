
// import * as https from "http";
import * as https from "https";
import { figures } from "../figures";
import { TeWrapper } from "../wrapper";
import { IncomingMessage } from "http";
import { Commands } from "../constants";
import { storage } from "../utils/storage";
import { log, logControl } from "../log/log";
import { refreshTree } from "../refreshTree";
import { isObject, isString } from "../utils/utils";
import { isScriptType } from "../utils/taskTypeUtils";
import { LicensePage } from "../../webview/page/licensePage";
import { executeCommand, registerCommand } from "../command";
import { ILicenseManager } from "../../interface/ILicenseManager";
import { Disposable, env, InputBoxOptions, Task, WebviewPanel, window } from "vscode";


export class LicenseManager implements ILicenseManager, Disposable
{
	private disposables: Disposable[] = [];
	private busy = false;
	private wrapper: TeWrapper;
	private host = "license.spmeesseman.com";
	private licensed = false;
	private logRequestStepsTests = false;
	private numTasks = 0;
	private maxFreeTasks = 500;
	private maxFreeTaskFiles = 100;
	private maxFreeTasksForTaskType = 100;
	private maxFreeTasksForScriptType = 50;
	private maxTasksReached = false;
	private panel: LicensePage | undefined;
	private port = 443;
	private token = "1Ac4qiBjXsNQP82FqmeJ5iH7IIw3Bou7eibskqg+Jg0U6rYJ0QhvoWZ+5RpH/Kq0EbIrZ9874fDG9u7bnrQP3zYf69DFkOSnOmz3lCMwEA85ZDn79P+fbRubTS+eDrbinnOdPe/BBQhVW7pYHxeK28tYuvcJuj0mOjIOz+3ZgTY=";


	constructor(wrapper: TeWrapper)
    {
		this.wrapper = wrapper;
		this.disposables.push(
			registerCommand(Commands.EnterLicense, () => this.enterLicenseKey(), this),
			registerCommand(Commands.GetLicense, () => this.getLicense(), this)
		);
    }


	async checkLicense(logPad = "   ")
	{
		const storedLicenseKey = await this.getLicenseKey();
		log.methodStart("license manager check license", 1, logPad, false, [
			[ "license key", storedLicenseKey ?? "n/a" ], [ "machine id", env.machineId ]
		]);
		if (storedLicenseKey) {
			this.licensed = await this.validateLicense(storedLicenseKey, logPad + "   ");
		}
		else {
			this.licensed = false;
		}
		log.methodDone("license manager check license", 1, logPad, [[ "is licensed", this.licensed ]]);
	}


	dispose()
	{
		this.disposables.forEach((d) => {
            d.dispose();
        });
	    this.panel?.hide();
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
				await executeCommand(Commands.ShowLicensePage);
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
							await refreshTree(true, false, "   ");
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


	async getLicense()
	{
		log.methodStart("get 30-day license command", 1, "", true);
		const newKey = await this.requestLicense("   ");
		const panel = await this.wrapper.licensePage.show(undefined, newKey);
		log.methodDone("get 30-day license command", 1);
		return { panel: panel.view, newKey };
	};


	getLicenseKey = async() => storage.getSecret("license_key"); // for now, "1234-5678-9098-7654321" is a valid license


	getMaxNumberOfTasks = (taskType?: string) =>
		(this.licensed ? Infinity : (!taskType ? this.maxFreeTasks :
												 (isScriptType(taskType) ? this.maxFreeTasksForScriptType :
																		   this.maxFreeTasksForTaskType)));


	getMaxNumberOfTaskFiles = () =>  (this.licensed ? Infinity : this.maxFreeTaskFiles);


	getToken = () => this.token;


	getVersion = () => this.wrapper.version;


	getWebviewPanel = () => this.panel?.view as WebviewPanel | undefined;


	isBusy = () => this.busy;


	isLicensed = () => this.licensed;


	private log = (msg: any, logPad?: string, value?: any, symbol?: string) =>
	{
		/* istanbul ignore if */
		if (this.wrapper.tests && !logControl.writeToConsole && this.logRequestStepsTests)
		{
			if (!value && value !== false) {
				console.log(`       ${symbol || figures.color.infoTask} ${figures.withColor(msg.toString(), figures.colors.grey)}`);
			}
			else {
				const valuePad = 18, diff = valuePad - msg.length;
				for (let i = 0; i < diff; i++) {
					msg += " ";
				}
				console.log(`       ${symbol || figures.color.infoTask} ${figures.withColor(msg + " : " + value, figures.colors.grey)}`);
			}
		}
		/* istanbul ignore else */
		if (isString(msg))
		{
			if (!value) {
				log.write(msg, 1, logPad);
			}
			else {
				log.value(msg, value, 1, logPad);
			}
		}
		else {
			log.error(msg);
		}
	};


	private logServerResponse = (res: IncomingMessage, jso: any, rspData: string, logPad: string) =>
	{
		this.log("   response received", logPad);
		this.log("      status code", logPad, res.statusCode);
		this.log("      length", logPad, rspData.length);
		this.log("      success", logPad, jso.success);
		this.log("      message", logPad, jso.message);
	};


	/* istanbul ignore next*/
	private onServerError = (e: any, logPad: string, fn: string, rspData?: string) =>
	{
		this.log(e, "", undefined, figures.color.errorTests);
		if (rspData) {
			this.log(rspData, "", undefined, figures.color.errorTests);
		}
		this.log("   the license server is down, offline, or there is a connection issue", logPad, undefined, figures.color.errorTests);
		this.log("   licensed mode will be automatically enabled", logPad, undefined, figures.color.errorTests);
		this.log("request to license server completed w/ a failure", logPad + "   ", undefined, figures.color.errorTests);
		log.methodDone(fn + " license", 1, logPad);
	};


	requestLicense = (logPad: string) =>
	{
		this.busy = true;

		return new Promise<string | undefined>(async(resolve) =>
		{
			log.methodStart("request license", 1, logPad, false, [[ "host", this.host ], [ "port", this.port ]]);

			if (await storage.getSecret("license_key_30day") !== undefined)
			{
				this.log("   a 30-day license has already been allocated to this machine", logPad);
				log.methodDone("validate license", 1, logPad);
				setTimeout(() => resolve(undefined), 1);
				this.busy = false;
				return;
			}

			let rspData = "";
			this.log("starting https get 30-day license request to license server", logPad + "   ");

			const req = https.request(this.getDefaultServerOptions("/token"), (res) =>
			{
				res.on("data", (chunk) => { rspData += chunk; });
				res.on("end", async() =>
				{
					let token: string | undefined;
					try
					{
						const jso = JSON.parse(rspData),
							  licensed = res.statusCode === 200 && jso.success && jso.message === "Success" && isObject(jso.token);
						this.logServerResponse(res, jso, rspData, logPad);
						await this.setLicenseKeyFromRsp(licensed, jso, logPad);
						token = jso.token.token;
						await storage.updateSecret("license_key_30day", token);
						log.methodDone("request license", 1, logPad, [[ "30-day license key", token ]]);
					}
					catch (e)
					{   // Fails if IIS/Apache server is running but the reverse proxied app server is not, maybe
						/* istanbul ignore next*/
						this.onServerError(e, "request", logPad, rspData);
					}
					finally {
						this.busy = false;
						resolve(token);
					}
				});
			});

			/* istanbul ignore next*/
			req.on("error", (e) =>
			{   // Not going to fail unless i birth a bug
				this.onServerError(e, "request", logPad);
				this.busy = false;
				resolve(undefined);
			});

			req.write(JSON.stringify(
			{
				ttl: 30,
				appid: env.machineId,
				appname: "vscode-taskexplorer",
				ip: "*",
				json: true,
				license: true,
				tests: this.wrapper.tests
			}),
			() => {
				this.log("   output stream written, ending request and waiting for response...", logPad);
				req.end();
			});
		});
	};


	setLicenseKey = async (licenseKey: string | undefined) => storage.updateSecret("license_key", licenseKey);


	private setLicenseKeyFromRsp = async(licensed: boolean, jso: any, logPad: string) =>
	{
		if (licensed && jso.token)
		{
			if (isString(jso.token))
			{
				this.log("      license key", logPad, jso.token);
				await this.setLicenseKey(jso.token);
			}
			else {
				this.log("      license key", logPad, jso.token.token);
				this.log("      issued", logPad, jso.token.issuedFmt);
				this.log("      expires", logPad, jso.token.expiresFmt || jso.expiresFmt);
				await this.setLicenseKey(jso.token.token);
			}
			this.log("   license key saved to secure storage", logPad);
		}
		else {
			this.log("   license key will not be saved", logPad);
		}
		this.log("request to license server completed", logPad + "   ");
	};


	setMaxTasksReached = (maxReached: boolean) => this.maxTasksReached = maxReached;


	async setTasks(tasks: Task[], logPad = "   ")
	{
		let displayPopup = !this.licensed;
		const storedVersion = storage.get<string>("version"),
			  lastNag = storage.get<string>("lastLicenseNag"),
			  versionChange = this.wrapper.version !== storedVersion;

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
			this.panel = await this.wrapper.licensePage.show();
			await storage.update("version", this.wrapper.version);
			await storage.update("lastLicenseNag", Date.now().toString());
		}
		else if (displayPopup)
		{
			this.displayPopup("Purchase a license to unlock unlimited parsed tasks.");
		}

		log.methodDone("license manager set tasks", 1, logPad);
	}


	setTestData = (data: any) =>
	{
		this.maxFreeTasks = data.maxFreeTasks;
		this.maxFreeTaskFiles = data.maxFreeTaskFiles;
		this.maxFreeTasksForTaskType = data.maxFreeTasksForTaskType;
		this.maxFreeTasksForScriptType = data.maxFreeTasksForScriptType;
		this.logRequestStepsTests = !!data.logRequestSteps || this.logRequestStepsTests;
	};


	private validateLicense = (licenseKey: string, logPad: string) =>
	{
		this.busy = true;

		return new Promise<boolean>((resolve) =>
		{
			log.methodStart("validate license", 1, logPad, false, [[ "license key", licenseKey ], [ "host", this.host ], [ "port", this.port ]]);

			let rspData = "";
			this.log("starting https validate request to license server", logPad);

			const req = https.request(this.getDefaultServerOptions("/api/license/validate/v1"), (res) =>
			{
				res.on("data", (chunk) => { rspData += chunk; });
				res.on("end", async() =>
				{
					let licensed = true;
					try
					{   const jso = JSON.parse(rspData);
						licensed = res.statusCode === 200 && jso.success && jso.message === "Success";
						this.logServerResponse(res, jso, rspData, logPad);
						jso.token = licenseKey;
						await this.setLicenseKeyFromRsp(licensed, jso, logPad);
						log.methodDone("validate license", 1, logPad, [[ "is valid license", licensed ]]);
					}
					catch (e)
					{   // Fails if IIS/Apache server is running but the reverse proxied app server is not, maybe
						/* istanbul ignore next*/
						this.onServerError(e, "validate", logPad, rspData);
					}
					finally {
						this.busy = false;
						resolve(licensed);
					}
				});
			});

			/* istanbul ignore next*/
			req.on("error", (e) =>
			{   // Not going to fail unless i birth a bug
				this.onServerError(e, "validate", logPad);
				this.busy = false;
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
				this.log("   output stream written, ending request and waiting for response...", logPad);
				req.end();
			});
		});
	};

	/*
	async resendVerification(): Promise<boolean> {
		if (this._subscription.account?.verified) return true;

		const scope = getLogScope();

		void this.showHomeView(true);

		const session = await this.ensureSession(false);
		if (session == null) return false;

		try {
			const rsp = await fetch(Uri.joinPath(this.baseApiUri, 'resend-email').toString(), {
				method: 'POST',
				agent: getProxyAgent(),
				headers: {
					Authorization: `Bearer ${session.accessToken}`,
					'User-Agent': userAgent,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ id: session.account.id }),
			});

			if (!rsp.ok) {
				debugger;
				Logger.error(
					'',
					scope,
					`Unable to resend verification email; status=(${rsp.status}): ${rsp.statusText}`,
				);

				void window.showErrorMessage(`Unable to resend verification email; Status: ${rsp.statusText}`, 'OK');

				return false;
			}

			const confirm = { title: 'Recheck' };
			const cancel = { title: 'Cancel' };
			const result = await window.showInformationMessage(
				"Once you have verified your email address, click 'Recheck'.",
				confirm,
				cancel,
			);

			if (result === confirm) {
				await this.validate();
				return true;
			}
		} catch (ex) {
			Logger.error(ex, scope);
			debugger;

			void window.showErrorMessage('Unable to resend verification email', 'OK');
		}

		return false;
	}*/

}
