
import { DOM } from "./common/dom";
import type { Disposable } from "./common/vscode";
import {
	IpcCommandType, IpcMessage, IpcMessageParams, WebviewFocusChangedParams,
	WebviewFocusChangedCommandType, WebviewReadyCommandType
} from "../shared/ipc";


interface VsCodeApi {
	postMessage(msg: unknown): void;
	setState(state: unknown): void;
	getState(): unknown;
}


declare function acquireVsCodeApi(): VsCodeApi;


const maxSmallIntegerV8 = 2 ** 30; // Max number that can be stored in V8's smis (small integers)
let ipcSequence = 0;
const  nextIpcId = () =>
{
	if (ipcSequence === maxSmallIntegerV8) {
		ipcSequence = 1;
	}
	else {
		ipcSequence++;
	}
	return `webview:${ipcSequence}`;
};


export abstract class TeWebviewApp<State = undefined>
{
	protected onInitialize?(): void;
	protected onBind?(): Disposable[];
	protected onInitialized?(): void;
	protected onMessageReceived?(e: MessageEvent): void;

	private readonly _vscode: VsCodeApi;
	protected state: State;
	private _focused?: boolean;
	private _inputFocused?: boolean;
	private bindDisposables: Disposable[] | undefined;


	constructor(protected readonly appName: string)
	{
		const disposables: Disposable[] = [];
		this.log(`${this.appName}()`);

		this._vscode = acquireVsCodeApi();
		this.state = (window as any).bootstrap;
		(window as any).bootstrap = undefined;

		requestAnimationFrame(() =>
		{
			this.log(`${this.appName}.initializing`);

			try {
				this.onInitialize?.();
				this.initialize();

				if (this.onMessageReceived) {
					disposables.push(DOM.on(window, "message", this.onMessageReceived.bind(this)));
				}

				this.sendCommand(WebviewReadyCommandType, undefined);

				this.onInitialized?.();
			}
			finally {
				if (document.body.classList.contains("preload")) {
					setTimeout(() => {
						document.body.classList.remove("preload");
					}, 500);
				}
			}
		});

		disposables.push(
			DOM.on(window, "pagehide", () => {
				disposables?.forEach(d => d.dispose());
				this.bindDisposables?.forEach(d => d.dispose());
				this.bindDisposables = undefined;
			}),
		);
	}


	protected get vscode() {
		return this._vscode;
	}


	protected initialize()
	{
		this.bindDisposables?.forEach(d => d.dispose());
		this.bindDisposables = this.onBind?.();
		if (!this.bindDisposables) {
			this.bindDisposables = [];
		}

		//
		// GitLens author uses this debounce method here for some reason...  i'm sure it'll
		// smack me in the fac one of these days and I'll find out why
		//
		// const sendWebviewFocusChangedCommand = debounce((params: WebviewFocusChangedParams) => {
		// 	this.sendCommand(WebviewFocusChangedCommandType, params);
		// }, 150);
		const sendWebviewFocusChangedCommand = (p: WebviewFocusChangedParams) => this.sendCommand(WebviewFocusChangedCommandType, p);

		this.bindDisposables.push(
			DOM.on(document, "focusin", e => {
				const inputFocused = e.composedPath().some(el => (el as HTMLElement).tagName === "INPUT");

				if (this._focused !== true || this._inputFocused !== inputFocused) {
					this._focused = true;
					this._inputFocused = inputFocused;
					sendWebviewFocusChangedCommand({ focused: true, inputFocused });
				}
			}),
			DOM.on(document, "focusout", () => {
				if (this._focused !== false || this._inputFocused !== false) {
					this._focused = false;
					this._inputFocused = false;
					sendWebviewFocusChangedCommand({ focused: false, inputFocused: false });
				}
			}),
		);
	}


	protected log = (message: string, ...optionalParams: any[]) => console.log(message, ...optionalParams);


	protected getState = () => this._vscode.getState() as State;


	private postMessage = (e: IpcMessage) => this._vscode.postMessage(e);


	protected sendCommand<TCommand extends IpcCommandType<any>>(command: TCommand, params: IpcMessageParams<TCommand>)
	{
		const id = nextIpcId();
		this.log(`${this.appName}.sendCommand(${id}): name=${command.method}`);
		this.postMessage({ id, method: command.method, params });
	}


	protected setState(state: State)
	{
		this.state = state;
		if (state) {
			this._vscode.setState(state);
		}
	}

}
