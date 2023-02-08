
/**
 * @class TeWebviewBase
 *
 * Credits to the author of the Gitlens extension for the webview/webpanel encapsulation
 * concepts that got my praise and thus used in Task Explorer as a starting point.
 */

import { TextDecoder } from "util";
// import { getNonce } from "@env/crypto";
import { Commands } from "../lib/constants";
import { TeContainer } from "../lib/container";
import { executeCommand } from "../lib/command";
import { getNonce } from "../lib/env/node/crypto";
import { Disposable, Uri, Webview, WebviewPanel, WebviewView, workspace } from "vscode";
import {
	ExecuteCommandType, IpcMessage, IpcMessageParams, IpcNotificationType, onIpc,
	WebviewFocusChangedCommandType, WebviewFocusChangedParams, WebviewReadyCommandType
} from "./ipc";


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


    constructor(protected readonly container: TeContainer, title: string, protected readonly fileName: string)
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
        const resourceDir = Uri.joinPath(this.container.context.extensionUri, "res");
		const webRootUri = Uri.joinPath(this.container.context.extensionUri, "res", "page");
		const uri = Uri.joinPath(webRootUri, this.fileName);
		const content = new TextDecoder("utf8").decode(await workspace.fs.readFile(uri));

		const [ bootstrap, head, body, endOfBody ] = await Promise.all([
			this.includeBootstrap?.(),
			this.includeHead?.(),
			this.includeBody?.(),
			this.includeEndOfBody?.(),
		]);

		const cspSource = webview.cspSource;

		const root = webview.asWebviewUri(this.container.context.extensionUri).toString();
		const webRoot = webview.asWebviewUri(webRootUri).toString();

        const cssDir = Uri.joinPath(resourceDir, "css"),
              jsDir = Uri.joinPath(resourceDir, "js"),
              pageDir = Uri.joinPath(resourceDir, "page"),
              sourceImgDir = Uri.joinPath(resourceDir, "sources"),
              pageUri = webview.asWebviewUri(pageDir),
              cssUri = webview.asWebviewUri(cssDir),
              jsUri = webview.asWebviewUri(jsDir),
              resourceDirUri = webview.asWebviewUri(resourceDir),
              sourceImgDirUri = webview.asWebviewUri(sourceImgDir);

		let html = await this.previewHtml(content, ...args);

		html = html.replace(/#{(head|body|endOfBody|placement|cspSource|cspNonce|root|title|version|webroot)}/g, (_s: string, token: string) =>
        {                                            //
            switch (token)                           // Credits to the author of the Gitlens extension for
			{                                        // this nice little replacer.  And the encapsulation
                case "head":                         // concepts for the webviews/webpanels that get my
                    return head ?? "";               // praise and used in Task Explorer. Made note in top
                case "body":                         // level file comment too.
                    return body ?? "";               //
                case "endOfBody":                    //
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
					return this._title;
				case "version":
					return this.container.version;
                case "webroot":
                    return webRoot;
                default:
                    return "";
            }
        });

        html = html.replace(/\[webview.cssDir\]/g, cssUri.toString())     // Last of the old replacers. Funny how similar
				   .replace(/\[webview.jsDir\]/g, jsUri.toString())       // it was the way I was already doing things as
				   .replace(/\[webview.pageDir\]/g, pageUri.toString())   // compared to the GitLens author.  He just beat
				   .replace(/\[webview.resourceDir\]/g, resourceDirUri.toString())    // me though.
				   .replace(/\[webview.sourceImgDir\]/g, sourceImgDirUri.toString());

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
