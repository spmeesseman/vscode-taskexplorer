/* eslint-disable prefer-arrow/prefer-arrow-functions */

import * as util from "../utils/utils";
import log from "../log/log";
import TaskItem from "../../tree/item";
import { configuration } from "../utils/configuration";
import SpecialTaskFolder from "../../tree/specialFolder";
import { IDictionary, ITaskTreeManager } from "../../interface";
import {
    Disposable, WorkspaceFolder, tasks, TaskStartEvent, StatusBarItem, StatusBarAlignment, Task, window, TaskEndEvent
} from "vscode";


export class TaskWatcher implements Disposable
{

    private statusBarSpace: StatusBarItem;
    private treeManager: ITaskTreeManager;
    private disposables: Disposable[];
    private babysitterCt = 0;
    private babysitterTimers: IDictionary<NodeJS.Timeout> = {};
    private specialFolders: { favorites: SpecialTaskFolder; lastTasks: SpecialTaskFolder };


    constructor(treeManager: ITaskTreeManager, specialFolders: { favorites: SpecialTaskFolder; lastTasks: SpecialTaskFolder })
    {
        this.treeManager = treeManager;
        this.specialFolders = specialFolders;
        this.statusBarSpace = window.createStatusBarItem(StatusBarAlignment.Left, -10000);
        this.statusBarSpace.tooltip = "Task Explorer Running Task";
        this.disposables = [
            this.statusBarSpace,
            tasks.onDidStartTask(async (_e) => this.taskStartEvent(_e)),
            tasks.onDidEndTask(async (_e) => this.taskFinishedEvent(_e))
        ];
    }


    dispose()
    {
        this.fireAllBabySitters();
        this.disposables.forEach((d) => {
            d.dispose();
        });
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
        const taskId = taskItem.task.definition.taskItemId; // taskItem.id
        this.fireBabySitter(taskId);
        const taskTimerId = setTimeout((t: TaskItem) =>
        {
            if (t.isRunning())
            {   /* istanbul ignore if */
                if (!t.isExecuting())
                {
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
        this.babysitterTimers[taskId] = taskTimerId;
    }


    private fireAllBabySitters()
    {
        Object.keys(this.babysitterTimers).forEach(/* istanbul ignore next */(taskId) => this.fireBabySitter(taskId));
    }


    private fireBabySitter(taskId: string)
    {
        let taskTimerId: NodeJS.Timeout | undefined;
        if (taskTimerId = this.babysitterTimers[taskId]) {
            clearTimeout(taskTimerId);
            delete this.babysitterTimers[taskId];
        }
    }


    fireTaskChangeEvents(taskItem: TaskItem, logPad: string, logLevel: number)
    {
        const taskTree = this.treeManager.getTaskTree();
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
            [ "resource path", taskItem.taskFile.resourceUri.fsPath ]
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
        this.treeManager.fireTreeRefreshEvent(logPad + "   ", logLevel, taskItem.taskFile);

        //
        // Fire change event for the 'Last Tasks' folder if the task exists there
        //
        if (this.specialFolders.lastTasks.hasTask(taskItem))
        {   //
            // 'Last Tasks' folder, if enabled, will always be the 1st tree item
            //
            this.treeManager.fireTreeRefreshEvent(logPad + "   ", logLevel, taskTree[0]);
        }

        //
        // Fire change event for the 'Favorites' folder if the task exists there
        //
        if (this.specialFolders.favorites.hasTask(taskItem))
        {   //
            // 'Favorites' folder, if enabled, can be the 1st tree item or 2d, depending on if
            // the 'Last Tasks' folder is enabled, which is always the 1st item in the tree if enabled
            //
            if (taskTree[0] && taskTree[0].label === this.specialFolders.favorites.label)
            {
                this.treeManager.fireTreeRefreshEvent(logPad + "   ", logLevel, taskTree[0]);
            }
            else {
                this.treeManager.fireTreeRefreshEvent(logPad + "   ", logLevel, taskTree[1]);
            }
        }

        log.methodDone("fire task change events", logLevel, logPad);
    }


    private showStatusMessage(task: Task, logPad: string)
    {
        log.methodStart("task start/stop show/hide message", 2, logPad);
        if (task && configuration.get<boolean>("showRunningTask") === true)
        {
            const exec = tasks.taskExecutions.find(e => e.task.name === task.name && e.task.source === task.source &&
                         e.task.scope === task.scope && e.task.definition.path === task.definition.path);
            if (exec)
            {
                log.methodStart("   found running task, show status message", 2, logPad);
                let statusMsg = task.name;
                /* istanbul ignore else */
                if ((task.scope as WorkspaceFolder).name) {
                    statusMsg += " (" + (task.scope as WorkspaceFolder).name + ")";
                }
                this.statusBarSpace.text = "$(loading~spin) " + statusMsg;
                this.statusBarSpace.show();
            }
            else {
                log.methodStart("   found idle/stopped task, hide status message", 2, logPad);
                this.statusBarSpace.hide();
            }
        }
        log.methodDone("task start/stop show/hide message", 2, logPad);
    }


    private async taskStartEvent(e: TaskStartEvent)
    {
        const taskMap = this.treeManager.getTaskMap(),
              taskTree = this.treeManager.getTaskTree(),
              task = e.execution.task,
              taskId = task.definition.taskItemId,
              isMapEmpty = util.isObjectEmpty(taskMap);

        log.methodStart("task started event", 1, "", false, [[ "task name", task.name ], [ "task id", taskId ]]);

        //
        // If taskMap is empty, then this view has not yet been made visible, an there's nothing
        // to update.  The `taskTree` property should also be null.  We could probably do this
        // before the timer check above, but hey, just in case taskMap goes empty between events
        // for some un4seen reason.
        //
        if (isMapEmpty || !taskMap[taskId])
        {
            /* istanbul ignore if */ /* istanbul ignore next */
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
        }
        else
        {
            const taskItem = taskMap[taskId] as TaskItem;
            this.showStatusMessage(task, "   ");
            this.fireTaskChangeEvents(taskItem, "   ", 1);
            this.babysitRunningTask(taskItem);
        }

        log.methodDone("task started event", 1);
    }


    private async taskFinishedEvent(e: TaskEndEvent)
    {
        const taskMap = this.treeManager.getTaskMap(),
              taskTree = this.treeManager.getTaskTree(),
              task = e.execution.task,
              taskId = task.definition.taskItemId,
              isMapEmpty = util.isObjectEmpty(taskMap);

        log.methodStart("task finished event", 1, "", false, [[ "task name", task.name ], [ "task id", taskId ]]);

        this.fireBabySitter(taskId);        // fire the babysitter
        this.showStatusMessage(task, "  "); // hides

        //
        // If taskMap is empty, then this view has not yet been made visible or an event fired
        // that caused the tree to refresh (e.g. when tests end and the package.json file is
        // restored, both the file hanged and task finished events fire at the same time from
        // VSCode). So there's nothing to update in the tree right now in these cases.  The
        // `taskTree` property should also be null.  This will usually fall through when both
        // the Explorer and SideBar views are enabled, but the sidebar hasn't received a visible
        // event yet, i.e. it hasn't been opened yet by the user.
        //
        if (isMapEmpty || !taskMap[taskId])
        {
            /* istanbul ignore if */ /* istanbul ignore next */
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
        }
        else {
            this.fireTaskChangeEvents(taskMap[taskId] as TaskItem, "   ", 1);
        }

        log.methodDone("task finished event", 1);
    }

}
