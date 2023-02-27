
import "../common/css/vscode.css";
import "./task-count.css";

import { State } from "../../common/ipc";
import { TeWebviewApp } from "../webviewApp";
// import { ExecuteCommandType } from "../../common/ipc";


export class TaskCountWebviewApp extends TeWebviewApp<State>
{
	constructor()
    {
		super("TaskCountWebviewApp");
	}

	//
	// TODO - Add clickactions on icons
	//
	// protected override onDataActionClicked(_e: MouseEvent, target: HTMLElement)
    // {
	// 	// const action = target.dataset.action;
	// 	// if (action) {
	// 	// 	this.sendCommand(ExecuteCommandType, { command: action.slice(8) });
	// 	// }
	// }
}

new TaskCountWebviewApp();
