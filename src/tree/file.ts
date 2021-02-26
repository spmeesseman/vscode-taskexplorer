
import { ThemeIcon, TreeItem, TreeItemCollapsibleState, TaskDefinition, ExtensionContext, Uri } from "vscode";
import * as path from "path";
import * as util from "../common/utils";
import { configuration } from "../common/configuration";
import TaskItem from "./item";
import TaskFolder  from "./folder";


/**
 * @class TaskFile
 *
 * A tree node that represents a task type/source (e.g. `npm`, `gulp`, etc...).
 *
 * A TaskFile can be a direct child of TaskFolder, or, if `grouping` is turned in in
 * Settings, it can be a child of another TaskFile.
 *
 * The last TaskFile in a grouping will contain items of type TaskItem.  If not grouped,
 * the TaskFile node for each task type within each TaskFolder will contain items of type TaskItem.
 *
 * @see [TaskItem](TaskItem)
 * @see [TaskFolder](TaskFolder)
 */
export default class TaskFile extends TreeItem
{
    public path: string;
    public folder: TaskFolder;
    public scripts: (TaskItem|TaskFile)[] = [];
    public fileName: string;
    public groupLevel: number;
    public nodePath: string;
    public readonly taskSource: string;
    public readonly isGroup: boolean;
    public readonly isUser: boolean;


    constructor(context: ExtensionContext, folder: TaskFolder, taskDef: TaskDefinition, source: string, relativePath: string, groupLevel: number, group?: boolean, label?: string, padding = "")
    {
        super(TaskFile.getLabel(taskDef, label ? label : source, relativePath, group || false), TreeItemCollapsibleState.Collapsed);

        this.folder = folder;
        this.path = this.label !== "vscode" ? relativePath : ".vscode";
        this.nodePath = this.label !== "vscode" ? relativePath : "vscode";
        this.taskSource = source;
        this.isGroup = (group === true);
        this.isUser = false;
        this.groupLevel = 0;

        //
        // Reference ticket #133, vscode folder should not use a path appendature in it's folder label
        // in the task tree, there is only one path for vscode/workspace tasks, /.vscode.  The fact that
        // you can set the path variable inside a vscode task changes the relativePath for the task,
        // causing an endless loop when putting the tasks into groups (see taskTree.createTaskGroupings).
        // All othr task types will have a relative path of it's location on the filesystem (with
        // eception of TSC, which is handled elsewhere).
        //
        this.path = this.label !== "vscode" ? relativePath : ".vscode";

        if (group && this.label) {
            this.nodePath = path.join(this.nodePath, this.label);
        }

        if (!this.nodePath && this.label === "vscode") {
            this.nodePath = path.join(".vscode", this.label);
        }

        if (!this.nodePath) { // force null or undefined to empty string
            this.nodePath = "";
        }

        if (!group)
        {
            this.contextValue = "taskFile" + util.properCase(this.taskSource);
            this.fileName = this.getFileNameFromSource(source, folder, taskDef, true);
            if (folder.resourceUri)
            {
                if (relativePath && source !== "Workspace")
                {
                    this.resourceUri = Uri.file(path.join(folder.resourceUri.fsPath, relativePath, this.fileName));
                } else
                {
                    this.resourceUri = Uri.file(path.join(folder.resourceUri.fsPath, this.fileName));
                }
            } //
             // No resource uri means this file is 'user tasks', and not associated to a workspace folder
            //
            else if (configuration.get<boolean>("readUserTasks")) {
                this.resourceUri = Uri.file(path.join(util.getUserDataPath(padding), this.fileName));
                this.isUser = true;
            }
        }
        else //
        {   // When a grouped node is created, the definition for the first task is passed to this
            // function.  Remove the filename part of tha path for this resource
            //
            this.fileName = "group";      // change to name of directory
            // Use a custom toolip (default is to display resource uri)
            this.tooltip = util.properCase(source) + " Task Files";
            this.contextValue = "taskGroup" + util.properCase(this.taskSource);
            this.groupLevel = groupLevel;
        }

        //
        // Set context icon
        //
        if (util.pathExists(context.asAbsolutePath(path.join("res", "sources", this.taskSource + ".svg"))))
        {
            let src = this.taskSource;
            //
            // If npm TaskFile, check package manager set in vscode settings, (npm, pnpm, or yarn) to determine
            // which icon to display
            //
            if (src === "npm")
            {
                src = util.getPackageManager();
            }
            this.iconPath = {
                light: context.asAbsolutePath(path.join("res", "sources", src + ".svg")),
                dark: context.asAbsolutePath(path.join("res", "sources", src + ".svg"))
            };
        }
        else
        {
            this.iconPath = ThemeIcon.File;
        }
    }


    addScript(script: (TaskFile | TaskItem | undefined))
    {
        if (script) {
            script.groupLevel = this.groupLevel;
            this.scripts.push(script);
        }
    }


    static getLabel(taskDef: TaskDefinition, source: string, relativePath: string, group: boolean): string
    {
        let label = source;

        if (source === "Workspace")
        {
            label = "vscode";
        }

        if (group !== true)
        {
            if (source === "ant")
            {   //
                // For ant files not named build.xml, display the file name too
                //
                if (taskDef.fileName && !taskDef.fileName.match(/build.xml/i))
                {
                    if (relativePath.length > 0 && relativePath !== ".vscode" && taskDef.type)
                    {
                        return label + " (" + relativePath.substring(0, relativePath.length - 1).toLowerCase() + "/" + taskDef.fileName.toLowerCase() + ")";
                    }
                    return (label + " (" + taskDef.fileName.toLowerCase() + ")");
                }
            }

            //
            // Reference ticket #133, vscode folder should not use a path appendature in it's folder label
            // in the task tree, there is only one path for vscode/workspace tasks, /.vscode.  The fact that
            // you can set the path variable inside a vscode task changes the relativePath for the task,
            // causing an endless loop when putting the tasks into groups (see taskTree.createTaskGroupings).
            // All othr task types will have a relative path of it's location on the filesystem (with
            // eception of TSC, which is handled elsewhere).
            //
            if (relativePath.length > 0 && relativePath !== ".vscode" && source !== "Workspace")
            {
                if (relativePath.endsWith("\\") || relativePath.endsWith("/")) // trim slash chars
                {
                    return label + " (" + relativePath.substring(0, relativePath.length - 1).toLowerCase() + ")";
                }
                else {
                    return label + " (" + relativePath.toLowerCase() + ")";
                }
            }
        }

        return label.toLowerCase();
    }


    getFileNameFromSource(source: string, folder: TaskFolder, taskDef: TaskDefinition, incRelPathForCode?: boolean): string
    {
        //
        // Ant tasks or any tasks provided by this extension will have a "fileName" definition
        //
        if (taskDef.fileName)
        {
            return path.basename(taskDef.fileName);
        }

        //
        // Since tasks are returned from VSCode API without a filename that they were found
        // in we must deduce the filename from the task source.  This includes npm, tsc, and
        // vscode (workspace) tasks
        //

        let fileName = "package.json";
        let tmpIdx = 0;

        if (source === "Workspace")
        {
            if (incRelPathForCode === true)
            {
                if (folder.resourceUri) { // project folder task
                    fileName = ".vscode/tasks.json";
                }
                else { // user task (has no resourceUri)
                    fileName = "tasks.json";
                }
            }
            else
            {
                fileName = "tasks.json";
            }
        }
        else if (source === "tsc")
        {
            fileName = "tsconfig.json";
            tmpIdx = 2;
        }

        return fileName;
    }


    insertScript(script: (TaskFile | TaskItem), index: number)
    {
        this.scripts.splice(index, 0, script);
    }


    removeScript(script: (TaskFile | TaskItem))
    {
        let idx = -1;
        let idx2 = -1;

        this.scripts.forEach(each =>
        {
            idx++;
            if (script === each)
            {
                idx2 = idx;
            }
        });

        if (idx2 !== -1 && idx2 < this.scripts.length)
        {
            this.scripts.splice(idx2, 1);
        }
    }

}
