
import "../common/css/vscode.css";
import "../common/css/page.css";
import "../common/css/fa.css";
import "./parsing-report.css";
import { State } from "../../common/state";
import { TeWebviewApp } from "../webviewApp";


export class ParsingReportWebviewApp extends TeWebviewApp<State>
{
	constructor()
    {
		super("ParsingReportWebviewApp");
	}
}

new ParsingReportWebviewApp();
