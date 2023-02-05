
import log from "../lib/log/log";
import { TextDecoder } from "util";
import WebviewManager from "./webViewManager";
import { getExtensionContext } from "../extension";
import {
	CancellationToken, Webview, WebviewView, WebviewViewProvider, WebviewViewResolveContext,
	WindowState, Disposable, Uri, window, workspace, commands
} from "vscode";

const maxSmallIntegerV8 = 2 ** 30; // Max number that can be stored in V8's smis (small integers)

let ipcSequence = 0;

const nextIpcId = () =>
{
	if (ipcSequence === maxSmallIntegerV8) {
		ipcSequence = 1;
	} else {
		ipcSequence++;
	}

	return `host:${ipcSequence}`;
};

export type WebviewViewIds = "home" | "taskCount";


export abstract class TeWebviewView<State, SerializedState = State> implements WebviewViewProvider, Disposable
{
	protected readonly disposables: Disposable[] = [];
	protected isReady = false;
	private _title: string;
	private _disposableView: Disposable | undefined;
	protected _view: WebviewView | undefined;

	constructor(public readonly id: `vscode-taskexplorer.${WebviewViewIds}`, protected readonly fileName: string, title: string)
	{
		this._title = title;
		this.disposables.push(window.registerWebviewViewProvider(id, this));
	}

	dispose()
	{
		this.disposables.forEach(d => void d.dispose());
		this._disposableView?.dispose();
	}

	get description(): string | undefined
	{
		return this._view?.description;
	}

	set description(description: string | undefined)
	{
		if (!this._view) return;
		this._view.description = description;
	}

	get title(): string
	{
		return this._view?.title ?? this._title;
	}

	set title(title: string)
	{
		this._title = title;
		if (!this._view) return;
		this._view.title = title;
	}

	get visible()
	{
		return this._view?.visible ?? false;
	}

	async show(options?: { preserveFocus?: boolean })
	{
		try {
			void (await commands.executeCommand(`${this.id}.focus`, options));
		}
		catch (ex) {
			log.error(ex);
		}
	}

	private readonly _cspNonce = WebviewManager.getNonce();
	protected get cspNonce(): string {
		return this._cspNonce;
	}

	protected onInitializing?(): Disposable[] | undefined;
	protected onReady?(): void;
	protected onMessageReceived?(e: any): void;
	protected onFocusChanged?(focused: boolean): void;
	protected onVisibilityChanged?(visible: boolean): void;
	protected onWindowFocusChanged?(focused: boolean): void;
	protected registerCommands?(): Disposable[];
	protected includeBootstrap?(): SerializedState | Promise<SerializedState>;
	protected includeHead?(): string | Promise<string>;
	protected includeBody?(): string | Promise<string>;
	protected includeEndOfBody?(): string | Promise<string>;


	async resolveWebviewView(webviewView: WebviewView, _context: WebviewViewResolveContext, _token: CancellationToken): Promise<void>
	{
		this._view = webviewView;

		webviewView.webview.options = {
			enableCommandUris: true,
			enableScripts: true,
		};

		webviewView.title = this._title;

		this._disposableView = Disposable.from(
			this._view.onDidDispose(this.onViewDisposed, this),
			this._view.onDidChangeVisibility(() => this.onViewVisibilityChanged(this.visible), this),
			this._view.webview.onDidReceiveMessage(this.onMessageReceivedCore, this),
			window.onDidChangeWindowState(this.onWindowStateChanged, this),
			...(this.onInitializing?.() ?? []),
			...(this.registerCommands?.() ?? []),
		);

		await this.refresh();
		this.onVisibilityChanged?.(true);
	}


	protected async refresh(force?: boolean): Promise<void>
	{
		if (!this._view) return;

		// Mark the webview as not ready, until we know if we are changing the html
		this.isReady = false;
		const html = await this.getHtml(this._view.webview);
		if (force) {
			// Reset the html to get the webview to reload
			this._view.webview.html = "";
		}

		// If we aren't changing the html, mark the webview as ready again
		if (this._view.webview.html === html) {
			this.isReady = true;
			return;
		}

		this._view.webview.html = html;
	}


	private onViewDisposed()
	{
		this.onFocusChanged?.(false);
		this.onVisibilityChanged?.(false);

		this.isReady = false;
		this._disposableView?.dispose();
		this._disposableView = undefined;
		this._view = undefined;
	}


	protected onViewFocusChanged(e: any): void
	{
		this.onFocusChanged?.(e.focused);
	}


	private async onViewVisibilityChanged(visible: boolean)
	{
		if (visible)
		{
			await this.refresh();
		}
		else {
			this.onFocusChanged?.(false);
		}
		this.onVisibilityChanged?.(visible);
	}


	private onWindowStateChanged(e: WindowState)
	{
		if (!this.visible) return;

		this.onWindowFocusChanged?.(e.focused);
	}


	private onMessageReceivedCore(e: any)
	{
		if (!e) return;

		switch (e.method)
		{

			default:
				this.onMessageReceived?.(e);
				break;
		}
	}


	protected getWebRoot()
	{
		if (!this._view) return;

		const webRootUri = Uri.joinPath(getExtensionContext().extensionUri, "dist", "webviews");
		const webRoot = this._view.webview.asWebviewUri(webRootUri).toString();

		return webRoot;
	}


	private async getHtml(webview: Webview): Promise<string>
	{
		const context = getExtensionContext();
		const webRootUri = Uri.joinPath(context.extensionUri, "dist", "webviews");
		const uri = Uri.joinPath(webRootUri, this.fileName);
		const content = new TextDecoder("utf8").decode(await workspace.fs.readFile(uri));

		const [ bootstrap, head, body, endOfBody ] = await Promise.all([
			this.includeBootstrap?.(),
			this.includeHead?.(),
			this.includeBody?.(),
			this.includeEndOfBody?.(),
		]);

		const cspSource = webview.cspSource;

		const root = webview.asWebviewUri(context.extensionUri).toString();
		const webRoot = webview.asWebviewUri(webRootUri).toString();

		const html = content.replace(
			/#{(head|body|endOfBody|placement|cspSource|cspNonce|root|webroot)}/g,
			(_substring: string, token: string) => {
				switch (token) {
					case "head":
						return head ?? "";
					case "body":
						return body ?? "";
					case "endOfBody":
						return `${
							bootstrap
								? `<script type="text/javascript" nonce="${
										this.cspNonce
								  }">window.bootstrap=${JSON.stringify(bootstrap)};</script>`
								: ""
						}${endOfBody ?? ""}`;
					case "placement":
						return "view";
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
			},
		);

		return html;
	}


	protected nextIpcId(): string
	{
		return nextIpcId();
	}


	protected postMessage(message: any)
	{
		if (!this._view || !this.isReady) return Promise.resolve(false);
		//
		// It looks like there is a bug where `postMessage` can sometimes just hang infinitely. Not sure why, but ensure we don't hang
		//
		return Promise.race<boolean>(
		[
			this._view.webview.postMessage(message),
			new Promise<boolean>(resolve => setTimeout(resolve, 5000, false)),
		]);
	}

}
