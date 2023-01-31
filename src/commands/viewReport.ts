
import log from "../lib/log/log";
import { commands, ExtensionContext, Uri, WebviewPanel, WebviewPanelSerializer, window } from "vscode";
import { displayParsingReport, getViewType, reviveParsingReport } from "../lib/page/infoPage";
import { ITaskExplorerApi } from "../interface";

let context: ExtensionContext;
let teApi: ITaskExplorerApi;


export const getParsingReportSerializer = () => serializer;


const viewReport = async(uri?: Uri) =>
{
    log.methodStart("view report command", 1, "", true);
    const panel = await displayParsingReport(teApi, context, "   ", uri);
    log.methodDone("view report command", 1);
    return panel.getWebviewPanel();
};


const serializer: WebviewPanelSerializer =
{
    deserializeWebviewPanel: async(webviewPanel: WebviewPanel, state: any) =>
    {
        await reviveParsingReport(webviewPanel, teApi, context, "");
    }
};


const registerViewReportCommand = (ctx: ExtensionContext, api: ITaskExplorerApi) =>
{
    teApi = api;
    context = ctx;
	ctx.subscriptions.push(
        commands.registerCommand("vscode-taskexplorer.viewReport", async (uri?: Uri) => viewReport(uri)),
        window.registerWebviewPanelSerializer(getViewType(), serializer)
    );
};


export default registerViewReportCommand;
