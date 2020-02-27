
import {
    Task, TaskExecution, ThemeIcon, TreeItem, TreeItemCollapsibleState, WorkspaceFolder,
    TaskDefinition, ExtensionContext, tasks, Uri
} from "vscode";
import * as path from "path";
import * as util from "./util";

export class TaskItem extends TreeItem
{
    public static readonly defaultSource = "Workspace";

    public readonly task: Task | undefined;
    public readonly taskSource: string;
    public readonly taskGroup: string;
    public readonly execution: TaskExecution | undefined;
    public paused: boolean;

    taskFile: TaskFile;

    constructor(context: ExtensionContext, taskFile: TaskFile, task: Task, taskGroup?: string)
    {
        let taskName = task.name;
        if (taskName.indexOf(" - ") !== -1 && (taskName.indexOf("/") !== -1 || taskName.indexOf("\\") !== -1 ||
            taskName.indexOf(" - tsconfig.json") !== -1))
        {
            taskGroup ? taskName.replace(taskGroup + "-", "") : taskName = task.name.substring(0, task.name.indexOf(" - "));
        }

        super(taskName, TreeItemCollapsibleState.None);

        this.taskGroup = taskGroup;
        this.id = taskFile.resourceUri.fsPath + ":" + task.source + ":" + task.name; // + Math.floor(Math.random() * 1000000);
        this.paused = false;
        this.contextValue = "script";
        this.taskFile = taskFile;
        this.task = task;
        this.command = {
            title: "Open definition",
            command: "taskExplorer.open",
            arguments: [this]
        };
        this.taskSource = task.source;
        this.execution = tasks.taskExecutions.find(e => e.task.name === task.name && e.task.source === task.source &&
            e.task.scope === task.scope && e.task.definition.path === task.definition.path);

        this.contextValue = this.execution && task.definition.type !== "$composite" ? "runningScript" : "script";

        if (this.execution && task.definition.type !== "$composite")
        {
            this.iconPath = {
                light: context.asAbsolutePath(path.join("res", "light", "loading.svg")),
                dark: context.asAbsolutePath(path.join("res", "dark", "loading.svg"))
            };
        } else
        {
            this.iconPath = {
                light: context.asAbsolutePath(path.join("res", "light", "script.svg")),
                dark: context.asAbsolutePath(path.join("res", "dark", "script.svg"))
            };
        }

        this.tooltip = "Open " + task.name;
    }

    getFolder(): WorkspaceFolder
    {
        return this.taskFile.folder.workspaceFolder;
    }
}


export class TaskFile extends TreeItem
{
    public path: string;
    public folder: TaskFolder;
    public scripts: (TaskItem|TaskFile)[] = [];
    public fileName: string;
    public readonly taskSource: string;
    public readonly isGroup: boolean;

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
            {
                if (taskDef.fileName && taskDef.fileName !== "build.xml" && taskDef.fileName !== "Build.xml")
                {
                    if (relativePath.length > 0 && relativePath !== ".vscode")
                    {
                        return label + " (" + relativePath.substring(0, relativePath.length - 1).toLowerCase() + "/" + taskDef.fileName.toLowerCase() + ")";
                    }
                    return (label + " (" + taskDef.fileName.toLowerCase() + ")");
                }
            }

            if (relativePath.length > 0 && relativePath !== ".vscode")
            {
                if (relativePath.endsWith("\\") || relativePath.endsWith("/"))
                {
                    return label + " (" + relativePath.substring(0, relativePath.length - 1).toLowerCase() + ")";
                }
                else
                {
                    return label + " (" + relativePath.toLowerCase() + ")";
                }
            }
        }

        return label.toLowerCase();
    }

    static getFileNameFromSource(source: string, folder: TaskFolder, taskDef: TaskDefinition, relativePath: string, incRelPathForCode?: boolean): string | null
    {
        //
        // Ant tasks or any tasks provided by this extension will have a 'fileName' definition
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
                fileName = ".vscode/tasks.json";
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

        //
        // Check for casing, technically this isnt needed for windows but still
        // want it covered in local tests
        //

        let dirPath: string;
        if (relativePath)
        {
            dirPath = path.join(folder!.resourceUri!.fsPath, relativePath);
        } else
        {
            dirPath = folder!.resourceUri!.fsPath;
        }

        // let filePath = path.join(dirPath, fileName);
        // if (!util.pathExists(filePath)) {
        // 	//
        // 	// try camelcasing
        // 	//
        // 	fileName = util.camelCase(fileName, tmpIdx);
        // 	if (!util.pathExists(filePath)) {
        // 		//
        // 		// upper casing first leter
        // 		//
        // 		fileName = util.properCase(fileName);
        // 		if (!util.pathExists(filePath)) {
        // 			//
        // 			// upper case
        // 			//
        // 			fileName = fileName.toUpperCase();
        // 		}
        // 	}
        // }

        return fileName;
    }


    constructor(context: ExtensionContext, folder: TaskFolder, taskDef: TaskDefinition, source: string, relativePath: string, group?: boolean, label?: string)
    {
        super(TaskFile.getLabel(taskDef, label ? label : source, relativePath, group), TreeItemCollapsibleState.Collapsed);

        this.folder = folder;
        this.path = relativePath;
        this.taskSource = source;
        this.isGroup = (group === true);

        if (!group)
        {
            this.contextValue = "taskFile" + util.properCase(this.taskSource);
            this.fileName = TaskFile.getFileNameFromSource(source, folder, taskDef, relativePath, true);
            if (relativePath)
            {
                this.resourceUri = Uri.file(path.join(folder!.resourceUri!.fsPath, relativePath, this.fileName));
            } else
            {
                this.resourceUri = Uri.file(path.join(folder!.resourceUri!.fsPath, this.fileName));
            }
        }
        else
        {
            // When a grouped node is created, the definition for the first task is passed to this
            // function.  Remove the filename part of tha path for this resource
            //
            this.fileName = "group";      // change to name of directory
            // Use a custom toolip (default is to display resource uri)
            this.tooltip = util.properCase(source) + " Task Files";
            this.contextValue = "taskGroup" + util.properCase(this.taskSource);
        }

        if (util.pathExists(context.asAbsolutePath(path.join("res", "sources", this.taskSource + ".svg"))))
        {
            this.iconPath = {
                light: context.asAbsolutePath(path.join("res", "sources", this.taskSource + ".svg")),
                dark: context.asAbsolutePath(path.join("res", "sources", this.taskSource + ".svg"))
            };
        }
        else
        {
            this.iconPath = ThemeIcon.File;
        }
    }

    addScript(script: any)
    {
        this.scripts.push(script);
    }

    insertScript(script: any, index: number)
    {
        this.scripts.splice(index, 0, script);
    }

    removeScript(script: any)
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

export class TaskFolder extends TreeItem
{
    public taskFiles: (TaskFile|TaskItem)[] = [];
    public taskFolders: TaskFolder[] = [];

    public workspaceFolder: WorkspaceFolder;

    constructor(folder: WorkspaceFolder | string)
    {
        super(typeof folder === "string" ? folder  : folder.name, TreeItemCollapsibleState.Expanded);
        this.contextValue = "folder";
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

    addTaskFolder(taskFolder: TaskFolder)
    {
        if (taskFolder) {
            this.taskFolders.push(taskFolder);
        }
    }

    removeTaskFile(taskFile: TaskFile|TaskItem)
    {
        if (taskFile)
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
}
