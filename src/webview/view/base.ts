
import log from "../../lib/log/log";
import TeWebviewPanel from "../webviewPanel";
import { views } from "../../lib/views";
import { Uri, WebviewPanel } from "vscode";
import { timeout } from "../../lib/utils/utils";
import { TeContainer } from "../../lib/container";
import { ITaskExplorerApi } from "../../interface";

const viewTitle = "Task Explorer Parsing Report";
const viewType = "viewParsingReport";
let panel: TeWebviewPanel | undefined;


export abstract class TeView
{
	private html: string;
	private teWebviewPanel: TeWebviewPanel;

	abstract getPageContent(api: ITaskExplorerApi, logPad: string, ...args: any[]): Promise<string>;


	constructor(title: string, viewtype: string, html: string, logPad: string)
	{
		log.methodStart("te view base constructor", 1, logPad);
		this.html = html;
		this.teWebviewPanel = TeContainer.instance.webviewManager.create(title, viewtype, html);
		log.methodDone("te view base constructor", 1, logPad);
	}

	register = (name: "taskExplorer"|"taskExplorerSideBar", enable: boolean, logPad: string) =>
	{
		let view = views[name];
		log.methodStart("create explorer view / tree provider", 1, logPad);
		if (!view)
		{
		}
		log.methodDone("create explorer view / tree provider", 1, logPad);
	};


	getViewTitle = () => viewTitle;


	getViewType = () => viewType;


	reviveParsingReport = async(webviewPanel: WebviewPanel, api: ITaskExplorerApi, logPad: string, uri?: Uri) =>
	{   //
		// Use a timeout so license manager can initialize first
		//
		await new Promise<void>(async(resolve) =>
		{
			while (api.isBusy()) {
				await timeout(100);
			}
			setTimeout(async(webviewPanel: WebviewPanel, api: ITaskExplorerApi, logPad: string, uri?: Uri) =>
			{
				log.methodStart("revive parsing report", 1, logPad);
				const html = await this.getPageContent(api, logPad, uri);
				TeContainer.instance.webviewManager.create(viewTitle, viewType, html, webviewPanel);
				log.methodDone("revive parsing report", 1, logPad);
				resolve();
			}, 10, webviewPanel, api, logPad, uri);
		});
	};
}
