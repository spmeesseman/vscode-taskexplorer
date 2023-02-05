
import { join } from "path";
import TeWebviewPanel from "./webviewPanel";
import { readFileAsync } from "../lib/utils/fs";
import { getTaskFiles } from "../lib/fileCache";
import { getInstallPath } from "../lib/utils/pathUtils";
import { getTaskTypes } from "../lib/utils/taskTypeUtils";
import { IDictionary, ITaskExplorerApi } from "../interface";
import { ExtensionContext, Task, Uri, ViewColumn, WebviewPanel, window, workspace } from "vscode";


export default class WebviewManager
{
    private static panelMap: IDictionary<TeWebviewPanel> = {};


    public static create(title: string, viewType: string, html: string, context: ExtensionContext, panel?: WebviewPanel)
    {
        const resourceDir = Uri.joinPath(context.extensionUri, "res"),
              column = window.activeTextEditor ? window.activeTextEditor.viewColumn : undefined;

		if (this.panelMap[viewType]) {
			this.panelMap[viewType].reveal(column);
			return this.panelMap[viewType];
		}

        panel = panel || window.createWebviewPanel(
            viewType,                 // Identifies the type of the webview. Used internally
            title,                    // Title of the panel displayed to the users
            column || ViewColumn.One, // Editor column to show the new webview panel in.
            {
                enableScripts: true,
                enableCommandUris: true,
                localResourceRoots: [ resourceDir ]
            }
        );

        this.panelMap[viewType] = new TeWebviewPanel(panel, title, viewType, html, context);
        // TeWebviewPanel.panelMap[title] = this;
        return this.panelMap[viewType];
	}


    dispose = () =>
    {
        for (const d of Object.keys(WebviewManager.panelMap))
        {
            WebviewManager.panelMap[d].dispose();
        }
        WebviewManager.panelMap = {};
    };


    static createTaskCountTable = async(api: ITaskExplorerApi, tasks: Task[], title: string, project?: string) =>
    {
        const projects: string[] = [],
              taskCounts: IDictionary<number> = {},
              installPath = await getInstallPath();
        let fileCount = 0,
            html = await readFileAsync(join(installPath, "res", "page", "license-manager.html"));

        html = html.replace("<!-- title -->", title);

        tasks.forEach((t) =>
        {
            if (!taskCounts[t.source]) {
                taskCounts[t.source] = 0;
            }
            taskCounts[t.source]++;
        });

        if (!project)
        {
            /* istanbul ignore else */
            if (workspace.workspaceFolders)
            {
                for (const wf of workspace.workspaceFolders)
                {
                    projects.push(wf.name);
                }
            }
            // eslint-disable-next-line no-template-curly-in-string
            html = html.replace("${projects.length}", projects.length.toString());
        }
        else {
            projects.push(project);
            // eslint-disable-next-line no-template-curly-in-string
            html = html.replace("${projects.length} project(s)", "the " + project + " project");
        }

        getTaskTypes().forEach((tcKey) =>
        {
            const taskFiles = getTaskFiles(tcKey) || [];
            fileCount += taskFiles.length;
            html = html.replace(new RegExp(`\\\${taskCounts.${tcKey}}`, "g"), (taskCounts[tcKey] || 0).toString());
        });

        // html = html.replace(/\$\{taskCounts.npm_plus_yarn\}/g, taskCounts.npm || "0");

        // if (getPackageManager() === "yarn") {
        //     html = html.replace(/\$\{taskCounts.yarn\}/g, taskCounts.npm || "0");
        // }
        // else {
        //     html = html.replace(/\$\{taskCounts.yarn\}/g, "0");
        // }

        html = html.replace(/\$\{taskCounts\.length\}/g, tasks.length.toString());
        html = html.replace(/\$\{taskTypes.length\}/g, Object.keys(taskCounts).length.toString());
        html = html.replace(/\$\{taskFiles.length\}/g, fileCount.toString());

        return WebviewManager.cleanLicenseButtons(html, api);
    };


    static cleanLicenseButtons = (html: string, api: ITaskExplorerApi) =>
    {
        if (api.isLicensed())
        {
            let idx1 = html.indexOf("<!-- startEnterLicenseButton -->"),
                idx2 = html.indexOf("<!-- endEnterLicenseButton -->") + 30;
            html = html.replace(html.slice(idx1, idx2), "");
            idx1 = html.indexOf("<!-- startGetLicenseButton -->");
            idx2 = html.indexOf("<!-- endGetLicenseButton -->") + 28;
            html = html.replace(html.slice(idx1, idx2), "");
        }
        return html;
    };


    static getNonce = () =>
    {
        let text = "";
        const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        for (let i = 0; i < 32; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    };

}
