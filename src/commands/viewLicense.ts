
import log from "../lib/log/log";
import { ITaskExplorerApi } from "../interface";
import { commands, ExtensionContext, WebviewPanel, WebviewPanelSerializer, window } from "vscode";
import { displayLicenseReport, getViewType, reviveLicensePage } from "../webview/page/licensePage";


export const getLicensePageSerializer = () => serializer;


const viewLicense = async() =>
{
    log.methodStart("view license command", 1, "", true);
    const panel = await displayLicenseReport("   ");
    log.methodDone("view license command", 1);
    return panel.getWebviewPanel();
};


const serializer: WebviewPanelSerializer =
{
    deserializeWebviewPanel: async(webviewPanel: WebviewPanel, state: any) =>
    {
        await reviveLicensePage(webviewPanel,  "");
    }
};


const registerViewLicenseCommand = (ctx: ExtensionContext) =>
{
	ctx.subscriptions.push(
        commands.registerCommand("vscode-taskexplorer.viewLicense", async () => viewLicense()),
        window.registerWebviewPanelSerializer(getViewType(), serializer)
    );
};


export default registerViewLicenseCommand;
