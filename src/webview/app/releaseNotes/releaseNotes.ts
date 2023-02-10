
import "./release-notes.css";
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
