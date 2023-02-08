
import { TextDecoder } from "util";
import { Task, Uri, workspace } from "vscode";
import { IDictionary } from "../../interface";
import { getTaskFiles } from "../../lib/fileCache";
import { TaskTreeManager } from "../../tree/treeManager";
import { getTaskTypes } from "../../lib/utils/taskTypeUtils";
import { removeLicenseButtons } from "./removeLicenseButtons";
import { getWorkspaceProjectName, isWorkspaceFolder } from "../../lib/utils/utils";


export const createTaskCountTable = async(extensionUri: Uri, project?: string, html?: string) =>
{
    const projects: string[] = [],
          taskCounts: IDictionary<number> = {},
          tableTemplateFile = Uri.joinPath(extensionUri, "res", "page", "task-count-table.html");

    let fileCount = 0;
    let tableTemplate = new TextDecoder("utf8").decode(await workspace.fs.readFile(tableTemplateFile));
    // let tableTemplate = (await workspace.fs.readFile(tableTemplateFile)).toString();
    const tasks = TaskTreeManager.getTasks() // Filter out 'User' tasks for project/folder reports
                                 .filter((t: Task) => !project || (isWorkspaceFolder(t.scope) &&
                                                       project === getWorkspaceProjectName(t.scope.uri.fsPath)));
    tasks.forEach((t) =>
    {
        if (!taskCounts[t.source]) {
            taskCounts[t.source] = 0;
        }
        taskCounts[t.source]++;
    });

    getTaskTypes().forEach((tcKey) =>
    {
        const taskFiles = getTaskFiles(tcKey) || [];
        fileCount += taskFiles.length;
        tableTemplate = tableTemplate.replace(new RegExp(`#{taskCounts.${tcKey}}`, "g"), (taskCounts[tcKey] || 0).toString());
    });

    // html = html.replace(/\$\{taskCounts.npm_plus_yarn\}/g, taskCounts.npm || "0");

    // if (getPackageManager() === "yarn") {
    //     html = html.replace(/\$\{taskCounts.yarn\}/g, taskCounts.npm || "0");
    // }
    // else {
    //     html = html.replace(/\$\{taskCounts.yarn\}/g, "0");
    // }

    if (html)
    {
        html = removeLicenseButtons(html);
        html = html.replace(/\#\{taskCounts\.table\}/g, tableTemplate);
        html = html.replace(/\#\{taskCounts\.length\}/g, tasks.length.toString())
                    .replace(/\#\{taskTypes\.length\}/g, Object.keys(taskCounts).length.toString())
                    .replace(/\#\{taskFiles\.length\}/g, fileCount.toString());
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
            html = html.replace(/\#\{projects\.length\}/g, projects.length.toString());
        }
        else {
            projects.push(project);
            html = html.replace(/\#\{projects\.length\} project\(s\)/g, "the " + project + " project");
        }
    }
    else {
        html = tableTemplate;
    }

    return html;
};
