
import log from "../lib/log/log";
import { ITaskExplorerApi } from "../interface";
import { displayReleaseNotes, getViewType, reviveReleaseNotes } from "../page/releaseNotes";
import { commands, ExtensionContext, Uri, WebviewPanel, WebviewPanelSerializer, window } from "vscode";

let context: ExtensionContext;
let teApi: ITaskExplorerApi;


export const getReleaseNotesSerializer = () => serializer;


const viewReleaseNotes = async(uri?: Uri) =>
{
    log.methodStart("view report command", 1, "", true);
    const panel = await displayReleaseNotes(teApi, context, "   ");
    log.methodDone("view report command", 1);
    return panel.getWebviewPanel();
};


const serializer: WebviewPanelSerializer =
{
    deserializeWebviewPanel: async(webviewPanel: WebviewPanel, state: any) =>
    {
        await reviveReleaseNotes(webviewPanel, teApi, context, "");
    }
};


const registerViewReleaseNotesCommand = (ctx: ExtensionContext, api: ITaskExplorerApi) =>
{
    teApi = api;
    context = ctx;
    ctx.subscriptions.push(
        commands.registerCommand("vscode-taskexplorer.viewReleaseNotes", async () => viewReleaseNotes()),
        window.registerWebviewPanelSerializer(getViewType(), serializer)
    );
};


export default registerViewReleaseNotesCommand;
