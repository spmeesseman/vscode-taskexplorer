import { join } from "path";
import { getTaskFiles } from "../fileCache";
import { readFileAsync } from "../utils/fs";
import { IDictionary, ITaskExplorerApi } from "../../interface";
import { getInstallPath } from "../utils/pathUtils";
import { getPackageManager, getTaskTypes } from "../utils/utils";
import { commands, Disposable, ExtensionContext, Task, Uri, ViewColumn, WebviewPanel, window, workspace } from "vscode";


export default class TeWebviewPanel
{
    public title: string;
    public viewType: string;
    private panel: WebviewPanel;
    private disposables: Disposable[] = [];
    private static panelMap: IDictionary<TeWebviewPanel> = {};


    private constructor(panel: WebviewPanel, title: string, viewType: string, html: string, context: ExtensionContext)
    {
        TeWebviewPanel.panelMap[title] = this;

        this.panel = panel;
        this.title = title;
        this.viewType = viewType;

        const resourceDir = Uri.joinPath(context.extensionUri, "res"),
              cssDir = Uri.joinPath(resourceDir, "css"),
              jsDir = Uri.joinPath(resourceDir, "js"),
              pageDir = Uri.joinPath(resourceDir, "page"),
              sourceImgDir = Uri.joinPath(resourceDir, "sources"),
              pageUri = panel.webview.asWebviewUri(pageDir),
              cssUri = panel.webview.asWebviewUri(cssDir),
              jsUri = panel.webview.asWebviewUri(jsDir),
              resourceDirUri = panel.webview.asWebviewUri(resourceDir),
              sourceImgDirUri = panel.webview.asWebviewUri(sourceImgDir);

        panel.webview.html = html.replace(/\[webview\.cspSource\]/g, panel.webview.cspSource)
                                 .replace(/\[webview\.cssDir\]/g, cssUri.toString())
                                 .replace(/\[webview\.jsDir\]/g, jsUri.toString())
                                 .replace(/\[webview\.pageDir\]/g, pageUri.toString())
                                 .replace(/\[webview\.resourceDir\]/g, resourceDirUri.toString())
                                 .replace(/\[webview\.sourceImgDir\]/g, sourceImgDirUri.toString())
                                 .replace(/\[webview\.nonce\]/g, this.getNonce());
        //
        // Listen for when the panel is disposed
        // This happens when the user closes the panel or when the panel is closed programmatically
        //
        panel.onDidDispose(() => this.dispose.call(panel), panel, this.disposables);

        panel.onDidChangeViewState(
            e => {
                if (panel.visible) {
                    // update();
                }
            },
            null, this.disposables
        );

        panel.webview.onDidReceiveMessage
        (
            message => {
                // i think don't await, the caller can't get the final result anyway
                commands.executeCommand("vscode-taskexplorer." + message.command);
            },
            undefined, this.disposables
        );

        panel.reveal();
    }


    public static create(title: string, viewType: string, html: string, context: ExtensionContext, panel?: WebviewPanel)
    {
        const resourceDir = Uri.joinPath(context.extensionUri, "res"),
              column = window.activeTextEditor ? window.activeTextEditor.viewColumn : undefined;

		if (this.panelMap[viewType]) {
			this.panelMap[viewType].panel.reveal(column);
			return this.panelMap[viewType];
		}

        panel = panel || window.createWebviewPanel(
            viewType,                 // Identifies the type of the webview. Used internally
            title,                    // Title of the panel displayed to the users
            column || ViewColumn.One, // Editor column to show the new webview panel in.
            {
                enableScripts: true,
                localResourceRoots: [ resourceDir ]
            }
        );

        TeWebviewPanel.panelMap[viewType] = new TeWebviewPanel(panel, title, viewType, html, context);
        return TeWebviewPanel.panelMap[viewType];
	}


    dispose = () =>
    {
        this.panel.dispose();
        while (this.disposables.length)
        {
            (this.disposables.pop() as Disposable).dispose();
        }
        TeWebviewPanel.panelMap[this.viewType] = null as unknown as TeWebviewPanel;
    };


    getWebviewPanel = () => this.panel;


    static createTaskCountTable = async(api: ITaskExplorerApi, tasks: Task[], title: string, project?: string) =>
    {
        const projects: string[] = [];
        const installPath = await getInstallPath();
        let fileCount = 0;
        let html = await readFileAsync(join(installPath, "res", "page", "license-manager.html"));

        html = html.replace("<!-- title -->", title);

        const taskCounts: any = {
            ant: 0,
            apppublisher: 0,
            bash: 0,
            batch: 0,
            composer: 0,
            gradle: 0,
            grunt: 0,
            gulp: 0,
            make: 0,
            maven: 0,
            npm: 0,
            nsis: 0,
            powershell: 0,
            python: 0,
            ruby: 0,
            tsc: 0,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            Workspace: 0
        };

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
            html = html.replace(new RegExp(`\\\${taskCounts.${tcKey}}`, "g"), taskCounts[tcKey] || "0");
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

        return TeWebviewPanel.cleanLicenseButtons(html, api);
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


    private getNonce = () =>
    {
        let text = "";
        const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        for (let i = 0; i < 32; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    };

}
