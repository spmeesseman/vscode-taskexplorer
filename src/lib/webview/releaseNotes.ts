
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
							   .replace("<!-- subtitle -->", getNewInThisReleaseShortDsc())
							   .replace("<!-- releasenotes -->", getNewReleaseNotes(changeLogHtml));
	html = cleanLicenseButtons(html, api);
	log.methodDone("get page content", 1, logPad);
	return html;
};


const getNewInThisReleaseShortDsc = () =>
{
	return "MAJOR RELEASE - A PLETHORA OF NEW FEATURES, BUG FIXES AND PERFORMANCE ENHANCEMENTS !!";
};


const getNewReleaseNotes = (changeLogHtml: string) =>
{
return `
<table style="margin-top:15px" width="100%" align="center">
	${getNewReleaseNotesHdr("Features", "plus")}
	<tr>
		<td>
			${getReleaseNotes("Features", changeLogHtml)}
		</td>
	</tr>
	${getNewReleaseNotesHdr("Bug Fixes", "bug")}
	<tr>
		<td>
			${getReleaseNotes("Bug Fixes", changeLogHtml)}
		</td>
	</tr>
	${getNewReleaseNotesHdr("Refactoring", "cog")}
	<tr>
		<td>
			${getReleaseNotes("Refactoring", changeLogHtml)}
		</td>
	</tr>
	${getNewReleaseNotesHdr("Miscellaneous", "asterisk")}
	<tr>
		<td>
			${getReleaseNotes("Miscellaneous", changeLogHtml)}
		</td>
	</tr>
</table>`;
};


const getNewReleaseNotesHdr = (title: string, icon: string) =>
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


const getReleaseNotes = (section: string, changeLogHtml: string) =>
{
	let html = "<ul>";
	const notes: string[] = [];
	notes.forEach(n => {
		html += `<li>${n}</li>`;
	});
	html += "</ul>";
	return html;
};
