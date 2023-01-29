
import log from "../log/log";
import { join } from "path";
import { marked } from "marked";
import { readFileAsync } from "../utils/fs";
import { ITaskExplorerApi } from "../../interface";
import { getInstallPath } from "../utils/pathUtils";
import { ExtensionContext, WebviewPanel } from "vscode";
import { cleanLicenseButtons, createWebviewPanel } from "./utils";

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
	log.methodStart("get page content", 1, logPad);
	const installPath = await getInstallPath(),
	      releaseNotesHtml = await readFileAsync(join(installPath, "res", "page", "release-notes.html")),
	      changeLogMd = await readFileAsync(join(installPath, "CHANGELOG.md")),
		  changeLogHtml = await marked(changeLogMd, { async: true });
	let html = releaseNotesHtml.replace("<!-- changelog -->", changeLogHtml)
							   .replace("<!-- title -->", `Task Explorer ${context.extension.packageJSON.version} Release Notes`)
							   .replace("<!-- subtitle -->", `TASK EXPLORER ${context.extension.packageJSON.version} RELEASE NOTES`)
							   .replace("<!-- releasenotes -->", getReleaseNotes());
	html = cleanLicenseButtons(html, api);
	log.methodDone("get page content", 1, logPad);
	return html;
};


const getReleaseNotes = () =>
{
return `
<table style="margin-top:15px" width="100%" align="center">
	${getReleaseNotesHdr("Features")}
	<tr>
		<td>
			<ul>
				<li>
			</ul>
		</td>
	</tr>
	${getReleaseNotesHdr("Bug Fixes")}
	<tr>
		<td>
			<ul>
				<li>
			</ul>
		</td>
	</tr>
	${getReleaseNotesHdr("Refactoring")}
	<tr>
		<td>
			<ul>
				<li>
			</ul>
		</td>
	</tr>
	${getReleaseNotesHdr("Miscellaneous")}
	<tr>
		<td>
			<ul>
				<li>
			</ul>
		</td>
	</tr>
</table>`;
};


const getReleaseNotesHdr = (title: string) =>
{
	return `
	<tr><td>
		<hr>
	</td></tr>
	<tr style="font-size:16px;font-weight:bold">
		<td style="padding-right:20px" nowrap>${title}</td>
	</tr>
	<tr><td>
		<hr>
	</td></tr>`;
};
