
import log from "../lib/log/log";
import { ITaskExplorerApi } from "../interface";
import { displayParsingReport, getViewType, reviveParsingReport } from "../webview/page/infoPage";
import { commands, ExtensionContext, Uri, WebviewPanel, WebviewPanelSerializer, window } from "vscode";


export const getParsingReportSerializer = () => serializer;


const viewReport = async(uri?: Uri) =>
{
    log.methodStart("view report command", 1, "", true);
    const panel = await displayParsingReport("   ", uri);
    log.methodDone("view report command", 1);
    return panel.getWebviewPanel();
};


const serializer: WebviewPanelSerializer =
{
    deserializeWebviewPanel: async(webviewPanel: WebviewPanel, state: any) =>
    {
        await reviveParsingReport(webviewPanel, "");
    }
};


const registerViewReportCommand = (ctx: ExtensionContext) =>
{
	ctx.subscriptions.push(
        commands.registerCommand("vscode-taskexplorer.viewReport", async (uri?: Uri) => viewReport(uri)),
        window.registerWebviewPanelSerializer(getViewType(), serializer)
    );
};


export default registerViewReportCommand;
