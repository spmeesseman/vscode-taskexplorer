
import constants from "../lib/constants";
import TaskItem from "./item";
import { isString, removeFromArray } from "../lib/utils/utils";
import TaskFolder from "./folder";
import { storage } from "../lib/utils/storage";
import * as log from "../lib/utils/log";
import * as sortTasks from "../lib/sortTasks";
import { configuration } from "../lib/utils/configuration";
import { InitScripts, LoadScripts, NoScripts } from "../lib/noScripts";
import { TaskTreeDataProvider } from "./tree";
import { commands, ConfigurationChangeEvent, Disposable, ExtensionContext, InputBoxOptions, ThemeIcon, TreeItem, TreeItemCollapsibleState, window, workspace } from "vscode";


/**
 * @class SpecialTaskFolder
 *
 * A tree node that represents a special folder i.e. the `Favorites` or `Last Tasks` folder
 */
export default class SpecialTaskFolder extends TaskFolder
{

    explorerName: string;
    explorer: TaskTreeDataProvider;
    private disposables: Disposable[] = [];
    private storeName: string;
    private isFavorites: boolean;
    private extensionContext: ExtensionContext;
    public isSpecial = true;
    public taskFiles: TaskItem[] = [];
    private subscriptionStartIndex = -1;
    private store: string[];
    private enabled: boolean;
    private settingNameEnabled: string;


    constructor(context: ExtensionContext, treeName: "taskExplorer"|"taskExplorerSideBar", treeProvider: TaskTreeDataProvider, label: string, state: TreeItemCollapsibleState = TreeItemCollapsibleState.Expanded)
    {
        super(label, state);
        this.contextValue = label.toLowerCase().replace(/[\W \_\-]/g, "");
        this.iconPath = ThemeIcon.Folder;
        this.explorer = treeProvider;
        this.explorerName = treeName;
        this.extensionContext = context;
        this.isFavorites = label === constants.FAV_TASKS_LABEL;
        this.storeName = this.isFavorites ? constants.FAV_TASKS_STORE : constants.LAST_TASKS_STORE;
        this.store = storage.get<string[]>(this.storeName, []);
        this.settingNameEnabled = "specialFolders.show" + label.replace(/ /g, "");
        this.enabled = configuration.get<boolean>(this.settingNameEnabled);
        this.tooltip = `A tree folder to store '${label}' tasks`;
        if (this.isFavorites)
        {
            this.disposables.push(commands.registerCommand(treeName + ".addRemoveFavorite", (taskItem: TaskItem) => this.addRemoveFavorite(taskItem), this));
            this.disposables.push(commands.registerCommand(treeName + ".clearFavorites", async() => { await this.clearSavedTasks(); }, this));
        }
        else {
            this.disposables.push(commands.registerCommand(treeName + ".clearLastTasks", async() => { await this.clearSavedTasks(); }, this));
        }
        const d = workspace.onDidChangeConfiguration(async e => { await this.processConfigChanges(context, e); }, this);
        this.disposables.push(d);
        context.subscriptions.push(...this.disposables);
        this.subscriptionStartIndex = context.subscriptions.length - (this.disposables.length + 1);
    }


    async addTaskFile(taskItem: TaskItem, logPad?: string)
    {
        if (this.store.includes(taskItem.id))
        {
            log.methodStart(`add tree taskitem to ${this.label}`, 1, logPad);

            const taskItem2 = new TaskItem(this.extensionContext, taskItem.taskFile, taskItem.task);
            taskItem2.id = this.label + ":" + taskItem2.id; // note 'label:' + taskItem2.id === id
            taskItem2.label = this.getRenamedTaskName(taskItem2);
            this.insertTaskFile(taskItem2, 0);
            this.sort(logPad + "   ");

            log.methodDone(`add tree taskitem to ${this.label}`, 1, logPad);
        }
    }


    /**
     * @method addRemoveFavorite
     * @since 2.0.0
     *
     * Adds/removes tasks from the Favorites List.  Basically a toggle, if the task exists as a
     * favorite already when this function is called, it gets removed, if it doesnt exist, it gets added.
     *
     * @param taskItem The representative TaskItem of the task to add/remove
     */
    private async addRemoveFavorite(taskItem: TaskItem)
    {
        let removed = false;
        const id = this.getTaskItemId(taskItem);

        log.methodStart("add/remove " + this.contextValue, 1, "", false, [
            [ "id", taskItem.id ], [ "current fav count", this.store.length ]
        ]);

        //
        // If this task exists in the store, remove it, if it doesnt, then add it
        //
        const idx = this.store.findIndex(f => f === id);
        if (idx === -1)
        {
            await this.saveTask(taskItem, "   ");
        }
        else {
           await this.removeTaskFile(id, true);
           removed = true;
        }

        log.methodDone("add/remove favorite", 1);
        return removed;
    }


    async removeTaskFile(taskFile: TaskItem|string, persist?: boolean)
    {
        const id = isString(taskFile) ? taskFile : taskFile.id, // getTaskItemId(taskFile);
              idx = this.taskFiles.findIndex(f => f.id === id);
        if (idx !== -1)
        {
            taskFile = this.taskFiles.splice(idx, 1)[0];
            if (persist)
            {
                const idx = this.store.findIndex(f => f === id);
                if (idx !== -1) {
                    this.store.splice(idx, 1);
                    await storage.update(constants.LAST_TASKS_STORE, this.store);
                }
            }
            // await this.refresh(true, taskFile);
            this.explorer.fireTreeRefreshEvent(this);
        }
    }


    async addRemoveRenamedLabel(taskItem: TaskItem)
    {
        let removed = false,
            addRemoved = false,
            index = 0;
        const renames = storage.get<string[][]>(constants.TASKS_RENAME_STORE, []),
              id = this.getTaskItemId(taskItem);

        log.methodStart("add/remove rename special", 1, "", false, [[ "id", id ]]);

        for (const i in renames)
        {   /* istanbul ignore else */
            if ([].hasOwnProperty.call(renames, i))
            {
                if (id === renames[i][0])
                {
                    addRemoved = true;
                    removed = true;
                    renames.splice(index, 1);
                    break;
                }
                ++index;
            }
        }

        if (!addRemoved)
        {
            const opts: InputBoxOptions = { prompt: "Enter favorites label" };
            await window.showInputBox(opts).then(async (str) =>
            {
                if (str !== undefined)
                {
                    addRemoved = true;
                    renames.push([ id, str ]);
                }
            });
        }

        //
        // Update
        //
        if (addRemoved) {
            await storage.update(constants.TASKS_RENAME_STORE, renames);
            await this.refresh(true, "   ");
        }

        log.methodDone("add/remove rename special", 1);
        return removed;
    }


    clearTaskItems()
    {
        const nodeExpandedeMap: any = configuration.get<any>("specialFolders.expanded");
        this.taskFiles = [];
        //
        // The 'Last Tasks' folder will be 1st in the tree
        //
        if (configuration.get<boolean>("specialFolders.showLastTasks") === true)
        {
            this.collapsibleState =  nodeExpandedeMap.lastTasks !== false ?
                                     TreeItemCollapsibleState.Expanded : TreeItemCollapsibleState.Collapsed;
        }

        //
        // The 'Favorites' folder will be 2nd in the tree (or 1st if configured to hide
        // the 'Last Tasks' folder)
        //
        if (configuration.get<boolean>("specialFolders.showFavorites"))
        {
            this.collapsibleState =  nodeExpandedeMap.lastTasks !== false ?
                                     TreeItemCollapsibleState.Expanded : TreeItemCollapsibleState.Collapsed;
        }
    }


    /**
     * @method clearSpecialFolder
     *
     * @param folder The TaskFolder representing either the "Last Tasks" or the "Favorites" folders.
     *
     * @since v2.0.0
     */
    async clearSavedTasks()
    {
        const choice = await window.showInformationMessage(`Clear all tasks from the \`${this.label}\` folder?`, "Yes", "No");
        if (choice === "Yes")
        {
            this.taskFiles = [];
            if (this.label === constants.FAV_TASKS_LABEL) {
                this.store = [];
                await storage.update(constants.FAV_TASKS_STORE, this.store);
                await this.refresh(true);
            }
            else if (this.label === constants.LAST_TASKS_LABEL) {
                await storage.update(constants.LAST_TASKS_STORE, this.store);
                await this.refresh(true);
            }
        }
    }


    /**
     * @method build
     *
     * Create and add a special folder the the tree.  As of v2.0 these are the "Last Tasks" and
     * "Favorites" folders.
     *
     * @param treeIndex The tree index to insert the created folder at.
     * @param sort Whether or not to sort any existing items in the folder.
     * @param logPad Padding to prepend to log entries.  Should be a string of any # of space characters.
     */
    private async build(logPad: string)
    {
        log.methodStart("create special tasks folder", 1, logPad, false, [[ "name", this.label ]]);

        const tree = this.explorer.getTaskTree();
        const showLastTasks = configuration.get<boolean>("specialFolders.showLastTasks");
        if (!tree || (!showLastTasks && !this.isFavorites)) { // && !forceChange) {
            return false;
        }

        const favIdx = showLastTasks ? 1 : 0;
        const treeIdx = !this.isFavorites ? 0 : favIdx;
        if (tree[treeIdx].label === this.label) {
            return false;
        }

        log.values(3, logPad + "   ", [[ "tree index", treeIdx ], [ "showLastTasks setting", showLastTasks ]]);

        this.taskFiles = [];

        for (const tId of this.store)
        {
            const taskItem2 = await this.explorer.getTaskMap()[tId];
            /* istanbul ignore else */
            if (taskItem2 && taskItem2 instanceof TaskItem && taskItem2.task)
            {
                const taskItem3 = new TaskItem(this.extensionContext, taskItem2.taskFile, taskItem2.task);
                taskItem3.id = this.label + ":" + taskItem3.id;
                taskItem3.label = this.getRenamedTaskName(taskItem3);
                this.insertTaskFile(taskItem3, 0);
            }
        }

        this.sort(logPad + "   ");

        tree.splice(treeIdx, 0, this);

        log.methodDone("create special tasks folder", 3, logPad);
        return true;
    }


    dispose(context: ExtensionContext)
    {
        this.taskFiles = [];
        this.disposables.forEach((d) => {
            d.dispose();
        });
        context.subscriptions.splice(this.subscriptionStartIndex, this.disposables.length);
        this.disposables = [];
    }


    private getRenamedTaskName(taskItem: TaskItem)
    {
        let label = taskItem.taskFile.folder.label + " - " + taskItem.taskSource;
        const renames = storage.get<string[][]>(constants.TASKS_RENAME_STORE, []),
              id = this.getTaskItemId(taskItem);
        for (const i in renames)
        {
            if (id === renames[i][0])
            {
                label = renames[i][1];
                break;
            }
        }
        return taskItem.label + " (" + label + ")";
    }


    getTaskItemId(taskItem: TaskItem)
    {
        return taskItem.id.replace(constants.LAST_TASKS_LABEL + ":", "")
                          .replace(constants.FAV_TASKS_LABEL + ":", "")
                          .replace(constants.USER_TASKS_LABEL + ":", "");
    }


    hasTask = (taskItem: TaskItem) => this.enabled && this.store.includes(this.getTaskItemId(taskItem));


    isEnabled = () => this.enabled;


    async processConfigChanges(ctx: ExtensionContext, e: ConfigurationChangeEvent)
    {
        if (e.affectsConfiguration("taskExplorer." + this.settingNameEnabled))
        {
            this.enabled = configuration.get<boolean>(this.settingNameEnabled);
            this.refresh(this.enabled);
        }
    }


    private pushToTop(taskItem: TaskItem, logPad = "")
    {
        const taskId = this.label + ":" + this.getTaskItemId(taskItem);

        /* istanbul ignore if */
        if (!taskItem.task) {
            return;
        }

        let taskItem2 = this.taskFiles.find(t => t instanceof TaskItem && t.id === taskId);
        /* istanbul ignore else */
        if (taskItem2)
        {
            this.removeTaskFile(taskItem2);
        }
        else if (this.taskFiles.length >= configuration.get<number>("specialFolders.numLastTasks"))
        {
            this.removeTaskFile(this.taskFiles[this.taskFiles.length - 1]);
        }

        if (!taskItem2)
        {
            taskItem2 = new TaskItem(this.extensionContext, taskItem.taskFile, taskItem.task);
            taskItem2.id = taskId;
            taskItem2.label = this.getRenamedTaskName(taskItem2);
        }

        log.value(logPad + "   add item", taskItem2.id, 2);
        this.insertTaskFile(taskItem2, 0);
        this.explorer.fireTreeRefreshEvent(this);
    }


    private async refresh(show: boolean, logPad = "")
    {
        let changed = false;
        const tree = this.explorer.getTaskTree();

        log.methodStart("show special tasks", 1, logPad, false, [[ "is favorite", this.isFavorites ], [ "show", show ]]);

        if (!tree || tree.length === 0 || (tree.length === 1 &&
            (tree[0].contextValue === "noscripts" || tree[0].contextValue === "noworkspace" || tree[0].contextValue === "initscripts" || tree[0].contextValue === "loadscripts")))
        {
            log.write("   no tasks found in tree", 1, logPad);
            log.methodDone("show special tasks", 1, logPad);
            return;
        }

        if (show)
        {
            changed = await this.build("   ");
        }
        else {
            if (tree[0].label === this.label) {
                tree.splice(0, 1);
                changed = true;
            }
            else if (tree[1].label === this.label) {
                tree.splice(1, 1);
                changed = true;
            }
        }

        /* istanbul ignore else */
        if (changed) {
            this.explorer.fireTreeRefreshEvent();
        }

        log.methodDone("show special tasks", 1, logPad);
    }


    async saveTask(taskItem: TaskItem, logPad = "   ")
    {
        const taskId =  this.getTaskItemId(taskItem);
        const maxTasks = configuration.get<number>("specialFolders.numLastTasks");

        log.methodStart("save task", 1, logPad, false, [
            [ "treenode label", this.label ], [ "max tasks", maxTasks ], [ "is favorite", this.isFavorites ],
            [ "task id", taskId ], [ "current # of saved tasks", this.store.length ]
        ]);
        log.value("current saved task ids", this.store.toString() , 3, logPad + "   ");

        //
        // Moving it to the top of the list it if it already exists
        //
        removeFromArray(this.store, taskId);

        if (maxTasks > 0) {
            while (this.store.length >= maxTasks)
            {
                this.store.shift();
            }
        }

        this.store.push(taskId);
        await storage.update(this.storeName, this.store);

        this.pushToTop(taskItem);

        log.methodDone("save task", 1, logPad, false, [[ "new # of saved tasks", this.store.length ]]);
    }


    private sort(logPad: string)
    {
        if (this.label === constants.LAST_TASKS_LABEL)
        {
            this.sortLastTasks(this.taskFiles, this.store, logPad, 4);
        }
        else {
            sortTasks.sortTasks(this.taskFiles, logPad, 4);
        }
    }


    private sortLastTasks(items: TaskItem[] | undefined, lastTasks: string[], logPad: string, logLevel: number)
    {
        log.methodStart("sort last tasks", logLevel, logPad);
        items?.sort((a: TaskItem, b: TaskItem) =>
        {   /* istanbul ignore else */
            if (a.id && b.id) {
                const aIdx = lastTasks.indexOf(a.id.replace(constants.LAST_TASKS_LABEL + ":", ""));
                const bIdx = lastTasks.indexOf(b.id.replace(constants.LAST_TASKS_LABEL + ":", ""));
                return (aIdx < bIdx ? 1 : (bIdx < aIdx ? -1 : 0));
            }
            return 0;
        });
        log.methodDone("sort last tasks", logLevel, logPad);
    }

}
