
import "../common/css/vscode.css";
import "./monitor.css";
import "./monitor.scss";
import "../common/scss/codicons.scss";
import React from "react";
import { State } from "../../common/state";
import { TeWebviewApp } from "../webviewApp";
import { TeReactTaskTimer } from "./cmp/timer";
import { render, unmountComponentAtNode } from "react-dom";
import { IpcMessage, IpcNotificationType } from "../../common/ipc";


class TaskMonitorWebviewApp extends TeWebviewApp<State>
{
    constructor()
    {
		super("TaskMonitorWebviewApp");
	}


    protected override onBind()
    {
		const disposables = super.onBind?.() ?? [];
		this.log(`${this.appName}.onBind`);

		// this.ensureTheming(this.state);

		const root = document.getElementById("root");
		if (root)
        {
			render(
				<TeReactTaskTimer
					state={this.state}
				/>,
				root
			);

			disposables.push({
				dispose: () => unmountComponentAtNode(root),
                // DOM.on(window, 'keyup', e => this.onKeyUp(e))
			});
		}

		return disposables;
	}


	// private onKeyUp(e: KeyboardEvent) {
	// 	if (e.key === 'Enter' || e.key === ' ') {
	// 		const inputFocused = e.composedPath().some(el => (el as HTMLElement).tagName === 'INPUT');
	// 		if (!inputFocused) return;

	// 		const $target = e.target as HTMLElement;
	// 	}
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
		// const themingChanged = this.ensureTheming(state);

		// Avoid calling the base for now, since we aren't using the vscode state
		this.state = state;
		// super.setState(state);

		// this.callback?.(this.state, type, themingChanged);
	}

}

new TaskMonitorWebviewApp();
