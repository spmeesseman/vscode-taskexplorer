
import "./home.css";
import { State } from "../../common/state";
import { TeWebviewApp } from "../webviewApp";
import { Disposable, DOM } from "../common/dom";
import { ExecuteCommandType, IpcMessage } from "../../common/ipc";
import { provideVSCodeDesignSystem, vsCodeButton } from "@vscode/webview-ui-toolkit";


export class HomeApp extends TeWebviewApp<State>
{
	constructor()
    {
		super("HomeApp");
	}


	protected override onInitialize()
    {
		provideVSCodeDesignSystem().register(vsCodeButton());
		this.updateState();
	}


    protected override onBind(): Disposable[]
    {
		const disposables = super.onBind?.() ?? [];
		disposables.push(
			DOM.on("[data-action]", "click", (e, target: HTMLElement) => this.onButtonClicked(e, target)),
			// DOM.on("btnEnterlicense", "click", () => this.enterLicense()),
			// DOM.on("btnGetLicense", "click", () => this.getLicense()),
			// DOM.on("btnViewLicense", "click", () => this.showLicensePage()),
			// DOM.on("btnViewReport", "click", () => this.showParsingReport()),
			// DOM.on("btnViewReleaseNotes", "click", () => this.showReleaseNotes()),
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


new HomeApp();
