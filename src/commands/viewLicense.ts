/* eslint-disable prefer-arrow/prefer-arrow-functions */

import log from "../lib/log/log";
import { ITaskExplorerApi } from "../interface";
import { commands, ExtensionContext } from "vscode";
import { displayLicenseReport } from "../lib/webview/licensePage";

let context: ExtensionContext;
let teApi: ITaskExplorerApi;


async function viewLicense()
{
    log.methodStart("view license command", 1, "", true);
    const panel = await displayLicenseReport(teApi, context.subscriptions, "   ");
    log.methodDone("view license command", 1);
    return panel;
}


function registerViewLicenseCommand(ctx: ExtensionContext, api: ITaskExplorerApi)
{
    teApi = api;
    context = ctx;
	ctx.subscriptions.push(
        commands.registerCommand("vscode-taskexplorer.viewLicense", async () => viewLicense())
    );
}


export default registerViewLicenseCommand;
