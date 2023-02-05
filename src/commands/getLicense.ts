/* eslint-disable prefer-arrow/prefer-arrow-functions */

import log from "../lib/log/log";
import { ITaskExplorerApi } from "../interface";
import { commands, ExtensionContext } from "vscode";
import { displayLicenseReport } from "../webview/page/licensePage";
import { getLicenseManager } from "../extension";


async function getLicense()
{
    log.methodStart("get 30-day license command", 1, "", true);
    const newKey = await getLicenseManager().requestLicense("   ");
    const panel = await displayLicenseReport("   ", [], newKey);
    log.methodDone("get 30-day license command", 1);
    return { panel: panel.getWebviewPanel(), newKey };
}


function registerGetLicenseCommand(ctx: ExtensionContext)
{
	ctx.subscriptions.push(
        commands.registerCommand("vscode-taskexplorer.getLicense", async () => getLicense())
    );
}


export default registerGetLicenseCommand;
