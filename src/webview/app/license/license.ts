
import "../common/css/vscode.css";
import "../common/css/page.css";
import "./license.css";
import { State } from "../../common/state";
import { TeWebviewApp } from "../webviewApp";
import { ExecuteCommandType, IpcMessage } from "../../common/ipc";


export class LicenseWebviewApp extends TeWebviewApp<State>
{
	constructor()
    {
		super("LicenseWebviewApp");
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
            case "getLicense":          // For tests
                this.getLicense();
                break;
        }
	}


    private getLicense = () => this.sendCommand(ExecuteCommandType, { command: "vscode-taskexplorer.getLicense"});

}

new LicenseWebviewApp();
