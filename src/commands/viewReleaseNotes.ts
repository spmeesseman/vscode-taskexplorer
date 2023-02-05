
import log from "../lib/log/log";
import { ITaskExplorerApi } from "../interface";
import { displayReleaseNotes, getViewType, reviveReleaseNotes } from "../webview/page/releaseNotes";
import { commands, ExtensionContext, Uri, WebviewPanel, WebviewPanelSerializer, window } from "vscode";


export const getReleaseNotesSerializer = () => serializer;


const viewReleaseNotes = async(uri?: Uri) =>
{
    log.methodStart("view report command", 1, "", true);
    const panel = await displayReleaseNotes("   ");
    log.methodDone("view report command", 1);
    return panel.getWebviewPanel();
};


const serializer: WebviewPanelSerializer =
{
    deserializeWebviewPanel: async(webviewPanel: WebviewPanel, state: any) =>
    {
        await reviveReleaseNotes(webviewPanel, "");
    }
};


const registerViewReleaseNotesCommand = (ctx: ExtensionContext) =>
{
    ctx.subscriptions.push(
        commands.registerCommand("vscode-taskexplorer.viewReleaseNotes", async () => viewReleaseNotes()),
        window.registerWebviewPanelSerializer(getViewType(), serializer)
    );
};


export default registerViewReleaseNotesCommand;
