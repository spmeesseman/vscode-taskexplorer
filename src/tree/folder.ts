
import { ThemeIcon, TreeItem, TreeItemCollapsibleState, WorkspaceFolder } from "vscode";
import constants from "../common/constants";
import TaskItem from "./item";
import TaskFile from "./file";


/**
 * @class TaskFolder
 *
 * A tree node that represents a workspace folder.
 * An item of this type is a "root folder" in the tree, it contains various TaskItem and TaskItem nodes.
 */
export default class TaskFolder extends TreeItem
{
    public taskFiles: (TaskFile|TaskItem)[] = [];
    public taskFolders: TaskFolder[] = [];
    public workspaceFolder: WorkspaceFolder | undefined;


    constructor(folder: WorkspaceFolder | string)
    {
        super(typeof folder === "string" ? folder  : folder.name, TreeItemCollapsibleState.Expanded);

        if (this.label === constants.FAV_TASKS_LABEL || this.label === constants.LAST_TASKS_LABEL) {
            this.contextValue = this.label.toLowerCase().replace(/[\W \_\-]/g, "");
        }
        else {
            this.contextValue = "folder";
        }

        if (!(typeof folder === "string")) {
            this.workspaceFolder = folder;
            this.resourceUri = folder.uri;
        }

        this.iconPath = ThemeIcon.Folder;
    }


    addTaskFile(taskFile: TaskFile|TaskItem)
    {
        if (taskFile) {
            this.taskFiles.push(taskFile);
        }
    }


    insertTaskFile(taskFile: TaskFile|TaskItem, index: number)
    {
        if (taskFile) {
            this.taskFiles.splice(index, 0, taskFile);
        }
    }


    removeTaskFile(taskFile: TaskFile|TaskItem)
    {
        if (taskFile)
        {
            let idx = -1;
            let idx2 = -1;

            for (const each of this.taskFiles)
            {
                idx++;
                if (taskFile === each)
                {
                    idx2 = idx;
                }
            }

            if (idx2 !== -1 && idx2 < this.taskFiles.length)
            {
                this.taskFiles.splice(idx2, 1);
            }
        }
    }
}
