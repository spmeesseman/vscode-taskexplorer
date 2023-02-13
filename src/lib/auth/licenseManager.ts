/* eslint-disable @typescript-eslint/naming-convention */

import { TeWrapper } from "../wrapper";
import { storage } from "../utils/storage";
import { isObject, isString } from "../utils/utils";
import { isScriptType } from "../utils/taskTypeUtils";
import { TeAuthenticationProvider, TeAuthenticationSessionChangeEvent } from "./authProvider";
import { LicensePage } from "../../webview/page/licensePage";
import { executeCommand, registerCommand, Commands } from "../command";
import {
	AuthenticationProviderAuthenticationSessionsChangeEvent, Disposable, env, EventEmitter,
	InputBoxOptions, Task, WebviewPanel, window
} from "vscode";


export class LicenseManager implements Disposable
{
	private disposables: Disposable[] = [];
	private busy = false;
	private wrapper: TeWrapper;
	private licensed = false;
	private numTasks = 0;
	private maxFreeTasks = 500;
	private maxFreeTaskFiles = 100;
	private maxFreeTasksForTaskType = 100;
	private maxFreeTasksForScriptType = 50;
	private maxTasksReached = false;
	private panel: LicensePage | undefined;
	private _auth: TeAuthenticationProvider;
    private _onSessionChange = new EventEmitter<TeAuthenticationSessionChangeEvent>();


	constructor(wrapper: TeWrapper)
    {
		this.wrapper = wrapper;
		this._auth = new TeAuthenticationProvider(wrapper);
		this._auth.onDidChangeSessions(this.onSessionChanged);
		this.disposables.push(
			this._auth,
			registerCommand(Commands.EnterLicense, () => this.enterLicenseKey(), this),
			registerCommand(Commands.GetLicense, () => this.getLicense(), this)
		);
    }


	async checkLicense(logPad = "   ")
	{
		const storedLicenseKey = await this.getLicenseKey();
		this.wrapper.log.methodStart("license manager check license", 1, logPad, false, [
			[ "license key", storedLicenseKey ?? "n/a" ], [ "machine id", env.machineId ]
		]);
		if (storedLicenseKey) {
			this.licensed = await this.validateLicense(storedLicenseKey, logPad + "   ");
		}
		else {
			this.licensed = false;
		}
		this.wrapper.log.methodDone("license manager check license", 1, logPad, [[ "is licensed", this.licensed ]]);
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


    get onDidSessionChange() {
        return this._onSessionChange.event;
    }


	private displayPopup = async (message: string) =>
	{
		await storage.update("taskExplorer.lastLicenseNag", Date.now().toString());
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
		this.wrapper.log.methodStart("enter license key", 1);
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
							await executeCommand(Commands.Refresh);
						}
					}
				}
				else {
					window.showInformationMessage("This does not appear to be a valid license, validation skipped");
				}
			}
		}
		catch (e) {}
		this.wrapper.log.methodDone("enter license key", 1);
	}


	async getLicense()
	{
		this.wrapper.log.methodStart("get 30-day license command", 1, "", true);
		const newKey = await this.requestLicense("   ");
		const panel = await this.wrapper.licensePage.show(undefined, newKey);
		this.wrapper.log.methodDone("get 30-day license command", 1);
		return { panel: panel.view, newKey };
	};


	getLicenseKey = async() => storage.getSecret("license_key"); // for now, "1234-5678-9098-7654321" is a valid license


	getMaxNumberOfTasks = (taskType?: string) =>
		(this.licensed ? Infinity : (!taskType ? this.maxFreeTasks :
												 (isScriptType(taskType) ? this.maxFreeTasksForScriptType :
																		   this.maxFreeTasksForTaskType)));


	getMaxNumberOfTaskFiles = () =>  (this.licensed ? Infinity : this.maxFreeTaskFiles);


	getVersion = () => this.wrapper.version;


	getWebviewPanel = () => this.panel?.view as WebviewPanel | undefined;


	isBusy = () => this.busy;


	isLicensed = () => this.licensed;



	private onSessionChanged = (e: AuthenticationProviderAuthenticationSessionsChangeEvent) =>
	{
		this._onSessionChange.fire(e);
	};


	requestLicense = async(logPad: string) =>
	{
		let token: string | undefined;
		this.busy = true;

		this.wrapper.log.methodStart("request license", 1, logPad);

		if (await this.wrapper.storage.getSecret("license_key_30day") !== undefined)
		{   // this.log("   a 30-day license has already been allocated to this machine", logPad);
			this.busy = false;
			return;
		}

		const jso = await this.wrapper.server.request({
			ttl: 30,
			appid: env.machineId,
			appname: "vscode-taskexplorer",
			ip: "*",
			json: true,
			license: true,
			tests: this.wrapper.tests
		}, logPad);

		await this.setLicenseKeyFromRsp(jso.success, jso, logPad);
		if (jso.success === true && isObject(jso.token))
		{
			token = jso.token.token;
			await storage.updateSecret("license_key_30day", token);
			await this.setLicenseKeyFromRsp(jso.success, jso, logPad);
		}

		this.busy = false;
		this.wrapper.log.methodDone("request license", 1, logPad, [[ "30-day key", token ]]);
		return token;
	};


	setLicenseKey = async (licenseKey: string | undefined) => storage.updateSecret("license_key", licenseKey);


	private setLicenseKeyFromRsp = async(licensed: boolean, jso: any, logPad: string) =>
	{
		if (licensed && jso.token)
		{
			if (isString(jso.token))
			{
				this.wrapper.log.write("license key", 1, logPad, jso.token);
				await this.setLicenseKey(jso.token);
			}
			else {
				this.wrapper.log.write("license key", 1, logPad, jso.token.token);
				this.wrapper.log.write("   issued", 1, logPad, jso.token.issuedFmt);
				this.wrapper.log.write("   expires", 1, logPad, jso.token.expiresFmt || jso.expiresFmt);
				await this.setLicenseKey(jso.token.token);
			}
			this.wrapper.log.write("license key saved to secure storage", 1, logPad);
		}
		else {
			this.wrapper.log.write("license key will not be saved", 1, logPad);
		}
		this.wrapper.log.write("request to license server completed", 1, logPad);
	};


	setMaxTasksReached = (maxReached: boolean) => this.maxTasksReached = maxReached;


	async setTasks(tasks: Task[], logPad = "   ")
	{
		let displayPopup = !this.licensed;
		const lastNag = storage.get<string>("taskExplorer.lastLicenseNag");

		if (this.numTasks === tasks.length) {
			return;
		}
		this.numTasks = tasks.length;

		this.wrapper.log.methodStart("license manager set tasks", 1, logPad, false, [
			[ "is licensed", this.licensed ], [ "is version change", this.wrapper.versionchanged ],
			[ "# of tasks", this.numTasks ], [ "last nag", lastNag ]
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

		if (this.wrapper.versionchanged)
		{
			setTimeout(async () =>
			{
				this.panel = await this.wrapper.licensePage.show();
				await storage.update("taskExplorer.lastLicenseNag", Date.now().toString());
			}, 1);
		}
		else if (displayPopup)
		{
			this.displayPopup("Purchase a license to unlock unlimited parsed tasks.");
		}

		this.wrapper.log.methodDone("license manager set tasks", 1, logPad);
	}


	setTestData = (data: any) =>
	{
		this.maxFreeTasks = data.maxFreeTasks;
		this.maxFreeTaskFiles = data.maxFreeTaskFiles;
		this.maxFreeTasksForTaskType = data.maxFreeTasksForTaskType;
		this.maxFreeTasksForScriptType = data.maxFreeTasksForScriptType;
	};


	private validateLicense = async(licenseKey: string, logPad: string) =>
	{
		this.busy = true;
		let licensed = false;

		const jso = await this.wrapper.server.request({
			licensekey: licenseKey,
			appid: env.machineId,
			appname: "vscode-taskexplorer-prod",
			ip: "*"
		}, logPad);

		if (jso.success === true)
		{
			licensed = jso.success;
			jso.token = licenseKey;
			await this.setLicenseKeyFromRsp(jso.success, jso, logPad);
		}

		this.busy = false;
		this.wrapper.log.methodDone("validate license", 1, logPad, [[ "is valid license", licensed ]]);
		return licensed;
	};

}
