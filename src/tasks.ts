
import {
    Task, TaskExecution, ThemeIcon, TreeItem, TreeItemCollapsibleState, WorkspaceFolder, env,
    TaskDefinition, ExtensionContext, tasks, Uri, workspace, ProcessExecution, ShellExecution,
    TaskScope, CustomExecution
} from "vscode";
import * as path from "path";
import * as util from "./util";
import * as os from "os";
import * as fs from "fs";
import * as constants from "./common/constants";


export class TaskItem extends TreeItem
{
    public static readonly defaultSource = "Workspace";

    public readonly task: Task | undefined;
    public readonly taskSource: string;
    public readonly taskGroup: string;
    public readonly execution: TaskExecution | undefined;
    public paused: boolean;
    public nodePath: string;
    public groupLevel: number;

    taskFile: TaskFile;

    constructor(context: ExtensionContext, taskFile: TaskFile, task: Task, taskGroup = "", groupLevel = 0)
    {
        const getDisplayName = (taskName: string, taskGroup: string): string =>
        {
            let displayName = taskName;
            if (displayName.indexOf(" - ") !== -1 && (displayName.indexOf("/") !== -1 || displayName.indexOf("\\") !== -1 ||
            displayName.indexOf(" - tsconfig.json") !== -1))
            {
                if (taskGroup) {
                    displayName = taskName.replace(taskGroup + "-", "");
                }
                else {
                    displayName = task.name.substring(0, taskName.indexOf(" - "));
                }
            }
            return displayName;
        };

        super(getDisplayName(task.name, taskGroup), TreeItemCollapsibleState.None);

        //
        // Task group indicates the TaskFile group name (???)
        //
        this.taskGroup = taskGroup;
        //
        // Since we save tasks (last tasks and favorites), we need a knownst unique key to
        // save them with.  We can just use the existing id parameter...
        //
        const fsPath = taskFile.resourceUri ? taskFile.resourceUri.fsPath : "root";
        this.id = fsPath + ":" + task.source + ":" + task.name + ":" + (taskGroup || "");
        this.paused = false;                // paused flag used by start/stop/pause task functionality
        this.taskFile = taskFile;           // Save a reference to the TaskFile that this TaskItem belongs to
        this.task = task;                   // Save a reference to the Task that this TaskItem represents
        this.groupLevel = groupLevel;       // Grouping level - indicates how many levels deep the TaskItem node is
        this.command = {                    // Note that 'groupLevel' will be set by TaskFile.addScript()
            title: "Open definition",       // Default click action is Open file since it's easy to click on accident
            command: "taskExplorer.open",   // Default click action can be set to 'Execute/Run' in Settings
            arguments: [this]               // If the def. action is 'Run', then it is redirected in the 'Open' cmd
        };

        //
        // The task source, i.e. "npm", "workspace", or any of the TaskExplorer provided tasl mnemonics,
        // i.e. "ant", "gulp", "batch", etc...
        //
        this.taskSource = task.source;

        //
        // Find an execustion for this task if it exists, this tells if it's currently running or not
        //
        this.execution = tasks.taskExecutions.find(e => e.task.name === task.name && e.task.source === task.source &&
            e.task.scope === task.scope && e.task.definition.path === task.definition.path);

        //
        // Context view controls the view parameters to the ui, see package.json /views/context node.
        //
        //     script        - Standard task item, e.g. "npm", "Workspace", "gulp", etc
        //     scriptFile    - A file that is ran as a task, ie. "batch" or "bash", i.e. script type "script".
        //     scriptRunning - Obviously, a task/script that is running.
        //
        // Note that TaskItems of type 'scriptFile' can be ran with arguments and this will have an additional
        // entry added to it's context menu - "Run with arguments"
        //
        if (this.task.definition.scriptFile || this.taskSource === "gradle") {
            this.contextValue = "scriptFile";
        }       //
        else { // Note 2/8/2021
              // I think "$composite" was the old definition type for composite tasks, because as of Code v1.53,
             // the task definition type for a comosite task is "$empty".
            //
            this.contextValue = this.execution && task.definition.type !== "$composite" ? "scriptRunning" : "script";
        }

        //
        // Set icon
        //
        // Note 2/8/2021
        // I think "$composite" was the old definition type for composite tasks, because as of Code v1.53,
        // the task definition type for a comosite task is "$empty".
        //
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
        this.nodePath = task.definition.path;
        this.tooltip = "Open " + task.name + (task.detail ? ` | ${task.detail}` : "");
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
    public groupLevel: number;
    public nodePath: string;


    constructor(context: ExtensionContext, folder: TaskFolder, taskDef: TaskDefinition, source: string, relativePath: string, group?: boolean, label?: string, groupLevel?: number)
    {
        super(TaskFile.getLabel(taskDef, label ? label : source, relativePath, group), TreeItemCollapsibleState.Collapsed);

        this.folder = folder;
        this.path = relativePath;
        this.nodePath = relativePath;
        this.taskSource = source;
        this.isGroup = (group === true);

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
            this.fileName = this.getFileNameFromSource(source, folder, taskDef, relativePath, true);
            if (folder.resourceUri)
            {
                if (relativePath)
                {
                    this.resourceUri = Uri.file(path.join(folder.resourceUri.fsPath, relativePath, this.fileName));
                } else
                {
                    this.resourceUri = Uri.file(path.join(folder.resourceUri.fsPath, this.fileName));
                }
            } //
             // No resource uri means this file is 'user tasks', and not associated to a workspace folder
            //
            else {
                this.resourceUri = Uri.file(path.join(util.getUserDataPath(), this.fileName));
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
                const pkgMgr = workspace.getConfiguration("npm").get<string>("packageManager");
                src = pkgMgr || this.taskSource;
                if (src.indexOf("npm") !== -1) { // pnpm?
                    src = "npm";
                }
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


    addScript(script: (TaskFile | TaskItem))
    {
        script.groupLevel = this.groupLevel;
        this.scripts.push(script);
    }


    getDefaultUserDataPath()
    {   //
        // Support global VSCODE_APPDATA environment variable
        //
        let appDataPath = process.env.VSCODE_APPDATA;
        //
        // Otherwise check per platform
        //
        if (!appDataPath) {
            switch (process.platform) {
                case "win32":
                    appDataPath = process.env.APPDATA;
                    if (!appDataPath) {
                        const userProfile = process.env.USERPROFILE;
                        if (typeof userProfile !== "string") {
                            throw new Error("Windows: Unexpected undefined %USERPROFILE% environment variable");
                        }
                        appDataPath = path.join(userProfile, "AppData", "Roaming");
                    }
                    break;
                case "darwin":
                    appDataPath = path.join(os.homedir(), "Library", "Application Support");
                    break;
                case "linux":
                    appDataPath = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), ".config");
                    break;
                default:
                    throw new Error("Platform not supported");
            }
        }

        return path.join(appDataPath, "vscode");
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
                if (!taskDef?.fileName?.match(/build.xml/i))
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


    getFileNameFromSource(source: string, folder: TaskFolder, taskDef: TaskDefinition, relativePath: string, incRelPathForCode?: boolean): string | null
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

        //
        // Check for casing, technically this isnt needed for windows but still
        // want it covered in local tests
        //

        // let dirPath: string;
        // if (folder!.resourceUri) {
        //     if (relativePath)
        //     {
        //         dirPath = path.join(folder!.resourceUri!.fsPath, relativePath);
        //     } else
        //     {
        //         dirPath = folder!.resourceUri!.fsPath;
        //     }
        // }
        // else {
        //     dirPath = "user"
        // }

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


    logProcessEnv()
    {
        util.log("get user data path", 1);
        util.logValue("   os", process.platform, 1);
        util.logValue("   portable", process.env.VSCODE_PORTABLE, 1);
        util.logValue("   env:VSCODE_APPDATA", process.env.VSCODE_APPDATA, 1);
        util.logValue("   env:VSCODE_APPDATA", process.env.APPDATA, 1);
        util.logValue("   env:VSCODE_APPDATA", process.env.USERPROFILE, 1);
        if (process.platform === "linux") {
            util.logValue("   env:XDG_CONFIG_HOME", process.env.XDG_CONFIG_HOME, 1);
        }
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


export class TaskFolder extends TreeItem
{
    public taskFiles: (TaskFile|TaskItem)[] = [];
    public taskFolders: TaskFolder[] = [];
    public workspaceFolder: WorkspaceFolder;


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
