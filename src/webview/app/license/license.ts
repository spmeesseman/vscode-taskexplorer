
import "./page.css";
import "./license.css";
import "../common/css/fa.css";
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
