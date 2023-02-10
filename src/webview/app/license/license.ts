
import "../common/css/vscode.css";
import "../common/css/page.css";
import "../common/css/fa.css";
import "./license.css";
import { State } from "../../common/state";
import { TeWebviewApp } from "../webviewApp";


export class LicenseWebviewApp extends TeWebviewApp<State>
{
	constructor()
    {
		super("LicenseWebviewApp");
	}
}

new LicenseWebviewApp();
