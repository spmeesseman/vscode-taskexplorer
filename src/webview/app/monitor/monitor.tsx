
import "../common/css/vscode.css";
import "./monitor.css";
import "./monitor.scss";
import "../common/scss/codicons.scss";
import React from "react";
// eslint-disable-next-line import/extensions
import { createRoot } from "react-dom/client";
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

		// const root = document.getElementById("root");
        const root = createRoot(document.getElementById("root") as HTMLElement);
		if (root)
        {
            root.render(<TeReactTaskTimer state={this.state} />);
			// render(<TeReactTaskTimer state={this.state} />, root);
			disposables.push({
				dispose: () => root.unmount()
				// dispose: () => unmountComponentAtNode(root),
                // DOM.on(window, 'keyup', e => this.onKeyUp(e))
			});
		}

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
		// const themingChanged = this.ensureTheming(state);

		this.state = state;
		// Avoid calling the base for now, since we aren't using the vscode state
		// super.setState(state);

		// this.callback?.(this.state, type, themingChanged);
	}

}

new TaskMonitorWebviewApp();
