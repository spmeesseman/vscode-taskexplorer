
import log from "../lib/log/log";
import { ITaskExplorerApi } from "../interface";
import { commands, ExtensionContext, WebviewPanel, WebviewPanelSerializer, window } from "vscode";
import { displayLicenseReport, getViewType, reviveLicensePage } from "../page/licensePage";

let context: ExtensionContext;
let teApi: ITaskExplorerApi;


export const getLicensePageSerializer = () => serializer;


const viewLicense = async() =>
{
    log.methodStart("view license command", 1, "", true);
    const panel = await displayLicenseReport(teApi, context, "   ");
    log.methodDone("view license command", 1);
    return panel.getWebviewPanel();
};


const serializer: WebviewPanelSerializer =
{
    deserializeWebviewPanel: async(webviewPanel: WebviewPanel, state: any) =>
    {
        await reviveLicensePage(webviewPanel, teApi, context, "");
    }
};


const registerViewLicenseCommand = (ctx: ExtensionContext, api: ITaskExplorerApi) =>
{
    teApi = api;
    context = ctx;
	ctx.subscriptions.push(
        commands.registerCommand("vscode-taskexplorer.viewLicense", async () => viewLicense()),
        window.registerWebviewPanelSerializer(getViewType(), serializer)
    );
};


export default registerViewLicenseCommand;
