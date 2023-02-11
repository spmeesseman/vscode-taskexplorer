
import "../common/css/vscode.css";
import "../common/css/page.css";
import "../common/css/fa.css";
import "./parsing-report.css";
import { State } from "../../common/state";
import { TeWebviewApp } from "../webviewApp";
import { ExecuteCommandType } from "../../common/ipc";


export class ParsingReportWebviewApp extends TeWebviewApp<State>
{
	constructor()
    {
		super("ParsingReportWebviewApp");
	}


	protected override onDataActionClicked(_e: MouseEvent, target: HTMLElement)
    {
		const action = target.dataset.action;
		if (action) {
			this.sendCommand(ExecuteCommandType, { command: action.slice(8) });
		}
	}
}

new ParsingReportWebviewApp();
