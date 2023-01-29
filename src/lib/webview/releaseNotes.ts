
import log from "../log/log";
import { marked } from "marked";
import { ExtensionContext, WebviewPanel } from "vscode";
import { createWebviewPanel } from "./utils";
import { ITaskExplorerApi } from "../../interface";
import { getInstallPath } from "../utils/pathUtils";
import { readFileAsync } from "../utils/fs";
import { join } from "path";

let panel: WebviewPanel | undefined;

export const displayReleaseNotes = async(api: ITaskExplorerApi, context: ExtensionContext, logPad: string) =>
{
	log.methodStart("display license report", 1, logPad);
	const html = await getPageContent(context, api, logPad + "   ");
	panel = await createWebviewPanel("Task Explorer Release Notes", html, context.subscriptions);
    log.methodDone("display license report", 1, logPad);
    return panel;
};


const getPageContent = async (context: ExtensionContext, api: ITaskExplorerApi, logPad: string) =>
{
	const installPath = await getInstallPath(),
	      releaseNotes = await readFileAsync(join(installPath, "res", "release-notes-html")),
	      changeLogMd = await readFileAsync(join(installPath, "CHANGELOG.md")),
		  changeLogHtml = await marked(changeLogMd, { async: true }),
		  infoContent = getExtraContent(context, logPad + "   ");
	const html = infoContent + changeLogHtml;
	return html;
};


const getExtraContent = (context: ExtensionContext, logPad: string) =>
{
    log.methodStart("get extra content", 1, logPad);
	const details = `
<table style="margin-top:15px;width:inherit">
	<tr><td style="font-weight:bold;font-size:14px">
		Version ${context.extension.packageJSON.version} Release Notes
	</td></tr>
	<tr><td>
		[ RELEASE NOTES ]
	</td></tr>
</table>`;
	log.methodDone("get extra content", 1, logPad);
	return details;
};
