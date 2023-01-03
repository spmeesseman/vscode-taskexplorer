
import * as path from "path";
import * as util from "../lib/utils/utils";
import * as assert from "assert";
import * as log from "../lib/utils/log";
import * as sortTasks from "../lib/sortTasks";
import TaskItem from "./item";
import TaskFile from "./file";
import TaskFolder from "./folder";
import constants from "../lib/constants";
import { storage } from "../lib/utils/storage";
import { rebuildCache } from "../cache";
import { InitScripts, LoadScripts, NoScripts, NoWorkspace } from "../lib/noScripts";
import { configuration } from "../lib/utils/configuration";
import { getLicenseManager, providers, providersExternal } from "../extension";
import { ScriptTaskProvider } from "../providers/script";
import { TaskExplorerDefinition } from "../interface";
import { isTaskIncluded } from "../lib/isTaskIncluded";
import { findDocumentPosition } from "../lib/findDocumentPosition";
import { getSpecialTaskName } from "../lib/getTaskName";
import { getTerminal } from "../lib/getTerminal";
import {
    Event, EventEmitter, ExtensionContext, Task, TaskDefinition, TaskRevealKind, TextDocument,
    TreeDataProvider, TreeItem, TreeItemCollapsibleState, Uri, TaskStartEvent, TaskEndEvent,
    commands, window, workspace, tasks, Selection, WorkspaceFolder, InputBoxOptions,
    ShellExecution, StatusBarItem, StatusBarAlignment, CustomExecution, Disposable
} from "vscode";
import { IExplorerApi, TaskMap } from "../interface/explorer";
import { enableConfigWatcher } from "../lib/configWatcher";


/**
 * @class TaskTreeDataProvider
 *
 * Implements the VSCode TreeDataProvider API to build a tree of tasks to display within a view.
 */
export class TaskTreeDataProvider implements TreeDataProvider<TreeItem>, IExplorerApi
{
    private static statusBarSpace: StatusBarItem;
    private disposables: Disposable[] = [];
    private subscriptionStartIndex = -1;
    private tasks: Task[] | null = null;
    private treeBuilding = false;
    private refreshPending = false;
    private visible = false;
    private enabled = false;
    private setEnableCalled = false;
    private busy = false;
    private extensionContext: ExtensionContext;
    private name: string;
    private taskTree: TaskFolder[] | NoScripts[] | InitScripts[] | NoWorkspace[] | undefined | null | void = null;
    private currentInvalidation: string | undefined;
    private taskIdStartEvents: Map<string, NodeJS.Timeout> = new Map();
    private taskIdStopEvents: Map<string, NodeJS.Timeout> = new Map();
    private _onDidChangeTreeData: EventEmitter<TreeItem | undefined | null | void> = new EventEmitter<TreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: Event<TreeItem | undefined | null | void> = this._onDidChangeTreeData.event;


    constructor(name: string, context: ExtensionContext)
    {
        this.extensionContext = context;
        this.name = name;

        this.disposables.push(commands.registerCommand(name + ".run",  async (item: TaskItem) => { await this.run(item); }, this));
        this.disposables.push(commands.registerCommand(name + ".runNoTerm",  async (item: TaskItem) => { await this.run(item, true, false); }, this));
        this.disposables.push(commands.registerCommand(name + ".runWithArgs",  async (item: TaskItem, args: string) => { await this.run(item, false, true, args); }, this));
        this.disposables.push(commands.registerCommand(name + ".runLastTask",  async () => { await this.runLastTask(); }, this));
        this.disposables.push(commands.registerCommand(name + ".stop",  (item: TaskItem) => { this.stop(item); }, this));
        this.disposables.push(commands.registerCommand(name + ".restart",  async (item: TaskItem) => { await this.restart(item); }, this));
        this.disposables.push(commands.registerCommand(name + ".pause",  (item: TaskItem) => { this.pause(item); }, this));
        this.disposables.push(commands.registerCommand(name + ".open", async (item: TaskItem, itemClick: boolean) => { await this.open(item, itemClick); }, this));
        this.disposables.push(commands.registerCommand(name + ".openTerminal", (item: TaskItem) => { this.openTerminal(item); }, this));
        this.disposables.push(commands.registerCommand(name + ".refresh", async () => { await this.refresh(true, false); }, this));
        this.disposables.push(commands.registerCommand(name + ".runInstall", async (taskFile: TaskFile) => { await this.runNpmCommand(taskFile, "install"); }, this));
        this.disposables.push(commands.registerCommand(name + ".runUpdate", async (taskFile: TaskFile) => { await this.runNpmCommand(taskFile, "update"); }, this));
        this.disposables.push(commands.registerCommand(name + ".runUpdatePackage", async (taskFile: TaskFile) => { await this.runNpmCommand(taskFile, "update <packagename>"); }, this));
        this.disposables.push(commands.registerCommand(name + ".runAudit", async (taskFile: TaskFile) => { await this.runNpmCommand(taskFile, "audit"); }, this));
        this.disposables.push(commands.registerCommand(name + ".runAuditFix", async (taskFile: TaskFile) => { await this.runNpmCommand(taskFile, "audit fix"); }, this));
        this.disposables.push(commands.registerCommand(name + ".addToExcludes", async (taskFile: TaskFile | TaskItem | string) => { await this.addToExcludes(taskFile); }, this));
        this.disposables.push(commands.registerCommand(name + ".addRemoveFromFavorites", (taskItem: TaskItem) => this.addRemoveFavorite(taskItem), this));
        this.disposables.push(commands.registerCommand(name + ".addRemoveCustomLabel", (taskItem: TaskItem) => this.addRemoveSpecialLabel(taskItem), this));
        this.disposables.push(commands.registerCommand(name + ".clearSpecialFolder", async (taskFolder: TaskFolder) => { await this.clearSpecialFolder(taskFolder); }, this));
        context.subscriptions.push(...this.disposables);
        this.subscriptionStartIndex = context.subscriptions.length - 20;
        tasks.onDidStartTask(async (_e) => this.taskStartEvent(_e));
        tasks.onDidEndTask(async (_e) => this.taskFinishedEvent(_e));
    }


    public dispose(context: ExtensionContext)
    {
        this.disposables.forEach((d) => {
            d.dispose();
        });
        context.subscriptions.splice(this.subscriptionStartIndex, 19);
        this.disposables = [];
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
        const favTasks = storage.get<string[]>(constants.FAV_TASKS_STORE, []);
        const favId = util.getTaskItemId(taskItem);

        log.methodStart("add/remove favorite", 1, "", false, [
            [ "id", taskItem.id ], [ "current fav count", favTasks.length ]
        ]);

        //
        // If this task exists in the favorites, remove it, if it doesnt, then add it
        //
        if (!favTasks.includes(favId))
        {
            await this.saveTask(taskItem, -1, true);
        }
        else //
        {   // Remove
            //
            util.removeFromArray(favTasks, favId);
            log.value("   new fav count", favTasks.length, 2);
            //
            // Update local storage for persistence
            //
            await storage.update(constants.FAV_TASKS_STORE, favTasks);
            //
            // Update
            //
            await this.showSpecialTasks(true, true, false, undefined, "   ");
            removed = true;
        }

        log.methodDone("add/remove favorite", 1);
        return removed;
    }


    private async addRemoveSpecialLabel(taskItem: TaskItem)
    {
        let removed = false,
            addRemoved = false,
            index = 0;
        const renames = storage.get<string[][]>(constants.TASKS_RENAME_STORE, []),
              id = util.getTaskItemId(taskItem);

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
            await this.showSpecialTasks(true, true, false, undefined, "   ");
            await this.showSpecialTasks(true, false, false, undefined, "   ");
        }

        log.methodDone("add/remove rename special", 1);
        return removed;
    }


    private async addToExcludes(selection: TaskFile | TaskItem | string)
    {
        let pathValue = "";
        let uri: Uri | undefined;
        let excludesList = "exclude";

        log.methodStart("add to excludes", 1, "", true, [[ "global", global ]]);

        if (selection instanceof TaskFile)
        {
            uri = selection.resourceUri;
            if (selection.isGroup)
            {
                log.write("   file group");
                pathValue = "";
                for (const each of selection.treeNodes)
                {
                    if (each.resourceUri) {
                        pathValue += each.resourceUri.path;
                        pathValue += ",";
                    }
                }
                if (pathValue) {
                    pathValue = pathValue.substring(0, pathValue.length - 1);
                }
            }
            else
            {
                log.value("   file glob", uri.path);
                pathValue = uri.path;
            }
        }
        else if (selection instanceof TaskItem)
        {
            if (util.isScriptType(selection.taskSource))
            {
                /* istanbul ignore else */ /* istanbul ignore next */
                if (selection.resourceUri) {
                    /* istanbul ignore next */
                    log.value("   file glob", selection.resourceUri.path);
                    /* istanbul ignore next */
                    pathValue = selection.resourceUri.path;
                }
                else if (selection.taskFile) {
                    log.value("   file glob", selection.taskFile.resourceUri.path);
                    pathValue = selection.taskFile.resourceUri.path;
                }
            }
            else {
                excludesList = "excludeTask";
                pathValue = selection.task.name;
            }
        }
        else {
            pathValue = selection;
        }

        if (!pathValue) {
            return;
        }
        log.value("   path value", pathValue, 2);

        const excludes = configuration.get<string[]>(excludesList),
              paths = pathValue.split(",");
        for (const s in paths) {
            /* istanbul ignore else */
            if ({}.hasOwnProperty.call(paths, s)) {
                util.pushIfNotExists(excludes, paths[s]);
            }
        }

        enableConfigWatcher(false);
        await configuration.updateWs(excludesList, excludes);
        // await configuration.update(excludesList, excludes);
        await this.refresh(selection instanceof TaskItem || selection instanceof TaskFile ? selection.taskSource : false,
                           !(selection instanceof TaskItem) ? uri : false);
        enableConfigWatcher(true);

        log.methodDone("add to excludes", 1);
    }


    private addToSpecialFolder(taskItem: TaskItem, folder: any, tasks: string[], label: string)
    {
        if (taskItem && taskItem.id && folder && tasks && label && taskItem.task && tasks.includes(taskItem.id))
        {
            const taskItem2 = new TaskItem(this.extensionContext, taskItem.taskFile, taskItem.task);
            taskItem2.id = label + ":" + taskItem2.id;
            taskItem2.label = getSpecialTaskName(taskItem2);
            folder.insertTaskFile(taskItem2, 0);
        }
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
        setTimeout((t: TaskItem) =>
        {
            if (t.isRunning())
            {   /* istanbul ignore if */
                if (!t.isExecuting()) {
                    // t.refreshState(false);
                    this.fireTaskChangeEvents(t, "", 5);
                }
                else {
                    this.babysitRunningTask(t);
                }
            }
        }, 1000, taskItem);
    }


    private async buildGroupings(folders: Map<string, TaskFolder>, logPad: string, logLevel: number)
    {
        log.methodStart("build tree node groupings", logLevel, logPad);

        //
        // Sort nodes.  By default the project folders are sorted in the same order as that
        // of the Explorer.  Sort TaskFile nodes and TaskItems nodes alphabetically, by default
        // its entirely random as to when the individual providers report tasks to the engine
        //
        // After the initial sort, create any task groupings based on the task group separator.
        // 'folders' are the project/workspace folders.
        //
        for (const [ key, folder ] of folders)
        {
            if (key === constants.LAST_TASKS_LABEL || key === constants.FAV_TASKS_LABEL) {
                continue;
            }
            sortTasks.sortTaskFolder(folder, logPad + "   ", logLevel + 1);
            //
            // Create groupings by task type
            //
            /* istanbul ignore else */
            if (configuration.get("groupWithSeparator")) // && key !== constants.USER_TASKS_LABEL)
            {
                await this.createTaskGroupings(folder, logPad + "   ", logLevel + 1);
            }
        }

        log.methodDone("build tree node groupings", logLevel, logPad);
    }


    public async buildTaskTree(tasksList: Task[], logPad: string, logLevel: number, force?: boolean)
    {
        let taskCt = 0;
        const folders: Map<string, TaskFolder> = new Map();
        const files: Map<string, TaskFile> = new Map();
        let ltFolder: TaskFolder | undefined,
            favFolder: TaskFolder | undefined;

        log.methodStart("build task tree", logLevel, logPad);

        if (tasksList.length === 0)
        {
            log.methodDone("build task tree", logLevel, logPad);
            return [ new NoScripts() ];
        }

        this.treeBuilding = true;
        const nodeExpandedeMap: any = configuration.get<any>("specialFolders.expanded");

        //
        // The 'Last Tasks' folder will be 1st in the tree
        //
        const lastTasks = storage.get<string[]>(constants.LAST_TASKS_STORE, []);
        if (configuration.get<boolean>("specialFolders.showLastTasks") === true)
        {
            // if (lastTasks && lastTasks.length > 0)
            // {
                ltFolder = new TaskFolder(constants.LAST_TASKS_LABEL, nodeExpandedeMap.lastTasks !== false ?
                                                                      TreeItemCollapsibleState.Expanded : TreeItemCollapsibleState.Collapsed);
                folders.set(constants.LAST_TASKS_LABEL, ltFolder);
            // }
        }

        //
        // The 'Favorites' folder will be 2nd in the tree (or 1st if configured to hide
        // the 'Last Tasks' folder)
        //
        const favTasks = storage.get<string[]>(constants.FAV_TASKS_STORE, []);
        if (configuration.get<boolean>("specialFolders.showFavorites"))
        {
            // if (favTasks && favTasks.length > 0)
            // {
                favFolder = new TaskFolder(constants.FAV_TASKS_LABEL, nodeExpandedeMap.favorites !== false ?
                                                                    TreeItemCollapsibleState.Expanded : TreeItemCollapsibleState.Collapsed);
                folders.set(constants.FAV_TASKS_LABEL, favFolder);
            // }
        }

        //
        // Loop through each task provided by the engine and build a task tree
        //
        for (const each of tasksList)
        {
            log.blank(2);
            log.write(`   Processing task ${++taskCt} of ${tasksList.length} (${each.source})`, logLevel, logPad);
            this.buildTaskTreeList(each, folders, files, ltFolder, favFolder, lastTasks, favTasks, logPad + "   ");
        }

        //
        // Sort and build groupings
        //
        await this.buildGroupings(folders, logPad + "   ", logLevel);

        //
        // Sort the 'Last Tasks' folder by last time run
        //
        sortTasks.sortLastTasks(ltFolder?.taskFiles, lastTasks, logPad + "   ", logLevel);

        //
        // Sort the 'Favorites' folder
        //
        sortTasks.sortTasks(favFolder?.taskFiles, logPad + "   ", logLevel);

        //
        // Get sorted root project folders (only project folders are sorted, special folders 'Favorites',
        // 'User Tasks' and 'Last Tasks' are kept at the top of the list.
        //
        const sortedFolders = sortTasks.sortFolders(folders);

        //
        // Done!
        //
        log.methodDone("build task tree", logLevel, logPad);
        this.treeBuilding = false;

        return sortedFolders;
    }


    /**
     * @method buildTaskTreeList
     *
     * @param each The Task that the tree item to be created will represent.
     * @param folders The map of existing TaskFolder items.  TaskFolder items represent workspace folders.
     * @param files The map of existing TaskFile items.
     * @param ltFolder The TaskFolder representing "Last Tasks"
     * @param favFolder The TaskFolder representing "Favorites"
     * @param lastTasks List of Task ID's currently in the "Last Tasks" TaskFolder.
     * @param favTasks List of Task ID's currently in the "Favorites" TaskFolder.
     * @param logPad Padding to prepend to log entries.  Should be a string of any # of space characters.
     */
    private buildTaskTreeList(each: Task, folders: Map<string, TaskFolder>, files: Map<string, TaskFile>, ltFolder: TaskFolder | undefined, favFolder: TaskFolder | undefined, lastTasks: string[], favTasks: string[], logPad: string)
    {
        let folder: TaskFolder | undefined,
            scopeName: string;

        log.methodStart("build task tree list", 2, logPad, true, [
            [ "name", each.name ], [ "source", each.source ], [ "scope", each.scope ],
            [ "definition type", each.definition.type ], [ "definition path", each.definition.path ]
        ]);

        const definition: TaskExplorerDefinition | TaskDefinition = each.definition;
        let relativePath = definition.path ?? "";
        const nodeExpandedeMap: any = configuration.get<any>("specialFolders.expanded");

        //
        // Make sure this task shouldn't be ignored based on various criteria...
        // Process only if this task type/source is enabled in settings or is scope is empty (VSCode provided task)
        // By default, also ignore npm 'install' tasks, since its available in the context menu, ignore
        // other providers unless it has registered as an external provider via Task Explorer API
        //
        const include: boolean | string = isTaskIncluded(each, relativePath, logPad + "   ");
        if (!include) {
            log.methodDone("build task tree list", 2, logPad);
            return;
        }

        const isNpmInstallTask = include === "npm-install";
        if (typeof include === "string" && !isNpmInstallTask) { // TSC tasks may have had their rel. pathchanged
            relativePath = include;
            log.value(logPad + "   set relative path", relativePath, 2);
        }

        //
        // Set scope name and create the TaskFolder, a "user" task will have a TaskScope scope, not
        // a WorkspaceFolder scope.
        //
        /* istanbul ignore else */
        if (util.isWorkspaceFolder(each.scope))
        {
            scopeName = each.scope.name;
            folder = folders.get(scopeName);
            if (!folder)
            {
                folder = new TaskFolder(each.scope, nodeExpandedeMap[util.lowerCaseFirstChar(scopeName, true)] !== false ?
                                                    TreeItemCollapsibleState.Expanded : TreeItemCollapsibleState.Collapsed);
                folders.set(scopeName, folder);
            }
        }     //
        else // User Task (not related to a ws or project)
        {   //
            scopeName = constants.USER_TASKS_LABEL;
            folder = folders.get(scopeName);
            if (!folder)
            {
                folder = new TaskFolder(scopeName, nodeExpandedeMap[util.lowerCaseFirstChar(scopeName, true)] !== false ?
                                                TreeItemCollapsibleState.Expanded : TreeItemCollapsibleState.Collapsed);
                folders.set(scopeName, folder);
            }
        }

        //
        // Log the task details
        //
        this.logTask(each, scopeName, logPad + "   ");

        //
        // Get task file node, this will create one of it doesn't exist
        //
        const taskFile = this.getTaskFileNode(each, folder, files, relativePath, scopeName, logPad + "   ");

        //
        // Create and add task item to task file node
        //
        // If this is an 'NPM Install' task, then we do not add the "tree item".  We do however add
        // the "tree file" (above), so that the npm management tasks (including install update, audit,
        // etc) are available via context menu of the "tree file" that represents the folder that the
        // package.json file is found in.  Pre-v2.0.5, we exited earlier if an 'npm install' task was
        // found, but in doing so, if there were no npm "scripts" in the package.json, code execution
        // would not get far enough to create the "tree file" node for the context menu.
        //
        if (!isNpmInstallTask)
        {   //
            // Create "tree item" node and add it to the owner "tree file" node
            //
            const taskItem = new TaskItem(this.extensionContext, taskFile, each);
            taskFile.addTreeNode(taskItem);
            //
            // Add this task to the 'Last Tasks' folder if we need to
            //
            this.addToSpecialFolder(taskItem, ltFolder, lastTasks, constants.LAST_TASKS_LABEL);
            //
            // Add this task to the 'Favorites' folder if we need to
            //
            this.addToSpecialFolder(taskItem, favFolder, favTasks, constants.FAV_TASKS_LABEL);
        }

        log.methodDone("build task tree list", 2, logPad);
    }


    /**
     * @method clearSpecialFolder
     *
     * @param folder The TaskFolder representing either the "Last Tasks" or the "Favorites" folders.
     *
     * @since v2.0.0
     */
    private async clearSpecialFolder(folder: TaskFolder | string)
    {
        const isString = typeof folder === "string" || folder instanceof String,
              choice = isString ? "Yes" : await window.showInformationMessage("Clear all tasks from this folder?", "Yes", "No"),
              // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
              label = isString ? folder : (folder as TaskFolder).label;
        if (choice === "Yes")
        {
            if (label === constants.FAV_TASKS_LABEL) {
                await storage.update(constants.FAV_TASKS_STORE, []);
                await this.showSpecialTasks(false, true);
            }
            else if (label === constants.LAST_TASKS_LABEL) {
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
    private async createSpecialFolder(storeName: string, label: string, treeIndex: number, sort: boolean, logPad: string)
    {
        const nodeExpandedeMap: any = configuration.get<any>("specialFolders.expanded");
        const lTasks = storage.get<string[]>(storeName, []);
        const folder = new TaskFolder(label, nodeExpandedeMap[util.lowerCaseFirstChar(storeName, true)] !== false ?
                                             TreeItemCollapsibleState.Expanded : TreeItemCollapsibleState.Collapsed);

        log.methodStart("create special tasks folder", 1, logPad, true, [
            [ "store",  storeName ], [ "name",  label ]
        ]);

        (this.taskTree as TaskFolder[]|NoScripts[]|InitScripts[]|NoWorkspace[]).splice(treeIndex, 0, folder);

        for (const tId of lTasks)
        {
            const taskItem2 = await this.getTaskItems(tId, logPad + "   ");
            /* istanbul ignore else */
            if (taskItem2 && taskItem2 instanceof TaskItem && taskItem2.task)
            {
                const taskItem3 = new TaskItem(this.extensionContext, taskItem2.taskFile, taskItem2.task);
                taskItem3.id = label + ":" + taskItem3.id;
                taskItem3.label = getSpecialTaskName(taskItem3);
                folder.insertTaskFile(taskItem3, 0);
            }
        }

        if (sort) {
            sortTasks.sortTasks(folder.taskFiles, logPad + "   ");
        }

        log.methodDone("create special tasks folder", 1, logPad);
    }


    /**
     * @method createTaskGroupings
     * @since 1.28.0
     *
     * Creates main task groupings, i.e. 'npm', 'vscode', 'batch', etc, for a given {@link TaskFolder}
     *
     * @param folder The TaskFolder to process
     */
    private async createTaskGroupings(folder: TaskFolder, logPad: string, logLevel: number)
    {
        let prevTaskFile: TaskItem | TaskFile | undefined;
        const subfolders: Map<string, TaskFile> = new Map();

        log.methodStart("create tree node folder grouping", logLevel, logPad, true, [[ "project folder", folder.label ]]);

        for (const each of folder.taskFiles)
        {   //
            // Only processitems of type 'TaskFile'
            //
            /* istanbul ignore if */
            if (!(each instanceof TaskFile)) {
                continue;
            }
            //
            // Check if current taskfile source is equal to previous (i.e. ant, npm, vscode, etc)
            //
            if (prevTaskFile && prevTaskFile.taskSource === each.taskSource)
            {
                const id = folder.label + each.taskSource;
                let subfolder: TaskFile | undefined = subfolders.get(id);
                if (!subfolder)
                {
                    log.values(logLevel + 2, logPad, [
                        [ "   Add source file sub-container", each.path ],
                        [ "      id", id ]
                    ], true);
                    const node = each.treeNodes[0];
                    /* istanbul ignore else */
                    if (node instanceof TaskItem)
                    {
                        subfolder = new TaskFile(this.extensionContext, folder, node.task.definition,
                                                each.taskSource, each.path, 0, true, undefined, "   ");
                        subfolders.set(id, subfolder);
                        folder.addTaskFile(subfolder);
                        //
                        // Since we add the grouping when we find two or more equal group names, we are iterating
                        // over the 2nd one at this point, and need to add the previous iteration's TaskItem to the
                        // new group just created
                        //
                        subfolder.addTreeNode(prevTaskFile); // addScript will set the group level on the TaskItem
                    }
                }
                /* istanbul ignore else */
                if (subfolder && subfolder.nodePath !== each.nodePath) {
                    subfolder.addTreeNode(each); // addScript will set the group level on the TaskItem
                }
            }
            prevTaskFile = each;
            //
            // Create the grouping
            //
            await this.createTaskGroupingsBySep(folder, each, subfolders, 0, logPad + "   ", logLevel + 1);
        }

        //
        // For groupings with separator, when building the task tree, when tasks are grouped new task definitions
        // are created but the old task remains in the parent folder.  Remove all tasks that have been moved down
        // into the tree hierarchy due to groupings
        //
        this.removeGroupedTasks(folder, subfolders, logPad + "   ", logLevel + 1);

        //
        // For groupings with separator, now go through and rename the labels within each group minus the
        // first part of the name split by the separator character (the name of the new grouped-with-separator node)
        //
        log.write(logPad + "   rename grouped tasks", logLevel);
        folder.taskFiles.filter(t => t instanceof TaskFile).forEach(async (tf) =>
        {
            await this.renameGroupedTasks(tf as TaskFile);
        });

        //
        // Resort after making adds/removes
        //
        sortTasks.sortTaskFolder(folder, logPad + "   ", logLevel + 1);

        log.methodDone("create tree node folder grouping", logLevel, logPad);
    }


    /**
     * @method createTaskGroupingsBySep
     * @since 1.29.0
     *
     *  Build groupings by separator
     *
     *  For example, consider the set of task names/labels:
     *
     *      build-prod
     *      build-dev
     *      build-server-dev
     *      build-server-prod
     *      build-sass
     *
     * If the option 'groupWithSeparator' is ON and 'groupSeparator' is set, then group this set of tasks.
     * By default the hierarchy would look like:
     *
     *      build
     *          prod
     *          dev
     *          server-dev
     *          server-prod
     *          sass
     *
     * If 'groupMaxLevel' is > 1 (default), then the hierarchy continues to be broken down until the max
     * nesting level is reached.  The example above, with 'groupMaxLevel' set > 1, would look like:
     *
     *      build
     *          prod
     *          dev
     *          server
     *             dev
     *             prod
     *          sass
     *
     * @param folder The base task folder
     * @param each  Task file to process
     * @param prevTaskFile Previous task file processed
     * @param subfolders Tree taskfile map
     * @param groupSeparator The group separator
     */
    private async createTaskGroupingsBySep(folder: TaskFolder, taskFile: TaskFile, subfolders: Map<string, TaskFile>, treeLevel: number, logPad: string, logLevel: number)
    {
        let prevName: string[] | undefined;
        let prevTaskItem: TaskItem | undefined;
        const newNodes: TaskFile[] = [];
        const groupSeparator = util.getGroupSeparator();
        const atMaxLevel: boolean = configuration.get<number>("groupMaxLevel") <= treeLevel + 1;

        log.methodStart("create task groupings by separator", logLevel, logPad, true, [
            [ "folder", folder.label ], [ "label (node name)", taskFile.label ], [ "grouping level", treeLevel ], [ "is group", taskFile.isGroup ],
            [ "file name", taskFile.fileName ], [ "folder", folder.label ], [ "path", taskFile.path ], [ "tree level", treeLevel ]
        ]);

        const _setNodePath = (t: TaskItem | undefined, cPath: string) =>
        {
            /* istanbul ignore else */
            if (t && !atMaxLevel && prevName)
            {
                log.write("   setting node path", logLevel + 2, logPad);
                log.value("      current", t.nodePath, logLevel + 2, logPad);
                /* istanbul ignore if */
                if (!t.nodePath && taskFile.taskSource === "Workspace")
                {   //
                    // Reference Ticket #?. Fixes never ending loop with specific case VSCode tasks.
                    //
                    t.nodePath = path.join(".vscode", prevName[treeLevel]);
                }
                else if (!t.nodePath) {
                    t.nodePath = prevName[treeLevel];
                }
                else {
                    t.nodePath = path.join(cPath, prevName[treeLevel]);
                }
                log.value("      new", t.nodePath, logLevel + 2, logPad);
            }
        };

        for (const each of taskFile.treeNodes)
        {
            if (!(each instanceof TaskItem) || !each.task || !each.label) {
                continue;
            }
            const label = each.label.toString();
            let subfolder: TaskFile | undefined;
            const prevNameThis = label.split(groupSeparator);
            const prevNameOk = prevName && prevName.length > treeLevel && prevName[treeLevel];

            log.write("   process task item", logLevel + 1, logPad);
            log.values(logLevel + 2, logPad + "      ", [
                [ "id", each.id ], [ "label", label ], [ "node path", each.nodePath ], [ "command", each.command.command ],
                [ "previous name [tree level]", prevName && prevNameOk ? prevName[treeLevel] : "undefined" ],
                [ "this previous name", prevNameThis ]
            ]);

            //
            // Check if we're in a state to create a new group.
            // If 'prevName' length > 1, then this task was grouped using the group separator, for
            // example:
            //
            //     build-ui-dev
            //     build-ui-production
            //     build-svr-trace
            //     build-svr-debug
            //     build-svr-production
            //
            // There may be other tasks, if we are grouping at more than one level, that may match
            // another set of tasks in separate parts of the groupings, for example:
            //
            //     wp-build-ui-dev
            //     wp-build-ui-production
            //     wp-build-svr-trace
            //     wp-build-svr-debug
            //     wp-build-svr-production
            //
            let foundGroup = false;
            if (prevName && prevNameOk && prevNameThis && prevNameThis.length > treeLevel)
            {
                for (let i = 0; i <= treeLevel; i++)
                {
                    if (prevName[i] === prevNameThis[i]) {
                        log.write("   found group", 4, logPad);
                        foundGroup = true;
                    }
                    else {
                        foundGroup = false;
                        break;
                    }
                }
            }

            if (foundGroup && prevName)
            {   //
                // We found a pair of tasks that need to be grouped.  i.e. the first part of the label
                // when split by the separator character is the same...
                //
                const id = this.getGroupedId(folder, taskFile, label, treeLevel);
                subfolder = subfolders.get(id);

                if (!subfolder)
                {   //
                    // Create the new node, add it to the list of nodes to add to the tree.  We must
                    // add them after we loop since we are looping on the array that they need to be
                    // added to
                    //
                    subfolder = new TaskFile(this.extensionContext, folder, each.task.definition, taskFile.taskSource,
                                             each.taskFile.path, treeLevel, true, prevName[treeLevel], logPad);
                    subfolders.set(id, subfolder);
                    _setNodePath(prevTaskItem, each.nodePath);
                    //
                    // Since we add the grouping when we find two or more equal group names, we are iterating
                    // over the 2nd one at this point, and need to add the previous iteration's TaskItem to the
                    // new group just created
                    //
                    subfolder.addTreeNode(prevTaskItem); // addScript will set the group level on the TaskItem
                    newNodes.push(subfolder);
                }

                _setNodePath(each, each.nodePath);
                subfolder.addTreeNode(each); // addScript will set the group level on the TaskItem
            }

            if (label.includes(groupSeparator)) {
                prevName = label.split(groupSeparator);
            }
            prevTaskItem = each;
        }

        //
        // If there are new grouped by separator nodes to add to the tree...
        //
        if (newNodes.length > 0)
        {
            let numGrouped = 0;
            for (const n of newNodes)
            {
                taskFile.insertTreeNode(n, numGrouped++);
                /* istanbul ignore else */
                if (!atMaxLevel)
                {
                    await this.createTaskGroupingsBySep(folder, n, subfolders, treeLevel + 1, logPad + "   ", logLevel + 1);
                }
            }
        }

        log.methodDone("create task groupings by separator", logLevel, logPad);
    }


    private fireTaskChangeEvents(taskItem: TaskItem, logPad: string, logLevel: number)
    {
        /* istanbul ignore next */
        if (!this.taskTree || !taskItem) {
            /* istanbul ignore next */
            log.error("task change event fire, invalid argument");
            /* istanbul ignore next */
            return;
        }

        log.methodStart("fire task change events", logLevel, logPad);

        //
        // Fire change event for parent folder.  Firing the change event for the task item itself
        // does not cause the getTreeItem() callback to be called from VSCode Tree API.  Firing it
        // on the parent folder (type TreeFile) works good though.  Pre v2, we refreshed the entire
        // tree, so this is still good.  TODO possibly this gets fixed in the future to be able to
        // invalidate just the TaskItem, so check back on this sometime.
        //
        this._onDidChangeTreeData.fire(taskItem.taskFile);

        //
        // Fire change event for the 'Last Tasks' folder if the task exists there
        //
        if (configuration.get<boolean>("specialFolders.showLastTasks") === true)
        {
            const lastTasks = storage.get<string[]>(constants.LAST_TASKS_STORE, []);
            if (lastTasks.includes(util.getTaskItemId(taskItem)) !== false)
            {
                if (this.taskTree[0] && this.taskTree[0].label === constants.LAST_TASKS_LABEL)
                {
                    this._onDidChangeTreeData.fire(this.taskTree[0]);
                }
            }
        }

        //
        // Fire change event for the 'Favorites' folder if the task exists there
        //
        const favTasks = storage.get<string[]>(constants.FAV_TASKS_STORE, []);
        if (favTasks.includes(util.getTaskItemId(taskItem)) !== false)
        {
            if (this.taskTree[0] && this.taskTree[0].label === constants.FAV_TASKS_LABEL)
            {
                this._onDidChangeTreeData.fire(this.taskTree[0]);
            }
            else if (this.taskTree[1] && this.taskTree[1].label === constants.FAV_TASKS_LABEL)
            {
                this._onDidChangeTreeData.fire(this.taskTree[1]);
            }
        }

        log.methodDone("fire task change events", logLevel, logPad);
    }


    /**
     * The main method VSCode TaskTreeProvider calls into
     *
     * @param element The tree item requested
     * @param logPad Log padding
     * @param logLevel Log level
     */
    async getChildren(element?: TreeItem, logPad = "", logLevel = 1): Promise<TreeItem[]>
    {
        if (!workspace.workspaceFolders && !configuration.get<boolean>("specialFolders.showUserTasks"))
        {
            return [ new NoWorkspace() ];
        }

        if (!this.enabled)
        {
            return [ !this.tasks && !this.taskTree ? new InitScripts() : new NoScripts() ];
        }
        else if (this.setEnableCalled && this.taskTree && !element)
        {
            // this.taskTree[0] = new LoadScripts();
            // this.taskTree[0].contextValue = "loadscripts";
            // return [ !this.tasks && !this.taskTree ? new InitScripts() : new NoScripts() ];
            this.setEnableCalled = false;
            // this._onDidChangeTreeData.fire();
            // return [ new LoadScripts() ];
        }

        if (element instanceof TaskFile)
        {
            if (!util.isTaskTypeEnabled(element.taskSource)) {
                return [];
            }
        }
        else if (!element || element instanceof TaskFolder)
        {
            if (util.getTaskTypes().filter(taskType => util.isTaskTypeEnabled(taskType)).length === 0) {
                return [ new NoScripts() ];
            }
        }

        let waited = 0;
        const licMgr = getLicenseManager();
        const firstRun = this.name === "taskExplorer" && !this.tasks && this.enabled &&
                          (!this.taskTree || this.taskTree[0].contextValue === "initscripts");

        this.refreshPending = true;

        log.methodStart("get tree children", logLevel, logPad, false, [
            [ "task folder", element?.label ], [ "all tasks need to be retrieved", !this.tasks ],
            [ "specific task type need to be retrieved", !!this.currentInvalidation ],
            [ "current invalidation", this.currentInvalidation ], [ "tree needs rebuild", !this.taskTree ],
            [ "first run", firstRun ]
        ]);

        //
        // The vscode task engine processing will call back in multiple time while we are awaiting
        // the call to buildTaskTree().  This occurs on the await of buildGroupings() in buildTaskTree.
        // To prevent bad. things. happening. sleep the call here until the tree has finished building.
        // This "could"" be prevented by re-implementing the tree the "right way", where we don't build the
        // whole tree if it doesnt exist and build it node by node as theyare expanded, but, because we
        // have 'LastTasks' and 'Favorites', we need to load everything.  Oh well.
        //
        // ^^^^^^ 1/2/23 -  WAIT?!?!  Was this because of the try/catch around the cll to buildTaskTree()???
        //                            Commented the try/catch for now, look into side effects as we move on...
        //
        while (this.treeBuilding) {
            /* istanbul ignore next */
            await util.timeout(200);
            /* istanbul ignore next */
            waited += 200;
        }
        /* istanbul ignore if */
        if (waited) {
            log.write("   waited " + waited + " ms", logLevel, logPad);
        }

        //
        // Build task tree if not built already.
        //
        if (!this.taskTree || (this.taskTree.length === 1 && (this.taskTree[0].contextValue === "noscripts" || this.taskTree[0].contextValue === "initscripts")))
        {   //
            // If 'tasks' is empty, then ask for all tasks.
            // If 'tasks' is non-empty, and 'currentInvalidation' is set, then only ask for tasks
            // of type specified by it's value.  The 'currentInvalidation' parameter is set by the
            // refresh() function when a file modify/create/delete event has occurred, it will be
            // set to the task type of the file that was modified.created/deleted, and at this point
            // the provider's tasks cache will have been invalidated and rebuilt.
            //
            // Note that if 'currentInvalidation' is 'workspace', indicating tasks from a tasks.json
            // file, there in actuality is no task type called 'workspace'.  Tasks found in these
            // files can be of any type that is available to VSCode's task provider interface
            // (including providers implemented in this extension).  In this case, we have to ask
            // for all tasks.  Same goes for typescript tasks.
            //
            /* istanbul ignore else */
            if (!this.tasks || this.currentInvalidation  === "Workspace" || this.currentInvalidation === "tsc")
            {
                this.tasks = await tasks.fetchTasks();
            }
            else if (this.tasks && this.currentInvalidation)
            {
                const isScriptType = util.isScriptType(this.currentInvalidation);
                //
                // Get all tasks of the type defined in 'currentInvalidation' from VSCode, remove
                // all tasks of the type defined in 'currentInvalidation' from the tasks list cache,
                // and add the new tasks from VSCode into the tasks list.
                //
                const toRemove: number[] = [];
                const taskItems = await tasks.fetchTasks(
                {
                    type: !isScriptType ? this.currentInvalidation : "script"
                });

                for (let i = 0; i < this.tasks.length; i++)
                {
                    const t = this.tasks[i];
                    //
                    // Note that requesting a task type can return Workspace tasks (tasks.json/vscode)
                    // if the script type set for the task in tasks.json is of type 'currentInvalidation'.
                    // Remove any Workspace type tasks returned as well, in this case the source type is
                    // != currentInvalidation, but the definition type == currentInvalidation
                    //
                    if (t.source === this.currentInvalidation || t.source === "Workspace" || (isScriptType && util.isScriptType(t.source)))
                    {
                        if (t.source !== "Workspace" || t.definition.type === this.currentInvalidation) {
                            toRemove.push(i);
                        }
                    }

                    // for (const externalProviderMap of providersExternal)
                    // {
                    //     const externalTasks = await externalProviderMap[1].provideTasks();
                    //     log.write(`   Get tasks from external provider ${externalProviderMap[0]}`, 4, logPad);
                    //     this.tasks.push(...(externalTasks || []));
                    // }
                }

                let rmvCount = -1;
                for (const t of toRemove) {
                    const idx = t - (++rmvCount);
                    log.write(`   removing old task '${this.tasks[idx].source}/${this.tasks[idx].name}'`, 4, logPad);
                    this.tasks.splice(idx, 1);
                }

                this.tasks.push(...taskItems);
            }

            /* istanbul ignore else */
            if (this.tasks)
            {   //
                // Remove User tasks if they're not enabled
                //
                if (!configuration.get<boolean>("specialFolders.showUserTasks")) // && util.isTaskTypeEnabled("workspace"))
                {
                    this.tasks.slice().reverse().forEach((item, index, object) =>
                    {
                        if (item.source === "Workspace" && !util.isWorkspaceFolder(item.scope)) {
                            (this.tasks as Task[]).splice(object.length - 1 - index, 1);
                        }
                    });
                }

                if (licMgr)
                {
                    const maxTasks = licMgr.getMaxNumberOfTasks();
                    if (this.tasks.length > maxTasks)
                    {
                        const rmvCount = this.tasks.length - maxTasks;
                        log.write(`   removing ${rmvCount} tasks, max count reached (no license)`, logLevel + 1, logPad);
                        this.tasks.splice(maxTasks, rmvCount);
                        util.showMaxTasksReachedMessage();
                    }
                }
                //
                // Build the entire task tree
                //
                // try {
                    this.taskTree = await this.buildTaskTree(this.tasks, logPad + "   ", logLevel + 1);
                // }
                // catch (e: any) { /* istanbul ignore next */ log.error(e); }
                /* istanbul ignore if */
                if (!this.taskTree || this.taskTree.length === 0)
                {
                    this.taskTree = [ new NoScripts() ];
                }
            }
            else {
                this.taskTree = [ new NoScripts() ];
            }
        }

        let items: TreeItem[] = [];
        if (element instanceof TaskFolder)
        {
            log.write("   Get folder task files", logLevel, logPad);
            items = element.taskFiles;
        }
        else if (element instanceof TaskFile)
        {
            log.write("   Get file tasks/scripts", logLevel, logPad);
            items = element.treeNodes;
        }
        else if (!element)
        {
            log.write("   Get task tree", logLevel, logPad);
            items = this.taskTree;
        }

        if (firstRun && licMgr)
        {   //
            // Update license manager w/ tasks, display info / license page if needed
            //
            await licMgr.setTasks(this.tasks || [], logPad + "   ");
        }

        this.refreshPending = false;
        this.currentInvalidation = undefined; // reset file modification task type flag

        log.methodDone("get tree children", logLevel, logPad, false, [
            [ "# of tasks total", this.tasks?.length ], [ "# of tasks returned", items.length ]
        ]);

        return items;
    }


    private getGroupedId(folder: TaskFolder, file: TaskFile, label: string, treeLevel: number)
    {
        const groupSeparator = util.getGroupSeparator();
        const labelSplit = label.split(groupSeparator);
        let id = "";
        for (let i = 0; i <= treeLevel; i++)
        {
            id += labelSplit[i];
        }
        id += file.resourceUri.fsPath.replace(/\W/gi, "");
        return folder.label + file.taskSource + id + treeLevel.toString();
    }


    public getParent(element: TreeItem): TreeItem | null
    {
        if (element instanceof TaskFolder)
        {
            return null;
        }
        if (element instanceof TaskFile)
        {
            return element.folder;
        }
        if (element instanceof TaskItem)
        {
            return element.taskFile;
        }
        /* istanbul ignore next */
        if (element instanceof NoScripts || element instanceof InitScripts || element instanceof NoWorkspace)
        {
            /* istanbul ignore next */
            return null;
        }
        /* istanbul ignore next */
        return null;
    }


    public async getTaskItem(taskId: string, logPad = "", logLevel = 1): Promise<TaskItem | undefined>
    {
        log.methodStart("Get task item from tree", logLevel, logPad, false, [[ "task id", taskId ?? "all tasks" ]]);
        const taskItems = await this.getTaskItems(taskId, logPad + "   ", false, logLevel);
        log.methodDone("Get task item(s) from tree", logLevel, logPad);
        return taskItems[taskId];
    }


    /**
     * @method getTaskItems
     *
     * Returns a flat mapped list of tree items, or the tre item specified by taskId.
     *
     * @param taskId Task ID
     * @param logPad Padding to prepend to log entries.  Should be a string of any # of space characters.
     * @param executeOpenForTests For running mocha tests only.
     */
    public async getTaskItems(taskId: string | undefined, logPad = "", executeOpenForTests = false, logLevel = 1): Promise<TaskMap>
    {
        const me = this;
        const taskMap: TaskMap = {};
        let done = false;

        log.methodStart("Get task items from tree", logLevel, logPad, false, [[ "execute open", executeOpenForTests ]]);

        const treeItems = await me.getChildren(undefined, "   ", logLevel + 1);
        if (!treeItems || treeItems.length === 0)
        {
            window.showInformationMessage("No tasks found!");
            await storage.update(constants.FAV_TASKS_STORE, []);
            await storage.update(constants.LAST_TASKS_STORE, []);
            return taskMap;
        }

        const processItem2g = async (pItem2: TaskFile) =>
        {
            const treeFiles: any[] = await me.getChildren(pItem2, "   ", logLevel + 1);
            if (treeFiles.length > 0)
            {
                for (const item2 of treeFiles)
                {
                    if (done) {
                        break;
                    }
                    if (item2 instanceof TaskItem)
                    {
                        const tmp = me.getParent(item2);
                        assert(
                            tmp instanceof TaskFile,
                            "Invaid parent type, should be TaskFile for TaskItem"
                        );
                        await processItem2(item2);
                    }
                    else if (item2 instanceof TaskFile && item2.isGroup)
                    {
                        log.write("        Task File (grouped): " + item2.path + item2.fileName, logLevel + 2);
                        await processItem2g(item2);
                    }
                    else if (item2 instanceof TaskFile && !item2.isGroup)
                    {
                        log.write("        Task File (grouped): " + item2.path + item2.fileName, logLevel + 2);
                        await processItem2(item2);
                    }
                }
            }
        };

        const processItem2 = async (pItem2: any) =>
        {
            const treeTasks: any[] = await me.getChildren(pItem2, "   ", logLevel + 1);
            if (treeTasks.length > 0)
            {
                for (const item3 of treeTasks)
                {
                    if (done) {
                        break;
                    }

                    if (item3 instanceof TaskItem)
                    {
                        if (executeOpenForTests) {
                            await me.open(item3);
                        }
                        const tmp = me.getParent(item3);
                        assert(
                            tmp instanceof TaskFile,
                            "Invaid parent type, should be TaskFile for TaskItem"
                        );
                        if (item3.task && item3.task.definition)
                        {
                            let tPath: string;

                            if (util.isWorkspaceFolder(item3)) {
                                tPath = item3.task.definition.uri ? item3.task.definition.uri.fsPath :
                                    (item3.task.definition.path ? item3.task.definition.path : "root");
                            }
                            else {
                                tPath = "root";
                            }

                            log.write(logPad + "   ✔ Processed " + item3.task.name, logLevel + 2);
                            log.value(logPad + "        id", item3.id, logLevel + 2);
                            log.value(logPad + "        type", item3.taskSource + " @ " + tPath, logLevel + 2);
                            if (item3.id) {
                                taskMap[item3.id] = item3;
                                if (taskId && taskId === item3.id) {
                                    done = true;
                                }
                            }
                        }
                    }
                    else if (item3 instanceof TaskFile && item3.isGroup)
                    {
                        await processItem2(item3);
                    }
                }
            }
        };

        const processItem = async (pItem: any) =>
        {
            let tmp: any;
            const treeFiles: any[] = await me.getChildren(pItem, "   ", logLevel + 2);
            if (treeFiles.length > 0)
            {
                for (const item2 of treeFiles)
                {
                    if (done) {
                        break;
                    }
                    if (item2 instanceof TaskFile && !item2.isGroup)
                    {
                        log.write(logPad + "   Task File: " + item2.path + item2.fileName, logLevel + 2);
                        tmp = me.getParent(item2);
                        assert(
                            tmp instanceof TaskFolder,
                            "Invaid parent type, should be TaskFolder for TaskFile"
                        );
                        await processItem2(item2);
                    }
                    else if (item2 instanceof TaskFile && item2.isGroup)
                    {
                        await processItem2g(item2);
                    }
                    else if (item2 instanceof TaskItem)
                    {
                        await processItem2(item2);
                    }
                }
            }
        };

        for (const item of treeItems)
        {
            if (item instanceof TaskFolder)
            {
                let isFav = false, isLast = false, isUser = false;
                isFav = (item.label as string).includes(constants.FAV_TASKS_LABEL);
                isLast = (item.label as string).includes(constants.LAST_TASKS_LABEL);
                isUser = (item.label as string).includes(constants.USER_TASKS_LABEL);
                const tmp: any = me.getParent(item);
                assert(tmp === null, "Invalid parent type, should be null for TaskFolder");
                log.write("   Task Folder " + item.label + ":  " + (!isFav && !isLast && !isUser ?
                         item.resourceUri?.fsPath : (isLast ? constants.LAST_TASKS_LABEL :
                            (isUser ? constants.USER_TASKS_LABEL : constants.FAV_TASKS_LABEL))), logLevel + 1, logPad);
                await processItem(item);
            }
        }

        log.methodDone("Get task item(s) from tree", logLevel, logPad, false, [
            [ "# of items found", Object.keys(taskMap).length ]
        ]);

        return taskMap;
    }


    public getTasks()
    {
        return this.tasks;
    }


    private getTaskFileNode(task: Task, folder: TaskFolder, files: any, relativePath: string, scopeName: string, logPad: string): TaskFile
    {
        let taskFile: TaskFile;
        log.methodStart("get task file node", 2, logPad, false, [[ "relative path", relativePath ], [ "scope name", scopeName ]]);

        //
        // Reference ticket #133, vscode folder should not use a path appenditure in it's folder label
        // in the task tree, there is only one path for vscode/workspace tasks, /.vscode.  The fact that
        // you can set the path variable inside a vscode task changes the relativePath for the task,
        // causing an endless loop when putting the tasks into groups (see taskTree.createTaskGroupings).
        // All other task types will have a relative path of it's location on the filesystem (with
        // exception of TSC, which is handled elsewhere).
        //
        const relPathAdj = task.source !== "Workspace" ? relativePath : ".vscode";

        let id = task.source + ":" + path.join(scopeName, relPathAdj);
        if (task.definition.fileName && !task.definition.scriptFile)
        {
            id = path.join(id, task.definition.fileName);
        }

        taskFile = files.get(id);

        //
        // Create taskfile node if needed
        //
        if (!taskFile)
        {
            log.value("   Add source file container", task.source, 2, logPad);
            taskFile = new TaskFile(this.extensionContext, folder, task.definition, task.source, relativePath, 0, false, undefined, logPad + "   ");
            folder.addTaskFile(taskFile);
            files.set(id, taskFile);
        }

        log.methodDone("get task file node", 2, logPad, false);
        return taskFile;
    }


    public getTreeItem(element: TaskItem | TaskFile | TaskFolder): TreeItem
    {
        /* istanbul ignore else */
        if (element instanceof TaskItem) {
            log.methodStart("get tree item", 3, "", true, [[ "label", element.label ]]);
            log.write("   refresh task item state", 3);
            element.refreshState(true);
            log.methodDone("get tree item", 3);
        }
        return element;
    }


    private async handleFileWatcherEvent(invalidate: any, opt: boolean | Uri | undefined, logPad: string)
    {
        log.methodStart("handle filewatcher / settings change / test event", 1, logPad);
        //
        // invalidate=true means the refresh button was clicked (opt will be false)
        // invalidate="tests" means this is being called from unit tests (opt will be undefined)
        //
        if ((invalidate === true || invalidate === "tests") && !opt)
        {   //
            // The file cache oly needs to update once on any change, since this will get called through
            // twice if both the Explorer and Sidebar Views are enabled, do a lil check here to make sure
            // we don't double scan for nothing.
            //
            const explorerViewEnabled = configuration.get<boolean>("enableExplorerView");
            if ((explorerViewEnabled && this.name === "taskExplorer") || (!explorerViewEnabled && this.name === "taskExplorerSideBar"))
            {
                log.write("   handling 'rebuild cache' event", 1, logPad + "   ");
                this.busy = true;
                await rebuildCache(logPad + "   ");
                log.write("   handling 'rebuild cache' eventcomplete", 1, logPad + "   ");
                this.busy = invalidate !== "tests";
            }
        }
        //
        // If this is not from unit testing, then invalidate the appropriate task cache/file
        //
        if (invalidate !== "tests")
        {
            log.write("   handling 'invalidate tasks cache' event", 1, logPad);
            await this.invalidateTasksCache(invalidate !== true ? invalidate : undefined, opt, logPad + "   ");
        }
        log.methodDone("   handle filewatcher / settings change / test event", 1, logPad);
    }


    /**
     * This function should only be called by the unit tests
     *
     * All internal task providers export an invalidate() function...
     *
     * If 'opt1' is a string then a filesystemwatcher, settings change, or taskevent was
     * triggered for the task type defined in the 'opt1' parameter.
     *
     * The 'opt1' parameter may also have a value of 'tests', which indicates this is
     * being called from the unit tests, so some special handling is required.
     *
     * In the case of a settings change, 'opt2' will be undefined.  Depending on how many task
     * types configs' were altered in settings, this function may run through more than once
     * right now for each task type affected.  Some settings require a global refresh, for example
     * the 'groupDashed' settings, or 'enableSideBar',etc.  If a global refresh is to be performed,
     * then both 'opt1' and 'opt2' will be undefined.
     *
     * In the cases of a task event, 'opt2' is undefined.
     *
     * If a FileSystemWatcher event, then 'opt2' should contain the Uri of the file that was
     * modified, created, or deleted.
     *
     *
     * @param opt1 Task provider type.  Can be one of:
     *     "ant"
     *     "apppublisher"
     *     "bash"
     *     "batch"
     *     "gradle"
     *     "grunt"
     *     "gulp"
     *     "make"
     *     "npm"
     *     "nsis"
     *     "perl"
     *     "powershell"
     *     "python"
     *     "ruby"
     *     "tests"
     *     "Workspace"
     * @param opt2 The uri of the file that contains/owns the task
     */
    public async invalidateTasksCache(opt1?: string, opt2?: Uri | boolean, logPad?: string)
    {
        log.methodStart("invalidate tasks cache", 1, logPad, false, [
            [ "opt1", opt1 ], [ "opt2", opt2 && opt2 instanceof Uri ? opt2.fsPath : opt2 ]
        ]);

        this.busy = true;

        try {
            if (opt1 && opt1 !== "tests" && opt2 instanceof Uri)
            {
                log.write("   invalidate '" + opt1 + "' task provider file ", 1, logPad);
                log.value("      file", opt2.fsPath, 1, logPad);
                const provider = providers.get(util.getTaskProviderType(opt1)) ||
                                 providersExternal.get(opt1);
                // NPM/Workspace/TSC tasks don't implement TaskExplorerProvider
                await provider?.invalidate(opt2, logPad + "   ");
            }
            else //
            {   // If opt1 is undefined, refresh all providers
                //
                if (!opt1)
                {
                    log.write("   invalidate all providers", 1, logPad);
                    for (const [ key, p ] of providers)
                    {
                        log.write("   invalidate '" + key + "' task provider", 1, logPad);
                        await p.invalidate(undefined, logPad + "   ");
                    }
                }
                else { // NPM/Workspace/TSC tasks don't implement TaskExplorerProvider
                    log.write("   invalidate '" + opt1 + "' task provider", 1, logPad);
                    const provider = providers.get(util.getTaskProviderType(opt1)) ||
                                     providersExternal.get(opt1);
                    provider?.invalidate(undefined, logPad + "   ");
                }
            }
        }
        catch (e: any) {
            /* istanbul ignore next */
            log.error([ "Error invalidating task cache", e ]);
        }

        this.busy = false;
        log.methodDone("invalidate tasks cache", 1, logPad);
    }


    public isBusy = () => this.refreshPending || this.busy;


    public isVisible = () => this.visible;


    private logTask(task: Task, scopeName: string, logPad: string)
    {
        const definition = task.definition;

        if (!log.isLoggingEnabled()) {
            return;
        }

        log.write("Task Details:", 3, logPad);
        log.value("   name", task.name, 3, logPad);
        log.value("   source", task.source, 3, logPad);
        log.value("   scope name", scopeName, 4, logPad);
        /* istanbul ignore else */
        if (util.isWorkspaceFolder(task.scope))
        {
            log.value("   scope.name", task.scope.name, 4, logPad);
            log.value("   scope.uri.path", task.scope.uri.path, 4, logPad);
            log.value("   scope.uri.fsPath", task.scope.uri.fsPath, 4, logPad);
        }
        else // User tasks
        {
            log.value("   scope.uri.path", "N/A (User)", 4, logPad);
        }
        log.value("   type", definition.type, 4, logPad);
        log.value("   relative Path", definition.path ? definition.path : "", 4, logPad);
        if (definition.scriptType)
        {
            log.value("      script type", definition.scriptType, 4, logPad);
        }
        if (definition.scriptFile)
        {
            log.value("      script file", definition.scriptFile, 4, logPad);
        }
        if (definition.script)
        {
            log.value("   script", definition.script, 4, logPad);
        }
        if (definition.target)
        {
            log.value("   target", definition.target, 4, logPad);
        }
        if (definition.path)
        {
            log.value("   path", definition.path, 4, logPad);
        }
        //
        // Internal task providers will set a fileName property
        //
        if (definition.fileName)
        {
            log.value("   file name", definition.fileName, 4, logPad);
        }
        //
        // Internal task providers will set a uri property
        //
        if (definition.uri)
        {
            log.value("   file path", definition.uri.fsPath, 4, logPad);
        }
        //
        // Script task providers will set a takesArgs property
        //
        if (definition.takesArgs)
        {
            log.value("   requires args", definition.takesArgs, 4, logPad);
        }
        if (definition.cmdLine)
        {
            log.value("   cmd line", definition.cmdLine, 4, logPad);
        }
        //
        // External task providers can set a icon/iconDark property
        //
        if (definition.icon)
        {
            log.value("   icon", definition.icon, 4, logPad);
        }
        //
        // External task providers can set a icon/iconDark property
        //
        if (definition.iconDark)
        {
            log.value("   icon dark", definition.iconDark, 4, logPad);
        }
        log.write("Task Details Done", 3, logPad);
    }


    public onVisibilityChanged(visible: boolean)
    {
        this.visible = visible;
    }


    private async open(selection: TaskItem, itemClick = false)
    {
        const clickAction = configuration.get<string>("taskButtons.clickAction", "Open");

        //
        // As of v1.30.0, added option to change the entry item click to execute.  In order to avoid having
        // to re-register the handler when the setting changes, we just re-route the request here
        //
        if (clickAction === "Execute" && itemClick === true) {
            await this.run(selection);
            return;
        }

        const uri = !util.isScriptType(selection.taskSource) ?
                    selection.taskFile.resourceUri : Uri.file(selection.task.definition.uri.fsPath);


        log.methodStart("open document at position", 1, "", true, [
            [ "command", selection.command.command ], [ "source", selection.taskSource ],
            [ "uri path", uri.path ], [ "fs path", uri.fsPath ]
        ]);

        /* istanbul ignore else */
        if (util.pathExists(uri.fsPath))
        {
            const document: TextDocument = await workspace.openTextDocument(uri);
            const offset = findDocumentPosition(document, selection);
            const position = document.positionAt(offset);
            await window.showTextDocument(document, { selection: new Selection(position, position) });
        }
    }


    private openTerminal(taskItem: TaskItem)
    {
        const term = getTerminal(taskItem);
        if (term) {
            term.show();
        }
    }


    private pause(taskItem: TaskItem)
    {
        if (this.isBusy() || !taskItem)
        {
            window.showInformationMessage("Busy, please wait...");
            return;
        }

        log.methodStart("pause", 1, "", true);

        if (taskItem.task.execution)
        {
            const terminal = getTerminal(taskItem, "   ");
            if (terminal)
            {
                if (taskItem.paused)
                {
                    taskItem.paused = false;
                    log.value("   send to terminal", "Y", 1);
                    terminal.sendText("N");
                }
                else
                {
                    taskItem.paused = true;
                    log.value("   send to terminal", "\\u0003", 1);
                    terminal.sendText("\u0003");
                }
            }
            else {
                window.showInformationMessage("Terminal not found");
            }
        }
        else {
            window.showInformationMessage("Executing task not found");
        }

        log.methodDone("pause", 1);
    }


    private pushToTopOfSpecialFolder(taskItem: TaskItem, label: string, treeIndex: number, logPad = "")
    {
        let taskItem2: TaskItem | undefined;
        /* istanbul ignore next */
        const ltFolder = this.taskTree ? this.taskTree[treeIndex] as TaskFolder : undefined;
        const taskId = label + ":" + util.getTaskItemId(taskItem);

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
            taskItem2.label = getSpecialTaskName(taskItem2);
        }

        log.value(logPad + "   add item", taskItem2.id, 2);
        ltFolder.insertTaskFile(taskItem2, 0);
    }


    /**
     * Responsible for refreshing the tree content and tasks cache
     * This function is called each time and event occurs, whether its a modified or new
     * file (via FileSystemWatcher event), or when the view first becomes active/visible, etc.
     *
     * @param invalidate The invalidation event.
     * Can be one of the custom values:
     *     "tests"            (from unit tests)
     *     "visible-event"
     *     false|null|undefined
     *
     * Can also be one of the task types FileSystemWatcher event):
     *
     *     "ant"
     *     "apppublisher"
     *     "bash"
     *     "batch"
     *     "gradle"
     *     "grunt"
     *     "gulp"
     *     "make"
     *     "npm"
     *     "nsis"
     *     "perl"
     *     "powershell"
     *     "python"
     *     "ruby"
     *     "tests"
     *     "Workspace"
     *
     * If invalidate is false, then this is both an event as a result from adding to excludes list
     * and the item being added is a file, not a group / set of files.  If theitem being added to
     * the excludes list is a group/folder, then invalidate will be set to the task source, i.e.
     * npm, ant, workspace, etc.
     *
     * If invalidate is true and opt is false, then the refresh button was clicked
     *
     * If invalidate is "tests" and opt undefined, then extension.refreshTree() called in tests
     *
     * If task is truthy, then a task has started/stopped, opt will be the task definition's
     * 'uri' property, note that task types not internally provided will not contain this property.
     *
     * If invalidate and opt are both truthy, then a filesystemwatcher event or a task just triggered
     *
     * If invalidate and opt are both undefined, then a configuration has changed
     *
     * 2/10/2021 - Task start/finish events no longer call this function.  This means invalidate will
     * only be false if it is set from the addToExcludes() function.
     *
     * @param opt Uri of the invalidated resource
     */
    public async refresh(invalidate?: any, opt?: Uri | boolean, logPad = ""): Promise<void>
    {
        log.methodStart("refresh task tree", 1, logPad, true, [
            [ "from view", this.name ], [ "invalidate", invalidate ],
            [ "opt fsPath", opt && opt instanceof Uri ? opt.fsPath : "n/a" ],
            [ "tree is null", !this.taskTree ]
        ]);

        await this.waitForRefreshComplete();
        this.refreshPending = true;

        if (invalidate !== false) // if anything but 'add to excludes'
        {
            await this.handleFileWatcherEvent(invalidate, opt, logPad + "   ");
        }

        if (opt !== false && util.isString(invalidate, true) && invalidate !== "tests")
        {
            log.write(`   invalidation is for type '${invalidate}'`, 1, logPad);
            //
            // TODO - Performance Enhancement
            // Get the invalidated treeitem.treefile and invalidate that instead of rebuilding
            // the entire tree.
            // We set currentInvalidation here, setting the 'currentInvalidation' flag will cause the
            // resulting call to getChildren() from the VSCode task engine to only re-provide the
            // invalidated task type, instead of all task types
            //                                         //
            this.currentInvalidation = invalidate;     // 'invalidate' will be taskType if 'opt' is uri
            this.taskTree = null;                      // see todo above
            // this._onDidChangeTreeData.fire();      // see todo above // task.definition.treeItem
        }                                              // not sure if its even possible
        else //                                        //
        {   // Re-ask for all tasks from all providers and rebuild tree
            //
            log.write("   invalidation is for all types", 1, logPad);
            this.tasks = null; // !skipAskTasks ? null : this.tasks;
            this.taskTree = null;
        }
        if (this.visible) {
            this._onDidChangeTreeData.fire();
        }
        else {
            // this.getChildren();
            this.refreshPending = false;
        }
        log.methodDone("refresh task tree", 1, logPad, true);
    }


    private removeGroupedTasks(folder: TaskFolder, subfolders: Map<string, TaskFile>, logPad: string, logLevel: number)
    {
        const taskTypesRmv: TaskFile[] = [];

        log.methodStart("remove grouped tasks", logLevel, logPad);

        for (const each of folder.taskFiles)
        {
            /* istanbul ignore if */
            if (!(each instanceof TaskFile) || !each.label) {
                continue;
            }
            const id = folder.label + each.taskSource;
            const id2 = this.getGroupedId(folder, each, each.label.toString(), each.groupLevel);

            if (!each.isGroup && subfolders.get(id))
            {
                taskTypesRmv.push(each);
            }
            else if (id2 && !each.isGroup && subfolders.get(id2))
            {
                taskTypesRmv.push(each);
            }
            else if (each.isGroup)
            {
                for (const each2 of each.treeNodes)
                {
                    this.removeScripts(each2 as TaskFile, folder, subfolders, 0, logPad, logLevel + 1);
                    if (each2 instanceof TaskFile && each2.isGroup && each2.groupLevel > 0)
                    {
                        for (const each3 of each2.treeNodes)
                        {
                            if (each3 instanceof TaskFile)
                            {
                                this.removeScripts(each3, folder, subfolders, 0, logPad, logLevel + 1);
                            }
                        }
                    }
                }
            }
            else {
                this.removeScripts(each, folder, subfolders, 0, logPad, logLevel + 1);
            }
        }

        for (const each of taskTypesRmv)
        {
            folder.removeTaskFile(each);
        }

        log.methodDone("remove grouped tasks", logLevel, logPad);
    }


    /**
     * Perform some removal based on groupings with separator.  The nodes added within the new
     * group nodes need to be removed from the old parent node still...
     *
     * @param taskFile TaskFile instance to remove tasks from
     * @param folder Project task folder
     * @param subfolders Current tree subfolders map
     * @param level Current grouping level
     */
    private removeScripts(taskFile: TaskFile, folder: TaskFolder, subfolders: Map<string, TaskFile>, level: number, logPad: string, logLevel: number)
    {
        const me = this;
        const taskTypesRmv: (TaskItem|TaskFile)[] = [];
        const groupSeparator = util.getGroupSeparator();

        log.methodStart("remove scripts", logLevel, logPad, false);

        for (const each of taskFile.treeNodes)
        {   /* istanbul ignore if */
            if (!each.label) {
                continue;
            }
            const label = each.label.toString();

            const labelPart = label.split(groupSeparator)[level];
            const id = this.getGroupedId(folder, taskFile, label, level);

            if (each instanceof TaskItem)
            {
                if (label.split(groupSeparator).length > 1 && labelPart)
                {
                    if (subfolders.get(id))
                    {
                        taskTypesRmv.push(each);
                    }
                }
            }
            else
            {
                let allTasks = false;
                for (const each2 of each.treeNodes)
                {
                    if (each2 instanceof TaskItem)
                    {
                        allTasks = true;
                    }
                    else {
                        allTasks = false;
                        break;
                    }
                }

                if (!allTasks) {
                    me.removeScripts(each, folder, subfolders, level + 1, logPad, logLevel + 1);
                }
            }
        }

        for (const each2 of taskTypesRmv)
        {
            taskFile.removeTreeNode(each2);
        }

        log.methodDone("remove scripts", logLevel, logPad);
    }


    private async renameGroupedTasks(taskFile: TaskFile)
    {
        /* istanbul ignore if */
        if (!configuration.get<boolean>("groupStripTaskLabel", true) || !taskFile.label) {
            return;
        }

        const groupSeparator = util.getGroupSeparator();
        let rmvLbl = taskFile.label.toString();
        rmvLbl = rmvLbl.replace(/\(/gi, "\\(").replace(/\[/gi, "\\[");
        rmvLbl = rmvLbl.replace(/\)/gi, "\\)").replace(/\]/gi, "\\]");

        for (const each2 of taskFile.treeNodes.filter(n => !!n.label))
        {
            if (each2 instanceof TaskItem)
            {
                const rgx = new RegExp(rmvLbl + groupSeparator, "i");
                each2.label = (each2.label as string).toString().replace(rgx, "");

                if (each2.groupLevel > 0)
                {
                    let label = "";
                    const labelParts = each2.label.split(groupSeparator);
                    /* istanbul ignore else */
                    if (labelParts)
                    {
                        for (let i = each2.groupLevel; i < labelParts.length; i++)
                        {
                            label += (label ? groupSeparator : "") + labelParts[i];
                        }
                        each2.label = label || each2.label;
                    }
                }
            }
            else {
                await this.renameGroupedTasks(each2);
            }
        }
    }


    private async restart(taskItem: TaskItem)
    {
        log.methodStart("restart task", 1, "", true);
        if (this.isBusy() || !taskItem)
        {
            window.showInformationMessage("Busy, please wait...");
        }
        else {
            this.stop(taskItem);
            await this.run(taskItem);
        }
        log.methodDone("restart task", 1);
    }


    private async resumeTask(taskItem: TaskItem)
    {
        log.methodStart("resume task", 1, "", true);
        const term = getTerminal(taskItem, "   ");
        if (term) {
            log.value("   send to terminal", "N", 1);
            term.sendText("N", true);
            taskItem.paused = false;
        }
        else {
            window.showInformationMessage("Terminal not found");
        }
        log.methodDone("resume task", 1);
    }


    /**
     * Run/execute a command.
     * The refresh() function will eventually be called by the VSCode task engine when
     * the task is launched
     *
     * @param taskItem TaskItem instance
     * @param noTerminal Whether or not to show the terminal
     * Note that the terminal will be shown if there is an error
     * @param withArgs Whether or not to prompt for arguments
     * Note that only script type tasks use arguments (and Gradle, ref ticket #88)
     */
    private async run(taskItem: TaskItem, noTerminal = false, withArgs = false, args?: string)
    {
        if (this.isBusy() || !taskItem)
        {
            window.showInformationMessage("Busy, please wait...");
            return;
        }

        log.methodStart("run task", 1, "", true, [[ "task name", taskItem.label ]]);
        taskItem.taskDetached = undefined;

        if (withArgs === true)
		{
            await this.runWithArgs(taskItem, args, noTerminal);
		}
        else if (taskItem.paused)
        {
            await this.resumeTask(taskItem);
        }
        else //
        {   // Create a new instance of 'task' if this is to be ran with no terminal (see notes below)
            //
            let newTask = taskItem.task;
            if (noTerminal && newTask)
            {   //
                // For some damn reason, setting task.presentationOptions.reveal = TaskRevealKind.Silent or
                // task.presentationOptions.reveal = TaskRevealKind.Never does not work if we do it on the task
                // that was instantiated when the providers were asked for tasks.  If we create a new instance
                // here, same exact task, then it works.  Same kind of thing with running with args, but in that
                // case I can understand it because a new execution class has to be instantiated with the command
                // line arguments.  In this case, its simply a property task.presentationOption on an instantiated
                // task.  No idea.  But this works fine for now.
                //
                const def = newTask.definition,
                      folder = taskItem.getFolder(),
                      p = providers.get(util.getTaskProviderType(def.type))
                          /* istanbul ignore next */ || providersExternal.get(def.type);
                /* istanbul ignore else */
                if (folder && p)
                {
                    newTask = p.createTask(def.target, undefined, folder, def.uri, undefined, "   ") as Task;
                    //
                    // Since this task doesnt belong to a treeItem, then set the treeItem id that represents
                    // an instance of this task.
                    //
                    /* istanbul ignore else */
                    if (newTask) {
                        newTask.definition.taskItemId = def.taskItemId;
                        taskItem.taskDetached = newTask;
                    }
                    else {
                        newTask = taskItem.task;
                    }
                }
            }
            if (await this.runTask(newTask, noTerminal))
            {
                await this.saveTask(taskItem, configuration.get<number>("specialFolders.numLastTasks"), false, "   ");
                this.babysitRunningTask(taskItem);
            }
        }

        log.methodDone("run task", 1);
    }


    private async runLastTask()
    {
        if (this.isBusy())
        {
            window.showInformationMessage("Busy, please wait...");
            return;
        }

        let lastTaskId: string | undefined;
        const lastTasks = storage.get<string[]>(constants.LAST_TASKS_STORE, []);
        if (lastTasks && lastTasks.length > 0)
        {
            lastTaskId = lastTasks[lastTasks.length - 1];
        }

        if (!lastTaskId)
        {
            window.showInformationMessage("No saved tasks!");
            return;
        }

        log.methodStart("Run last task", 1, "", true, [[ "last task id", lastTaskId ]]);

        const taskItem = await this.getTaskItems(lastTaskId, "   ");

        /* istanbul ignore else */
        if (taskItem && taskItem instanceof TaskItem)
        {
            await this.run(taskItem);
        }
        else
        {
            window.showInformationMessage("Task not found!  Check log for details");
            util.removeFromArray(lastTasks, lastTaskId);
            await storage.update(constants.LAST_TASKS_STORE, lastTasks);
            await this.showSpecialTasks(true);
        }

        log.methodDone("Run last task", 1);
    }


    private async runNpmCommand(taskFile: TaskFile, command: string)
    {
        const pkgMgr = util.getPackageManager(),
              uri = taskFile.resourceUri;

        const options = {
            cwd: path.dirname(uri.fsPath)
        };

        const kind: TaskDefinition = {
            type: "npm",
            script: "install",
            path: path.dirname(uri.fsPath)
        };

        if (command.indexOf("<packagename>") === -1)
        {   /* istanbul ignore else */
            if (taskFile.folder.workspaceFolder)
            {
                const execution = new ShellExecution(pkgMgr + " " + command, options);
                const task = new Task(kind, taskFile.folder.workspaceFolder, command, "npm", execution, undefined);
                await tasks.executeTask(task);
            }
        }
        else
        {
            const opts: InputBoxOptions = { prompt: "Enter package name to " + command };
            await window.showInputBox(opts).then(async (str) =>
            {
                if (str !== undefined && taskFile.folder.workspaceFolder)
                {
                    const execution = new ShellExecution(pkgMgr + " " + command.replace("<packagename>", "").trim() + " " + str.trim(), options);
                    const task = new Task(kind, taskFile.folder.workspaceFolder, command.replace("<packagename>", "").trim() + str.trim(), "npm", execution, undefined);
                    await tasks.executeTask(task);
                }
            });
        }
    }


    private async runTask(task: Task, noTerminal?: boolean, logPad = "   "): Promise<boolean>
    {
        let result = true;
        log.methodStart("run task", 1, logPad, false, [[ "no terminal", noTerminal ]]);

        if (noTerminal === true) {
            task.presentationOptions.reveal = TaskRevealKind.Silent;
        }
        else {
            task.presentationOptions.reveal = TaskRevealKind.Always;
        }

        try {
            await tasks.executeTask(task);
        }
        catch (e: any) {
            /* istanbul ignore next */
            const err = e.toString();
            /* istanbul ignore next */
            if (err.indexOf("No workspace folder") !== -1)
            {
                /* istanbul ignore next */
                window.showErrorMessage("Task execution failed:  No workspace folder.  NOTE: You must " +
                                        "save your workspace first before running 'User' tasks");
            }
            else {
                /* istanbul ignore next */
                window.showErrorMessage("Task execution failed: " + err);
            }
            /* istanbul ignore next */
            log.write("Task execution failed: " + err, 1, logPad);
            /* istanbul ignore next */
            result = false;
        }

        log.methodDone("run task", 1, logPad, false, [[ "result", result ]]);
        return result;
    }


    /**
     * Run/execute a command, with arguments (prompt for args)
     *
     * @param taskItem TaskItem instance
     * @param noTerminal Whether or not to show the terminal
     * Note that the terminal will be shown if there is an error
     */
    public async runWithArgs(taskItem: TaskItem, args?: string, noTerminal?: boolean, logPad = "   ")
    {
        log.methodStart("run task with arguments", 1, logPad, false, [[ "no terminal", noTerminal ]]);
        /* istanbul ignore else */
        if (taskItem.task && !(taskItem.task.execution instanceof CustomExecution))
        {
            const me = this;
            const opts: InputBoxOptions = { prompt: "Enter command line arguments separated by spaces"};

            const _run = async (_args: string | undefined) =>
            {
                if (_args)
                {
                    let newTask = taskItem.task;
                    const def = taskItem.task.definition,
                          folder = taskItem.getFolder();
                    /* istanbul ignore else */
                    if (folder)
                    {
                        newTask = (providers.get("script") as ScriptTaskProvider).createTask(
                            def.script, undefined, folder, def.uri, _args.trim().split(" "), logPad + "   "
                        ) as Task;
                        newTask.definition.taskItemId = def.taskItemId;
                    }
                    /* istanbul ignore else */
                    if (await this.runTask(newTask, noTerminal, logPad + "   "))
                    {
                        await me.saveTask(taskItem, configuration.get<number>("specialFolders.numLastTasks"), false, logPad + "   ");
                        this.babysitRunningTask(taskItem);
                    }
                }
            };

            taskItem.taskDetached = undefined;
            if (!args) {
                await _run(await window.showInputBox(opts));
            }
            else {
                await _run(args);
            }
        }
        else {
            window.showInformationMessage("Custom execution tasks cannot have the cmd line altered");
        }
        log.methodDone("run task with arguments", 1, logPad);
    }


    private async saveTask(taskItem: TaskItem, maxTasks: number, isFavorite = false, logPad = "")
    {
        const storeName: string = !isFavorite ? constants.LAST_TASKS_STORE : constants.FAV_TASKS_STORE;
        const label: string = !isFavorite ? constants.LAST_TASKS_LABEL : constants.FAV_TASKS_LABEL;
        const cstTasks = storage.get<string[]>(storeName, []);
        const taskId =  util.getTaskItemId(taskItem);

        log.methodStart("save task", 1, logPad, false, [
            [ "treenode label", label ], [ "max tasks", maxTasks ], [ "is favorite", isFavorite ],
            [ "task id", taskId ], [ "current saved task ids", cstTasks.toString() ]
        ]);

        //
        // Moving it to the top of the list it if it already exists
        //
        util.removeFromArray(cstTasks, taskId);

        if (maxTasks > 0) {
            while (cstTasks.length >= maxTasks)
            {
                cstTasks.shift();
            }
        }

        cstTasks.push(taskId);

        await storage.update(storeName, cstTasks);

        log.methodDone("save task", 1, logPad, false, [
            [ "new saved task ids", cstTasks.toString() ]
        ]);

        await this.showSpecialTasks(true, isFavorite, false, taskItem, logPad);
    }


    //
    // Tired of VSCode complaining that the the expension was a startup hog. Performing the
    // initial scan after the extension has been instantiated stops it from getting all up
    // in stdout's business.  Displaying an 'Initializing...' message in the tree now on
    // startup resulting from this, looks kinda nice I guess, so oh well.
    //
    public setEnabled(enable: boolean)
    {
        this.enabled = enable;
        this.setEnableCalled = true;
        this._onDidChangeTreeData.fire();
    }


    public async showSpecialTasks(show: boolean, isFavorite = false, forceChange?: boolean, taskItem?: TaskItem, logPad = "")
    {
        let changed = true;
        const tree = this.taskTree;
        const storeName: string = !isFavorite ? constants.LAST_TASKS_STORE : constants.FAV_TASKS_STORE;
        const label: string = !isFavorite ? constants.LAST_TASKS_LABEL : constants.FAV_TASKS_LABEL;
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
            log.write(logPad + "   no tasks found in tree", 1);
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
            this._onDidChangeTreeData.fire(taskItem);
        }
    }


    private showStatusMessage(task: Task)
    {
        if (task && configuration.get<boolean>("showRunningTask") === true)
        {
            const exec = tasks.taskExecutions.find(e => e.task.name === task.name && e.task.source === task.source &&
                         e.task.scope === task.scope && e.task.definition.path === task.definition.path);
            if (exec)
            {
                if (!TaskTreeDataProvider.statusBarSpace) {
                    TaskTreeDataProvider.statusBarSpace = window.createStatusBarItem(StatusBarAlignment.Left, -10000);
                    TaskTreeDataProvider.statusBarSpace.tooltip = "Task Explorer running task";
                }
                let statusMsg = task.name;
                /* istanbul ignore else */
                if ((task.scope as WorkspaceFolder).name) {
                    statusMsg += " (" + (task.scope as WorkspaceFolder).name + ")";
                }
                TaskTreeDataProvider.statusBarSpace.text = "$(loading~spin) " + statusMsg;
                TaskTreeDataProvider.statusBarSpace.show();
            }
            else {
                /* istanbul ignore else */
                if (TaskTreeDataProvider.statusBarSpace) {
                    TaskTreeDataProvider.statusBarSpace.dispose();
                }
            }
        }
    }


    private stop(taskItem: TaskItem)
    {
        log.methodStart("stop", 1, "", true);

        /* istanbul ignore if */
        if (this.isBusy() || !taskItem)
        {
            window.showInformationMessage("Busy, please wait...");
            return;
        }

        const exec = taskItem.isExecuting();
        if (exec)
        {
            if (configuration.get<boolean>("keepTermOnStop") === true && !taskItem.taskDetached)
            {
                const terminal = getTerminal(taskItem, "   ");
                log.write("   keep terminal open", 1);
                if (terminal)
                {
                    if (taskItem.paused)
                    {
                        log.value("   send to terminal", "Y", 1);
                        terminal.sendText("Y");
                    }
                    else
                    {
                        log.value("   send to terminal", "\\u0003", 1);
                        terminal.sendText("\u0003");
                        setTimeout(() => {
                            log.value("   send to terminal", "Y", 1);
                            terminal.sendText("Y", true);
                        }, 500);
                    }
                    taskItem.paused = false;
                }
                else {
                    window.showInformationMessage("Terminal not found");
                }
            }
            else {
                log.write("   kill task execution", 1);
                try {
                    exec.terminate();
                }
                catch {}
            }
        }
        else {
            window.showInformationMessage("Executing task not found");
            taskItem.refreshState(false);
        }

        log.methodDone("stop", 1);
    }


    private async taskStartEvent(e: TaskStartEvent)
    {
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
        //
        // Debounce!!  VScode v1.57+ emits about a dozen task start/end event for a task.  Sick
        // of these damn bugs that keep getting introduced seemingly every other version AT LEAST.
        //
        taskTimerId = setTimeout(async () =>
        {
            try
            {   log.methodStart("task started event", 1);
                //
                // Show status bar message (if ON in settings)
                //
                this.showStatusMessage(task);
                const taskItem = await this.getTaskItem(taskId, "   ", 3) as TaskItem;
                this.fireTaskChangeEvents(taskItem, "   ", 1);
                log.methodDone("task started event", 1);
            }
            catch (e) { /* istanbul ignore next */ console.error(e); }
        }, 50);

        this.taskIdStartEvents.set(taskId, taskTimerId);
    }


    private async taskFinishedEvent(e: TaskEndEvent)
    {
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
        //
        // Debounce!!  VScode v1.57+ emits about a dozen task start/end event for a task.  Sick
        // of these damn bugs that keep getting introduced seemingly every other version AT LEAST.
        //
        taskTimerId = setTimeout(async () =>
        {
            try
            {   log.methodStart("task finished event", 1);
                //
                // Hide status bar message (if ON in settings)
                //
                this.showStatusMessage(task);
                const taskItem = await this.getTaskItem(taskId, "   ", 3) as TaskItem;
                this.fireTaskChangeEvents(taskItem, "   ", 1);
                log.methodDone("task finished event", 1);
            }
            catch (e) { /* istanbul ignore next */ console.error(e); }
        }, 50);

        this.taskIdStopEvents.set(taskId, taskTimerId);
    }


    public async waitForRefreshComplete(maxWait = 15000, logPad = "   ")
    {
        let waited = 0;
        if (this.refreshPending) {
            log.write("waiting for previous refresh to complete...", 1, logPad);
        }
        while (this.refreshPending && waited < maxWait) {
            await util.timeout(250);
            waited += 250;
        }
    }

}
