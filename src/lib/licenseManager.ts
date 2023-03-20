/* eslint-disable @typescript-eslint/naming-convention */

import { TeWrapper } from "./wrapper";
import { ITeApiEndpoint } from "./server";
import { Disposable, Event, EventEmitter, window } from "vscode";
import { executeCommand, registerCommand, Commands } from "./command/command";
import {
	ITeLicenseManager, TeLicenseType, TeSessionChangeEvent, ITeAccount, ITeTaskChangeEvent,
	TeLicenseState, IDictionary, TeRuntimeEnvironment
} from "../interface";


export class LicenseManager implements ITeLicenseManager, Disposable
{
	private _account: ITeAccount;
	private _accountChangeNumber = 0;
	private _busy = false;
	private _checkLicenseTask: NodeJS.Timeout;
	private _maxFreeTasks = 500;
	private _maxFreeTaskFiles = 100;
	private _maxTasksMessageShown = false;
	private _maxFreeTasksForTaskType = 100;
	private _maxFreeTasksForScriptType = 50;
    private readonly _onReady: EventEmitter<void>;
	private readonly _defaultSessionInterval = 1000 * 60 * 60 * 4;
	private readonly _disposables: Disposable[] = [];
	private readonly _maxTaskTypeMsgShown: IDictionary<boolean> = {};
    private readonly _onSessionChange: EventEmitter<TeSessionChangeEvent>;
	private readonly _sessionInterval = <{ [id in TeRuntimeEnvironment]: number}>{
		production: this._defaultSessionInterval, // 4 hr
		tests: this._defaultSessionInterval, // 4 hr
		dev: 1000 * 60 * 10 // 10 min
	};


	constructor(private readonly wrapper: TeWrapper)
    {
		this._account = this.getNewAccount();
		this._onReady = new EventEmitter<void>();
		this._onSessionChange = new EventEmitter<TeSessionChangeEvent>();
		// eslint-disable-next-line @typescript-eslint/tslint/config
		this._checkLicenseTask = setInterval(this.checkLicense, this.sessionInterval, "");
		this._disposables.push(
			this._onReady,
			this._onSessionChange,
			this.wrapper.treeManager.onDidTaskCountChange(this.onTasksChanged, this),
			registerCommand(Commands.ExtendTrial, this.extendTrial, this),
			registerCommand(Commands.PurchaseLicense, this.purchaseLicense, this),
			registerCommand(Commands.RefreshSession, () => this.validateLicense(this._account.license.key, ""), this),
			registerCommand(Commands.Register, this.register, this)
		);
    }

	dispose = () =>
	{
		clearInterval(this._checkLicenseTask);
		this._disposables.forEach((d) => d.dispose());
	};


	get account(): ITeAccount {
		return this._account;
	}

	get isBusy(): boolean {
		return this._busy;
	}

	get isLicensed(): boolean {
		return this._account.errorState || this.isTrial || this._account.license.type >= TeLicenseType.Standard;
	}

	get isPaid(): boolean {
		return this._account.license.type >= TeLicenseType.Standard && this._account.license.state === TeLicenseState.Paid;
	}

	get isRegistered(): boolean {
		return this._account.verified;
	}

	get isTrial(): boolean {
		return this._account.license.type <= TeLicenseType.TrialExtended && this._account.license.state === TeLicenseState.Trial && this._account.license.period <= 2;
	}

	get isTrialExtended(): boolean {
		return this._account.license.type === TeLicenseType.TrialExtended && this._account.license.state === TeLicenseState.Trial && this._account.license.period === 2;
	}

    get onDidSessionChange(): Event<TeSessionChangeEvent> {
        return this._onSessionChange.event;
    }

    get onReady(): Event<void> {
        return this._onReady.event;
    }

	get sessionInterval(): number {
		return this._sessionInterval[this.wrapper.env];
	}

	get statusDays(): string {
		return this.isTrial ?
			this.wrapper.utils.getDateDifference(Date.now(), this._account.license.expires, "d").toString() :
			(this.isLicensed ? this.wrapper.utils.getDateDifference(Date.now(), this._account.license.expires, "d").toString() : "");
	}

    get statusDescription(): string {
        return this.isTrial ? (this._account.license.period <= 1 ? "PRE-TRIAL" : "EXT-TRIAL") : (this.isLicensed ? "LICENSED" : "UNLICENSED");
    }


	private beginTrial = async(logPad: string): Promise<void> =>
	{
		const ep: ITeApiEndpoint = "register/trial/start";
		this.wrapper.log.methodStart("begin trial", 1, logPad);
		try
		{
			const account = await this.wrapper.server.request<ITeAccount>(ep, undefined, logPad + "   ", {});
			await this.saveAccount(account, logPad + "   ");
			window.showInformationMessage(`Welcome to ${this.wrapper.extensionName} 3.0.  Your 30 day trial has been activated.`, "More Info")
			.then((action) =>
			{
				if (action === "More Info") {
					void executeCommand(Commands.ShowLicensePage);
				}
			});
		}
		catch (e) {
			/* istanbul ignore next  */
			await this.handleServerError(e);
		}
		this.wrapper.log.methodDone("begin trial", 1, logPad);
	};


	checkLicense = async(logPad: string): Promise<void> =>
	{
		this._busy = true;
		this._account.errorState = false;
		this.wrapper.statusBar.update("Checking license");
		this.wrapper.log.methodStart("license manager check license", 1, logPad);

		try
		{
			this._account = await this.getStoredAccount();
			this.logAccountFields(logPad + "   ");
			if (this._account.license.type !== TeLicenseType.None)
			{
				if (this._account.license.key && this._account.license.type !== TeLicenseType.Free)
				{
					if (this._account.session.expires <= Date.now() + this.sessionInterval) {
						await this.validateLicense(this._account.license.key, logPad + "   ");
					}
					else {
						await this.displayPopup("Purchase a license to unlock unlimited parsed tasks.", logPad + "   ");
					}
				}
				else {
					await this.displayPopup("Purchase a license to unlock unlimited parsed tasks.", logPad + "   ");
				}
			}
			else {
				await this.beginTrial(logPad + "   ");
			}
		}
		finally  {
			this._busy = false;
			this.wrapper.statusBar.update("");
			this._onReady.fire();
		}

		this.wrapper.log.methodDone("license manager check license", 1, logPad, [
			[ "trial", this.isTrial ], [ "registered", this.isRegistered ], [ "licensed", this.isLicensed ]
		]);
	};


	private displayPopup = async (message: string, logPad: string): Promise<void> =>
	{
		const lastNag = this.wrapper.storage.get<string>(this.wrapper.keys.Storage.LastLicenseNag);
		this.wrapper.log.methodStart("license manager display popup", 1, logPad, false, [[ "last nag", lastNag ]]);

		//
		// Only display the nag on startup once every 30 days.  If the version
		// changed, the webview will be shown instead regardless of the nag state.
		//
		let displayPopup = !this.isLicensed || this.isTrial;
		if (displayPopup && lastNag)
		{
			const now = Date.now(),
				  lastNagDate = parseInt(lastNag, 10);
			displayPopup = ((now - lastNagDate)  / 1000 / 60 / 60 / 24) > 30;
		}

		if (displayPopup)
		{
			const options = [ "Buy License", "Info", "Not Now" ];
			if (this._account.license.type !== TeLicenseType.TrialExtended) {
				options.push("Extend Trial");
			}
			await this.wrapper.storage.update(this.wrapper.keys.Storage.LastLicenseNag, Date.now().toString());
			window.showInformationMessage(message, ...options)
			.then((action) =>
			{
				if (action === "Buy License")
				{
					void executeCommand(Commands.PurchaseLicense);
				}
				else if (action === "Extend Trial")
				{
					void executeCommand(Commands.ExtendTrial);
				}
				else if (action === "Info")
				{
					void executeCommand(Commands.ShowLicensePage);
				}
			});
		}

		this.wrapper.log.methodDone("license manager display popup", 1, logPad);
	};


	private extendTrial = async(logPad: string): Promise<void> =>
	{
		const ep: ITeApiEndpoint = "register/trial/extend",
			  token = this._account.session.token;

		this.wrapper.statusBar.update("Requesting extended trial");
		this.wrapper.log.methodStart("request extended trial", 1, logPad, false, [[ "endpoint", ep ]]);

		if (this._account.license.period > 1 || !this.isRegistered)
		{
			const msg = "user is not registered or an extended trial license has already been allocated to this machine";
			window.showInformationMessage("Can't proceed - " + msg);
			this.wrapper.log.write("   " + msg, 1, logPad);
			this.wrapper.log.methodDone("request extended trial", 1, logPad);
			this.wrapper.statusBar.update("");
			return;
		}

		this._busy = true;

		//
		// TODO - Collect name and email address to allow 2nd trial
		//
		const firstName = "Scott",
			  lastName = "Meesseman",
			  email = `scott-${this.wrapper.utils.getRandomNumber()}@spmeesseman.com`;
		try
		{
			const account = await this.wrapper.server.request<ITeAccount>(ep, token, logPad,
			{
				accountId: this._account.id,
				email,
				firstName,
				lastName,
				tests: this.wrapper.tests
			});
			await this.saveAccount(account, "   ");
		}
		catch (e) {
			/* istanbul ignore next */
			await this.handleServerError(e);
		}
		finally {
			this._busy = false;
			this.wrapper.statusBar.update("");
			queueMicrotask(() => this._onReady.fire());
		}
		this.wrapper.log.methodDone("request extended trial", 1, logPad);
	};


	private getNewAccount = (): ITeAccount =>
	{
		const now = Date.now();
		return {
			id: 0,
			created: now,
			email: "",
			firstName: "",
			lastName: "",
			name: "",
			orgId: 0,
			trialId: 0,
			verified: false,
			verificationPending: false,
			session: {
				expires: 0,
				issued: 0,
				token: "",
				scopes: [ "te-explorer", "te-sidebar", "te-monitor-free" ],
			},
			license: {
				id: 1,
				expired: false,
				expires: 0,
				issued: 0,
				key: "",
				paid: false,
				period: 0,
				state: TeLicenseState.Trial,
				type: TeLicenseType.None
			}
		};
	};


	private getStoredAccount = (): Thenable<ITeAccount> =>
		this.wrapper.storage.getSecret<ITeAccount>(this.wrapper.keys.Storage.Account, this._account);


	getMaxNumberOfTasks = (taskType?: string): number =>
		(this.isLicensed ? Infinity : (!taskType ? this._maxFreeTasks :
						(this.wrapper.taskUtils.isScriptType(taskType) ? this._maxFreeTasksForScriptType : this._maxFreeTasksForTaskType)));


	getMaxNumberOfTaskFiles = (): number =>  (this.isLicensed ? Infinity : this._maxFreeTaskFiles);


	private getPaypalWebhookPayload = () => ({
		id: "5O190127TN364715T",
		create_time: "2018-04-16T21:21:49.000Z",
		event_type: "CHECKOUT.ORDER.COMPLETED",
		resource_type: "checkout-order",
		resource_version: "2.0",
		summary: "Checkout Order Completed",
		zts: 1494957670,
		event_version: "1.0",
		resource: {
			id: "5O190127TN364715T",
			intent: "CAPTURE",
			status: "COMPLETED",
			create_time: "2018-04-01T21:18:49Z",
			update_time: "2018-04-01T21:20:49Z",
			gross_amount: {
				value: "19.00",
				currency_code: "USD"
			},
			payer: {
				payer_id: "PAYPAL_PAYER_ID",
				email_address: "buyer@example.com",
				name: {
					given_name: "John",
					surname: "Doe"
				}
			},
			purchase_units: [{
				reference_id: "5",
				amount: {
					currency_code: "USD",
					value: "19.00"
				 },
				payee: {
					email_address: `scott-${this.wrapper.utils.getRandomNumber()}@spmeesseman.com`
				}
			}],
			shipping: {
				method: "United States Postal Service",
				address: {
				   address_line_1: "2211 N First Street",
				   address_line_2: "Building 17",
				   admin_area_2: "San Jose",
				   admin_area_1: "CA",
				   postal_code: "95131",
				   country_code: "US"
				}
			},
			payments: {
				captures: [
				{
					id: "3C679366HH908993F",
					status: "COMPLETED",
					final_capture: true,
					create_time: "2018-04-01T21:20:49Z",
					update_time: "2018-04-01T21:20:49Z",
					amount: {
						currency_code: "USD",
						value: "100.00"
					},
					seller_protection: {
						status: "ELIGIBLE",
						dispute_categories: [
							"ITEM_NOT_RECEIVED",
							"UNAUTHORIZED_TRANSACTION"
						]
					},
					seller_receivable_breakdown: {
						gross_amount: {
						   currency_code: "USD",
						   value: "19.00"
						},
						paypal_fee: {
						   currency_code: "USD",
						   value: "2.00"
						},
						net_amount: {
						   currency_code: "USD",
						   value: "17.00"
						}
					 },
					 links: [{
						href: "https://api.paypal.com/v2/checkout/orders/5O190127TN364715T",
						rel: "self",
						method: "GET"
					}]
				}]
			},
			links: [{
				href: "https://api.paypal.com/v2/checkout/orders/5O190127TN364715T",
				rel: "self",
				method: "GET"
			}]
		}
	});


	private handleServerError = async(e: any): Promise<void> =>
	{
		/* istanbul ignore if  */
		if (e instanceof Error)
		{
			this.wrapper.log.error(e);
			this._account.errorState = true; // In error state, licensed mode is ON
		}
		else //
		{   // Possible Status Codes:
			//
			//     201  : Success
			//     400  : Client Error (Invalid Parameters)
			//     402  : Payment required, trial extension already granted
			//     406  : Invalid License Key
			//     408  : Timeout
			//     409  : License/Account/Trial Record Not Found
			//     500  : Server Error
			//
			this.wrapper.log.value("response body", JSON.stringify(e.body), 3);
			this.wrapper.log.error(e.message, [[ "status code", e.status ], [ "server message", e.body.message ]]);
			/* istanbul ignore else */
			if (e.status !== 500)
			{
				switch (e.body.message)
				{
					case "Account does not exist":           // 409
					case "Account trial does not exist":     // 409
					case "Account license does not exist":   // 409
						this._account.license.type = TeLicenseType.Free;
						this._account.license.state = TeLicenseState.Free;
						await this.saveAccount(this._account, "   ");
						this._account.verified = false;
						break;
					// case "Account trial cannot be extended": // 402
					case "Invalid license key":              // 406
						this._account.license.type = TeLicenseType.Free;
						this._account.license.state = TeLicenseState.Free;
						await this.saveAccount(this._account, "   ");
						break;
					// case "Error - could not update trial":
					// case "Invalid request parameters":
				}
			}
			else {
				this._account.errorState = true; // In error state, licensed mode goes ON
			}
		}

		this.wrapper.statusBar.update("Server error");
		setTimeout(() => this.wrapper.statusBar.update(""), 1500);
	};


	private logAccountFields = (logPad: string) =>
	{
		const _v = (e: [ string, any ]) => {
			if (!e[0].match(/(?:expires|issued)/i)) return e[1];
			return this.wrapper.utils.formatDate(e[1]);
		};
		const _l = (o: object, p: string) =>
		{
			Object.entries(o).forEach((e) =>
			{
				if (!this.wrapper.typeUtils.isObject(e[1])) {
					this.wrapper.log.value(`   ${e[0]}`, !e[0].match(/(?:token|key|machine)/i) ? _v(e) : "*****", 1, p);
				}
				else {
					this.wrapper.log.write(`   ${e[0]} details:`,  1, p);
					_l(e[1], p + "   ");
				}
			});
		};
		this.wrapper.log.write("Account details:",  1, logPad);
		_l(this._account, logPad);
	};


	private onSessionChanged = (e: TeSessionChangeEvent) => this._onSessionChange.fire(e);


	private onTasksChanged = (e: ITeTaskChangeEvent) =>
	{
		this.wrapper.log.methodOnce("license event", "on tasks changed", 1, "");
		if (e.tasks.length > this.getMaxNumberOfTasks(e.task?.source)) {
			this.setMaxTasksReached();
			this.displayPopup("Purchase a license to unlock unlimited parsed tasks.", "");
		}
	};


	private purchaseLicense = async(logPad: string): Promise<void> =>
	{
		this.wrapper.log.methodStart("purchase license", 1, logPad);
		/* istanbul ignore else */
		if (this.wrapper.tests)
		{   //
			// For tests, simulate a payment triggered by a PayPal transaction using the
			// license/payment endpoint, then call the license/validate endpoint to retrieve
			// the new license state
			//
			this.wrapper.statusBar.update("Sending payment request");
			const ep: ITeApiEndpoint = "payment/paypal/hook",
				  token = this._account.session.token;
			try
			{
				await this.wrapper.server.request<any>(ep, token, logPad, this.getPaypalWebhookPayload());
				await this.wrapper.utils.sleep(500);
				await this.validateLicense(this._account.license.key, logPad + "   ");
			}
			catch (e) {
				/* istanbul ignore next */
				await this.handleServerError(e);
			}
			finally {
				this.wrapper.statusBar.update("");
			}
		}
		else
		{
			this.wrapper.utils.openUrl(
				`https://license.spmeesseman.com/payment/paynow/${this.wrapper.extensionId}/${this.account.id}/v1`
			);
		}
		this.wrapper.log.methodDone("purchase license", 1, logPad);
	};


	private register = async(): Promise<void> =>
	{
		await this.wrapper.utils.sleep(1);
		//
		// TODO - Account registration
		//        Need webview app to input first/last name, email address
		//
		// window.showInformationMessage("Not implemented yet");
	};


	private saveAccount = async (account: ITeAccount, logPad: string): Promise<void> =>
	{
		this.wrapper.log.methodStart("save account", 1, logPad);
		++this._accountChangeNumber;
		this.wrapper.log.values(1, logPad + "   ", [
			[ "account id", account.id ],
			[ "account change #", this._accountChangeNumber ],
			[ "license issued", this.wrapper.utils.formatDate(account.session.issued) ],
			[ "license expires", this.wrapper.utils.formatDate(account.session.expires) ]
		]);
		/* istanbul ignore else */
		if (this.wrapper.env !== "production")
		{
			this.wrapper.log.values(2, logPad + "   ", [
				[ "license id", account.license.id ], [ "trial id", account.trialId ],
				[ "access token", account.session.token ], [ "license key", account.license.key ]
			]);
			const rPath = await this.wrapper.pathUtils.getInstallPath() + `\\dist\\account_saved_${this._accountChangeNumber}.json`;
			await this.wrapper.fs.writeFile(rPath, JSON.stringify(account, null, 3));
		}
		//
		// Save and set new account, clone previous account object for change flag comparison
		//
		const accountJson = JSON.stringify(account);
		await this.wrapper.storage.updateSecret(this.wrapper.keys.Storage.Account, accountJson);
		const pAccount = this.wrapper.utils.cloneJsonObject<ITeAccount>(this._account);
		this._account = JSON.parse(accountJson);
		//
		// Queue task to notify of session changed
		//
		this.wrapper.log.write("   queue trigger session change event", 2, logPad);
		queueMicrotask(() =>
		{
			this.onSessionChanged(
			{
				account: this.wrapper.utils.cloneJsonObject(this._account),
				changeNumber: this._accountChangeNumber,
				changeFlags: {
					expiration: this._account.license.expired !== pAccount.license.expired,
					license: this._account.license.paid !== pAccount.license.paid,
					licenseState: this._account.license.state !== pAccount.license.state,
					licenseType: this._account.license.type !== pAccount.license.type,
					paymentDate: this._account.license.paid !== pAccount.license.paid,
					session: this._account.session.token !== pAccount.session.token,
					trialPeriod: this._account.license.type < 4 && this._account.license.period !== pAccount.license.period,
					verification: this._account.verified !== pAccount.verified || this._account.verificationPending !== pAccount.verificationPending
				},
				session: {
					added: [],
					removed: [ this.wrapper.utils.cloneJsonObject(pAccount.session) ],
					changed: [ this.wrapper.utils.cloneJsonObject(this._account.session) ]
				}
			});
		});
		this.wrapper.log.methodDone("save account", 1, logPad);
	};


	setMaxTasksReached = async(taskType?: string, force?: boolean) =>
	{
		if (force || ((!this._maxTasksMessageShown && !taskType) || (taskType && !this._maxTaskTypeMsgShown[taskType] && Object.keys(this._maxTaskTypeMsgShown).length < 3)))
		{
			this._maxTasksMessageShown = true;
			if (taskType)
			{
				this._maxTaskTypeMsgShown[taskType] = true;
			}
			const msg = `The max # of parsed ${taskType ?? ""} tasks in un-licensed mode has been reached`;
			return this.displayPopup(msg, "");
		}
	};


	setTestData = (data: any): void =>
	{
		this._maxFreeTasks = data.maxFreeTasks || this._maxFreeTasks;
		this._maxFreeTaskFiles = data.maxFreeTaskFiles || this._maxFreeTaskFiles;
		this._maxFreeTasksForTaskType = data.maxFreeTasksForTaskType || this._maxFreeTasksForTaskType;
		this._maxFreeTasksForScriptType = data.maxFreeTasksForScriptType || this._maxFreeTasksForScriptType;
		this._sessionInterval.tests = data.sessionInterval || this._defaultSessionInterval;
		if (data.callTasksChanged) {
			this.onTasksChanged(data.callTasksChanged);
		}
	};


	private validateLicense = async(key: string, logPad: string): Promise<void> =>
	{
		const ep: ITeApiEndpoint = "license/validate",
			  token = this._account.session.token;
		this.wrapper.log.methodStart("validate license", 1, logPad);
		try
		{
			const account = await this.wrapper.server.request<ITeAccount>(ep, token, logPad, { key });
			await this.saveAccount(account, "   ");
		}
		catch (e) {
			await this.handleServerError(e);
		}
		this.wrapper.log.methodDone("validate license", 1, logPad);
	};

}
