
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
