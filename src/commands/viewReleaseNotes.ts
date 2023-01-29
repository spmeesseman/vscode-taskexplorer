/* eslint-disable prefer-arrow/prefer-arrow-functions */

import log from "../lib/log/log";
import { commands, ExtensionContext, Uri } from "vscode";
import { displayReleaseNotes } from "../lib/webview/releaseNotes";
import { ITaskExplorerApi } from "../interface";

let context: ExtensionContext;
let teApi: ITaskExplorerApi;


async function viewReleaseNotes(uri?: Uri)
{
    log.methodStart("view report command", 1, "", true);
    const panel = await displayReleaseNotes(teApi, context, "   ");
    log.methodDone("view report command", 1);
    return panel;
}


function registerViewReleaseNotesCommand(ctx: ExtensionContext, api: ITaskExplorerApi)
{
    teApi = api;
    context = ctx;
	ctx.subscriptions.push(
        commands.registerCommand("vscode-taskexplorer.viewReleaseNotes", async () => viewReleaseNotes())
    );
}


export default registerViewReleaseNotesCommand;
