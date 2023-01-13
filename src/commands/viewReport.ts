/* eslint-disable prefer-arrow/prefer-arrow-functions */

import log from "../lib/log/log";
import { commands, ExtensionContext, Uri } from "vscode";
import { displayParsingReport } from "../lib/infoPage";


async function viewReport(uri?: Uri)
{
    log.methodStart("view report command", 1, "", true);
    const panel = await displayParsingReport("   ", 1, uri);
    log.methodDone("view report command", 1);
    return panel;
}


function registerViewReportCommand(ctx: ExtensionContext)
{
	ctx.subscriptions.push(
        commands.registerCommand("taskExplorer.viewReport", async (uri?: Uri) => viewReport(uri))
    );
}


export default registerViewReportCommand;
