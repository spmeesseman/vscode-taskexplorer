import { ExtensionContext, InputBoxOptions, ThemeIcon, TreeItem, TreeItemCollapsibleState, window, WorkspaceFolder } from "vscode";
import constants from "../lib/constants";
import TaskItem from "./item";
import TaskFile from "./file";
import { getTaskItemId, lowerCaseFirstChar, removeFromArray } from "../lib/utils/utils";
import TaskFolder from "./folder";
import { storage } from "../lib/utils/storage";
import * as log from "../lib/utils/log";
import * as sortTasks from "../lib/sortTasks";
import { configuration } from "../lib/utils/configuration";
import { InitScripts, LoadScripts, NoScripts } from "../lib/noScripts";
import { TaskTreeDataProvider } from "./tree";


/**
 * @class SpecialTaskFolder
 *
 * A tree node that represents a special folder i.e. the `Favorites` or `Last Tasks` folder
 */
export default class SpecialTaskFolder extends TaskFolder
{
    explorerName: string;
    explorer: TaskTreeDataProvider;
    private storeName: string;
    private isFavorites: boolean;
    private extensionContext: ExtensionContext;
    public isSpecial = true;
    public taskFiles: TaskItem[] = [];


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
        // this.disposables.push(commands.registerCommand(name + ".clearSpecialFolder", async (taskFolder: "favorites"|"lastTasks") => { await this.clearSpecialTaskFolder(taskFolder); }, this));

    }


    async addTaskFile(taskItem: TaskItem, logPad?: string)
    {
        log.methodStart(`add taskitem to ${this.label}`, 1, logPad);

        let tasks: string[];
        if (this.label === constants.LAST_TASKS_LABEL)
        {
            tasks = storage.get<string[]>(constants.LAST_TASKS_STORE, []);
        }
        else {
            tasks = storage.get<string[]>(constants.FAV_TASKS_STORE, []);
        }

        if (taskItem && taskItem.id && tasks && taskItem.task && tasks.includes(taskItem.id))
        {
            let add = true;
            const taskTree = this.explorer.getTaskTree();
            if (this.label === constants.LAST_TASKS_LABEL)
            {
                if (taskTree && (taskTree[0] && taskTree[0].label === constants.LAST_TASKS_LABEL))
                {
                    add = !this.taskFiles.find(tf => tf instanceof TaskItem && getTaskItemId(tf) === taskItem.id);
                }
            }
            else // label === constants.FAV_TASKS_LABEL
            {
                if (taskTree && taskTree[0] && taskTree[0].label === constants.FAV_TASKS_LABEL)
                {
                    add = !this.taskFiles.find(tf => tf instanceof TaskItem && getTaskItemId(tf) === taskItem.id);
                }
                else if (taskTree && taskTree[1] && taskTree[1].label === constants.FAV_TASKS_LABEL)
                {
                    add = !this.taskFiles.find(tf => tf instanceof TaskItem && getTaskItemId(tf) === taskItem.id);
                }
            }
            if (add)
            {
                const taskItem2 = new TaskItem(this.extensionContext, taskItem.taskFile, taskItem.task);
                taskItem2.id = this.label + ":" + taskItem2.id; // note 'label:' + taskItem2.id === id
                taskItem2.label = this.getSpecialTaskName(taskItem2);
                this.insertTaskFile(taskItem2, 0);
                if (this.label === constants.LAST_TASKS_LABEL)
                {
                    tasks = storage.get<string[]>(constants.LAST_TASKS_STORE, []);
                    sortTasks.sortLastTasks(this.taskFiles, tasks, logPad + "   ", 4);
                }
                else {
                    tasks = storage.get<string[]>(constants.FAV_TASKS_STORE, []);
                    sortTasks.sortTasks(this.taskFiles, logPad + "   ", 4);
                }
            }
        }

        log.methodDone(`add item to ${this.label}`, 1, logPad);
    }


    async addRemoveSpecialLabel(taskItem: TaskItem)
    {
        let removed = false,
            addRemoved = false,
            index = 0;
        const renames = storage.get<string[][]>(constants.TASKS_RENAME_STORE, []),
              id = getTaskItemId(taskItem);

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
            await this.showSpecialTasks(true, false, undefined, "   ");
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
                await storage.update(constants.FAV_TASKS_STORE, []);
                await this.showSpecialTasks(false, true);
            }
            else if (this.label === constants.LAST_TASKS_LABEL) {
                await storage.update(constants.LAST_TASKS_STORE, []);
                await this.showSpecialTasks(false);
            }
        }
    }


    /**
     * @method createSpecialFolder
     *
     * Create and add a special folder the the tree.  As of v2.0 these are the "Last Tasks" and
     * "Favorites" folders.
     *
     * @param storeName A defined constant representing the special folder ("Last Tasks", or "Favorites")
     * @see [TaskItem](TaskItem)
     * @param label The folder label to be displayed in the tree.
     * @param treeIndex The tree index to insert the created folder at.
     * @param sort Whether or not to sort any existing items in the folder.
     * @param logPad Padding to prepend to log entries.  Should be a string of any # of space characters.
     */
    async createSpecialFolder(storeName: string, label: string, treeIndex: number, sort: boolean, logPad: string)
    {
        const nodeExpandedeMap: any = configuration.get<any>("specialFolders.expanded");
        this.collapsibleState =  nodeExpandedeMap.lastTasks !== false ?
                                 TreeItemCollapsibleState.Expanded : TreeItemCollapsibleState.Collapsed;
        const lTasks = storage.get<string[]>(storeName, []);
        this.taskFiles = [];
        log.methodStart("create special tasks folder", 1, logPad, true, [
            [ "store",  storeName ], [ "name",  label ]
        ]);

        (this.explorer.getTaskTree() as TaskFolder[]|NoScripts[]|InitScripts[]|LoadScripts[]).splice(treeIndex, 0, this);

        for (const tId of lTasks)
        {
            const taskItem2 = await this.explorer.treeUtils.getTreeItem(tId, logPad + "   ");
            /* istanbul ignore else */
            if (taskItem2 && taskItem2 instanceof TaskItem && taskItem2.task)
            {
                const taskItem3 = new TaskItem(this.extensionContext, taskItem2.taskFile, taskItem2.task);
                taskItem3.id = label + ":" + taskItem3.id;
                taskItem3.label = this.getSpecialTaskName(taskItem3);
                this.insertTaskFile(taskItem3, 0);
            }
        }

        if (sort) {
            sortTasks.sortTasks(this.taskFiles, logPad + "   ");
        }

        log.methodDone("create special tasks folder", 1, logPad);
    }


    private getSpecialTaskName(taskItem: TaskItem)
    {
        let label = taskItem.taskFile.folder.label + " - " + taskItem.taskSource;
        const renames = storage.get<string[][]>(constants.TASKS_RENAME_STORE, []),
              id = getTaskItemId(taskItem);
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


    private pushToTopOfSpecialFolder(taskItem: TaskItem, label: string, treeIndex: number, logPad = "")
    {
        let taskItem2: TaskItem | undefined;
        const taskTree = this.explorer.getTaskTree();
        /* istanbul ignore next */
        const ltFolder = taskTree ? taskTree[treeIndex] as TaskFolder : undefined;
        const taskId = label + ":" + getTaskItemId(taskItem);

        /* istanbul ignore if */
        if (!ltFolder || !taskItem.task) {
            return;
        }

        for (const t of ltFolder.taskFiles)
        {
            if (t instanceof TaskItem && t.id === taskId) {
                taskItem2 = t;
                break;
            }
        }

        /* istanbul ignore else */
        if (taskItem2)
        {
            ltFolder.removeTaskFile(taskItem2);
        }
        else if (ltFolder.taskFiles.length >= configuration.get<number>("specialFolders.numLastTasks"))
        {
            ltFolder.removeTaskFile(ltFolder.taskFiles[ltFolder.taskFiles.length - 1]);
        }

        if (!taskItem2)
        {
            taskItem2 = new TaskItem(this.extensionContext, taskItem.taskFile, taskItem.task);
            taskItem2.id = taskId;
            taskItem2.label = this.getSpecialTaskName(taskItem2);
        }

        log.value(logPad + "   add item", taskItem2.id, 2);
        ltFolder.insertTaskFile(taskItem2, 0);
    }


    async saveTask(taskItem: TaskItem, logPad = "   ")
    {
        const cstTasks = storage.get<string[]>(this.storeName, []);
        const taskId =  getTaskItemId(taskItem);
        const maxTasks = configuration.get<number>("specialFolders.numLastTasks");

        log.methodStart("save task", 1, logPad, false, [
            [ "treenode label", this.label ], [ "max tasks", maxTasks ], [ "is favorite", this.isFavorites ],
            [ "task id", taskId ], [ "current saved task ids", cstTasks.toString() ]
        ]);

        //
        // Moving it to the top of the list it if it already exists
        //
        removeFromArray(cstTasks, taskId);

        if (maxTasks > 0) {
            while (cstTasks.length >= maxTasks)
            {
                cstTasks.shift();
            }
        }

        cstTasks.push(taskId);

        await storage.update(this.storeName, cstTasks);
        await this.showSpecialTasks(true, false, taskItem, logPad);

        log.methodDone("save task", 1, logPad, false, [
            [ "new saved task ids", cstTasks.toString() ]
        ]);
    }


    async showSpecialTasks(show: boolean, forceChange?: boolean, taskItem?: TaskItem, logPad = "")
    {
        let changed = true;
        const tree = this.explorer.getTaskTree();
        const isFavorite = this.label === constants.FAV_TASKS_LABEL;
        const storeName: string = !isFavorite ? constants.LAST_TASKS_STORE : constants.FAV_TASKS_STORE;
        const label = this.label as string;
        const showLastTasks = configuration.get<boolean>("specialFolders.showLastTasks");
        const favIdx = showLastTasks ? 1 : 0;
        const treeIdx = !isFavorite ? 0 : favIdx;

        log.methodStart("show special tasks", 1, logPad, false, [
            [ "is favorite", isFavorite ], [ "fav index", favIdx ], [ "tree index", treeIdx ],
            [ "show", show ], [ "has task item", !!taskItem ], [ "showLastTasks setting", showLastTasks ]
        ]);

        if (!showLastTasks && !isFavorite && !forceChange) {
            return;
        }

        if (!tree || tree.length === 0 || (tree.length === 1 &&
            (tree[0].contextValue === "noscripts" || tree[0].contextValue === "noworkspace" || tree[0].contextValue === "initscripts" || tree[0].contextValue === "loadscripts")))
        {
            log.write("   no tasks found in tree", 1, logPad);
            log.methodDone("show special tasks", 1, logPad);
            return;
        }

        if (show)
        {
            if (!taskItem || isFavorite) // refresh
            {
                taskItem = undefined;
                if (tree[treeIdx].label === label) {
                    // file deepcode ignore AttrAccessOnNull: whatever
                    tree.splice(treeIdx, 1);
                }
                changed = true;
            }

            /* istanbul ignore else */
            if (!isFavorite && tree[0].label !== label)
            {
                await this.createSpecialFolder(storeName, label, 0, false, "   ");
                changed = true;
            }
            else if (isFavorite && tree[favIdx].label !== label)
            {
                await this.createSpecialFolder(storeName, label, favIdx, true, "   ");
                changed = true;
            }
            else if (taskItem) // only 'last tasks' case here.  'favorites' are added
            {
                this.pushToTopOfSpecialFolder(taskItem, label, treeIdx);
                changed = true;
            }
        }
        else {
            if (!isFavorite && tree[0].label === constants.LAST_TASKS_LABEL)
            {
                tree.splice(0, 1);
                changed = true;
            }
            else if (isFavorite && tree[favIdx].label === constants.FAV_TASKS_LABEL)
            {
                tree.splice(favIdx, 1);
                changed = true;
            }
        }

        /* istanbul ignore else */
        if (changed) {
            this.explorer.fireTaskChangeEvents(taskItem, false, logPad, 1);
        }

        log.methodDone("show special tasks", 1, logPad);
    }


}
