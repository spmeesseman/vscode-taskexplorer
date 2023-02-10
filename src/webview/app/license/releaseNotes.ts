
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
