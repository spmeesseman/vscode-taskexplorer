import { Task, workspace } from "vscode";
import { IDictionary } from "../../interface";
import { getTaskFiles } from "../../lib/fileCache";
import { getTaskTypes } from "../../lib/utils/taskTypeUtils";
import { removeLicenseButtons } from "./removeLicenseButtons";


export const createTaskCountTable = async(tasks: Task[], html: string, project?: string) =>
{
    const projects: string[] = [],
          taskCounts: IDictionary<number> = {};

    let fileCount = 0;

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
        html = html.replace(/\#\{projects\.length\}/g, projects.length.toString());
    }
    else {
        projects.push(project);
        html = html.replace(/\#\{projects\.length\} project\(s\)/g, "the " + project + " project");
    }

    getTaskTypes().forEach((tcKey) =>
    {
        const taskFiles = getTaskFiles(tcKey) || [];
        fileCount += taskFiles.length;
        html = html.replace(new RegExp(`#{taskCounts.${tcKey}}`, "g"), (taskCounts[tcKey] || 0).toString());
    });

    // html = html.replace(/\$\{taskCounts.npm_plus_yarn\}/g, taskCounts.npm || "0");

    // if (getPackageManager() === "yarn") {
    //     html = html.replace(/\$\{taskCounts.yarn\}/g, taskCounts.npm || "0");
    // }
    // else {
    //     html = html.replace(/\$\{taskCounts.yarn\}/g, "0");
    // }

    html = html.replace(/\#\{taskCounts\.length\}/g, tasks.length.toString());
    html = html.replace(/\#\{taskTypes\.length\}/g, Object.keys(taskCounts).length.toString());
    html = html.replace(/\#\{taskFiles\.length\}/g, fileCount.toString());

    return removeLicenseButtons(html);
};
