
import { TaskFile } from "./file";
import { TaskItem } from "./item";
import { log } from "../lib/log/log";
import { TaskFolder } from "./folder";
import { IEvent } from "../interface";
import { TaskTreeManager } from "./treeManager";
import { InitScripts, LoadScripts } from "../lib/noScripts";
import { Event, EventEmitter, Task, TreeItem, Disposable } from "vscode";


/**
 * @class TaskTree
 *
 * Implements the VSCode TreeDataProvider API to build a tree of tasks to display within a view.
 *
 * The typical chain of events are:
 *
 *     1. A task starts and the TaskWatcher reacts too the event.  Or, the 'refresh' command was
 *        received i.e. the refresh button was clicked on the tree ui.
 *
 *     2. The refresh() method is called
 *
 *     3. The refresh() method invalidates task caches as needed, then calls 'fireTreeRefreshEvent'
 *        to fire the change event in VSCode.
 *
 *     4. The 'fireTreeRefreshEvent' fires the tree data event to VSCode if the UI/view is visible.
 *        If not visible, the event is queued in 'eventQueue'.  The queue is processed when a
 *       'visibility' event is processed in 'onVisibilityChanged', and is processed until empty
 *        in the 'processEventQueue' function.
 *
 *     5. When a tree data change event is fired, VSCode engine will call 'getTreeChildren' to
 *        refresh the tree ui, with the TreeItem that needs to be provided (or undefined/null if
 *        asking to provide the entire tree).
 */
export class TaskTree implements Disposable
{
    private static loadStage = 0;
    private defaultGetChildrenLogLevel = 1;
    private defaultGetChildrenLogPad = "";
    private eventQueue: IEvent[] = [];
    private name: string;
    private disposables: Disposable[];
    private visible = false;
    private wasVisible = false;
    private refreshPending = false;
    private currentRefreshEvent: string | undefined;
    private getChildrenLogLevel = this.defaultGetChildrenLogLevel;
    private getChildrenLogPad = this.defaultGetChildrenLogPad;
    private treeManager: TaskTreeManager;
    private _onDidChangeTreeData: EventEmitter<TreeItem | undefined | null | void> = new EventEmitter<TreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: Event<TreeItem | undefined | null | void> = this._onDidChangeTreeData.event;


    constructor(name: "taskExplorer"|"taskExplorerSideBar", treeManager: TaskTreeManager)
    {
        this.name = name;
        this.disposables = [];
        this.treeManager = treeManager;
    }


    dispose = () =>
    {   //
        // Don't have any disposables anymore after tree manager extraction, but the disposal
        // indexing in tree manager is based on where the instance TaskTree is located, so
        // we keep the dispose() event here.  Who knows maybe we'll need it again someday. I
        // know if I removed it, i 100% would need it again.
        //
        // this.disposables.forEach((d) => {
        //     d.dispose();
        // });
        this.disposables = [];
    };


    fireTreeRefreshEvent = (logPad: string, logLevel: number, treeItem?: TreeItem) =>
    {
        const id = "pendingFireTreeRefreshEvent-" + (treeItem ? treeItem.id?.replace(/\W/g, "") : "g");
        log.methodStart("fire tree refresh event", logLevel, logPad, false, [[ "node id", id ]]);
        if (this.visible)
        {
            this.refreshPending = true;
            this._onDidChangeTreeData.fire(treeItem);
        }
        else if (this.wasVisible)
        {   // if (!this.eventQueue.find((e => e.type === "refresh" && e.id === id)))
            if (id !== this.currentRefreshEvent && !this.eventQueue.find((e => e.type === "refresh" && e.id === id)))
            {
                if (!treeItem)
                {   // if this is a global refresh, remove all other refresh events from the q
                    //  this.eventQueue.slice().reverse().forEach((value, index, obj) => {
                    //      // As of v3.0, there's only one event type, "refresh"
                    //      // if (value.type === "wsFolderRemove" || value.type === "refresh") {
                    //          this.eventQueue.splice(obj.length - 1 - index, 1);
                    //      // }
                    //  });
                    this.eventQueue.splice(0);
                }
                this.eventQueue.push(
                {
                    id,
                    delay: 1,
                    fn: this.fireTreeRefreshEvent,
                    args: [ treeItem ],
                    type: "refresh"
                });
                log.write("   refresh event has been queued", logLevel, logPad);
            }
            else {
                log.write("   a refresh event for this item is already running or queued, skip", logLevel, logPad);
            }
        }
        else
        {
            if (TaskTree.loadStage <= 1) {
                this.getChildren(treeItem);
            }
            else {
                ++TaskTree.loadStage;
            }
            log.write("   a refresh event will be skipped as the view has not yet been made visible", logLevel, logPad);
        }
        log.methodDone("fire tree refresh event", logLevel, logPad);
    };


    /**
     * The main method VSCode TaskTreeProvider calls into
     *
     * @param element The tree item requested
     * @param logPad Log padding
     * @param logLevel Log level
     */
    getChildren = async(element?: TreeItem): Promise<TreeItem[]> =>
    {
        const logPad = this.getChildrenLogPad,
              logLevel = this.getChildrenLogLevel,
              tasks = this.treeManager.getTasks(),
              taskItemTree = this.treeManager.getTaskTree();

        this.refreshPending = true;

        if (TaskTree.loadStage === 0)
        {
            ++TaskTree.loadStage;
            this.refreshPending = false;
            return [ new InitScripts(this) ];
        }
        else if (TaskTree.loadStage === 1 || !taskItemTree)
        {
            ++TaskTree.loadStage;
            this.refreshPending = false;
            if (!taskItemTree && TaskTree.loadStage > 2) {
                this.refreshPending = true;
                // setTimeout(() => this._onDidChangeTreeData.fire(), 50);
            }
            return [ new LoadScripts(this) ];
        }

        this.getChildrenLogPad = "";  // just can't see a nice way to ever line this up unless we use the log queue
        this.getChildrenLogLevel = 1; // just can't see a nice way to ever line this up unless we use the log queue

        this.logGetChildrenStart(element, tasks, logPad, logLevel);

        //
        // Set return tree items that were requested
        //
        let items: TreeItem[] = [];
        if (element instanceof TaskFolder)
        {
            log.write("   Return task folder (task files)", logLevel + 1, logPad);
            items = element.taskFiles;
        }
        else if (element instanceof TaskFile)
        {
            log.write("   Return taskfile (tasks/scripts)", logLevel + 1, logPad);
            items = element.treeNodes;
        }
        else
        {
            log.write("   Return full task tree", logLevel + 1, logPad);
            items = taskItemTree;
        }

        this.getChildrenLogPad = this.defaultGetChildrenLogPad;
        this.getChildrenLogLevel = this.defaultGetChildrenLogLevel;

        //
        // Process event queue
        //
        this.refreshPending = this.processEventQueue(logPad + "   ");

        log.methodDone("get tree children", logLevel, logPad, [
            [ "# of tasks total", tasks.length ], [ "# of tree task items returned", items.length ],
            [ "pending event", this.refreshPending ]
        ]);

        return items;
    };


    getName = () => this.name;


    public getParent(element: TreeItem): TreeItem | null
    {
        if (element instanceof TaskItem)
        {
            return element.taskFile;
        }
        else if (element instanceof TaskFile)
        {
            return element.folder;
        }
        return null;
    }


    getTreeItem = (element: TaskItem | TaskFile | TaskFolder) =>
    {
        log.methodStart("get tree item", 4, "", true, [[ "label", element.label ], [ "id", element.id ]]);
        if (element instanceof TaskItem)
        {
            log.write("   refresh task item state", 4);
            element.refreshState("   ", 4);
        }
        else {
            log.write("   get tree file/folder", 4);
        }
        log.methodDone("get tree item", 4);
        return element;
    };


    isBusy = () => this.refreshPending;


    isVisible = () => this.visible;


    private logGetChildrenStart = (element: TreeItem | undefined, tasks: Task[], logPad: string, logLevel: number) =>
    {
        log.methodStart("get tree children", logLevel, logPad, false, [
            [ "task folder", element?.label ], [ "all tasks need to be retrieved", !tasks ],
            [ "needs rebuild", !this.treeManager.getTaskTree() ], [ "instance name", this.name ]
        ]);

        if (element instanceof TaskFile)
        {
            log.values(logLevel + 1, logPad + "   ", [
                [ "tree item type", "task file" ], [ "label", element.label ], [ "id", element.id ],
                [ "description", element.description ], [ "file name", element.fileName ], [ "is user", element.isUser ],
                [ "resource path", element.resourceUri?./* istanbul ignore next */fsPath ]
            ]);
        }
        else if (element instanceof TaskFolder)
        {
            log.values(logLevel + 1, logPad + "   ", [
                [ "tree item type", "task folder" ], [ "label", element.label ], [ "id", element.id ],
                [ "description", element.description ], [ "resource path", element.resourceUri?./* istanbul ignore next */fsPath ]
            ]);
        }
        else
        {
            log.value("tree item type", "asking for all (null)", logLevel + 1, logPad + "   ");
        }
    };


    onVisibilityChanged = (visible: boolean, dataChanged: boolean) =>
    {
        log.methodStart("visibility event received", 1, "", true, [[ "is visible", visible ], [ "data changed", dataChanged ]]);
        this.visible = visible;
        if (dataChanged && this.visible && this.wasVisible)
        {
            this.processEventQueue("   ");
        }
        this.wasVisible = true;
        log.methodDone("visibility event received", 1);
        log.blank(1);
    };


    private processEventQueue = (logPad: string) =>
    {
        let firedEvent = false;
        log.methodStart("process task explorer event queue", 1, logPad, true, [[ "# of queued events", this.eventQueue.length ]]);

        if (this.eventQueue.length > 0)
        {
            const next = this.eventQueue.shift() as IEvent; // get the next event
            log.write("   loaded next queued event", 2, logPad);
            log.value("      id", next.id, 1, logPad);
            log.value("      type", next.type, 1, logPad);
            log.write(`   firing queued event with ${next.args.length} args and ${next.delay}ms delay`, 2, logPad);
            // if (next.type === "wsFolderRemove" || next.type === "refresh") { // as of 1/29/23, only these two events exist
                this.refreshPending = true;
                this.currentRefreshEvent = next.id;
            // }
            firedEvent = true;
            setTimeout(async () => {
                await next.fn.call(this, ...next.args);
                // this.refreshPending = this.processEventQueue(logPad);
            }, next.delay);
        }

        log.methodDone("process task explorer main event queue", 1, logPad);
        return firedEvent;
    };

}
