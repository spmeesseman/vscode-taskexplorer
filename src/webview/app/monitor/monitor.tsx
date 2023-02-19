
import "../common/css/vscode.css";
import "./monitor.css";
import "./monitor.scss";
import "../common/scss/codicons.scss";
import React from "react";
import { State } from "../../common/state";
import { TeWebviewApp } from "../webviewApp";
import { TeTaskControl } from "./cmp/control";
// eslint-disable-next-line import/extensions
import { createRoot } from "react-dom/client";
import { IpcMessage, IpcNotificationType, UpdateStateCallback } from "../../common/ipc";


class TaskMonitorWebviewApp extends TeWebviewApp<State>
{
    private callback?: UpdateStateCallback;

    constructor()
    {
		super("TaskMonitorWebviewApp");
	}


    protected override onBind()
    {
		const disposables = super.onBind?.() ?? [];
		this.log(`${this.appName}.onBind`);

        const root = createRoot(document.getElementById("root") as HTMLElement);
        root.render(
            <TeTaskControl
                state={this.state}
                subscribe={(callback: UpdateStateCallback) => this.registerEvents(callback)}
            />
        );

        disposables.push({
            dispose: () => root.unmount()
            // DOM.on(window, 'keyup', e => this.onKeyUp(e))
        });

		return disposables;
	}


	// private onKeyUp(e: KeyboardEvent)
    // {
	// 	if (e.key === 'Enter' || e.key === ' ') {
	// 		const inputFocused = e.composedPath().some(el => (el as HTMLElement).tagName === 'INPUT');
	// 		if (inputFocused) {
	// 		   const $target = e.target as HTMLElement;
    //      }
	// 	 }
	// }


	protected override onMessageReceived(e: MessageEvent)
    {
		const msg = e.data as IpcMessage;
		this.log(`${this.appName}.onMessageReceived(${msg.id}): name=${msg.method}`);

		switch (msg.method) {
			default:
				super.onMessageReceived?.(e);
		}
	}


	protected override setState(state: State, type?: IpcNotificationType<any>) // | InternalNotificationType)
    {
		this.log(`${this.appName}.setState`);
		this.state = state;
		// super.setState(state); // Don't call base (for now), not using internally provided vscode state
		this.callback?.(this.state, type);
	}


	private registerEvents(callback: UpdateStateCallback): () => void
    {
		this.callback = callback;
		return () => {
			this.callback = undefined;
		};
	}

}

new TaskMonitorWebviewApp();
