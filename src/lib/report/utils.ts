import { join } from "path";
import { commands, Disposable, Task, ViewColumn, window, workspace } from "vscode";
import { getTaskFiles } from "../fileCache";
import { configuration } from "../utils/configuration";
import { readFileAsync } from "../utils/fs";
import { getInstallPath, getTaskTypes } from "../utils/utils";


export const createTaskCountTable = async (tasks: Task[], title: string, project?: string) =>
{
    const projects: string[] = [];
    const installPath = await getInstallPath();
    let fileCount = 0;
    let html = await readFileAsync(join(installPath, "res/license-manager.html"));

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

    //
    // TODO - yarn counts?
    //
    if (configuration.getVs<string>("npm.packageManager") === "yarn") {
        html = html.replace(/\$\{taskCounts.yarn\}/g, taskCounts.npm || "0");
    }
    else {
        html = html.replace(/\$\{taskCounts.yarn\}/g, "0");
    }

    html = html.replace(/\$\{taskCounts\.length\}/g, tasks.length.toString());
    html = html.replace(/\$\{taskTypes.length\}/g, Object.keys(taskCounts).length.toString());
    html = html.replace(/\$\{taskFiles.length\}/g, fileCount.toString());

    return html;
};


export const createWebviewPanel = async(html: string, disposables: Disposable[]) =>
{
    const panel = window.createWebviewPanel(
		"taskExplorer",   // Identifies the type of the webview. Used internally
		"Task Explorer",  // Title of the panel displayed to the users
		ViewColumn.One,   // Editor column to show the new webview panel in.
		{
			enableScripts: true
		}
	);
	panel.webview.html = html;
	panel.webview.onDidReceiveMessage
	(
		message =>
		{
			switch (message.command)
			{
				case "enterLicense":
					commands.executeCommand("taskExplorer.enterLicense");
					return;
				case "viewReport":
					commands.executeCommand("taskExplorer.viewReport");
					return;
			}
		}, undefined, disposables
	);
	panel.reveal();
    disposables.push(panel);
    return panel;
};
