
import { request } from "https";
// import fetch from "@env/fetch";
// import fetch from "node-fetch";
import { Disposable } from "vscode";
import { figures } from "../figures";
import { TeWrapper } from "../wrapper";
import { IncomingMessage } from "http";
import { ISessionToken } from "src/interface/IAuthentication";


export interface IServerResponseData
{
	token?: ISessionToken;
	success: boolean;
	message: string;
}

export interface IServerResponse
{
	data: IServerResponseData;
	status: number | undefined;
	success: boolean;
}

export class TeServer
{
	// eslint-disable-next-line @typescript-eslint/naming-convention
	private readonly MAX_CONNECTION_TIME = 7500;
	private busy = false;
	private port = 443;
	private host = "license.spmeesseman.com";
	private idToken = "1Ac4qiBjXsNQP82FqmeJ5iH7IIw3Bou7eibskqg+Jg0U6rYJ0QhvoWZ+5RpH/Kq0EbIrZ9874fDG9u7bnrQP3zYf69DFkOSnOmz3lCMwEA85ZDn79P+fbRubTS+eDrbinnOdPe/BBQhVW7pYHxeK28tYuvcJuj0mOjIOz+3ZgTY=";


    constructor(private readonly wrapper: TeWrapper)
    {
    }


	private getDefaultServerOptions = (apiEndpoint: string) =>
	{
		return {
			hostname: this.host,
			port: this.port,
			path: apiEndpoint,
			method: "POST",
			//
			// Timeout don't work worth a s***.  Do a promise race in request()
			//
			timeout: this.host !== "localhost" ? 4000 : /* istanbul ignore next*/1250,
			headers: {
				"token": this.idToken,
				// eslint-disable-next-line @typescript-eslint/naming-convention
				"Content-Type": "application/json"
			}
		};
	};


	get serverToken() {
		return this.idToken;
	};


	private log = (msg: any, logPad?: string, value?: any, symbol?: string) =>
	{
		/* istanbul ignore next */
		if (this.wrapper.tests)
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
		if (this.wrapper.utils.isString(msg))
		{
			if (!value) {
				this.wrapper.log.write(msg, 1, logPad);
			}
			else {
				this.wrapper.log.value(msg, value, 1, logPad);
			}
		}
		else {
			this.wrapper.log.error(msg);
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
		this.wrapper.log.methodDone(fn + " license", 1, logPad);
	};


	request = (endpoint: string, params: any, logPad: string) =>
	{
		return Promise.race<IServerResponse>(
		[
			this._request(endpoint, params, logPad),
			new Promise<IServerResponse>(resolve => setTimeout(resolve, this.MAX_CONNECTION_TIME,
			<IServerResponse> {
				data: {
					success: false,
					message: `Maximum connection attempt time of ${this.MAX_CONNECTION_TIME}ms reached`
				},
				status: undefined, success: false
			}))
		]);
	};


    private _request = (endpoint: string, params: any, logPad: string) =>
	{
		this.busy = true;

		return new Promise<IServerResponse>(async(resolve) =>
		{
			let rspData = "";
			this.wrapper.log.methodStart("request license", 1, logPad, false, [[ "host", this.host ], [ "port", this.port ]]);
			this.log("starting https request to license server", logPad + "   ");

			const req = request(this.getDefaultServerOptions(endpoint), (res) =>
			{
				res.on("data", (chunk) => { rspData += chunk; });
				res.on("end", async() =>
				{
                    let jso = { success: false, message: "" };
                    try {
                        jso = JSON.parse(rspData);
                    }
                    catch {}
                    this.logServerResponse(res, jso, rspData, logPad);
					this.busy = false;
					resolve(<IServerResponse>{
                        data: jso,
                        status: res.statusCode,
                        success: res.statusCode === 200 && jso.success && jso.message === "Success"
                    });
				});
			});

			/* istanbul ignore next*/
			req.on("error", (e) =>
			{   // Not going to fail unless i birth a bug
				this.onServerError(e, "request", logPad);
				this.busy = false;
				resolve(<IServerResponse>{
					data: {
						success: false,
						message: e.message
					},
					status: undefined,
					success: false
				});
			});

			req.write(JSON.stringify(params), () =>
            {
				this.log("   output stream written, ending request and waiting for response...", logPad);
				req.end();
			});
		});
	};

    //
    // 'Fetch' examples, in case I ever decide to go to fetch, which will also be built in in Node 18
    //

    // /* istanbul ignore next */
    // private async getUserInfo(_token: string): Promise<{ name: string; email: string }>
    // {
    //     const response = await fetch(`https://${TEAUTH_DOMAIN}/userinfo`, {
    //         headers: {
    //             // eslint-disable-next-line @typescript-eslint/naming-convention
    //             Authorization: `Bearer ${token}`
    //         }
    //     });
    //     return response.json() as Promise<{ name: string; email: string }>;
    //     return { name: "Test", email: "test@spmeesseman.com" };
    // }

	// private validateLicenseFetch = async(licenseKey: string, logPad: string) =>
	// {
	// 	const res = await fetch(Uri.joinPath(this.host, this.authApiEndpoint).toString(),
	// 	{
	// 		method: "POST",
	// 		agent: getProxyAgent(),
	// 		headers: {
	// 			// "Authorization": `Bearer ${codeSession.token}`,
	// 			"Authorization": `Bearer ${this.token}`,
	// 			"User-Agent": "VSCode-TaskExplorer",
	// 			"Content-Type": "application/json",
	// 		},
	// 		body: JSON.stringify(
	// 		{
	// 			licensekey: licenseKey,
	// 			appid: env.machineId,
	// 			appname: "vscode-taskexplorer-prod",
	// 			ip: "*"
	// 		}),
	// 	});

	// 	let licensed = true;
	// 	try
	// 	{   const jso = JSON.parse(res.body);
	// 		licensed = res.ok && jso.success && jso.message === "Success";
	// 		this.logServerResponse(res, jso, res.data, logPad);
	// 		jso.token = licenseKey;
	// 		await this.setLicenseKeyFromRsp(licensed, jso, logPad);
	// 	}
	// 	catch (e) {
	// 		/* istanbul ignore next*/
	// 		this.onServerError(e, "validate", logPad, res.data);
	// 	}
	// 	finally {
	// 		this.busy = false;
	// 	}
	// 	log.methodDone("validate license", 1, logPad, [[ "is valid license", licensed ]]);
	// };

}
