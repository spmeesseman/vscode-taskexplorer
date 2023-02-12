
import { TeWrapper } from "../lib/wrapper";
import { TeWebviewBase } from "./webviewBase";
import { isObject, timeout } from "../lib/utils/utils";
import { ContextKeys, setContext } from "../lib/context";
import { Commands, registerCommand } from "../lib/command";
import type { WebviewFocusChangedParams } from "./common/ipc";
import type { TrackedUsageFeatures } from "../lib/watcher/usageWatcher";
import {
    WebviewOptions, WebviewPanel, WebviewPanelOnDidChangeViewStateEvent, WebviewPanelOptions, WindowState,
    Disposable, Uri, ViewColumn, window, WebviewPanelSerializer
} from "vscode";

export type WebviewIds = "parsingReport" | "licensePage" | "releaseNotes";


export abstract class TeWebviewPanel<State> extends TeWebviewBase<State> implements Disposable
{
	protected readonly disposables: Disposable[] = [];
	private _disposablePanel: Disposable | undefined;
	protected override _view: WebviewPanel | undefined;


	constructor(container: TeWrapper,
				fileName: string,
				title: string,
				private readonly iconPath: string,
				public readonly id: `taskExplorer.${WebviewIds}`,
				private readonly contextKeyPrefix: `${ContextKeys.WebviewPrefix}${WebviewIds}`,
				private readonly trackingFeature: TrackedUsageFeatures,
				showCommand: Commands)
	{
		super(container, title, fileName);
		this.disposables.push(
			registerCommand(showCommand, this.onShowCommand, this),
			window.registerWebviewPanelSerializer(id, this._serializer)
		);
	}


	dispose()
	{
		this.disposables.forEach(d => void d.dispose());
		this._disposablePanel?.dispose();
	}


	private _serializer: WebviewPanelSerializer =
	{
		deserializeWebviewPanel: async(webviewPanel: WebviewPanel, state: State) =>
		{
			await this.show(undefined, webviewPanel, state);
		}
	};


	get serializer() {
		return this._serializer;
	}


	protected get options(): WebviewPanelOptions & WebviewOptions
	{
		return {
			retainContextWhenHidden: true,
			enableFindWidget: true,
			enableCommandUris: true,
			enableScripts: true,
			localResourceRoots: [ Uri.joinPath(this.wrapper.context.extensionUri, "res") ]
		};
	}


	hide()
	{
		this._view?.dispose();
	}


	async show(options?: { column?: ViewColumn; preserveFocus?: boolean }, ...args: any[])
	{
		void this.wrapper.usage.track(`${this.trackingFeature}:shown`);

		while (this.wrapper.busy) {
			await timeout(100);
		}

		const column = options?.column ?? ViewColumn.One; // ViewColumn.Beside;
		// Only try to open beside if there is an active tab
		// if (column === ViewColumn.Beside && !window.tabGroups.activeTabGroup.activeTab) {
		// 	column = ViewColumn.Active;
		// }

		if (!this._view)
		{
			if (args.length === 2 && isObject(args[0]) && args[0].webview)
			{
				this._view = args[0] as WebviewPanel;
				// State = args[1],.... still don't know wtf to do with 'State'.
				args.splice(0, 2);
			}
			else
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
			}

			this._view.iconPath = Uri.file(this.wrapper.context.asAbsolutePath(this.iconPath));
			this._disposablePanel = Disposable.from(
				this._view,
				this._view.onDidDispose(this.onPanelDisposed, this),
				this._view.onDidChangeViewState(this.onViewStateChanged, this),
				this._view.webview.onDidReceiveMessage(this.onMessageReceivedCore, this),
				...(this.onInitializing?.() ?? []),
				...(this.registerCommands?.() ?? []),
				window.onDidChangeWindowState(this.onWindowStateChanged, this),
			);

			this._view.webview.html = await this.getHtml(this._view.webview, ...args);
		}
		else {
			await this.refresh(true, ...args);
			this._view.reveal(this._view.viewColumn ?? ViewColumn.Active, options?.preserveFocus ?? false);
		}

		return this;
	}


	private onWindowStateChanged(e: WindowState)
	{
		if (this.visible) {
			this.onWindowFocusChanged?.(e.focused);
		}
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
		this._isReady = false;
		this._disposablePanel?.dispose();
		this._disposablePanel = undefined;
		this._view = undefined;
	}


	protected onShowCommand(...args: unknown[])
    {
		return this.show(undefined, ...args);
	}


	protected onViewFocusChanged(e: WebviewFocusChangedParams)
	{
		this.setContextKeys(undefined, e.focused, e.inputFocused);
		this.onFocusChanged?.(e.focused);
	}


	protected onViewStateChanged(e: WebviewPanelOnDidChangeViewStateEvent)
	{
		const { active, visible } = e.webviewPanel;
		if (visible)
		{
			this.setContextKeys(active);
			this.onActiveChanged?.(active);
			if (!active) {
				this.onFocusChanged?.(false);
			}
		}
		else {
			this.resetContextKeys();
			this.onActiveChanged?.(false);
			this.onFocusChanged?.(false);
		}
		this.onVisibilityChanged?.(visible);
	}


	protected override _onHtmlPreview = async(html: string, ...args: unknown[]) =>
	{
		return this.onHtmlPreview(html.replace(/\#\{title\}/g,
`<table><tr>
<td class="content-img">
	<img class="te-icon" src="#{webroot}/img/logo-bl.png" />
</td>
<td class="content-title"> &nbsp;#{title}</td>
</tr></table>`), ...args);
	};

}
