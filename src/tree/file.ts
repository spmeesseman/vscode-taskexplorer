
import * as path from "path";
import { log } from "../lib/log/log";
import { TaskFolder }  from "./folder";
import * as util from "../lib/utils/utils";
import { ITaskDefinition } from "../interface";
import { pathExistsSync } from "../lib/utils/fs";
import { properCase } from "../lib/utils/commonUtils";
import { getTaskTypeFriendlyName } from "../lib/utils/taskTypeUtils";
import { ThemeIcon, TreeItem, TreeItemCollapsibleState, Uri } from "vscode";
import { getInstallPathSync, getUserDataPath } from "../lib/utils/pathUtils";
import { TaskItem } from "./item";


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
 */
export class TaskFile extends TreeItem implements TaskFile
{
    public path: string;
    /**
     * @property folder
     *
     * The owner TaskFolder representing a workspace or special (Last Tasks / Favorites)
     * folder.
     */
    public folder: TaskFolder;
    /**
     * @property folder
     *
     * Child TaskItem or TaskFile nodes in the tree.  A TaskFile can own another TaskFile
     * if "Grouping" is turned on in settings.
     */
    public treeNodes: (TaskItem|TaskFile)[] = [];
    /**
     * @property fileName
     *
     * The name of the filesystem file that this TaskFile represents, and/or is associated
     * with if grouped.
     */
    public fileName: string;
    /**
     * @property groupLevel
     *
     * Grouping level of this TaskFIle, if grouping is enabled in Settings.  The maximum
     * group level is configurable in Settings 1-10.
     */
    public groupLevel: number;
    /**
     * @property nodePath ?
     */
    public nodePath: string;
    /**
     * @property taskSource
     *
     * The task source that the TaskFile will be associated with, e.g. `npm`, `ant`,
     * `gulp`, etc.
     *
     * @readonly
     */
    public readonly taskSource: string;
    /**
     * @property isGroup Flag indicating if the TaskFile is being added in grouped mode.
     * @readonly
     */
    public readonly isGroup: boolean;
    /**
     * @property isUser Flag indicating if the TaskFile is associated with "User" tasks.
     * @readonly
     */
    public readonly isUser: boolean;

    override resourceUri: Uri;

    public override id: string;

    /**
     * @constructor
     *
     * @param context The VSCode extension context.
     * @param folder The owner TaskFolder, a TaskFolder represents a workspace or special (Last Tasks / Favorites) folder.
     * @param taskDef The task definition.
     * @param source The task source that the TaskFile will be associated with, e.g. `npm`, `ant`, `gulp`, etc.
     * @param relativePath The relative path of the task file, relative to the workspace folder it was found in.
     * @param groupLevel The grouping level in the tree.
     * @param group Flag indicating if the TaskFile is being added in grouped mode.
     * @param label The display label.
     * @param logPad Padding to prepend to log entries.  Should be a string of any # of space characters.
     */
    constructor(folder: TaskFolder, taskDef: ITaskDefinition, source: string, relativePath: string,
                groupLevel: number, groupId: string | undefined, label: string | undefined, logPad: string)
    {
        super(TaskFile.getLabel(taskDef, label ? label : source, relativePath, groupId), TreeItemCollapsibleState.Collapsed);

        log.methodStart("construct tree file", 4, logPad, false, [
            [ "label", label ?? source ], [ "source", source ], [ "relativePath", relativePath ], [ "task folder", folder.label ],
            [ "groupLevel", groupLevel ], [ "group id", groupId ], [ "taskDef cmd line", taskDef.cmdLine ],
            [ "taskDef file name", taskDef.fileName ], [ "taskDef icon light", taskDef.icon ], [ "taskDef icon dark", taskDef.iconDark ],
            [ "taskDef script", taskDef.script ], [ "taskDef target", taskDef.target ], [ "taskDef path", taskDef.path ]
        ]);

        this.folder = folder;
        this.taskSource = source;
        this.isGroup = !!groupId;
        this.isUser = false;
        this.groupLevel = 0;
        //
        // Reference ticket #133, vscode folder should not use a path appenditure in it's folder label
        // in the task tree, there is only one path for vscode/workspace tasks, /.vscode.  The fact that
        // you can set the path variable inside a vscode task changes the relativePath for the task,
        // causing an endless loop when putting the tasks into groups (see taskTree.createTaskGroupings).
        // All other task types will have a relative path of it's location on the filesystem (with
        // exception of TSC, which is handled elsewhere).
        //
        this.path = this.label !== "vscode" ? relativePath : ".vscode";
        this.nodePath = this.label !== "vscode" ? relativePath : "vscode"; // <---- ??? TODO - Why vscode and not .vscode.  same as .path?

        if (groupId && this.label) {
            this.nodePath = path.join(this.nodePath, this.label.toString());
        }

        /* istanbul ignore if */
        if (!this.nodePath && this.label === "vscode") {
            this.nodePath = path.join(".vscode", this.label);
        }

        if (!this.nodePath) { // force null or undefined to empty string
            this.nodePath = "";
        }

        this.fileName = this.getFileNameFromSource(source, folder, taskDef, true);
        this.resourceUri = Uri.file(path.resolve(this.fileName));
        /* istanbul ignore else */
        if (folder.resourceUri)
        {
            if (relativePath && source !== "Workspace") {
                this.resourceUri = Uri.file(path.join(folder.resourceUri.fsPath, relativePath, this.fileName));
            }
            else {
                this.resourceUri = Uri.file(path.join(folder.resourceUri.fsPath, this.fileName));
            }
        } //
         // No resource uri means this file is 'user tasks', and not associated to a workspace folder
        //
        else {
            this.resourceUri = Uri.file(path.join(getUserDataPath(undefined, logPad), this.fileName));
            this.isUser = true;
        }

        if (!groupId)
        {
            this.contextValue = "taskFile" + properCase(this.taskSource);
        }       //
        else { // When a grouped node is created, the definition for the first task is passed
              // to this function. Remove the filename part of tha path for this resource.
             //
            this.fileName = "group"; // change to name of directory
            // Use a custom toolip (default is to display resource uri)
            const taskName = getTaskTypeFriendlyName(source, true);
            this.tooltip = `A tree item representing a ${taskName} task file grouping`;
            this.contextValue = "taskGroup" + properCase(this.taskSource);
            this.groupLevel = groupLevel;
        }

        //
        // Set unique id
        //
        this.id = ("treeFileId-" + folder.id.replace("treeFolderId-", ":") + this.nodePath + ":" + this.fileName +
                  ":" + this.groupLevel + ":" + groupId + ":" + this.label + ":" + source).replace(/ /g, "");

        //
        // If npm TaskFile, check package manager set in vscode settings, (npm, pnpm, or yarn) to determine
        // which icon to display
        //
        let src = this.taskSource;
        if (src === "npm") {
            src = util.getPackageManager();
        }

        //
        // Set context icons
        //
        this.iconPath = ThemeIcon.File;
        if (!taskDef.icon)
        {
            const installPath = getInstallPathSync(),
                  icon = path.join(installPath, "res", "img", "sources", src + ".svg");
            if (pathExistsSync(icon))
            {
                this.iconPath = { light: icon, dark: icon };
            }
            else
            {
                const iconDark = path.join(installPath, "res", "img", "sources", "light", src + ".svg");
                const iconLight = path.join(installPath, "res", "img", "sources", "light", src + ".svg");
                if (pathExistsSync(iconDark) && pathExistsSync(iconDark))
                {
                    this.iconPath = { light: iconLight, dark: iconDark };
                }
            }
        }
        else if (pathExistsSync(taskDef.icon) && path.extname(taskDef.icon) === ".svg")
        {
            const iconLight = taskDef.icon;
            const iconDark = taskDef.iconDark && pathExistsSync(taskDef.iconDark) && path.extname(taskDef.iconDark) === ".svg" ?
                             taskDef.iconDark : taskDef.icon;
            this.iconPath = { light: iconLight, dark: iconDark };
        }

        const iconPath = this.iconPath as { light: string | Uri; dark: string | Uri };
        log.methodDone("construct tree file", 4, logPad, [
            [ "id", this.id ], [ "label", this.label ], [ "Node Path", this.nodePath ], [ "is usertask", this.isUser ],
            [ "context value", this.contextValue ], [ "is group", this.isGroup ], [ "groupLevel", this.groupLevel ],
            [ "filename", this.fileName ], [ "resource uri path", this.resourceUri.fsPath ],
            [ "path", this.path  ], [ "icon light", iconPath.light ], [ "icon dark", iconPath.dark ]
        ]);
    }

    /**
     * @method addTreeNode
     *
     * @param treeNode The node/item to add to this TaskFile node.
     */
    public addTreeNode(treeNode: (TaskFile | TaskItem | undefined))
    {
        /* istanbul ignore else */
        if (treeNode) {
            treeNode.groupLevel = this.groupLevel;
            this.treeNodes.push(treeNode);
        }
    }


    static getGroupedId = (folder: TaskFolder, file: TaskFile, label: string, treeLevel: number) =>
    {
        const groupSeparator = util.getGroupSeparator();
        const labelSplit = label.split(groupSeparator);
        let id = "";
        for (let i = 0; i <= treeLevel; i++)
        {
            id += labelSplit[i];
        }
        id += file.resourceUri.fsPath.replace(/\W/gi, "");
        return folder.label + file.taskSource + id + treeLevel.toString();
    };


    /**
     * @method getLabel
     *
     * @param treeNode The node/item to add to this TaskFile node.
     */
    private static getLabel(taskDef: ITaskDefinition, source: string, relativePath: string, groupId: string | undefined): string
    {
        let label = source;
        if (source === "Workspace")
        {
            label = "vscode";
        }

        if (!groupId)
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

            if (source === "apppublisher")
            {   //
                // For ap files in the same dir, nsamed with a tag, e.g.:
                //    .publishrc.spm.json
                //
                label = label.replace("ppp", "pp-p"); // `ppp -> pp-p` my app-publisher;
                const match = (taskDef.fileName as string).match(/\.publishrc\.(.+)\.(?:js(?:on)?|ya?ml)$/i);
                if (match && match.length > 1 && match[1])
                {
                    return (label + " (" + match[1].toLowerCase() + ")");
                }
            }

            if (source === "webpack")
            {   //
                // For ap files in the same dir, nsamed with a tag, e.g.:
                //    webpack.config.dev.json
                //
                const match = (taskDef.fileName as string).match(/webpack\.config\.(.+)\.(?:js(?:on)?)$/i);
                if (match && match.length > 1 && match[1])
                {
                    return (label + " (" + match[1].toLowerCase() + ")");
                }
            }

            //
            // Reference ticket #133, vscode folder should not use a path appenditure in it's folder label
            // in the task tree, there is only one path for vscode/workspace tasks, /.vscode.  The fact that
            // you can set the path variable inside a vscode task changes the relativePath for the task,
            // causing an endless loop when putting the tasks into groups (see taskTree.createTaskGroupings).
            // All other task types will have a relative path of it's location on the filesystem (with
            // exception of TSC, which is handled elsewhere).
            //
            if (relativePath.length > 0 && relativePath !== ".vscode" && source !== "Workspace" && relativePath !== ".")
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


    /**
     * @method addTreeNode
     * @private
     *
     * @param treeNode The node/item to add to this TaskFile node.
     *
     * @returns File name
     */
    // Note:  Making this function private bombs the types
    public getFileNameFromSource(source: string, folder: TaskFolder, taskDef: ITaskDefinition, incRelPathForCode?: boolean)
    {
        //
        // Ant tasks or any tasks provided by this extension will have a "fileName" definition
        // External tasks registered throughthe API also define fileName
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

        if (source === "Workspace")
        {
            fileName = "tasks.json"; // // note:  user task has no resourceUri
            /* istanbul ignore else */
            if (incRelPathForCode === true && folder.resourceUri) // project folder task
            {
                fileName = ".vscode/tasks.json";
            }
        }
        else if (source === "tsc")
        {
            fileName = "tsconfig.json";
        }

        return fileName;
    }


    /**
     * @method insertTreeNode
     *
     * @param treeNode The node/item to add to this TaskFile node.
     * @param index The index at which to insert into the array
     */
    public insertTreeNode(treeItem: (TaskFile | TaskItem), index: number)
    {
        this.treeNodes.splice(index, 0, treeItem);
    }


    /**
     * @method removeTreeNode
     *
     * @param treeNode The node/item to remove from this TaskFile node.
     */
    public removeTreeNode(treeItem: (TaskFile | TaskItem))
    {
        const idx = this.treeNodes.findIndex(tn => tn.id === treeItem.id);
        /* istanbul ignore else */
        if (idx !== -1) {
            this.treeNodes.splice(idx, 1);
        }
    }

}
