
import "../common/css/vscode.css";
import "../common/css/page.css";
import "./parsing-report.css";
import { State } from "../../common/state";
import { TeWebviewApp } from "../webviewApp";
import { ExecuteCommandType, IpcMessage } from "../../common/ipc";


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


	protected override onMessageReceived(e: MessageEvent)
    {
		const msg = e.data as IpcMessage;
        this.log(`${this.appName}.onMessageReceived(${msg.id}): method=${msg.method}: name=${e.data.command}`);
		const message = e.data; // JSON data from tests
        switch (message.command)
        {
            case "enterLicense":
                this.enterLicense();
                break;
            case "getLicense":
                this.getLicense();
                break;
            case "showLicensePage":
                this.showLicensePage();
                break;
            case "showParsingReport":
                this.showParsingReport();
                break;
            case "showReleaseNotes":
                this.showReleaseNotes();
                break;
        }
	}

	private enterLicense = () => this.sendCommand(ExecuteCommandType, { command: "vscode-taskexplorer.enterLicense"});
    private getLicense = () => this.sendCommand(ExecuteCommandType, { command: "vscode-taskexplorer.getLicense"});
    private showReleaseNotes = () => this.sendCommand(ExecuteCommandType, { command: "vscode-taskexplorer.showReleaseNotesPage"});
    private showParsingReport = () => this.sendCommand(ExecuteCommandType, { command: "vscode-taskexplorer.showParsingReportPage"});
    private showLicensePage = () => this.sendCommand(ExecuteCommandType, { command: "vscode-taskexplorer.showLicensePage"});
}

new ParsingReportWebviewApp();
