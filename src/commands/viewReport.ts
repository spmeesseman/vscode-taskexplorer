/* eslint-disable prefer-arrow/prefer-arrow-functions */

import log from "../lib/utils/log";
import { commands, ExtensionContext, Uri } from "vscode";
import { displayParsingReport } from "../lib/infoPage";


let context: ExtensionContext;


async function viewReport(uri?: Uri, logPad = "   ", logLevel = 1)
{
    log.methodStart("view report command", logLevel, logPad, true);
    const panel = await displayParsingReport(logPad + "   ", logLevel, uri);
    /* istanbul ignore else */
    if (panel) {
        panel.onDidDispose(() =>
        {
        },
        null, context.subscriptions);
    }
    log.methodDone("view report command", logLevel, logPad);
    return panel;
}


function registerViewReportCommand(ctx: ExtensionContext)
{
    context = ctx;
	context.subscriptions.push(
        commands.registerCommand("taskExplorer.viewReport", async (uri?: Uri, logPad?: string, logLevel?: number) => viewReport(uri, logPad, logLevel))
    );
}


export default registerViewReportCommand;
