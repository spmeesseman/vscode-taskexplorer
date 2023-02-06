
// import type { Commands, ContextKeys } from "../constants";
// import type { Container } from "../container";
// import { setContext } from "../context";
// import { executeCommand, registerCommand } from "../system/command";
// import { serialize } from "../system/decorators/serialize";
import { TeWebviewBase } from "./base";
import { setContext } from "../lib/context";
import { TeContainer } from "../lib/container";
import { registerCommand } from "../lib/command";
import { Commands, ContextKeys } from "../lib/constants";
import type { WebviewFocusChangedParams } from "./protocol";
import type { TrackedUsageFeatures } from "../lib/watcher/usageWatcher";
import {
    WebviewOptions, WebviewPanel, WebviewPanelOnDidChangeViewStateEvent, WebviewPanelOptions, WindowState,
    Disposable, Uri, ViewColumn, window
} from "vscode";

export type WebviewIds = "taskCount" | "license" | "releaseNotes";


export abstract class TeWebviewPanel2<State> extends TeWebviewBase<State> implements Disposable
{
	protected readonly disposables: Disposable[] = [];
	private _disposablePanel: Disposable | undefined;
	protected override _view: WebviewPanel | undefined;


	constructor(container: TeContainer,
				fileName: string,
				title: string,
				private readonly iconPath: string,
				public readonly id: `gitlens.${WebviewIds}`,
				private readonly contextKeyPrefix: `${ContextKeys.WebviewPrefix}${WebviewIds}`,
				private readonly trackingFeature: TrackedUsageFeatures,
				showCommand: Commands)
	{
		super(container, title, fileName);
		this.disposables.push(registerCommand(showCommand, this.onShowCommand, this));
	}


	dispose()
	{
		this.disposables.forEach(d => void d.dispose());
		this._disposablePanel?.dispose();
	}


	protected get options(): WebviewPanelOptions & WebviewOptions
	{
		return {
			retainContextWhenHidden: true,
			enableFindWidget: true,
			enableCommandUris: true,
			enableScripts: true,
			localResourceRoots: [ Uri.joinPath(this.container.context.extensionUri, "res") ]
		};
	}


	hide()
	{
		this._view?.dispose();
	}


	async show(options?: { column?: ViewColumn; preserveFocus?: boolean }, ..._args: unknown[]): Promise<void>
	{
		void this.container.usage.track(`${this.trackingFeature}:shown`);

		const column = options?.column ?? ViewColumn.One; // ViewColumn.Beside;
		// Only try to open beside if there is an active tab
		// if (column === ViewColumn.Beside && !window.tabGroups.activeTabGroup.activeTab) {
		// 	column = ViewColumn.Active;
		// }

		if (!this._view)
		{
			this._view = window.createWebviewPanel(
				this.id,
				this.title,
				{
					viewColumn: column,
					preserveFocus: options?.preserveFocus ?? false
				},
				this.options
			);

			this._view.iconPath = Uri.file(this.container.context.asAbsolutePath(this.iconPath));
			this._disposablePanel = Disposable.from(
				this._view,
				this._view.onDidDispose(this.onPanelDisposed, this),
				this._view.onDidChangeViewState(this.onViewStateChanged, this),
				this._view.webview.onDidReceiveMessage(this.onMessageReceivedCore, this),
				...(this.onInitializing?.() ?? []),
				...(this.registerCommands?.() ?? []),
				window.onDidChangeWindowState(this.onWindowStateChanged, this),
			);

			this._view.webview.html = await this.getHtml(this._view.webview);
		}
		else {
			await this.refresh(true);
			this._view.reveal(this._view.viewColumn ?? ViewColumn.Active, options?.preserveFocus ?? false);
		}
	}


	private onWindowStateChanged(e: WindowState) {
		if (!this.visible) return;

		this.onWindowFocusChanged?.(e.focused);
	}


	private resetContextKeys()
	{
		void setContext(`${this.contextKeyPrefix}:inputFocus`, false);
		void setContext(`${this.contextKeyPrefix}:focus`, false);
		void setContext(`${this.contextKeyPrefix}:active`, false);
	}


	private setContextKeys(active: boolean | undefined, focus?: boolean, inputFocus?: boolean)
	{
		if (!active)
		{
			void setContext(`${this.contextKeyPrefix}:active`, active);
			if (!active) {
				focus = false;
				inputFocus = false;
			}
		}
		if (!focus) {
			void setContext(`${this.contextKeyPrefix}:focus`, focus);
		}
		if (!inputFocus) {
			void setContext(`${this.contextKeyPrefix}:inputFocus`, inputFocus);
		}
	}


	private onPanelDisposed()
    {
		this.resetContextKeys();

		this.onActiveChanged?.(false);
		this.onFocusChanged?.(false);
		this.onVisibilityChanged?.(false);

		this.isReady = false;
		this._disposablePanel?.dispose();
		this._disposablePanel = undefined;
		this._view = undefined;
	}


	protected onShowCommand(...args: unknown[])
    {
		void this.show(undefined, ...args);
	}


	protected onViewFocusChanged(e: WebviewFocusChangedParams)
	{
		this.setContextKeys(undefined, e.focused, e.inputFocused);
		this.onFocusChanged?.(e.focused);
	}


	protected onViewStateChanged(e: WebviewPanelOnDidChangeViewStateEvent)
	{
		const { active, visible } = e.webviewPanel;
		if (visible) {
			this.setContextKeys(active);
			this.onActiveChanged?.(active);
			if (!active) {
				this.onFocusChanged?.(false);
			}
		} else {
			this.resetContextKeys();

			this.onActiveChanged?.(false);
			this.onFocusChanged?.(false);
		}

		this.onVisibilityChanged?.(visible);
	}

}
