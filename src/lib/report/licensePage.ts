
import log from "../log/log";
import { Disposable, Task, WebviewPanel } from "vscode";
import { createTaskCountTable, createWebviewPanel } from "./utils";

let panel: WebviewPanel | undefined;


export const displayLicenseReport = async(tasks: Task[], licensed: boolean, disposables: Disposable[], logPad: string) =>
{
	log.methodStart("display license report", 1, logPad);
	const html = await getHtmlContent(tasks, licensed);
	panel = await createWebviewPanel(html, disposables);
    log.methodDone("display license report", 1, logPad);
    return panel;
};


const getHtmlContent = async (tasks: Task[], licensed: boolean) =>
{
	let html = await createTaskCountTable(tasks, "Welcome to Task Explorer");
	if (licensed)
	{
		const idx1 = html.indexOf("<!-- startLicenseContent -->");
		const idx2 = html.indexOf("<!-- endLicenseContent -->") + 26;
		html = html.replace(html.slice(idx1, idx2), "");
	}
	return html;
};
