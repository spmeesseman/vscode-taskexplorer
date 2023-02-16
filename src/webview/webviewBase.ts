
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
import { Disposable, EventEmitter, Uri, Webview, WebviewPanel, WebviewView, workspace } from "vscode";
import {
	ExecuteCommandType, IpcMessage, IpcMessageParams, IpcNotificationType, onIpc, LogWriteCommandType,
	WebviewFocusChangedCommandType, WebviewFocusChangedParams, WebviewReadyCommandType
} from "./common/ipc";


export abstract class TeWebviewBase<State> implements Disposable
{
	protected readonly disposables: Disposable[] = [];

    abstract show(options?: any, ..._args: unknown[]): Promise<TeWebviewBase<any>>;
    protected onViewFocusChanged?(e: WebviewFocusChangedParams): void;

	protected includeBootstrap?(...args: unknown[]): any;
	protected includeBody?(...args: unknown[]): string | Promise<string>;
	protected includeEndOfBody?(...args: unknown[]): string | Promise<string>;
	protected includeHead?(...args: unknown[]): string | Promise<string>;
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

	private _onContentLoaded: EventEmitter<string> = new EventEmitter<string>();
	get onContentLoaded() {
		return this._onContentLoaded.event;
	}

	private _onReadyReceived: EventEmitter<void> = new EventEmitter<void>();
	get onReadyReceived() {
		return this._onReadyReceived.event;
	}


    constructor(protected readonly wrapper: TeWrapper, title: string, protected readonly fileName: string)
    {
		this._title = title;
		this._originalTitle = title;
		this.disposables.push(this._onContentLoaded);
    }


	dispose()
	{
		this.disposables.forEach(d => void d.dispose());
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
			this.includeBootstrap?.(...args),
			this.includeHead?.(...args),
			this.includeBody?.(...args),
			this.includeEndOfBody?.(...args),
		]);

		let html = content;
		html = await this.onHtmlPreviewCore(content, ...args);

		const repl = (h: string) =>
		{
			h = h.replace(/#{(head|body|endOfBody|cspSource|cspNonce|title|version|webroot)}/g, (_s: string, token: string) =>
			{
				switch (token)
				{
					case "head":
						return repl(head ?? "");
					case "body":
						return repl(body ?? "");
					case "endOfBody":
						return `${bootstrap ? `<script type="text/javascript" nonce="${this._cspNonce}">window.bootstrap=${JSON.stringify(bootstrap)};</script>` : ""}${endOfBody ?? ""}`;
					case "cspSource":
						return cspSource;
					case "cspNonce":
						return this._cspNonce;
					case "title":
						return this.title;
					case "version":
						return this.wrapper.version;
					default: // case "webroot":
						return webRoot;
				}
			});
			return h;
		};

		html = repl(html);

		this._isFirstLoadComplete = true;
		return this.onHtmlFinalizeCore(html, ...args);
	}


    private nextIpcId  = () =>
    {
		/* istanbul ignore if */
        if (this.ipcSequence === this.maxSmallIntegerV8)
        {
            this.ipcSequence = 1;
        }
        else {
            this.ipcSequence++;
        }
	    return `host:${this.ipcSequence}`;
    };


	notify<T extends IpcNotificationType<any>>(type: T, params: IpcMessageParams<T>, completionId?: string)
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


	protected onHtmlPreviewCore = async(html: string, ...args: unknown[]): Promise<string> => this.onHtmlPreview(html, ...args);


	protected onHtmlFinalizeCore = async(html: string, ...args: unknown[]): Promise<string> => this.onHtmlFinalize(html, ...args);


	protected onMessageReceivedCore(e: IpcMessage)
	{
		switch (e.method)
		{
			case WebviewReadyCommandType.method:
				onIpc(WebviewReadyCommandType, e, () => { this._isReady = true; this.onReady?.(); this._onReadyReceived.fire(); });
				break;

			// case WebviewFocusChangedCommandType.method:
			// 	onIpc(WebviewFocusChangedCommandType, e, params => this.onViewFocusChanged(params));
			// 	break;

			case ExecuteCommandType.method:
				onIpc(ExecuteCommandType, e, params =>
				{
					if (params.args) {
						void executeCommand(params.command as Commands, ...params.args);
					}
					else { void executeCommand(params.command as Commands); }
				});
				break;

			case LogWriteCommandType.method:
				onIpc(LogWriteCommandType, e, params => this.wrapper.log.write("[WEBVIEW]: " + params.message, 1));
				break;

			default:
				this.onMessageReceived?.(e);
				break;
		}
	}


	private postMessage(message: IpcMessage)
	{
		if (!this._view || !this._isReady || !this.visible) {
			return Promise.resolve(false);
		}
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
		setTimeout(() => this._onContentLoaded.fire(html), 1);
	}

}
