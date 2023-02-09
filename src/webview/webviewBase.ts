
/**
 * @class TeWebviewBase
 *
 * Credits to the author of the Gitlens extension for the webview/webpanel encapsulation
 * concepts that got my praise and thus used in Task Explorer as a starting point.
 */

import { TextDecoder } from "util";
// import { getNonce } from "@env/crypto";
import { Commands } from "../lib/constants";
import { TeWrapper } from "../lib/wrapper";
import { executeCommand } from "../lib/command";
import { getNonce } from "../lib/env/node/crypto";
import { Disposable, Uri, Webview, WebviewPanel, WebviewView, workspace } from "vscode";
import {
	ExecuteCommandType, IpcMessage, IpcMessageParams, IpcNotificationType, onIpc,
	WebviewFocusChangedCommandType, WebviewFocusChangedParams, WebviewReadyCommandType
} from "./shared/ipc";


export abstract class TeWebviewBase<State>
{
    abstract show(options?: any, ..._args: unknown[]): Promise<TeWebviewBase<any>>;
    protected abstract onViewFocusChanged(e: WebviewFocusChangedParams): void;

	protected isReady = false;
	protected _view: WebviewView | WebviewPanel | undefined;
	protected includeBootstrap?(): any;
	protected includeBody?(): string | Promise<string>;
	protected includeEndOfBody?(): string | Promise<string>;
	protected includeHead?(): string | Promise<string>;
	protected onActiveChanged?(active: boolean): void;
	protected onInitializing?(): Disposable[] | undefined;
	protected onFocusChanged?(focused: boolean): void;
	protected onMessageReceived?(e: IpcMessage): void;
	protected onReady?(): void;
	protected onVisibilityChanged?(visible: boolean): void;
	protected onWindowFocusChanged?(focused: boolean): void;
	protected registerCommands?(): Disposable[];

	private readonly _cspNonce = getNonce();
	private _isFirstLoadComplete = false;
	private _title: string;
	private _originalTitle: string | undefined;
    private maxSmallIntegerV8 = 2 ** 30;
    private ipcSequence = 0;


    constructor(protected readonly wrapper: TeWrapper, title: string, protected readonly fileName: string)
    {
		this._title = title;
		this._originalTitle = title;
    }


	private get cspNonce()
	{
		return this._cspNonce;
	}


	get isFirstLoadComplete()
	{
		return this._isFirstLoadComplete;
	}


	get title()
	{
		return this._view?.title ?? this._title;
	}


	set title(title: string)
	{
		this._title = title;
		if (!this._view) return;
		this._view.title = title;
	}


	get originalTitle()
	{
		return this._originalTitle;
	}


	get visible()
	{
		return this._view?.visible ?? false;
	}


	protected async previewHtml(html: string, ...args: unknown[])
	{
		return html;
	}


	protected async finalizeHtml(html: string, ...args: unknown[])
	{
		return html;
	}


	getWebviewPanel = () => this._view;


	protected async getHtml(webview: Webview, ...args: unknown[])
	{
		const webRootUri = Uri.joinPath(this.wrapper.context.extensionUri, "res"),
			  uri = Uri.joinPath(webRootUri, "page", this.fileName),
			  content = new TextDecoder("utf8").decode(await workspace.fs.readFile(uri)),
			  cspSource = webview.cspSource,
			  webRoot = webview.asWebviewUri(webRootUri).toString(),
			  root = webview.asWebviewUri(this.wrapper.context.extensionUri).toString();

		const [ bootstrap, head, body, endOfBody ] = await Promise.all([
			this.includeBootstrap?.(),
			this.includeHead?.(),
			this.includeBody?.(),
			this.includeEndOfBody?.(),
		]);

		let html = await this.previewHtml(content, ...args);
		html = this.onHtml(html);

		const repl = (h: string) =>
		{
			h = h.replace(/#{(head|body|endOfBody|placement|cspSource|cspNonce|title|version|webroot)}/g, (_s: string, token: string) =>
			{
				switch (token)
				{
					case "head":
						return repl(head ?? "");
					case "body":
						return repl(body ?? "");
					case "endOfBody":
						return `${bootstrap ? `<script type="text/javascript" nonce="${this.cspNonce}">window.bootstrap=${JSON.stringify(bootstrap)};</script>` : ""}${endOfBody ?? ""}`;
					case "placement":
						return "editor";
					case "cspSource":
						return cspSource;
					case "cspNonce":
						return this.cspNonce;
					case "root":
						return root;
					case "title":
						return this.title;
					case "version":
						return this.wrapper.version;
					case "webroot":
						return webRoot;
					default:
						return "";
				}
			});
			return h;
		};

		html = repl(html);

		this._isFirstLoadComplete = true;
		return this.finalizeHtml(html, ...args);
	}


    private nextIpcId  = () =>
    {
        if (this.ipcSequence === this.maxSmallIntegerV8)
        {
            this.ipcSequence = 1;
        }
        else {
            this.ipcSequence++;
        }
	    return `host:${this.ipcSequence}`;
    };


	protected notify<T extends IpcNotificationType<any>>(type: T, params: IpcMessageParams<T>, completionId?: string)
	{
		return this.postMessage(
		{
			id: this.nextIpcId(),
			method: type.method,
			params,
			completionId,
		});
	}


	protected onHtml = (html: string) =>
	{
		return html;
	};


	protected onMessageReceivedCore(e: IpcMessage)
	{
		if (!e) return;

		switch (e.method)
		{
			case WebviewReadyCommandType.method:
				onIpc(WebviewReadyCommandType, e, () =>
				{
					this.isReady = true;
					this.onReady?.();
				});
				break;

			case WebviewFocusChangedCommandType.method:
				onIpc(WebviewFocusChangedCommandType, e, params =>
				{
					this.onViewFocusChanged(params);
				});
				break;

			case ExecuteCommandType.method:
				onIpc(ExecuteCommandType, e, params =>
				{
					if (params.args) {
						void executeCommand(params.command as Commands, ...params.args);
					}
					else {
						void executeCommand(params.command as Commands);
					}
				});
				break;

			default:
				this.onMessageReceived?.(e);
				break;
		}
	}


	private postMessage(message: IpcMessage)
	{
		if (!this._view || !this.isReady || !this.visible) return Promise.resolve(false);
		//
		// From GitLens:
		//     It looks like there is a bug where `postMessage` can sometimes just hang infinitely.
		//     Not sure why, but ensure we don't hang
		//
		return Promise.race<boolean>(
		[
			this._view.webview.postMessage(message),
			new Promise<boolean>(resolve => setTimeout(resolve, 5000, false)),
		]);
	}


	protected async refresh(force?: boolean)
    {
		if (!this._view) return;
		this.isReady = false;
		const html = await this.getHtml(this._view.webview);
		if (force) {
			this._view.webview.html = "";
		}
		if (this._view.webview.html === html) {
			this.isReady = true;
			return;
		}
		this._view.webview.html = html;
	}

}