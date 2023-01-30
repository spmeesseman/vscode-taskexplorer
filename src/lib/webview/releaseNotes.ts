
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
	panel = await createWebviewPanel("Task Explorer Release Notes", html, context);
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
							   .replace("<!-- subtitle -->", getReleaseTitle())
							   .replace("<!-- releasenotes -->", getReleaseNotes());
	html = cleanLicenseButtons(html, api);
	log.methodDone("get page content", 1, logPad);
	return html;
};


const getReleaseTitle = () =>
{
	return "NEW FEATURES AND PERFORMANCE ENHANCEMENTS";
};


const getReleaseNotes = () =>
{
return `
<table style="margin-top:15px" width="100%" align="center">
	${getReleaseNotesHdr("Features", "plus")}
	<tr>
		<td>
			<ul>
				<li>
			</ul>
		</td>
	</tr>
	${getReleaseNotesHdr("Bug Fixes", "bug")}
	<tr>
		<td>
			<ul>
				<li>
			</ul>
		</td>
	</tr>
	${getReleaseNotesHdr("Refactoring", "cog")}
	<tr>
		<td>
			<ul>
				<li>
			</ul>
		</td>
	</tr>
	${getReleaseNotesHdr("Miscellaneous", "asterisk")}
	<tr>
		<td>
			<ul>
				<li>
			</ul>
		</td>
	</tr>
</table>`;
};


const getReleaseNotesHdr = (title: string, icon: string) =>
{
	return `
	<tr><td>
		<hr>
	</td></tr>
	<tr class="content-section-header">
		<td class="content-section-header-nowrap" nowrap>&nbsp;<span class=\"far fa-${icon} content-section-fa-img\"></span> &nbsp;${title}</td>
	</tr>
	<tr><td>
		<hr>
	</td></tr>`;
};
