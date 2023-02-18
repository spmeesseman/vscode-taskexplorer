
import { ContextKeys } from "../lib/context";
import { TeWrapper } from "../lib/wrapper";
import { timeout } from "../lib/utils/utils";
import { TeWebviewBase } from "./webviewBase";
import { registerCommand } from "../lib/command";
import {
	CancellationToken, WebviewView, WebviewViewProvider, WebviewViewResolveContext,
	WindowState, Disposable, window, commands, Uri
} from "vscode";


export type WebviewViewIds = "home" | "taskCount" | "taskUsage";


export abstract class TeWebviewView<State, SerializedState = State> extends TeWebviewBase<State> implements WebviewViewProvider, Disposable
{
	private _description: string | undefined;
	private _disposableView: Disposable | undefined;
	protected override _view: WebviewView | undefined = undefined;


	constructor(
		wrapper: TeWrapper,
		title: string,
		description: string,
		fileName: string,
		public readonly id: `taskexplorer.view.${WebviewViewIds}`,
		private readonly contextKeyPrefix: `${ContextKeys.WebviewViewPrefix}${WebviewViewIds}`,
		private readonly trackingFeature: string)
	{
		super(wrapper, title, fileName);
		this.description = description;
		this.disposables.push(window.registerWebviewViewProvider(id, this));
	}


	override dispose()
	{
		this._disposableView?.dispose();
		super.dispose();
	}


	get description(): string | undefined
	{
		return this._description;
	}


	set description(description: string | undefined)
	{
		this._description = description;
		if (this._view) {
			this._view.description = description;
		}
	}


	protected override includeBootstrap?(): SerializedState | Promise<SerializedState>;


	async show(options?: { preserveFocus?: boolean })
	{
		while (this.wrapper.busy) {
			/* istanbul ignore next */
			await timeout(100);
		}
		void this.wrapper.usage.track(`${this.trackingFeature}:shown`);
		void (await commands.executeCommand(`${this.id}.focus`, options));
		this.setContextKeys(true, false);
		return this;
	}


	async resolveWebviewView(webviewView: WebviewView, _context: WebviewViewResolveContext, _token: CancellationToken): Promise<void>
	{
		while (this.wrapper.busy) {
			/* istanbul ignore next */
			await timeout(100);
		}

		this._view = webviewView;

		webviewView.webview.options = {
			enableCommandUris: true,
			enableScripts: true,
			localResourceRoots: [ Uri.joinPath(this.wrapper.context.extensionUri, "res") ]
		};

		webviewView.title = this.title;
		webviewView.description = this._description;

		this._disposableView = Disposable.from(
			this._view.onDidDispose(this.onViewDisposed, this),
			this._view.onDidChangeVisibility(() => this.onViewVisibilityChanged(this.visible), this),
			this._view.webview.onDidReceiveMessage(this.onMessageReceivedCore, this),
			window.onDidChangeWindowState(this.onWindowStateChanged, this),
			...(this.onInitializing?.() ?? []),
			...(this.registerCommands?.() ?? []),
			registerCommand(`${this.id}.refresh`, () => this.refresh(), this)
		);

		await this.refresh();
		this.onVisibilityChanged?.(true);
	}


	private resetContextKeys()
	{
		void this.wrapper.contextTe.setContext(`${this.contextKeyPrefix}:inputFocus`, false);
		void this.wrapper.contextTe.setContext(`${this.contextKeyPrefix}:focus`, false);
	}


	private setContextKeys(focus: boolean, inputFocus: boolean)
	{
		void this.wrapper.contextTe.setContext(`${this.contextKeyPrefix}:focus`, focus);
		void this.wrapper.contextTe.setContext(`${this.contextKeyPrefix}:inputFocus`, inputFocus);
	}


	private onViewDisposed()
	{
		this.resetContextKeys();
		this.onFocusChanged?.(false);
		this.onVisibilityChanged?.(false);
		this._isReady = false;
		this._disposableView?.dispose();
		this._disposableView = undefined;
		this._view = undefined;
	}


	// protected onViewFocusChanged(e: WebviewFocusChangedParams): void
	// {
	// 	this.setContextKeys(e.focused, e.inputFocused);
	// 	this.onFocusChanged?.(e.focused);
	// }


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


	/* istanbul ignore next */
	private onWindowStateChanged(e: WindowState)
	{
		if (this.visible) {
			this.onWindowFocusChanged?.(e.focused);
		}
	}

}
