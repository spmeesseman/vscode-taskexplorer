
import "../common/css/vscode.css";
import "./welcome.css";
import { State } from "../../common/state";
import { TeWebviewApp } from "../webviewApp";


export class WelcomeWebviewApp extends TeWebviewApp<State>
{
	constructor()
    {
		super("WelcomeWebviewApp");
	}
}

new WelcomeWebviewApp();
