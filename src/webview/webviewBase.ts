
import WebviewManager from "./webViewManager";
import { TextDecoder } from "util";
// import { getNonce } from "@env/crypto";
import { TeContainer } from "../lib/container";
import { getNonce } from "../lib/env/node/crypto";
import { Disposable, Uri, Webview, WebviewPanel, WebviewPanelOnDidChangeViewStateEvent, WebviewView, workspace } from "vscode";
import { ExecuteCommandType, IpcMessage, IpcMessageParams, IpcNotificationType, onIpc, WebviewFocusChangedCommandType, WebviewFocusChangedParams, WebviewReadyCommandType } from "./protocol";
import { executeCommand } from "../lib/command";
import { Commands } from "../lib/constants";


export abstract class TeWebviewBase<State>
{
    abstract hide(): void;
    abstract show(options?: any, ..._args: unknown[]): Promise<TeWebviewBase<any>>;
    protected abstract onViewFocusChanged(e: WebviewFocusChangedParams): void;
	protected abstract onViewStateChanged(e: WebviewPanelOnDidChangeViewStateEvent): void;

	protected isReady = false;
	protected _view: WebviewView | WebviewPanel | undefined;
	protected onReady?(): void;
	protected onMessageReceived?(e: IpcMessage): void;
	protected onActiveChanged?(active: boolean): void;
	protected onFocusChanged?(focused: boolean): void;
	protected onVisibilityChanged?(visible: boolean): void;
	protected onWindowFocusChanged?(focused: boolean): void;
	protected registerCommands?(): Disposable[];
	protected includeBootstrap?(): any;
	protected includeHead?(): string | Promise<string>;
	protected includeBody?(): string | Promise<string>;
	protected includeEndOfBody?(): string | Promise<string>;


	private readonly _cspNonce = getNonce();
	private _title: string;	protected onInitializing?(): Disposable[] | undefined;
	private _originalTitle: string | undefined;


    constructor(protected readonly container: TeContainer, title: string, protected readonly fileName: string)
    {
		this._title = title;
		this._originalTitle = title;
    }


	protected nextIpcId = () => WebviewManager.nextIpcId();


	protected get cspNonce()
	{
		return this._cspNonce;
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


	protected getWebRoot()
	{
		if (!this._view) return;
		const webRootUri = Uri.joinPath(this.container.context.extensionUri, "dist", "webviews");
		return this._view.webview.asWebviewUri(webRootUri).toString();
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

        let html = content.replace(/\[webview\.cspSource\]/g, cspSource)
                          .replace(/\[webview\.cssDir\]/g, cssUri.toString())
                          .replace(/\[webview\.jsDir\]/g, jsUri.toString())
                          .replace(/\[webview\.pageDir\]/g, pageUri.toString())
                          .replace(/\[webview\.resourceDir\]/g, resourceDirUri.toString())
                          .replace(/\[webview\.sourceImgDir\]/g, sourceImgDirUri.toString())
                          .replace(/\[webview\.nonce\]/g, WebviewManager.getNonce());

		html = html.replace(/#{(head|body|endOfBody|placement|cspSource|cspNonce|root|webroot)}/g, (_s: string, token: string) =>
        {
            switch (token) {
                case "head":
                    return head ?? "";
                case "body":
                    return body ?? "";
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
                case "webroot":
                    return webRoot;
                default:
                    return "";
            }
        });

		return this.finalizeHtml(html, ...args);
	}


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


	protected postMessage(message: IpcMessage)
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
