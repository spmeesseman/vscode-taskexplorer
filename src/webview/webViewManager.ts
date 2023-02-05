
import { join } from "path";
import TeWebviewPanel from "./webviewPanel";
import { readFileAsync } from "../lib/utils/fs";
import { getTaskFiles } from "../lib/fileCache";
import { getInstallPath } from "../lib/utils/pathUtils";
import { getTaskTypes } from "../lib/utils/taskTypeUtils";
import { IDictionary, ITaskExplorerApi } from "../interface";
import { ExtensionContext, Task, WebviewPanel, window, workspace } from "vscode";


export default class WebviewManager
{
    private static panelMap: IDictionary<TeWebviewPanel> = {};


    constructor()
    {

    }


    static create(title: string, viewType: string, html: string, context: ExtensionContext, panel?: WebviewPanel)
    {
        const column = window.activeTextEditor ? window.activeTextEditor.viewColumn : undefined;
		if (this.panelMap[viewType] && !this.panelMap[viewType].isDisposed())
        {
            this.panelMap[viewType].reveal(column);
            return this.panelMap[viewType];
		}
        this.panelMap[viewType] = new TeWebviewPanel(title, viewType, html, context, panel);
        return this.panelMap[viewType];
	}


    static dispose = () =>
    {
        for (const d of Object.keys(this.panelMap).filter(p => !this.panelMap[p].isDisposed()))
        {
            this.panelMap[d].dispose();
        }
        this.panelMap = {};
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
