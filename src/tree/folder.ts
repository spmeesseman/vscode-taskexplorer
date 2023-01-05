
import { ThemeIcon, TreeItem, TreeItemCollapsibleState, WorkspaceFolder } from "vscode";
import constants from "../lib/constants";
import TaskItem from "./item";
import TaskFile from "./file";
import { isString } from "../lib/utils/utils";
import * as log from "../lib/utils/log";


/**
 * @class TaskFolder
 *
 * A tree node that represents a workspace folder.
 * An item of this type is a "root folder" in the tree, it contains various TaskItem and TaskItem nodes.
 */
export default class TaskFolder extends TreeItem
{
    public id: string;
    public taskFiles: (TaskFile|TaskItem)[] = [];
    public workspaceFolder: WorkspaceFolder | undefined;


    constructor(folder: WorkspaceFolder | string, state: TreeItemCollapsibleState = TreeItemCollapsibleState.Expanded)
    {
        super(isString(folder) ? folder  : folder.name, state);

        this.contextValue = "folder";

        if (!isString(folder)) {
            this.workspaceFolder = folder;
            this.resourceUri = folder.uri;
        }

        this.iconPath = ThemeIcon.Folder;
        this.id = "fid-" + this.label;
        this.tooltip = "A tree folder representing a workspace/project";
    }


    addTaskFile(taskFile: TaskFile|TaskItem)
    {
        this.taskFiles.push(taskFile);
    }


    insertTaskFile(taskFile: TaskFile|TaskItem, index: number)
    {
        this.taskFiles.splice(index, 0, taskFile);
    }


    removeTaskFile(taskFile: TaskFile|TaskItem|string)
    {
        const id = isString(taskFile) ? taskFile : taskFile.id;
        const idx = this.taskFiles.findIndex(f => f.id === id);
        if (idx !== -1) {
            this.taskFiles.splice(idx, 1);
        }
    }
}
