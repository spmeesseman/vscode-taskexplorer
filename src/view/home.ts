
import * as path from "path";
import log from "../lib/log/log";
import TeWebviewPanel from "../page/teWebviewPanel";
import { ITaskExplorerApi } from "../interface";
import { ExtensionContext, Task, Uri, WebviewPanel } from "vscode";
import { getWorkspaceProjectName, isWorkspaceFolder, pushIfNotExists, timeout } from "../lib/utils/utils";

const viewTitle = "Task Explorer Parsing Report";
const viewType = "viewParsingReport";
let panel: TeWebviewPanel | undefined;


export const displayParsingReport = async(api: ITaskExplorerApi, context: ExtensionContext, logPad: string, uri?: Uri) =>
{
    log.methodStart("display parsing report", 1, logPad);
	const html = await getPageContent(api, logPad, uri);
	panel = TeWebviewPanel.create(viewTitle, viewType, html, context);
    log.methodDone("display parsing report", 1, logPad);
    return panel;
};


const getPageContent = async (api: ITaskExplorerApi, logPad: string, uri?: Uri) =>
{
	let html = "";
	const project = uri ? getWorkspaceProjectName(uri.fsPath) : undefined;
	return html;
};
