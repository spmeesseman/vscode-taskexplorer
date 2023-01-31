import { join } from "path";
import { getTaskFiles } from "../fileCache";
import { readFileAsync } from "../utils/fs";
import { ITaskExplorerApi } from "../../interface";
import { getInstallPath } from "../utils/pathUtils";
import { getPackageManager, getTaskTypes, lowerCaseFirstChar } from "../utils/utils";
import { commands, Disposable, ExtensionContext, Task, Uri, ViewColumn, window, workspace } from "vscode";

const disposables: Disposable[] = [];


export const createTaskCountTable = async (api: ITaskExplorerApi, tasks: Task[], title: string, project?: string) =>
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
        html = html.replace(`\${taskCounts.${tcKey}}`, taskCounts[tcKey] || "0");
    });

    if (getPackageManager() === "yarn") {
        html = html.replace(/\$\{taskCounts.yarn\}/g, taskCounts.npm || "0");
    }
    else {
        html = html.replace(/\$\{taskCounts.yarn\}/g, "0");
    }

    html = html.replace(/\$\{taskCounts\.length\}/g, tasks.length.toString());
    html = html.replace(/\$\{taskTypes.length\}/g, Object.keys(taskCounts).length.toString());
    html = html.replace(/\$\{taskFiles.length\}/g, fileCount.toString());

    return cleanLicenseButtons(html, api);
};


export const cleanLicenseButtons = (html: string, api: ITaskExplorerApi) =>
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


export const createWebviewPanel = async(title: string, html: string, context: ExtensionContext) =>
{

    const resourceDir = Uri.joinPath(context.extensionUri, "res"),
          pageDir = Uri.joinPath(resourceDir, "page"),
          sourceImgDir = Uri.joinPath(resourceDir, "sources");

    const panel = window.createWebviewPanel(
		lowerCaseFirstChar(title, true), // Identifies the type of the webview. Used internally
		title,                           // Title of the panel displayed to the users
		ViewColumn.One,                  // Editor column to show the new webview panel in.
		{
            enableScripts: true,
            localResourceRoots: [ resourceDir ]
        }
	);

    const pageUri = panel.webview.asWebviewUri(pageDir),
          resourceDirUri = panel.webview.asWebviewUri(resourceDir),
          sourceImgDirUri = panel.webview.asWebviewUri(sourceImgDir);

    panel.webview.html = html.replace(/\[webview\.cspSource\]/g, panel.webview.cspSource)
                             .replace(/\[webview\.cssDir\]/g, pageUri.toString())
                             .replace(/\[webview\.pageDir\]/g, pageUri.toString())
                             .replace(/\[webview\.resourceDir\]/g, resourceDirUri.toString())
                             .replace(/\[webview\.scriptDir\]/g, pageUri.toString())
                             .replace(/\[webview\.sourceImgDir\]/g, sourceImgDirUri.toString())
                             .replace(/\[webview\.nonce\]/g, getNonce());
console.log(panel.webview.html);

    // Listen for when the panel is disposed
    // This happens when the user closes the panel or when the panel is closed programmatically
    panel.onDidDispose(() => dispose(), null, disposables);

    panel.onDidChangeViewState(
        e => {
            if (panel.visible) {
                // update();
            }
        },
        null, disposables
    );

	panel.webview.onDidReceiveMessage
	(
		message => {
            // i think don't await, the caller can't get the final result anyway
			commands.executeCommand("vscode-taskexplorer." + message.command);
		},
        undefined, disposables
	);

	panel.reveal();
    disposables.unshift(panel);
    return panel;
};


const dispose = () =>
{
    while (disposables.length) {
        const x = disposables.pop();
        if (x) {
            x.dispose();
        }
    }
};


const getNonce = () =>
{
	let text = "";
	const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	for (let i = 0; i < 32; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
};