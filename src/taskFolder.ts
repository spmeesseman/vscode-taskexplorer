
import {
    ThemeIcon, TreeItem, TreeItemCollapsibleState, WorkspaceFolder
} from "vscode";
import { TaskFile } from "./taskFile";

export class TaskFolder extends TreeItem 
{
    public taskFiles: TaskFile[] = [];
    public taskFolders: TaskFolder[] = [];

    public workspaceFolder: WorkspaceFolder;

    constructor(folder: WorkspaceFolder)
    {
        super(folder.name, TreeItemCollapsibleState.Expanded);
        this.contextValue = "folder";
        this.resourceUri = folder.uri;
        this.workspaceFolder = folder;
        this.iconPath = ThemeIcon.Folder;
    }

    addTaskFile(taskFile: TaskFile)
    {
        this.taskFiles.push(taskFile);
    }

    addTaskFolder(taskFolder: TaskFolder)
    {
        this.taskFolders.push(taskFolder);
    }

    removeTaskFile(taskFile: TaskFile) 
    {
        let idx = -1;
        let idx2 = -1;

        this.taskFiles.forEach(each =>
        {
            idx++;
            if (taskFile === each)
            {
                idx2 = idx;
            }
        });

        if (idx2 !== -1 && idx2 < this.taskFiles.length)
        {
            this.taskFiles.splice(idx2, 1);
        }
    }
}
