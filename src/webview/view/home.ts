
import { Uri } from "vscode";
import log from "../../lib/log/log";
import { TeWebviewPanel } from "../webviewPanel";
import { TeContainer } from "../../lib/container";
import { ITaskExplorerApi } from "../../interface";
import { getWorkspaceProjectName } from "../../lib/utils/utils";

const viewTitle = "Task Explorer Parsing Report";
const viewType = "viewParsingReport";
let panel: TeWebviewPanel<Record<string, unknown>> | undefined;


export const displayParsingReport = async(api: ITaskExplorerApi, logPad: string, uri?: Uri) =>
{
    log.methodStart("display parsing report", 1, logPad);
	const html = await getPageContent(api, logPad, uri);
	panel =  TeContainer.instance.webviewManager.create(viewTitle, viewType, html);
    log.methodDone("display parsing report", 1, logPad);
    return panel;
};


const getPageContent = async (api: ITaskExplorerApi, logPad: string, uri?: Uri) =>
{
	let html = "";
	const project = uri ? getWorkspaceProjectName(uri.fsPath) : undefined;
	return html;
};

