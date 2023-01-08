/* eslint-disable prefer-arrow/prefer-arrow-functions */

import * as log from "./utils/log";
import * as util from "./utils/utils";
import { IExplorerApi, ITaskExplorerApi } from "../interface";
import { teApi } from "../extension";
import TaskItem from "../tree/item";
import {
    Disposable, ExtensionContext, FileSystemWatcher, WorkspaceFolder, tasks, TaskStartEvent,
    StatusBarItem, StatusBarAlignment, Task, window, TaskEndEvent
} from "vscode";
import SpecialTaskFolder from "../tree/specialFolder";


export class TaskWatcher
{
    private static statusBarSpace: StatusBarItem;
    private tree: IExplorerApi;
    private processingTaskEvent = false;
    private eventQueue: any[] = [];
    private disposables: Disposable[];
    private subscriptionStartIndex: number;
    private babysitterCt = 0;
    private babysitterTimer: NodeJS.Timeout | undefined;
    private taskIdStartEvents: Map<string, NodeJS.Timeout> = new Map();
    private taskIdStopEvents: Map<string, NodeJS.Timeout> = new Map();
    private specialFolders: { favorites: SpecialTaskFolder; lastTasks: SpecialTaskFolder };


    constructor(tree: IExplorerApi, specialFolders: { favorites: SpecialTaskFolder; lastTasks: SpecialTaskFolder }, context: ExtensionContext)
    {
        this.tree = tree;
        this.specialFolders = specialFolders;
        this.disposables = [
            tasks.onDidStartTask(async (_e) => this.taskStartEvent(_e)),
            tasks.onDidEndTask(async (_e) => this.taskFinishedEvent(_e))
        ];
        context.subscriptions.push(...this.disposables);
        this.subscriptionStartIndex = context.subscriptions.length - (this.disposables.length + 1);
    }


    dispose(context: ExtensionContext)
    {
        this.disposables.forEach((d) => {
            d.dispose();
        });
        context.subscriptions.splice(this.subscriptionStartIndex, this.disposables.length);
        this.disposables = [];
    }


    /**
     * Used as a check to reset node state when a task 'hangs' or whatever it does sometimes
     * when the task fails ad the vscode engine doesnt trigger the taskexec finished event.
     * RUns every 2 seconds for each task that is launched.
     *
     * @param taskItem Task item
     */
    private babysitRunningTask(taskItem: TaskItem)
    {
        this.babysitterTimer = setTimeout((t: TaskItem) =>
        {
            if (t.isRunning())
            {   /* istanbul ignore if */
                if (!t.isExecuting()) {
                    // t.refreshState(false);
                    if (++this.babysitterCt >= 3)
                    {
                        this.babysitterCt = 0;
                        log.write("task babysitter firing change event", 1);
                        log.value("   task name", t.task.name, 1);
                        this.fireTaskChangeEvents(t, "   ", 1);
                    }
                    else {
                        this.babysitRunningTask(t);
                    }
                }
                else {
                    this.babysitRunningTask(t);
                }
            }
        }, 1000, taskItem);
    }


    fireTaskChangeEvents(taskItem: TaskItem, logPad?: string, logLevel?: number)
    {
        const taskTree = this.tree.getTaskTree();
        /* istanbul ignore if */
        if (!taskItem || !taskItem.task || !taskItem.taskFile) {
            log.error(`fire task change event type invalid, received ${typeof taskItem}`);
            return;
        }
        /* istanbul ignore if */
        if (!taskItem.task || !taskItem.taskFile) {
            log.error(`fire task change event invalid (${!taskItem.task}/${!taskItem.taskFile})`);
            return;
        }

        const isTaskItem = taskItem instanceof TaskItem;
        log.methodStart("fire task change events", logLevel, logPad, false, [
            [ "task name", taskItem.task.name ], [ "task type", taskItem.task.source ],
            [ "resource path", taskItem.taskFile.resourceUri.fsPath ], [ "view", this.tree.getName() ]
        ]);

        /* istanbul ignore if */
        if (!taskTree) {
            log.write("   no task tree!!", logLevel, logPad);
            log.methodDone("fire task change events", logLevel, logPad);
            return;
        }

        /* istanbul ignore if */
        if (!isTaskItem) {
            log.write("   change event object is not a taskitem!!", logLevel, logPad);
            log.methodDone("fire task change events", logLevel, logPad);
            return;
        }

        //
        // Fire change event for parent folder.  Firing the change event for the task item itself
        // does not cause the getTreeItem() callback to be called from VSCode Tree API.  Firing it
        // on the parent folder (type TreeFile) works good though.  Pre v2, we refreshed the entire
        // tree, so this is still good.  TODO possibly this gets fixed in the future to be able to
        // invalidate just the TaskItem, so check back on this sometime.
        //
        this.tree.fireTreeRefreshEvent(taskItem.taskFile, logPad + "   ", logLevel);

        //
        // Fire change event for the 'Last Tasks' folder if the task exists there
        //
        if (this.specialFolders.lastTasks.hasTask(taskItem))
        {
            if (taskTree[0] && taskTree[0].label === this.specialFolders.lastTasks.label)
            {
                this.tree.fireTreeRefreshEvent(taskTree[0], logPad + "   ", logLevel);
            }
        }

        //
        // Fire change event for the 'Favorites' folder if the task exists there
        //
        if (this.specialFolders.favorites.hasTask(taskItem))
        {
            if (taskTree[0] && taskTree[0].label === this.specialFolders.favorites.label)
            {
                this.tree.fireTreeRefreshEvent(taskTree[0], logPad + "   ", logLevel);
            }
            else if (taskTree[1] && taskTree[1].label === this.specialFolders.favorites.label)
            {
                this.tree.fireTreeRefreshEvent(taskTree[1], logPad + "   ", logLevel);
            }
        }

        log.methodDone("fire task change events", logLevel, logPad);
    }


    private showStatusMessage(task: Task)
    {
        if (task && teApi.config.get<boolean>("showRunningTask") === true)
        {
            const exec = tasks.taskExecutions.find(e => e.task.name === task.name && e.task.source === task.source &&
                         e.task.scope === task.scope && e.task.definition.path === task.definition.path);
            if (exec)
            {
                if (!TaskWatcher.statusBarSpace) {
                    TaskWatcher.statusBarSpace = window.createStatusBarItem(StatusBarAlignment.Left, -10000);
                    TaskWatcher.statusBarSpace.tooltip = "Task Explorer running task";
                }
                let statusMsg = task.name;
                /* istanbul ignore else */
                if ((task.scope as WorkspaceFolder).name) {
                    statusMsg += " (" + (task.scope as WorkspaceFolder).name + ")";
                }
                TaskWatcher.statusBarSpace.text = "$(loading~spin) " + statusMsg;
                TaskWatcher.statusBarSpace.show();
            }
            else {
                /* istanbul ignore else */
                if (TaskWatcher.statusBarSpace) {
                    TaskWatcher.statusBarSpace.dispose();
                }
            }
        }
    }


    private async taskStartEvent(e: TaskStartEvent)
    {
        const taskMap = this.tree.getTaskMap();
        const taskTree = this.tree.getTaskTree();
        //
        // Clear debounce timeout if still pending.  VScode v1.57+ emits about a dozen task
        // start/end event for a task.  Sick of these damn bugs that keep getting introduced
        // seemingly every other version AT LEAST.
        //
        const task = e.execution.task,
            taskId = task.definition.taskItemId;
        let taskTimerId: NodeJS.Timeout | undefined;
        if (taskTimerId = this.taskIdStartEvents.get(taskId)) {
            clearTimeout(taskTimerId);
            this.taskIdStartEvents.delete(taskId);
        }
        if (this.babysitterTimer) {
            clearTimeout(this.babysitterTimer);
            this.babysitterTimer = undefined;
        }
        //
        // If taskMap is empty, then this view has not yet been made visible, an there's nothing
        // to update.  The `taskTree` property should also be null.  We could probably do this
        // before the timer check above, but hey, just in case taskMap goes empty between events
        // for some un4seen reason.
        //
        const isMapEmpty = util.isObjectEmpty(taskMap);
        if (isMapEmpty || !taskMap[taskId])
        {
            /* istanbul ignore if */
            if (taskTree && !taskMap[taskId] && taskTree.length > 0 && taskTree[0].contextValue !== "noscripts")
            {
                if (task.source === "npm" && task.definition.type === "npm" &&
                (task.name === "build" || task.name === "install" || task.name === "watch" || task.name.startsWith("update")  || task.name.startsWith("audit")))
                {
                    return;
                }
                log.error(`The task map is ${isMapEmpty ? "empty" : "missing the running task"} but ` +
                        `the task tree is non-null and holds ${taskTree.length} folders (task start event)`,
                        [[ "# of tasks in task map", Object.keys(taskMap).length ], [ "task name", task.name ],
                        [ "task source", task.source ], [ "task type", task.definition.type ]]);
            }
            return;
        }
        //
        // Debounce!!  VScode v1.57+ emits about a dozen task start/end event for a task.  Sick
        // of these damn bugs that keep getting introduced seemingly every other version AT LEAST.
        //
        taskTimerId = setTimeout(async(taskEvent) =>
        {
            const task = taskEvent.execution.task,
                taskId = task.definition.taskItemId;
            try
            {   log.methodStart("task started event", 1, "", false, [[ "task name", task.name ], [ "task id", taskId ], [ "view", this.tree.getName() ]]);
                this.showStatusMessage(task);
                const taskItem = taskMap[taskId] as TaskItem;
                this.fireTaskChangeEvents(taskItem, "   ", 1);
                this.babysitRunningTask(taskItem);
                log.methodDone("task started event", 1);
            }
            catch (e) { /* istanbul ignore next */ console.error(e); }
        }, 50, e);

        this.taskIdStartEvents.set(taskId, taskTimerId);
    }


    private async taskFinishedEvent(e: TaskEndEvent)
    {
        const taskMap = this.tree.getTaskMap();
        const taskTree = this.tree.getTaskTree();
        //
        // Clear debounce timeout if still pending.  VScode v1.57+ emits about a dozen task
        // start/end event for a task.  Sick of these damn bugs that keep getting introduced
        // seemingly every other version AT LEAST.
        //
        const task = e.execution.task;
        const taskId = task.definition.taskItemId;
        let taskTimerId: NodeJS.Timeout | undefined;
        if (taskTimerId = this.taskIdStopEvents.get(taskId)) {
            clearTimeout(taskTimerId);
            this.taskIdStopEvents.delete(taskId);
        }
        if (this.babysitterTimer) {
            clearTimeout(this.babysitterTimer);
            this.babysitterTimer = undefined;
        }
        //
        // If taskMap is empty, then this view has not yet been made visible, an there's nothing
        // to update.  The `taskTree` property should also be null.  We could probably do this
        // before the timer check above, but hey, just in case taskMap goes empty between events
        // for some un4seen reason.  This willusually fall through when both the Explorer and
        // SideBar views are enabled, but the sidebar hasn't received a visible event yet, i.e.
        // it hasn't been opened yet by the user.
        //
        const isMapEmpty = util.isObjectEmpty(taskMap);
        if (isMapEmpty || !taskMap[taskId]) {
            /* istanbul ignore if */
            if (taskTree && !taskMap[taskId] && taskTree.length > 0 && taskTree[0].contextValue !== "noscripts")
            {
                if (task.source === "npm" && task.definition.type === "npm" &&
                (task.name === "build" || task.name === "install" || task.name === "watch" || task.name.startsWith("update")  || task.name.startsWith("audit")))
                {
                    return;
                }
                log.error(`The task map is ${isMapEmpty ? "empty" : "missing the running task"} but ` +
                        `the task tree is non-null and holds ${taskTree.length} folders (task start event)`,
                        [[ "# of tasks in task map", Object.keys(taskMap).length ], [ "task name", task.name ],
                        [ "task source", task.source ], [ "task type", task.definition.type ]]);
            }
            return;
        }
        //
        // Debounce!!  VScode v1.57+ emits about a dozen task start/end event for a task.  Sick
        // of these damn bugs that keep getting introduced seemingly every other version AT LEAST.
        //
        taskTimerId = setTimeout(async(taskEvent) =>
        {
            const task = taskEvent.execution.task,
                taskId = task.definition.taskItemId;
            try
            {   log.methodStart("task finished event", 1, "", false, [[ "task name", task.name ], [ "task id", taskId ], [ "view", this.tree.getName() ]]);
                this.showStatusMessage(task); // hides
                const taskItem = taskMap[taskId] as TaskItem;
                this.fireTaskChangeEvents(taskItem, "   ", 1);
                log.methodDone("task finished event", 1);
            }
            catch (e) { /* istanbul ignore next */ console.error(e); }
        }, 50, e);

        this.taskIdStopEvents.set(taskId, taskTimerId);
    }

}
