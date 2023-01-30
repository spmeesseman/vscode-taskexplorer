/* eslint-disable prefer-arrow/prefer-arrow-functions */

import log from "../lib/log/log";
import { ITaskExplorerApi } from "../interface";
import { commands, ExtensionContext } from "vscode";
import { displayLicenseReport } from "../lib/webview/licensePage";
import { getLicenseManager } from "../extension";

let context: ExtensionContext;
let teApi: ITaskExplorerApi;


async function getLicense()
{
    log.methodStart("get 30-day license command", 1, "", true);
    const newKey = await getLicenseManager().requestLicense("   ");
    const panel = await displayLicenseReport(teApi, context, "   ", [], newKey);
    log.methodDone("get 30-day license command", 1);
    return { panel, newKey };
}


function registerGetLicenseCommand(ctx: ExtensionContext, api: ITaskExplorerApi)
{
    teApi = api;
    context = ctx;
	ctx.subscriptions.push(
        commands.registerCommand("vscode-taskexplorer.getLicense", async () => getLicense())
    );
}


export default registerGetLicenseCommand;
