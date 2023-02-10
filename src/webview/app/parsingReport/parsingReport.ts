
import "./parsing-report.css";
import "../common/css/fa.css";
import "../common/css/page.css";
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
