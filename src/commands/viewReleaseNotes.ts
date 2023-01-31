
import log from "../lib/log/log";
import { commands, ExtensionContext, Uri, WebviewPanel, WebviewPanelSerializer, window } from "vscode";
import { displayReleaseNotes, getViewType, reviveReleaseNotes } from "../lib/page/releaseNotes";
import { ITaskExplorerApi } from "../interface";

let context: ExtensionContext;
let teApi: ITaskExplorerApi;


const viewReleaseNotes = async(uri?: Uri) =>
{
    log.methodStart("view report command", 1, "", true);
    const panel = await displayReleaseNotes(teApi, context, "   ");
    log.methodDone("view report command", 1);
    return panel.getWebviewPanel();
};


const serializer: WebviewPanelSerializer =
{   // eslint-disable-next-line prefer-arrow/prefer-arrow-functions
    async deserializeWebviewPanel(webviewPanel: WebviewPanel, state: any)
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
