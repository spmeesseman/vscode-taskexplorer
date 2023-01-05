
import * as log from "../lib/utils/log";
import * as path from "path";
import * as util from "../lib/utils/utils";
import TaskFile from "./file";
import { configuration } from "../lib/utils/configuration";
import {
    Task, TaskExecution, TreeItem, TreeItemCollapsibleState, WorkspaceFolder, ExtensionContext, tasks, Command
}
from "vscode";


/**
 * @class TaskItem
 *
 * A tree node that represents a task.
 * An item of this type is always a child of type TaskFile in the tree.
 */
export default class TaskItem extends TreeItem
{
    public readonly context: ExtensionContext; // Note:  Making this field private bombs the types
    public readonly taskSource: string;
    public readonly isUser: boolean;
    readonly taskFile: TaskFile;
    public task: Task;
    public taskDetached: Task | undefined;
    public execution: TaskExecution | undefined;
    public paused: boolean;
    /**
     * @property Equivalent to `task.definition.path`
     */
    public nodePath: string;
    public groupLevel: number;
    public id: string;
    public command: Command;


    constructor(context: ExtensionContext, taskFile: TaskFile, task: Task)
    {
        const getDisplayName = (taskName: string): string =>
        {
            let displayName = taskName;
            if (displayName.indexOf(" - ") !== -1 && (displayName.indexOf("/") !== -1 || displayName.indexOf("\\") !== -1 ||
                displayName.indexOf(" - tsconfig.json") !== -1))
            {
                displayName = task.name.substring(0, taskName.indexOf(" - "));
            }
            return displayName;
        };
        //
        // Construction
        //
        super(getDisplayName(task.name), TreeItemCollapsibleState.None);
        //
        // Save extension context, we need it in a few of the classes functions
        //
        this.context = context;
        //
        // Task group indicates the TaskFile group name (double check this???)
        //
        this.isUser = taskFile.isUser;
        //
        // Since we save tasks (last tasks and favorites), we need a known unique key to
        // save them with.  We can just use the existing id parameter...
        // 'Script' type tasks will set the file 'uri' and the 'scriptFile' flag on the task definition
        //
        const fsPath = !task.definition.scriptFile ? taskFile.resourceUri.fsPath : task.definition.uri.fsPath;
        this.id = fsPath + ":" + task.source + ":" + task.name + ":"; // <- leave trailing ':' for backwards compat
        this.paused = false;                // paused flag used by start/stop/pause task functionality
        this.taskFile = taskFile;           // Save a reference to the TaskFile that this TaskItem belongs to
        this.task = task;                   // Save a reference to the Task that this TaskItem represents
        this.groupLevel = 0;                // Grouping level - will get set by treefile.addTreeNode()
        this.command = {                    // Note that 'groupLevel' will be set by TaskFile.addScript()
            title: "Open definition",       // Default click action is Open file since it's easy to click on accident
            command: "taskExplorer.open",   // Default click action can be set to 'Execute/Run' in Settings
            arguments: [ this, true ]         // If the def. action is 'Run', then it is redirected in the 'Open' cmd
        };
        //
        // The task source, i.e. "npm", "Workspace", or any of the TaskExplorer provided task mnemonics,
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
        const taskName = util.getTaskTypeFriendlyName(task.source, true);
        this.tooltip = "Open " + task.name + (task.detail ? ` | ${task.detail}` : "") +
                        `   source : \`${taskName}\``;
        if (task.definition.type !== task.source) {
            this.tooltip += `   type   : \`${task.definition.type}\``;
        }
        //
        // Refresh state - sets context value, icon path from execution state
        //
        this.refreshState(false);
    }


    getFolder(): WorkspaceFolder | undefined
    {
        return this.taskFile.folder.workspaceFolder;
    }


    isExecuting(logPad = "   ")
    {
        log.methodStart("is executing", 5, logPad);
        const task = this.taskDetached ?? this.task;
        const execs = tasks.taskExecutions.filter(e => e.task.name === task.name && e.task.source === task.source &&
                                                  e.task.scope === task.scope && e.task.definition.path === task.definition.path);
        const exec = execs.find(e => e.task.name === task.name && e.task.source === task.source &&
                                e.task.scope === task.scope && e.task.definition.path === task.definition.path);
        if (execs.length > 1) {
            log.error(`More than one task execution was found for '${this.task.name}' !!`);
        }
        log.methodDone("is executing", 5, logPad, false, [
            [ "is executing", !!exec ], [ "task execution count", execs.length ], [ "total execution count", tasks.taskExecutions.length ]
        ]);
        return exec;
    }


    isRunning()
    {
        return !!this.contextValue?.includes("Running");
    }


    refreshState(doLog: boolean)
    {
        const isExecuting = !!this.isExecuting();
        if (doLog) log.methodStart("refresh state", 5, "   ", false, [[ "is executing", isExecuting ]]);
        this.setContextValue(this.task, isExecuting);
        this.setIconPath(this.context, isExecuting);
        if (doLog) log.methodDone("refresh state", 5, "   ", false, [[ "is executing", isExecuting ]]);
    }


    setContextValue(task: Task, running: boolean)
    {   //
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
        if (util.isSpecial(this))
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


    setIconPath(context: ExtensionContext, running: boolean)
    {   //
        // Type "$empty" is a composite tasks
        //
        if (running) // && task.definition.type !== "$empty")
        {
            const disableAnimated = configuration.get<boolean>("visual.disableAnimatedIcons");
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
