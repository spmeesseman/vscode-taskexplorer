
import "./release-notes.css";
import "../common/css/fa.css";
import { State } from "../../common/state";
import { TeWebviewApp } from "../webviewApp";
import { Disposable, DOM } from "../common/dom";


export class ReleaseNotesWebviewApp extends TeWebviewApp<State>
{
	constructor()
    {
		super("ReleaseNotesWebviewApp");
	}


    protected override onBind(): Disposable[]
    {
		const disposables = super.onBind?.() ?? [];
		disposables.push(
			DOM.on("btnViewReleaseNotes", "click", (_e: MouseEvent, element: HTMLElement) => this.toggle(element)),
		);
		return disposables;
    }


	private toggle = (element: HTMLElement) =>
	{
		const x = document.getElementById("releaseNotesDiv");
		const showing = element.classList.toggle("is-show");
		element.classList.remove(!showing ? "fa-chevron-down" : "fa-chevron-up");
		element.classList.add(!showing ? "fa-chevron-up" : "fa-chevron-down");
	};

}


new ReleaseNotesWebviewApp();
