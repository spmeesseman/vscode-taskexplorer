
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


    private enterLicense = () =>
    {
        this.vscode.postMessage({
            method: "command/execute",
            params: {
                command: "vscode-taskexplorer.enterLicense"
            }
        });
    };


    private getLicense = () =>
    {
        this.vscode.postMessage({
            method: "command/execute",
            params: {
                command: "vscode-taskexplorer.getLicense"
            }
        });
    };


    private showLicensePage = () =>
    {
        this.vscode.postMessage({
            method: "command/execute",
            params: {
                command: "vscode-taskexplorer.showLicensePage"
            }
        });
    };


    private showParsingReport = () =>
    {
        this.vscode.postMessage({
            method: "command/execute",
            params: {
                command: "vscode-taskexplorer.showParsingReportPage"
            }
        });
    };


    private showReleaseNotes = () =>
    {
        this.vscode.postMessage({
            method: "command/execute",
            params: {
                command: "vscode-taskexplorer.showReleaseNotesPage"
            }
        });
    };


	private updateState()
    {
	}

}


new HomeWebviewApp();
