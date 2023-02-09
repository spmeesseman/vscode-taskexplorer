
import "./home.css";
import { TeWebviewApp } from "../webviewApp";
import { Disposable, DOM } from "../common/dom";
import { ExecuteCommandType, IpcMessage, TeState } from "../../shared/ipc";
import { provideVSCodeDesignSystem, vsCodeButton, Button } from "@vscode/webview-ui-toolkit";


export class HomeApp extends TeWebviewApp<TeState>
{
	constructor()
    {
		super("HomeApp");
	}

	protected override onInitialize()
    {
		provideVSCodeDesignSystem().register(vsCodeButton());

        let elem = document.getElementById("btnViewReleaseNotes");
        elem?.addEventListener("click", this.showReleaseNotes);
        elem = document.getElementById("btnEnterlicense") as Button;
        elem?.addEventListener("click", this.enterLicense); elem.onclick = this.enterLicense;
        elem = document.getElementById("btnGetLicense") as Button;
        elem?.addEventListener("click", this.getLicense);
        elem = document.getElementById("btnViewLicense") as Button;
        elem?.addEventListener("click", this.showLicensePage);
        elem = document.getElementById("btnViewReport") as Button;
        elem?.addEventListener("click", this.showParsingReport);

		this.updateState();
	}


    protected override onBind(): Disposable[]
    {
		const disposables = super.onBind?.() ?? [];
		disposables.push(
			DOM.on("[data-action]", "click", (e, target: HTMLElement) => this.onButtonClicked(e, target)),
		);
		return disposables;
    }


	private onButtonClicked(_e: MouseEvent, target: HTMLElement)
    {
		const action = target.dataset.action;
		if (action) {
			this.sendCommand(ExecuteCommandType, { command: action.slice(8) });
		}
	}


	protected override onMessageReceived(e: MessageEvent)
    {
		const msg = e.data as IpcMessage;
        this.log(`${this.appName}.onMessageReceived(${msg.id}): name=${msg.method}`);

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
