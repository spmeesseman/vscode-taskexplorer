
import TaskItem from "./item";
import TaskFile from "./file";
import { ITaskFolder } from "../interface";
import { isString } from "../lib/utils/utils";
import { ThemeIcon, TreeItem, TreeItemCollapsibleState, WorkspaceFolder } from "vscode";


/**
 * @class TaskFolder
 *
 * A tree node that represents a workspace folder.
 * An item of this type is a "root folder" in the tree, it contains various TaskItem and TaskItem nodes.
 */
export default class TaskFolder extends TreeItem implements ITaskFolder
{
    public id: string;
    public taskFiles: (TaskFile|TaskItem)[] = [];
    public workspaceFolder: WorkspaceFolder | undefined;


    constructor(folder: WorkspaceFolder | string, state: TreeItemCollapsibleState = TreeItemCollapsibleState.Expanded)
    {
        super(isString(folder) ? folder  : folder.name, state);

        this.contextValue = "folder";

        if (!isString(folder)) { // 'SpecialFolder' will have string type
            this.workspaceFolder = folder;
            this.resourceUri = folder.uri;
        }

        this.iconPath = ThemeIcon.Folder;
        this.id = "fid-" + this.label;
        this.tooltip = "A tree folder representing a workspace/project";
    }


    addTaskFile(taskFile: TaskFile|TaskItem)
    {
        return new Promise<void>((resolve) => {
            setTimeout(() => { this.taskFiles.push(taskFile); resolve(); }, 1);
        });
    }


    insertTaskFile(taskFile: TaskFile|TaskItem, index: number)
    {
        this.taskFiles.splice(index, 0, taskFile);
    }


    removeTaskFile(taskFile: TaskFile|TaskItem|string, logPad: string)
    {
        const id = isString(taskFile) ? /* istanbul ignore next */ taskFile : taskFile.id;
        const idx = this.taskFiles.findIndex(f => f.id === id);
        this.taskFiles.splice(idx, 1);
    }
}
