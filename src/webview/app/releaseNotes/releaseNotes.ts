
import "../common/css/vscode.css";
import "../common/css/page.css";
import "../common/scss/page.scss";
import "./release-notes.css";

import { TeWebviewApp } from "../webviewApp";
import { Disposable, DOM } from "../common/dom";
import { IpcExecCommand, State } from "../../common/ipc";
// import { provideVSCodeDesignSystem, vsCodeButton } from "@vscode/webview-ui-toolkit";


export class ReleaseNotesWebviewApp extends TeWebviewApp<State>
{
	constructor()
    {
		super("ReleaseNotesWebviewApp");
	}


	protected override onInitialize()
    {
		// provideVSCodeDesignSystem().register(vsCodeButton());
	}


    protected override onBind(): Disposable[]
    {
		const disposables = super.onBind?.() ?? [];
		disposables.push(
			DOM.on("[id=btnToggleReleaseNotes]", "click", (_e: MouseEvent, element: HTMLElement) => this.toggle(element)),
		);
		return disposables;
    }


	protected override onDataActionClicked(_e: MouseEvent, target: HTMLElement)
    {
		const action = target.dataset.action;
		if (action) {
			this.sendCommand(IpcExecCommand, { command: action.slice(8) });
		}
	}


	private toggle = (element: HTMLElement) =>
	{
		const x = document.getElementById("releaseNotesDiv") as HTMLElement;
		const showing = x.classList.toggle("is-show");
		element.classList.remove(!showing ? "fa-chevron-circle-down" : "fa-chevron-circle-up");
		element.classList.add(!showing ? "fa-chevron-circle-up" : "fa-chevron-circle-down");
	};

}


new ReleaseNotesWebviewApp();
