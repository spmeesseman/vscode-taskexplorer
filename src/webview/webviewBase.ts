
/**
 * @class TeWebviewBase
 *
 * Credits to the author of the Gitlens extension for the webview/webpanel encapsulation
 * concepts that got my praise and thus used in Task Explorer as a starting point.
 */

import { TextDecoder } from "util";
// import { getNonce } from "@env/crypto";
import { TeWrapper } from "../lib/wrapper";
import { getNonce } from "../lib/env/node/crypto";
import { Commands, executeCommand } from "../lib/command";
import { Disposable, Uri, Webview, WebviewPanel, WebviewView, workspace } from "vscode";
import {
	ExecuteCommandType, IpcMessage, IpcMessageParams, IpcNotificationType, onIpc,
	WebviewFocusChangedCommandType, WebviewFocusChangedParams, WebviewReadyCommandType
} from "./common/ipc";


export abstract class TeWebviewBase<State>
{
    abstract show(options?: any, ..._args: unknown[]): Promise<TeWebviewBase<any>>;
    protected abstract onViewFocusChanged(e: WebviewFocusChangedParams): void;

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

	protected _isReady = false;
	protected _view: WebviewView | WebviewPanel | undefined;

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


	get isFirstLoadComplete() {
		return this._isFirstLoadComplete;
	}

	get title() {
		return this._view?.title ?? this._title;
	}

	set title(title: string)
	{
		this._title = title;
		if (!this._view) return;
		this._view.title = title;
	}

	get originalTitle() {
		return this._originalTitle;
	}

	get view() {
		return this._view;
	}

	get visible() {
		return this._view?.visible ?? false;
	}


	protected async getHtml(webview: Webview, ...args: unknown[])
	{
		const webRootUri = Uri.joinPath(this.wrapper.context.extensionUri, "res"),
			  uri = Uri.joinPath(webRootUri, "page", this.fileName),
			  content = new TextDecoder("utf8").decode(await workspace.fs.readFile(uri)),
			  cspSource = webview.cspSource,
			  webRoot = webview.asWebviewUri(webRootUri).toString();

		const [ bootstrap, head, body, endOfBody ] = await Promise.all([
			this.includeBootstrap?.(),
			this.includeHead?.(),
			this.includeBody?.(),
			this.includeEndOfBody?.(),
		]);

		let html = content;
		html = await this._onHtmlPreview(content, ...args);

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
						return `${bootstrap ? `<script type="text/javascript" nonce="${this._cspNonce}">window.bootstrap=${JSON.stringify(bootstrap)};</script>` : ""}${endOfBody ?? ""}`;
					case "placement":
						return "editor";
					case "cspSource":
						return cspSource;
					case "cspNonce":
						return this._cspNonce;
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
		return this._onHtmlFinalize(html, ...args);
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


	protected onHtmlPreview = async(html: string, ...args: unknown[]): Promise<string> => html;


	protected onHtmlFinalize = async(html: string, ...args: unknown[]): Promise<string> => html;


	protected _onHtmlPreview = async(html: string, ...args: unknown[]): Promise<string> => this.onHtmlPreview(html, ...args);


	protected _onHtmlFinalize = async(html: string, ...args: unknown[]): Promise<string> => this.onHtmlFinalize(html, ...args);


	protected onMessageReceivedCore(e: IpcMessage)
	{
		if (!e) return;

		switch (e.method)
		{
			case WebviewReadyCommandType.method:
				onIpc(WebviewReadyCommandType, e, () =>
				{
					this._isReady = true;
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
		if (!this._view || !this._isReady || !this.visible) return Promise.resolve(false);
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


	protected async refresh(force?: boolean, ...args: unknown[])
    {
		if (!this._view) return;
		this._isReady = false;
		const html = await this.getHtml(this._view.webview, ...args);
		if (force) {
			this._view.webview.html = "";
		}
		if (this._view.webview.html === html) {
			this._isReady = true;
			return;
		}
		this._view.webview.html = html;
	}

}
