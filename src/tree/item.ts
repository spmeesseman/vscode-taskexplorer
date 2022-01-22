
import {
    Task, TaskExecution, TreeItem, TreeItemCollapsibleState, WorkspaceFolder, ExtensionContext, tasks
}
from "vscode";
import * as path from "path";
import TaskFile from "./file";
import * as util from "../common/utils";
import { storage } from "../common/storage";
import constants from "../common/constants";
import { configuration } from "../common/configuration";


/**
 * @class TaskItem
 *
 * A tree node that represents a task.
 * An item of this type is always a child of type TaskFile in the tree.
 */
export default class TaskItem extends TreeItem
{
    private readonly context: ExtensionContext;
    public static readonly defaultSource = "Workspace";
    public readonly taskSource: string;
    public readonly taskGroup: string;
    public readonly isUser: boolean;
    public task: Task | undefined;
    public execution: TaskExecution | undefined;
    public paused: boolean;
    /**
     * Equivalent to task.definition.path
     */
    public nodePath: string;
    public groupLevel: number;
    public taskItemId: string | undefined;


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
                    displayName = taskName.replace(taskGroup + util.getGroupSeparator(), "");
                }
                else {
                    displayName = task.name.substring(0, taskName.indexOf(" - "));
                }
            }
            return displayName;
        };
        //
        // Construction
        //
        super(getDisplayName(task.name, taskGroup), TreeItemCollapsibleState.None);
        //
        // Save extension context, we need it in a few of the classes functions
        //
        this.context = context;
        //
        // Task group indicates the TaskFile group name (double check this???)
        //
        this.taskGroup = taskGroup;
        this.isUser = taskFile.isUser;
        //
        // Since we save tasks (last tasks and favorites), we need a known unique key to
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
            arguments: [this, true]         // If the def. action is 'Run', then it is redirected in the 'Open' cmd
        };
        //
        // The task source, i.e. "npm", "workspace", or any of the TaskExplorer provided task mnemonics,
        // i.e. "ant", "gulp", "batch", etc...
        //
        this.taskSource = task.source;
        //
        // Set taskItem on the task definition object for use in the task start/stop events
        //
        this.task.definition.taskItemId = this.id;
        //
        // Node path
        // 2-19-21 - This was being set to task.definition.path, which for workspace tasks doesn't
        // necessarily mean that the file path is the same (workspace task filepath is ./.vscode).
        // The 'nodePath' variable should be the same as the taskFile owner in any case, and this
        // should not have had anything to do with the issue found in ticket #133, which the same
        // situation with workspace tasks with paths set caused a never-ending loop when building
        // the task groups.  Leaving commented, as a reminder, in case of any side effect.  It gets
        // reset in _setNodePath of taskTree.createTaskGroupingsBySep while creating grouping levels.
        //
        this.nodePath = taskFile.nodePath; // task.definition.path;
        //
        // Tooltip
        //
        this.tooltip = "Open " + task.name + (task.detail ? ` | ${task.detail}` : "");
        //
        // TaskItemId, for saving
        //
        this.taskItemId = util.getTaskItemId(this);
        //
        // Refresh state - sets context value, icon path from execution state
        //
        this.refreshState();
    }


    getFolder(): WorkspaceFolder | undefined
    {
        return this.taskFile.folder.workspaceFolder;
    }


    isExecuting(task?: Task | undefined)
    {
        this.task = task ?? this.task;
        if (this.task) {
            this.execution = tasks.taskExecutions.find(e => e.task.name === this.task?.name && e.task.source === this.task.source &&
                e.task.scope === this.task.scope && e.task.definition.path === this.task.definition.path);
            return !!this.execution;
        }
        return false;
    }


    refreshState(task?: Task | undefined)
    {
        const isExecuting = this.isExecuting(task);
        if (this.task) {
            this.setContextValue(this.task, isExecuting);
            this.setIconPath(this.task, this.context, isExecuting);
        }
    }


    setContextValue(task: Task, running: boolean)
    {
        const favTasks = storage.get<string[]>(constants.FAV_TASKS_STORE, []),
              lastTasks = storage.get<string[]>(constants.LAST_TASKS_STORE, []);
        //
        // Context view controls the view parameters to the ui, see package.json /views/context node.
        //
        //     script        - Standard task item, e.g. "npm", "Workspace", "gulp", etc
        //     scriptFile    - A file that is ran as a task, ie. "batch" or "bash", i.e. script type "script".
        //     scriptRunning - Obviously, a task/script that is running.
        //
        //     scriptS        - Same as above, but for a TaskItem in the Fav/LastTasks folder
        //     scriptFileS    - Same as above, but for a TaskItem in the Fav/LastTasks folder
        //     scriptRunningS - Same as above, but for a TaskItem in the Fav/LastTasks folder
        //
        // Note that TaskItems of type 'scriptFile' can be ran with arguments and this will have an additional
        // entry added to it's context menu - "Run with arguments"
        //
        if (this.taskItemId && (util.existsInArray(favTasks, this.taskItemId) ||
                                util.existsInArray(lastTasks, this.taskItemId)))
        {
            if (task.definition.scriptFile || this.taskSource === "gradle") {
                this.contextValue = running ? "scriptRunningS" : "scriptFileS";
            }
            else {
                this.contextValue = running ? "scriptRunningS" : "scriptS";
            }
        }
        else
        {
            if (task.definition.scriptFile || this.taskSource === "gradle") {
                this.contextValue = running ? "scriptRunning" : "scriptFile";
            }
            else {
                this.contextValue = running ? "scriptRunning" : "script";
            }
        }
    }


    setIconPath(task: Task, context: ExtensionContext, running: boolean)
    {   //
        // Type "$empty" is a composite tasks
        //
        if (running) // && task.definition.type !== "$empty")
        {
            const disableAnimated = configuration.get<boolean>("disableAnimatedIcons");
            this.iconPath = {
                light: context.asAbsolutePath(path.join("res", "light", !disableAnimated ? "loading.svg" : "loadingna.svg")),
                dark: context.asAbsolutePath(path.join("res", "dark", !disableAnimated ? "loading.svg" : "loadingna.svg"))
            };
        } else
        {
            this.iconPath = {
                light: context.asAbsolutePath(path.join("res", "light", "script.svg")),
                dark: context.asAbsolutePath(path.join("res", "dark", "script.svg"))
            };
        }
    }

}
