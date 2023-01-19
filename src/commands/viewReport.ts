/* eslint-disable prefer-arrow/prefer-arrow-functions */

import log from "../lib/log/log";
import { commands, ExtensionContext, Uri } from "vscode";
import { displayParsingReport } from "../lib/report/infoPage";
import { ITaskExplorerApi } from "../interface";

let context: ExtensionContext;
let teApi: ITaskExplorerApi;


async function viewReport(uri?: Uri)
{
    log.methodStart("view report command", 1, "", true);
    const panel = await displayParsingReport(teApi, context.subscriptions, "   ", uri);
    log.methodDone("view report command", 1);
    return panel;
}


function registerViewReportCommand(ctx: ExtensionContext, api: ITaskExplorerApi)
{
    teApi = api;
    context = ctx;
	ctx.subscriptions.push(
        commands.registerCommand("taskExplorer.viewReport", async (uri?: Uri) => viewReport(uri))
    );
}


export default registerViewReportCommand;
