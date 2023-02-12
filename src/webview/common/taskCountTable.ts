
import { Task, workspace } from "vscode";
import { TeWrapper } from "../../lib/wrapper";
import { IDictionary } from "../../interface";
import { getTaskFiles } from "../../lib/fileCache";
import { getTaskTypes } from "../../lib/utils/taskTypeUtils";
import { removeLicenseButtons } from "./removeLicenseButtons";
import { getWorkspaceProjectName, isWorkspaceFolder } from "../../lib/utils/utils";


export const createTaskCountTable = async(wrapper: TeWrapper, project?: string, html?: string) =>
{
    const projects: string[] = [],
          taskCounts: IDictionary<number> = {};

    let fileCount = 0;
    const treeMgr = wrapper.treeManager;
    // let tableTemplate = (await workspace.fs.readFile(tableTemplateFile)).toString();
    const tasks = treeMgr.getTasks() // Filter out 'User' tasks for project/folder reports
                         .filter((t: Task) => !project || (isWorkspaceFolder(t.scope) &&
                                  project === getWorkspaceProjectName(t.scope.uri.fsPath)));
    tasks.forEach((t) =>
    {
        if (!taskCounts[t.source]) {
            taskCounts[t.source] = 0;
        }
        taskCounts[t.source]++;
    });

    let tableTemplate = getHtml();
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
        html = removeLicenseButtons(wrapper, html);
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


const getHtml = () =>
{
    return `
<table width="100%">
    <tr>
        <td width="10%">
            <img src="#{webroot}/img/sources/ant.png" class="task-image" />
        </td>
        <td class="task-count task-count-value" width="12%">
            #{taskCounts.ant}
        </td>
        <td width="10%">
            <img src="#{webroot}/img/sources/apppublisher.png" class="task-image" />
        </td>
        <td class="task-count task-count-value" width="12%">
            #{taskCounts.apppublisher}
        </td>
        <td width="10%">
            <img src="#{webroot}/img/sources/bash.png" class="task-image" />
        </td>
        <td class="task-count task-count-value" width="12%">
            #{taskCounts.bash}
        </td>
        <td width="10%">
            <img src="#{webroot}/img/sources/bat.png" class="task-image" />
        </td>
        <td class="task-count task-count-value" width="12%">
            #{taskCounts.batch}
        </td>
        <td width="10%">
            <img src="#{webroot}/img/sources/bat.png" class="task-image" />
        </td>
        <td class="task-count task-count-value" width="12%">
            #{taskCounts.composer}
        </td>
    </tr><tr>
        <td>
            <img src="#{webroot}/img/sources/gradle.png" class="task-image" />
        </td>
        <td class="task-count task-count-value">
            #{taskCounts.gradle}
        </td>
        <td>
            <img src="#{webroot}/img/sources/grunt.png" class="task-image" />
        </td>
        <td class="task-count task-count-value">
            #{taskCounts.grunt}
        </td>
        <td>
            <img src="#{webroot}/img/sources/gulp.png" class="task-image" />
        </td>
        <td class="task-count task-count-value">
            #{taskCounts.gulp}
        </td>
        <td>
            <img src="#{webroot}/img/sources/jenkins.png" class="task-image" />
        </td>
        <td class="task-count task-count-value">
            #{taskCounts.jenkins}
        </td>
        <td>
            <img src="#{webroot}/img/sources/make.png" class="task-image" />
        </td>
        <td class="task-count task-count-value">
            #{taskCounts.make}
        </td>
    </tr><tr>
        <td>
            <img src="#{webroot}/img/sources/maven.png" class="task-image" />
        </td>
        <td class="task-count task-count-value">
            #{taskCounts.maven}
        </td>
        <td class="task-image-stacked-container">
            <span class="task-image1-stacked-container"><img src="#{webroot}/img/sources/npm.png" class="task-image-stacked" /></span>
            <div class="task-image2-stacked-container"><img src="#{webroot}/img/sources/yarn.png" class="task-image-stacked" /></div>
        </td>
        <td class="task-count task-count-value">
            #{taskCounts.npm}
        </td>
        <td>
            <img src="#{webroot}/img/sources/nsis.png" class="task-image" />
        </td>
        <td class="task-count task-count-value">
            #{taskCounts.nsis}
        </td>
        <td>
            <img src="#{webroot}/img/sources/powershell.png" class="task-image" />
        </td>
        <td class="task-count task-count-value">
            #{taskCounts.powershell}
        </td>
        <td>
            <img src="#{webroot}/img/sources/python.png" class="task-image" />
        </td>
        <td class="task-count task-count-value">
            #{taskCounts.python}
        </td>
    </tr><tr>
        <td>
            <img src="#{webroot}/img/sources/perl.png" class="task-image" />
        </td>
        <td class="task-count task-count-value">
            #{taskCounts.perl}
        </td>
        <td>
            <img src="#{webroot}/img/sources/ruby.png" class="task-image" />
        </td>
        <td class="task-count task-count-value">
            #{taskCounts.ruby}
        </td>
        <td>
            <img src="#{webroot}/img/sources/ts.png" class="task-image" />
        </td>
        <td class="task-count task-count-value">
            #{taskCounts.tsc}
        </td>
        <td>
            <img src="#{webroot}/img/sources/webpack.png" class="task-image" />
        </td>
        <td class="task-count task-count-value">
            #{taskCounts.webpack}
        </td>
        <td>
            <img src="#{webroot}/img/sources/workspace.png" class="task-image" />
        </td>
        <td class="task-count task-count-value">
            #{taskCounts.Workspace}
        </td>
    </tr><!--<tr>
        <td>
            <img src="#{webroot}/img/sources/npm.png" class="task-image" />
        </td>
        <td class="task-count task-count-value">
            #{taskCounts.npm}
        </td>
        <td>
            <img src="#{webroot}/img/sources/yarn.png" class="task-image" />
        </td>
        <td class="task-count task-count-value">
            #{taskCounts.yarn}
        </td>
    </tr>-->
</table>`;
};
