/* eslint-disable prefer-arrow/prefer-arrow-functions */

import * as log from "../common/log";
import { commands, ExtensionContext } from "vscode";
import { getLicenseManager } from "../extension";


async function enterLicense(logPad = "   ", timeout = 45000, logLevel = 3)
{
    log.methodStart("enter license command", logLevel, logPad);
    getLicenseManager().enterLicenseKey();
    log.methodDone("enter license command", logLevel, logPad);
}


function registerEnterLicenseCommand(context: ExtensionContext)
{
	context.subscriptions.push(
        commands.registerCommand("taskExplorer.enterLicense", async (logPad?: string, timeout?: number, logLevel?: number) => { await enterLicense(logPad, timeout, logLevel); })
    );
}


export default registerEnterLicenseCommand;
