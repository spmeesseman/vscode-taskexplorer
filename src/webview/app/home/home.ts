
import "../common/css/vscode.css";
import "./home.css";
import "./home.scss";
import { Disposable } from "vscode";
import { State } from "../../common/state";
import { TeWebviewApp } from "../webviewApp";
import { ExecuteCommandType, IpcMessage } from "../../common/ipc";


export class HomeWebviewApp extends TeWebviewApp<State>
{
	constructor()
    {
		super("HomeWebviewApp");
	}


	protected override onInitialize()
    {
		this.updateState();
	}


	protected override onDataActionClicked(_e: MouseEvent, target: HTMLElement)
    {
		const action = target.dataset.action;
		if (action) {
			this.sendCommand(ExecuteCommandType, { command: action.slice(8) });
		}
	}


    protected override onInitialized()
    {
		const disposables: Disposable[] = [];
		return disposables;
    }


	protected override onMessageReceived(e: MessageEvent)
    {
		const msg = e.data; // as IpcMessage;
        this.log(`${this.appName}.onMessageReceived(${msg.id}): method=${msg.method}: name=${e.data.command}`);
        switch (msg.command)
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

	private updateState()
    {
	}

	private enterLicense = () => this.sendCommand(ExecuteCommandType, { command: "vscode-taskexplorer.enterLicense"});
    private getLicense = () => this.sendCommand(ExecuteCommandType, { command: "vscode-taskexplorer.getLicense"});
    private showReleaseNotes = () => this.sendCommand(ExecuteCommandType, { command: "vscode-taskexplorer.view.releaseNotes.show"});
    private showParsingReport = () => this.sendCommand(ExecuteCommandType, { command: "vscode-taskexplorer.view.parsingReport.show"});
    private showLicensePage = () => this.sendCommand(ExecuteCommandType, { command: "vscode-taskexplorer.view.licensePage.show"});
}


new HomeWebviewApp();
