
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


    constructor(folder: WorkspaceFolder | string, state: TreeItemCollapsibleState = TreeItemCollapsibleState.Expanded, logPad = "")
    {
        super(typeof folder === "string" ? folder  : folder.name, state);

        log.methodStart("construct tree folder", 3, logPad, false, [[ "label", this.label ]]);

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
        this.id = "fid-" + this.label;
        this.description = "A tree item representing a task or project folder";

        log.methodDone("construct tree folder", 3, logPad, false, [[ "id", this.id ], [ "context value", this.contextValue ]]);
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
