
import "./release-notes.css";
import "../common/css/fa.css";
import { State } from "../../common/state";
import { TeWebviewApp } from "../webviewApp";


export class ReleaseNotesWebviewApp extends TeWebviewApp<State>
{
	constructor()
    {
		super("ReleaseNotesWebviewApp");
	}
}

new ReleaseNotesWebviewApp();
