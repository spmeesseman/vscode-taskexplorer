import {
    Event, EventEmitter, ExtensionContext, Task, TaskDefinition, TaskRevealKind, TextDocument,
    TreeDataProvider, TreeItem, TreeItemCollapsibleState, Uri, TaskStartEvent, TaskEndEvent,
    commands, window, workspace, tasks, Selection, WorkspaceFolder, InputBoxOptions,
    ShellExecution, Terminal, StatusBarItem, StatusBarAlignment, CustomExecution
} from "vscode";
import * as path from "path";
import * as util from "../common/utils";
import * as assert from "assert";
import * as nls from "vscode-nls";
import constants from "../common/constants";
import * as log from "../common/log";
import TaskItem from "./item";
import TaskFile from "./file";
import TaskFolder from "./folder";
import { visit, JSONVisitor } from "jsonc-parser";
import { storage } from "../common/storage";
import { views } from "../views";
import { rebuildCache } from "../cache";
import { configuration } from "../common/configuration";
import { providers } from "../extension";


const localize = nls.loadMessageBundle();


class NoScripts extends TreeItem
{
    constructor()
    {
        super(localize("noScripts", "No scripts found"), TreeItemCollapsibleState.None);
        this.contextValue = "noscripts";
    }
}
const noScripts = new NoScripts();


/**
 * @class TaskTreeDataProvider
 *
 * Implements the VSCode TreeDataProvider API to build a tree of tasks to display within a view.
 */
export class TaskTreeDataProvider implements TreeDataProvider<TreeItem>
{
    private static statusBarSpace: StatusBarItem;
    private tasks: Task[] | null = null;
    private treeBuilding = false;
    private busy = false;
    private extensionContext: ExtensionContext;
    private name: string;
    private needsRefresh: any[] = [];
    private taskTree: TaskFolder[] | NoScripts[] | null = null;
    private currentInvalidation: string | undefined;
    private _onDidChangeTreeData: EventEmitter<TreeItem | null> = new EventEmitter<TreeItem | null>();
    readonly onDidChangeTreeData: Event<TreeItem | null> = this._onDidChangeTreeData.event;


    constructor(name: string, context: ExtensionContext)
    {
        const subscriptions = context.subscriptions;
        this.extensionContext = context;
        this.name = name;

        subscriptions.push(commands.registerCommand(name + ".run",  async (item: TaskItem) => { await this.run(item); }, this));
        subscriptions.push(commands.registerCommand(name + ".runNoTerm",  async (item: TaskItem) => { await this.run(item, true, false); }, this));
        subscriptions.push(commands.registerCommand(name + ".runWithArgs",  async (item: TaskItem, args: string) => { await this.run(item, false, true, args); }, this));
        subscriptions.push(commands.registerCommand(name + ".runLastTask",  async () => { await this.runLastTask(); }, this));
        subscriptions.push(commands.registerCommand(name + ".stop",  (item: TaskItem) => { this.stop(item); }, this));
        subscriptions.push(commands.registerCommand(name + ".restart",  async (item: TaskItem) => { await this.restart(item); }, this));
        subscriptions.push(commands.registerCommand(name + ".pause",  (item: TaskItem) => { this.pause(item); }, this));
        subscriptions.push(commands.registerCommand(name + ".open", async (item: TaskItem) => { await this.open(item); }, this));
        subscriptions.push(commands.registerCommand(name + ".openTerminal", (item: TaskItem) => { this.openTerminal(item); }, this));
        subscriptions.push(commands.registerCommand(name + ".refresh", async () => { await this.refresh(true, false); }, this));
        subscriptions.push(commands.registerCommand(name + ".runInstall", async (taskFile: TaskFile) => { await this.runNpmCommand(taskFile, "install"); }, this));
        subscriptions.push(commands.registerCommand(name + ".runUpdate", async (taskFile: TaskFile) => { await this.runNpmCommand(taskFile, "update"); }, this));
        subscriptions.push(commands.registerCommand(name + ".runUpdatePackage", async (taskFile: TaskFile) => { await this.runNpmCommand(taskFile, "update <packagename>"); }, this));
        subscriptions.push(commands.registerCommand(name + ".runAudit", async (taskFile: TaskFile) => { await this.runNpmCommand(taskFile, "audit"); }, this));
        subscriptions.push(commands.registerCommand(name + ".runAuditFix", async (taskFile: TaskFile) => { await this.runNpmCommand(taskFile, "audit fix"); }, this));
        subscriptions.push(commands.registerCommand(name + ".addToExcludes", async (taskFile: TaskFile | string) => { await this.addToExcludes(taskFile); }, this));
        subscriptions.push(commands.registerCommand(name + ".addRemoveFromFavorites", async (taskItem: TaskItem) => { await this.addRemoveFavorite(taskItem); }, this));
        subscriptions.push(commands.registerCommand(name + ".clearSpecialFolder", async (taskFolder: TaskFolder) => { await this.clearSpecialFolder(taskFolder); }, this));

        tasks.onDidStartTask(async (_e) => this.taskStartEvent(_e));
        tasks.onDidEndTask(async (_e) => this.taskFinishedEvent(_e));
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
        const favTasks = storage.get<string[]>(constants.FAV_TASKS_STORE, []);
        const favId = this.getTaskItemId(taskItem);

        log.methodStart("add/remove favorite", 1, "", false, [
            ["id", taskItem.id ], [ "current fav count", favTasks.length ]
        ]);

        //
        // If this task exists in the favorites, remove it, if it doesnt, then add it
        //
        if (util.existsInArray(favTasks, favId) === false)
        {
            await this.saveTask(taskItem, -1, true);
        }
        else //
        {   // Remove
            //
            await util.removeFromArrayAsync(favTasks, favId);
            log.value("   new fav count", favTasks.length, 2);
            //
            // Update local storage for persistence
            //
            await storage.update(constants.FAV_TASKS_STORE, favTasks);
            //
            // Update
            //
            await this.showSpecialTasks(true, true, undefined, "   ");
        }
        log.methodDone("add/remove favorite", 1);
    }


    private async addToExcludes(selection: TaskFile | string)
    {
        const me = this;
        let pathValue = "";
        let uri: Uri | undefined;

        log.methodStart("add to excludes", 1, "", true, [[ "global", global ]]);

        if (selection instanceof TaskFile)
        {
            uri = selection.resourceUri;
            if (selection.isGroup)
            {
                log.write("  file group");
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
            else if (uri)
            {
                log.value("  file glob", uri.path);
                pathValue = uri.path;
            }
        }
        else {
            pathValue = selection;
        }

        if (!pathValue) {
            return;
        }
        log.value("   path value", pathValue, 2);

        let excludes: string[] = [];
        const excludes2 = configuration.get<string[]>("exclude");
        if (excludes2 && excludes2 instanceof Array) {
            excludes = excludes2;
        }
        else if (typeof excludes2 === "string") {
            excludes.push(excludes2);
        }
        const strs = pathValue.split(",");
        for (const s in strs) {
            if (strs.hasOwnProperty(s)) { // skip properties inherited from prototype
                util.pushIfNotExists(excludes, strs[s]);
            }
        }

        configuration.updateWs("exclude", excludes);
        // configuration.update("exclude", excludes);

        await me.refresh(selection instanceof TaskFile ? selection.taskSource : false, uri);

        log.methodDone("add to excludes", 1);
    }


    private addToSpecialFolder(taskItem: TaskItem, folder: any, tasks: string[], label: string)
    {
        if (taskItem && taskItem.id && folder && tasks && label && taskItem.task && tasks.includes(taskItem.id))
        {
            const taskItem2 = new TaskItem(this.extensionContext, taskItem.taskFile, taskItem.task);
            taskItem2.id = label + ":" + taskItem2.id;
            taskItem2.label = this.getSpecialTaskName(taskItem2);
            folder.insertTaskFile(taskItem2, 0);
        }
    }


    private async buildGroupings(folders: Map<string, TaskFolder>, logPad = "")
    {
        log.methodStart("build tree node groupings", 1, logPad);

        //
        // Sort nodes.  By default the project folders are sorted in the same order as that
        // of the Explorer.  Sort TaskFile nodes and TaskItems nodes alphabetically, by default
        // its entirley random as to when the individual providers report tasks to the engine
        //
        // After the initial sort, create any task groupings based on the task group separator.
        // 'folders' are the project/workspace folders.
        //
        for (const [ key, folder ] of folders)
        {
            if (key === constants.LAST_TASKS_LABEL || key === constants.FAV_TASKS_LABEL) {
                continue;
            }
            await this.sortFolder(folder, logPad + "   ");
            //
            // Create groupings by task type
            //
            if (configuration.get("groupWithSeparator")) // && key !== constants.USER_TASKS_LABEL)
            {
                await this.createTaskGroupings(folder, logPad + "   ");
            }
        }

        log.methodDone("build tree node groupings", 1, logPad);
    }


    private async buildTaskTree(tasksList: Task[], logPad = ""): Promise<TaskFolder[] | NoScripts[]>
    {
        let taskCt = 0;
        const folders: Map<string, TaskFolder> = new Map();
        const files: Map<string, TaskFile> = new Map();
        let ltfolder: TaskFolder | undefined,
            favfolder: TaskFolder | undefined;

        log.methodStart("build task tree", 1, logPad);
        this.treeBuilding = true;

        //
        // The 'Last Tasks' folder will be 1st in the tree
        //
        const lastTasks = storage.get<string[]>(constants.LAST_TASKS_STORE, []);
        if (configuration.get<boolean>("showLastTasks") === true)
        {
            if (lastTasks && lastTasks.length > 0)
            {
                ltfolder = new TaskFolder(constants.LAST_TASKS_LABEL);
                folders.set(constants.LAST_TASKS_LABEL, ltfolder);
            }
        }

        //
        // The 'Favorites' folder will be 2nd in the tree (or 1st if configured to hide
        // the 'Last Tasks' folder)
        //
        const favTasks = storage.get<string[]>(constants.FAV_TASKS_STORE, []);
        if (favTasks && favTasks.length > 0)
        {
            favfolder = new TaskFolder(constants.FAV_TASKS_LABEL);
            folders.set(constants.FAV_TASKS_LABEL, favfolder);
        }

        //
        // Loop through each task provided by the engine and build a task tree
        //
        for (const each of tasksList)
        {
            log.blank(1);
            log.write("   Processing task " + (taskCt++).toString() + " of " + tasksList.length.toString(), 1, logPad);
            this.buildTaskTreeList(each, folders, files, ltfolder, favfolder, lastTasks, favTasks, logPad + "   ");
        }

        //
        // Sort and build groupings
        //
        await this.buildGroupings(folders);

        //
        // Sort the 'Last Tasks' folder by last time run
        //
        this.sortLastTasks(ltfolder?.taskFiles, lastTasks, logPad + "   ");

        //
        // Sort the 'Favorites' folder
        //
        this.sortTasks(favfolder?.taskFiles, logPad + "   ");

        //
        // Get sorted root project folders (only project folders are sorted, special folders 'Favorites',
        // 'User Tasks' and 'Last Tasks' are kept at the top of the list.
        //
        const sortedFolders = this.getSortedRoot(folders);

        //
        // Done!
        //
        log.methodDone("build task tree", 1, logPad);
        this.treeBuilding = false;

        return sortedFolders;
    }


    /**
     * @method buildTaskTreeList
     *
     * @param each The Task that the tree item to be created will represent.
     * @param folders The map of existing TaskFolder items.  TaskFolder items represent workspace folders.
     * @param files The map of existing TaskFile items.
     * @param ltfolder The TaskFolder representing "Last Tasks"
     * @param favfolder The TaskFolder representing "Favorites"
     * @param lastTasks List of Task ID's currently in the "Last Tasks" TaskFolder.
     * @param favTasks List of Task ID's currently in the "Favorites" TaskFolder.
     * @param logPad Padding to prepend to log entries.  Should be a string of any # of space characters.
     */
    private buildTaskTreeList(each: Task, folders: Map<string, TaskFolder>, files: Map<string, TaskFile>, ltfolder: TaskFolder | undefined, favfolder: TaskFolder | undefined, lastTasks: string[], favTasks: string[], logPad = "")
    {
        let folder: TaskFolder | undefined,
            scopeName: string;

        log.methodStart("build task tree list", 2, logPad, true, [
            [ "name", each.name ], [ "source", each.source ], [ "scope", each.scope ],
            [ "definition type", each.definition.type ], [ "definition path", each.definition.path ]
        ]);

        const definition: TaskDefinition = each.definition;
        let relativePath = definition.path ?? "";

        //
        // Make sure this task shouldnt be ignored based on various criteria...
        // Process only if this task type/source is enabled in settings or is scope is empty (VSCode provided task)
        // By default, also ignore npm 'install' tasks, since its available in the context menu
        //
        const include: boolean | string = this.isTaskIncluded(each, relativePath, logPad);
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
        // a WosrkspaceFolder scope.
        //
        if (this.isWorkspaceFolder(each.scope))
        {
            scopeName = each.scope.name;
            folder = folders.get(scopeName);
            if (!folder)
            {
                folder = new TaskFolder(each.scope);
                folders.set(scopeName, folder);
            }
        }     //
        else // User Task (not related to a ws or project)
        {   //
            scopeName = constants.USER_TASKS_LABEL;
            folder = folders.get(scopeName);
            if (!folder)
            {
                folder = new TaskFolder(scopeName);
                folders.set(scopeName, folder);
            }
        }

        //
        // Log the task details
        //
        this.logTask(each, scopeName, logPad);

        //
        // Get task file node, this will create one of it doesn't exist
        //
        const taskFile = this.getTaskFileNode(each, folder, files, relativePath, scopeName, logPad);

        //
        // Create and add task item to task file node
        //
        // If this is an 'NPM Install' task, then we do not add the "tree item".  We do however add
        // the "tree file" (above), so that the npm management tasks (including install update, audit,
        // etc) are available via context menu of the "tree file" that represent's the folder that the
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
            this.addToSpecialFolder(taskItem, ltfolder, lastTasks, constants.LAST_TASKS_LABEL);
            //
            // Add this task to the 'Favorites' folder if we need to
            //
            this.addToSpecialFolder(taskItem, favfolder, favTasks, constants.FAV_TASKS_LABEL);
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
        const choice = typeof folder === "string" ?
                       "Yes" : await window.showInformationMessage("Clear all tasks from this folder?", "Yes", "No"),
              label = typeof folder === "string" ? folder : folder.label;
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
    private async createSpecialFolder(storeName: string, label: string, treeIndex: number, sort: boolean, logPad = "")
    {
        const lTasks = storage.get<string[]>(storeName, []);
        const folder = new TaskFolder(label);

        log.methodStart("create special tasks folder", 1, logPad, true, [
            [ "store",  storeName ], [ "name",  label ]
        ]);

        if (!this.taskTree) {
            return;
        }

        this.taskTree.splice(treeIndex, 0, folder);

        for (const tId of lTasks)
        {
            const taskItem2 = await this.getTaskItems(tId);
            if (taskItem2 && taskItem2 instanceof TaskItem && taskItem2.task)
            {
                const taskItem3 = new TaskItem(this.extensionContext, taskItem2.taskFile, taskItem2.task);
                taskItem3.id = label + ":" + taskItem3.id;
                taskItem3.label = this.getSpecialTaskName(taskItem3);
                folder.insertTaskFile(taskItem3, 0);
            }
        }

        if (sort) {
            this.sortTasks(folder.taskFiles, logPad + "   ");
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
    private async createTaskGroupings(folder: TaskFolder, logPad = "")
    {
        let prevTaskFile: TaskItem | TaskFile | undefined;
        const subfolders: Map<string, TaskFile> = new Map();

        log.methodStart("create tree node folder grouping", 1, logPad, true, [[ "project folder", folder.label ]]);

        for (const each of folder.taskFiles)
        {   //
            // Only processitems of type 'TaskFile'
            //
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
                    log.values(3, logPad, [
                        ["   Add source file sub-container", each.path],
                        ["      id", id]
                    ], true);
                    const definition = (each.treeNodes[0] as TaskItem)?.task?.definition;
                    if (definition)
                    {
                        subfolder = new TaskFile(this.extensionContext, folder, definition,
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
                subfolder?.addTreeNode(each); // addScript will set the group level on the TaskItem
            }
            prevTaskFile = each;
            //
            // Create the grouping
            //
            await this.createTaskGroupingsBySep(folder, each, subfolders, 0, logPad + "   ");
        }

        //
        // For groupings with separator, when building the task tree, when tasks are grouped new task definitions
        // are created but the old task remains in the parent folder.  Remove all tasks that have been moved down
        // into the tree hierarchy due to groupings
        //
        this.removeGroupedTasks(folder, subfolders, logPad + "   ");

        //
        // For groupings with separator, now go through and rename the labels within each group minus the
        // first part of the name split by the separator character (the name of the new grouped-with-separator node)
        //
        log.write(logPad + "   rename grouped tasks", 1);
        for (const each of folder.taskFiles)
        {
            if (each instanceof TaskFile) {
                await this.renameGroupedTasks(each);
            }
        }

        //
        // Resort after making adds/removes
        //
        await this.sortFolder(folder, logPad + "   ");

        log.methodDone("create tree node folder grouping", 1, logPad);
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
     * If 'groupMaxLevel' is > 1 (default), then the hierarchy continunes to be broken down until the max
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
    private async createTaskGroupingsBySep(folder: TaskFolder, taskFile: TaskFile, subfolders: Map<string, TaskFile>, treeLevel = 0, logPad = "")
    {
        let prevName: string[] | undefined;
        let prevTaskItem: TaskItem | undefined;
        const newNodes: TaskFile[] = [];
        const groupSeparator = util.getGroupSeparator();
        const atMaxLevel: boolean = configuration.get<number>("groupMaxLevel") <= treeLevel + 1;

        log.methodStart("create task groupings by separator", 2, logPad, true, [
            [ "folder", folder.label ], [ "label (node name)", taskFile.label ], [ "grouping level", treeLevel ], [ "is group", taskFile.isGroup ],
            [ "file name", taskFile.fileName ], [ "folder", folder.label ], [ "path", taskFile.path ], ["tree level", treeLevel]
        ]);

        const _setNodePath = (t: TaskItem | undefined, cPath: string) =>
        {
            if (t && !atMaxLevel && prevName)
            {
                log.write("   setting node path", 4, logPad);
                log.value("      current", t.nodePath, 4, logPad);
                if (!t.nodePath && taskFile.taskSource === "Workspace") {
                    t.nodePath = path.join(".vscode", prevName[treeLevel]);
                }
                else if (!t.nodePath) {
                    t.nodePath = prevName[treeLevel];
                }
                else {
                    t.nodePath = path.join(cPath, prevName[treeLevel]);
                }
                log.value("      new", t.nodePath, 4, logPad);
            }
        };

        for (const each of taskFile.treeNodes)
        {
            if (!(each instanceof TaskItem) || !each.task || !each.label) {
                continue;
            }
            const label = each.label.toString();
            let subfolder: TaskFile | undefined;
            const prevNameThis = label?.split(groupSeparator);
            const prevNameOk = prevName && prevName.length > treeLevel && prevName[treeLevel];

            log.write("   process task item", 3, logPad);
            log.values(4, logPad + "      ", [
                ["id", each.id], ["label", label], ["node path", each.nodePath], ["command", each.command?.command],
                ["previous name [tree level]", prevName && prevNameOk ? prevName[treeLevel] : "undefined"],
                ["this previous name", prevNameThis]
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
            // antoeher set of tasks in separate parts of the groupings, for example:
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

            prevName = label.split(groupSeparator);
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
                if (!atMaxLevel)
                {   //
                    // TODO !!!
                    // Ref ticket #133
                    // VSCode Tasks - Bug, something to do with "relativepath" of the acutal task being empty,
                    // but in this extension we use /.vcsode as the path, cant go deeper then one level, for
                    // now until I can find time to look at more
                    //
                    if (n.taskSource === "Workspace") {
                        continue;
                    }
                    await this.createTaskGroupingsBySep(folder, n, subfolders, treeLevel + 1, logPad + "   ");
                }
            }
        }

        log.methodDone("create task groupings by separator", 2, logPad);
    }


    private findJsonDocumentPosition(documentText: string, taskItem: TaskItem)
    {
        const me = this;
        let inScripts = false;
        let inTasks = false;
        let inTaskLabel: any;
        let scriptOffset = 0;

        const visitor: JSONVisitor =
        {
            onError: () =>
            {
                return scriptOffset;
            },
            onObjectEnd: () =>
            {
                if (inScripts)
                {
                    inScripts = false;
                }
            },
            onLiteralValue: (value: any, offset: number, _length: number) =>
            {
                if (inTaskLabel)
                {
                    if (typeof value === "string")
                    {
                        if (inTaskLabel === "label" || inTaskLabel === "script")
                        {
                            if (taskItem.task?.name === value)
                            {
                                scriptOffset = offset;
                            }
                        }
                    }
                    inTaskLabel = undefined;
                }
            },
            onObjectProperty: (property: string, offset: number, _length: number) =>
            {
                if (property === "scripts")
                {
                    inScripts = true;
                    if (!taskItem)
                    { // select the script section
                        scriptOffset = offset;
                    }
                }
                else if (inScripts && taskItem)
                {
                    const label = me.getTaskName(property, taskItem.task?.definition.path);
                    if (taskItem.task?.name === label)
                    {
                        scriptOffset = offset;
                    }
                }
                else if (property === "tasks")
                {
                    inTasks = true;
                    if (!inTaskLabel)
                    { // select the script section
                        scriptOffset = offset;
                    }
                }
                else if ((property === "label" || property === "script") && inTasks && !inTaskLabel)
                {
                    inTaskLabel = "label";
                    if (!inTaskLabel)
                    { // select the script section
                        scriptOffset = offset;
                    }
                }
                else
                { // nested object which is invalid, ignore the script
                    inTaskLabel = undefined;
                }
            }
        };

        visit(documentText, visitor);

        return scriptOffset;
    }


    private findDocumentPosition(document: TextDocument, taskItem?: TaskItem): number
    {
        let scriptOffset = 0;
        const documentText = document.getText();

        log.methodStart("find task definition document position", 1, "", true,
            [ [ "task label", taskItem?.label], [ "task source", taskItem?.taskSource] ]
        );

        if (!taskItem || !taskItem.task) { return 0; }

        const def = taskItem.task.definition;
        if (taskItem.taskSource === "npm" || taskItem.taskSource === "Workspace")
        {
            scriptOffset = this.findJsonDocumentPosition(documentText, taskItem);
        }
        else {
            const provider = providers.get(util.getScriptProviderType(def.type));
            scriptOffset = provider?.getDocumentPosition(taskItem.task.name, documentText) || -1;
        }

        if (scriptOffset === -1) {
            scriptOffset = 0;
        }

        log.methodDone("find task definition document position", 1, "", true, [ ["offset", scriptOffset ] ]);
        return scriptOffset;
    }


    private fireTaskChangeEvents(taskItem: TaskItem)
    {
        if (!this.taskTree || !taskItem) {
            log.error("task change event fire, invalid argument");
            return;
        }

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
        if (configuration.get<boolean>("showLastTasks") === true)
        {
            const lastTasks = storage.get<string[]>(constants.LAST_TASKS_STORE, []);
            if (util.existsInArray(lastTasks, this.getTaskItemId(taskItem)) !== false)
            {
                if (this.taskTree[0].label === constants.LAST_TASKS_LABEL)
                {
                    this._onDidChangeTreeData.fire(this.taskTree[0]);
                }
            }
        }

        //
        // Fire change event for the 'Favorites' folder if the task exists there
        //
        const favTasks = storage.get<string[]>(constants.FAV_TASKS_STORE, []);
        if (util.existsInArray(favTasks, this.getTaskItemId(taskItem)) !== false)
        {
            if (this.taskTree[0].label === constants.FAV_TASKS_LABEL)
            {
                this._onDidChangeTreeData.fire(this.taskTree[0]);
            }
            else if (this.taskTree[1].label === constants.FAV_TASKS_LABEL)
            {
                this._onDidChangeTreeData.fire(this.taskTree[1]);
            }
        }
    }


    async getChildren(element?: TreeItem, logPad = ""): Promise<TreeItem[]>
    {
        let waited = 0;
        let items: any = [];

        log.methodStart("get tree children", 1, logPad, true, [
            [ "task folder", element?.label ], [ "all tasks need to be retrieved", !this.tasks ],
            [ "specific tasks need to be retrieved", !!this.currentInvalidation ],
            [ "   current invalidation", this.currentInvalidation ],
            [ "task tree needs to be built", !this.taskTree ]
        ]);

        //
        // The vscode task engine processing will call back in multiple time while we are awaiting
        // the call to buildTaskTree().  This occurs on the await of buildGroupings() in buildTaskTree.
        // To prevent bad. things. happening. sleep the call here until the tree has finished building.
        // This "could"" be prevented by re-implementing the tree the "right way", where we dont build the
        // whole tree if it doesnt exist and build it node by node as theyare expanded, but, because we
        // have 'LastTasks' and 'Favorites', we need to load everything.  Oh well.
        //
        while (this.treeBuilding) {
            log.write(logPad + "   waiting...", 1);
            await util.timeout(100);
            waited += 100;
        }
        if (waited) {
            log.write(logPad + "   waited " + waited + " ms", 1);
        }

        //
        // Build task tree if not built already.
        //
        if (!this.taskTree)
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
            // for all tasks.
            //
            if (!this.tasks || this.currentInvalidation === "workspace") {
                this.tasks = await tasks.fetchTasks();
            }
            else if (this.currentInvalidation)
            {   //
                // Get all tasks of the type defined in 'currentInvalidation' from VSCode, remove
                // all tasks of the type defined in 'currentInvalidation' from the tasks list cache,
                // and add the new tasks from VSCode into the tasks list.
                //
                const toRemove: Task[] = [];
                const taskItems = await tasks.fetchTasks({ type: this.currentInvalidation });
                for (const t of this.tasks)
                {   //
                    // Note that requesting a task type can return Workspace tasks (tasks.json/vscode)
                    // if the script type set for the task in tasks.json is of type 'currentInvalidation'.
                    // Remove any Workspace type tasks returned as well, in this case the source type is
                    // != currentInvalidation, but the definition type == currentInvalidation
                    //
                    if (t.source === this.currentInvalidation || t.source === "Workspace") {
                        if (t.source !== "Workspace" || t.definition.type === this.currentInvalidation) {
                            toRemove.push(t);
                        }
                    }
                }
                for (const t of toRemove) {
                    util.removeFromArray(this.tasks, t);
                }
                this.tasks.push(...taskItems);
            }
            if (this.tasks)
            {   //
                // Build the entire task tree
                //
                this.taskTree = await this.buildTaskTree(this.tasks, logPad + "   ");
                log.blank(1);
                if (this.taskTree.length === 0)
                {
                    this.taskTree = [noScripts];
                }
            }
        }

        if (element instanceof TaskFolder)
        {
            log.write(logPad + "   Get folder task files", 2);
            items = element.taskFiles;
        }
        else if (element instanceof TaskFile)
        {
            log.write(logPad + "   Get file tasks/scripts", 2);
            items = element.treeNodes;
        }
        else if (!element)
        {
            log.write(logPad + "   Get task tree", 1);
            if (this.taskTree)
            {
                items = this.taskTree;
            }
        }

        log.methodDone("get tree children", 1, logPad, true);

        this.currentInvalidation = undefined; // reset file modification task type flag
        return items;
    }


    private getGroupedId(folder: TaskFolder, file: TaskFile, label: string, treeLevel: number)
    {
        const groupSeparator = util.getGroupSeparator();
        const labelSplit = label?.split(groupSeparator);
        let id = "";
        for (let i = 0; i <= treeLevel; i++)
        {
            id += labelSplit[i];
        }
        return folder.label + file.taskSource + id + (treeLevel || treeLevel === 0 ? treeLevel.toString() : "");
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
        if (element instanceof NoScripts)
        {
            return null;
        }
        return null;
    }


    private getSortedRoot(folders: Map<string, TaskFolder>): TaskFolder[]
    {
        return [...folders.values()]?.sort((a: TaskFolder, b: TaskFolder) =>
        {
            const sFolders = [ constants.FAV_TASKS_LABEL, constants.LAST_TASKS_LABEL, constants.USER_TASKS_LABEL];
            if (a.label === constants.LAST_TASKS_LABEL) {
                return -1;
            }
            else if (b.label === constants.LAST_TASKS_LABEL) {
                return 1;
            }
            else if (a.label === constants.FAV_TASKS_LABEL) {
                if (b.label !== constants.LAST_TASKS_LABEL) {
                    return -1;
                }
                return 1;
            }
            else if (b.label === constants.FAV_TASKS_LABEL) {
                if (a.label !== constants.LAST_TASKS_LABEL) {
                    return 1;
                }
                return -1;
            }
            else if (a.label === constants.USER_TASKS_LABEL) {
                if (b.label !== constants.LAST_TASKS_LABEL && b.label !== constants.FAV_TASKS_LABEL) {
                    return -1;
                }
                return 1;
            }
            else if (b.label === constants.USER_TASKS_LABEL) {
                if (a.label !== constants.LAST_TASKS_LABEL && a.label !== constants.FAV_TASKS_LABEL) {
                    return 1;
                }
                return -1;
            }
            if (a.label && b.label) {
                return a.label?.localeCompare(b.label?.toString());
            }
            return 0;
        });
    }


    private getSpecialTaskName(taskItem: TaskItem)
    {
        return taskItem.label + " (" + taskItem.taskFile.folder.label + " - " + taskItem.taskSource + ")";
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
    public async getTaskItems(taskId: string | undefined, logPad = "", executeOpenForTests = false): Promise<Map<string, TaskItem> | TaskItem | undefined>
    {
        const me = this;
        const taskMap: Map<string, TaskItem> = new Map();
        let done = false;

        log.methodStart("Get task item(s) from tree", 1, logPad, false, [
            [ "task id", taskId ?? "all tasks" ], [ "execute open", executeOpenForTests ]
        ]);

        const treeItems = await this.getChildren(undefined, "   ");
        if (!treeItems || treeItems.length === 0)
        {
            window.showInformationMessage("No tasks found!");
            await storage.update(constants.FAV_TASKS_STORE, []);
            await storage.update(constants.LAST_TASKS_STORE, []);
            return;
        }

        const processItem2g = async (pitem2: TaskFile) =>
        {
            const treeFiles: any[] = await me.getChildren(pitem2, "   ");
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
                        log.write("        Task File (grouped): " + item2.path + item2.fileName);
                        await processItem2g(item2);
                    }
                    else if (item2 instanceof TaskFile && !item2.isGroup)
                    {
                        log.write("        Task File (grouped): " + item2.path + item2.fileName);
                        await processItem2(item2);
                    }
                }
            }
        };

        const processItem2 = async (pitem2: any) =>
        {
            const treeTasks: any[] = await me.getChildren(pitem2, "   ");
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
                            let tpath: string;

                            if (me.isWorkspaceFolder(item3)) {
                                tpath = item3.task.definition.uri ? item3.task.definition.uri.fsPath :
                                    (item3.task.definition.path ? item3.task.definition.path : "root");
                            }
                            else {
                                tpath = "root";
                            }

                            log.write(logPad + "   ✔ Processed " + item3.task.name);
                            log.value(logPad + "        id", item3.id);
                            log.value(logPad + "        type", item3.taskSource + " @ " + tpath);
                            if (item3.id) {
                                taskMap.set(item3.id, item3);
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

        const processItem = async (pitem: any) =>
        {
            let tmp: any;
            const treeFiles: any[] = await me.getChildren(pitem, "   ");
            if (treeFiles.length > 0)
            {
                for (const item2 of treeFiles)
                {
                    if (done) {
                        break;
                    }
                    if (item2 instanceof TaskFile && !item2.isGroup)
                    {
                        log.write(logPad + "   Task File: " + item2.path + item2.fileName);
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
                const isFav = item.label?.includes(constants.FAV_TASKS_LABEL);
                const isLast = item.label?.includes(constants.LAST_TASKS_LABEL);
                const isUser = item.label?.includes(constants.USER_TASKS_LABEL);
                const tmp: any = me.getParent(item);
                assert(tmp === null, "Invaid parent type, should be null for TaskFolder");
                log.write(logPad + "Task Folder " + item.label + ":  " + (!isFav && !isLast && !isUser ?
                         item.resourceUri?.fsPath : (isLast ? constants.LAST_TASKS_LABEL :
                            (isUser ? constants.USER_TASKS_LABEL : constants.FAV_TASKS_LABEL))));
                await processItem(item);
            }
        }

        log.methodDone("Get task item(s) from tree", 1, logPad, false, [
            [ "# of items found", taskMap.keys.length ]
        ]);

        if (taskId) {
            return taskMap.get(taskId);
        }
        return taskMap;
    }


    private getTaskName(script: string, relativePath: string | undefined)
    {
        if (relativePath && relativePath.length)
        {
            return `${script} - ${relativePath.substring(0, relativePath.length - 1)}`;
        }
        return script;
    }


    private getTaskFileNode(task: Task, folder: TaskFolder, files: any, relativePath: string, scopeName: string, logPad = ""): TaskFile
    {
        let taskFile: TaskFile;
        //
        // Reference ticket #133, vscode folder should not use a path appendature in it's folder label
        // in the task tree, there is only one path for vscode/workspace tasks, /.vscode.  The fact that
        // you can set the path variable inside a vscode task changes the relativePath for the task,
        // causing an endless loop when putting the tasks into groups (see taskTree.createTaskGroupings).
        // All othr task types will have a relative path of it's location on the filesystem (with
        // eception of TSC, which is handled elsewhere).
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
            log.value(logPad + "   Add source file container", task.source);
            taskFile = new TaskFile(this.extensionContext, folder, task.definition, task.source, relativePath, 0, false, undefined, logPad);
            folder.addTaskFile(taskFile);
            files.set(id, taskFile);
        }

        return taskFile;
    }


    private getTaskItemId(taskItem: TaskItem)
    {
        return taskItem?.id?.replace(constants.LAST_TASKS_LABEL + ":", "")
                            .replace(constants.FAV_TASKS_LABEL + ":", "")
                            .replace(constants.USER_TASKS_LABEL + ":", "");
    }


    private getTerminal(taskItem: TaskItem): Terminal | undefined
    {
        const me = this;
        let checkNum = 0;
        let term: Terminal | undefined;

        log.write("Get terminal", 1);

        if (!taskItem.task || !taskItem.label)
        {
            log.write("   no defined task on TaskItem", 2);
            return;
        }

        if (!window.terminals || window.terminals.length === 0)
        {
            log.write("   zero terminals alive", 2);
            return term;
        }

        if (window.terminals.length === 1)
        {
            log.write("   return only terminal alive", 2);
            return window.terminals[0];
        }

        const check = (taskName: string) =>
        {
            let termNum = 0,
                term2: Terminal | undefined;
            log.value("   Checking possible task terminal name #" + (++checkNum).toString(), taskName, 2);
            for (const t of window.terminals)
            {
                log.value("      == terminal " + (++termNum) + " name", t.name, 2);
                if (taskName.toLowerCase().replace("task - ", "").indexOf(t.name.toLowerCase().replace("task - ", "")) !== -1)
                {
                    term2 = t;
                    log.write("   found!", 2);
                    break;
                }
            }
            return term2;
        };

        let relPath = taskItem.task.definition.path ? taskItem.task.definition.path : "";
        if (relPath[relPath.length - 1] === "/") {
            relPath = relPath.substring(0, relPath.length - 1);
        }
        else if (relPath[relPath.length - 1] === "\\") {
            relPath = relPath.substring(0, relPath.length - 1);
        }

        if (taskItem.taskFile.folder.workspaceFolder)
        {
            const lblString = taskItem.label.toString();
            let taskName = "Task - " + taskItem.taskFile.label + ": " + taskItem.label +
                            " (" + taskItem.taskFile.folder.workspaceFolder.name + ")";
            term = check(taskName);

            if (!term && lblString.indexOf("(") !== -1)
            {
                taskName = "Task - " + taskItem.taskSource + ": " + lblString.substring(0, lblString.indexOf("(")).trim() +
                        " (" + taskItem.taskFile.folder.workspaceFolder.name + ")";
                term = check(taskName);
            }

            if (!term)
            {
                taskName = "Task - " + taskItem.taskSource + ": " + lblString +
                        " - " + relPath + " (" + taskItem.taskFile.folder.workspaceFolder.name + ")";
                term = check(taskName);
            }

            if (!term && lblString.indexOf("(") !== -1)
            {
                taskName = "Task - " + taskItem.taskSource + ": " + lblString.substring(0, lblString.indexOf("(")).trim() +
                        " - " + relPath + " (" + taskItem.taskFile.folder.workspaceFolder.name + ")";
                term = check(taskName);
            }

            if (!term)
            {
                const folder = taskItem.getFolder();
                if (folder) {
                    taskName = folder.name + " (" + relPath + ")";
                    term = check(taskName);
                }
            }

            if (!term)
            {
                const folder = taskItem.getFolder();
                if (folder) {
                    taskName = folder.name + " (" + path.basename(relPath) + ")";
                    term = check(taskName);
                }
            }
        }

        return term;
    }


    public getTreeItem(element: TaskItem | TaskFile | TaskFolder): TreeItem
    {
        log.blank(3);
        log.write("get tree item", 3);
        log.value("   label", element?.label, 3);
        if (element instanceof TaskItem) {
            log.write("   refresh task item state", 3);
            element.refreshState();
        }
        return element;
    }


    private async handleFileWatcherEvent(invalidate: any, opt?: boolean | Uri, logPad = "")
    {
        log.write("   handling FileWatcher / settings change / test event");
        //
        // invalidate=true means the refresh button was clicked (opt will be false)
        // invalidate="tests" means this is being called from unit tests (opt will be undefined)
        //
        if ((invalidate === true || invalidate === "tests") && !opt) {
            log.write("Handling 'rebuild cache' event", 1, logPad);
            this.busy = true;
            await rebuildCache();
            log.write("Handling 'rebuild cache' eventcomplete", 1, logPad);
            this.busy = false;
        }
        //
        // If this is not from unit testing, then invalidate the appropriate task cache/file
        //
        if (invalidate !== "tests") {
            log.write("handling 'invalidate tasks cache' event", 1, logPad);
            await this.invalidateTasksCache(invalidate, opt);
        }
    }


    private async handleVisibleEvent(logPad = "")
    {
        log.write("   handling 'visible' event");
        if (this.needsRefresh && this.needsRefresh.length > 0)
        {   //
            // If theres more than one pending refresh request, just refresh the tree
            //
            if (this.needsRefresh.length > 1 || this.needsRefresh[0].invalidate === undefined)
            {
                await this.refresh(logPad);
            }
            else
            {
                await this.refresh(this.needsRefresh[0].invalidate, this.needsRefresh[0].uri, logPad);
            }

            this.needsRefresh = [];
        }
    }


    /**
     * This function should only be called by the unit tests
     *
     * @param opt1 Task provider type.  Can be one of:
     *     "ant"
     *     "app-publisher"
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
    public async invalidateTasksCache(opt1?: string, opt2?: Uri | boolean)
    {
        log.methodStart("invalidate tasks cache", 1, "", true, [
            [ "opt1", opt1 ], [ "opt2", opt2 && opt2 instanceof Uri ? opt2.fsPath : opt2 ]
        ]);
        this.busy = true;

        //
        // All internal task providers export an invalidate() function...
        //
        // If 'opt1' is a string then a filesystemwatcher, settings change, or taskevent was
        // triggered for the task type defined in the 'opt1' parameter.
        //
        // The 'opt1' parameter may also have a value of 'tests', which indicates this is
        // being called from the unit tests, so some special handling is required.
        //
        // In the case of a settings change, 'opt2' will be undefined.  Depending on how many task
        // types configs' were aaltered in settings, this function may run through more than once
        // right now for each task type affected.  Some settings require a global refresh, for example
        // the 'groupDashed' settings, or 'enableSideBar',etc.  If a global refresh is to be performed,
        // then both 'opt1' and 'opt2' will be undefined.
        //
        // In the casse of a task event, 'opt2' is undefined.
        //
        // If a FileSystemWatcher event, then 'opt2' should contain the Uri of the file that was
        // modified, created, or deleted.
        //
        if (opt1 && opt1 !== "tests" && opt2 instanceof Uri)
        {
            log.write("   invalidate " + opt1 + " provider file ", 1);
            log.value("      file", opt2, 1);
            const provider = providers.get(util.getScriptProviderType(opt1));
            await provider?.invalidateTasksCache(opt2, "   "); // NPM/Workspace tasks don't implement TaskExplorerProvider
        }
        else { // If opt1 is undefined, refresh all providers
            if (!opt1) {
                log.write("   invalidate all providers", 1);
                for (const [ key, p ] of providers)
                {
                    log.write("   invalidate " + key + " provider", 1);
                    await p.invalidateTasksCache(undefined, "   ");
                }
            }
            else {
                log.write("   invalidate " + opt1 + " provider", 1);
                await providers.get(opt1)?.invalidateTasksCache(undefined, "   ");  // NPM/Workspace tasks don't implement TaskExplorerProvider
            }
        }

        this.busy = false;
        log.methodDone("invalidate tasks cache", 1, "", true);
    }


    private isNpmInstallTask(task: Task): boolean
    {
        return task.source === "npm" && task.name === this.getTaskName("install", task.definition.path);
    }


    private isTaskIncluded(task: Task, relativePath: string, logPad = ""): boolean | string
    {
        //
        // We have our own provider for Gulp and Grunt tasks...
        // Ignore VSCode provided gulp and grunt tasks, which are always and only from a gulp/gruntfile
        // in a workspace folder root directory.  All internaly provided tasks will have the 'uri' property
        // set in its task definition,VSCode provided Grunt/Gulp tasks will not
        //
        if (!task.definition.uri && (task.source === "gulp" || task.source === "grunt"))
        {
            log.write(`   skipping vscode provided ${task.source} task`, 2, logPad);
            return false;
        }

        //
        // TSC tasks are returned with no path value, the relative path is in the task name:
        //
        //     watch - tsconfig.json
        //     watch - .vscode-test\vscode-1.32.3\resources\app\tsconfig.schema.json
        //
        if (task.source === "tsc" && this.isWorkspaceFolder(task.scope))
        {
            if (task.name.indexOf(" - ") !== -1 && task.name.indexOf(" - tsconfig.json") === -1)
            {
                relativePath = path.dirname(task.name.substring(task.name.indexOf(" - ") + 3));
                if (util.isExcluded(path.join(task.scope.uri.path, relativePath)))
                {
                    log.write("   skipping this tsc task (remapped subfolder)", 2, logPad);
                    return false;
                }
                return relativePath;
            }
        }

        //
        // Remove the '-' from app-publisher task.  VSCode doesn't like dashes in the settings names, so...
        //
        let settingName: string = "enable" + util.properCase(task.source);
        if (settingName === "enableApp-publisher") {
            settingName = "enableAppPublisher";
        }
        const srcEnabled = configuration.get(settingName);

        const isNpmInstallTask = this.isNpmInstallTask(task);
        if ((srcEnabled || !this.isWorkspaceFolder(task.scope)) && !isNpmInstallTask)
        {
            return true;
        }

        log.value("   enabled in settings", configuration.get(settingName), 2, logPad);
        log.value("   is npm install task", isNpmInstallTask, 2, logPad);

        if (isNpmInstallTask && srcEnabled) {
            return "npm-install";
        }
        log.write("   skipping this task", 2, logPad);

        return false;
    }


    private isWorkspaceFolder(value: any): value is WorkspaceFolder
    {
        return value && typeof value !== "number";
    }


    private logTask(task: Task, scopeName: string, logPad = "")
    {
        const definition = task.definition;

        if (!log.isLoggingEnabled()) {
            return;
        }

        log.value("name", task.name, 3, logPad);
        log.value("source", task.source, 3, logPad);
        log.value("scope name", scopeName, 4, logPad);
        if (this.isWorkspaceFolder(task.scope))
        {
            log.value("scope.name", task.scope.name, 4, logPad);
            log.value("scope.uri.path", task.scope.uri.path, 4, logPad);
            log.value("scope.uri.fsPath", task.scope.uri.fsPath, 4, logPad);
        }
        else // User tasks
        {
            log.value("scope.uri.path", "N/A (User)", 4, logPad);
        }
        log.value("relative Path", definition.path ? definition.path : "", 4, logPad);
        log.value("type", definition.type, 4, logPad);
        if (definition.scriptType)
        {
            log.value("   script type", definition.scriptType, 4, logPad);	// if 'script' is defined, this is type npm
        }
        if (definition.scriptFile)
        {
            log.value("   script file", definition.scriptFile, 4, logPad);	// if 'script' is defined, this is type npm
        }
        if (definition.script)
        {
            log.value("script", definition.script, 4, logPad);	// if 'script' is defined, this is type npm
        }
        if (definition.path)
        {
            log.value("path", definition.path, 4, logPad);
        }
        //
        // Internal task providers will set a fileName property
        //
        if (definition.fileName)
        {
            log.value("file name", definition.fileName, 4, logPad);
        }
        //
        // Internal task providers will set a uri property
        //
        if (definition.uri)
        {
            log.value("file path", definition.uri.fsPath, 4, logPad);
        }
        //
        // Script task providers will set a fileName property
        //
        if (definition.takesArgs)
        {
            log.value("script requires args", "true", 4, logPad);
        }
        if (definition.cmdLine)
        {
            log.value("script cmd line", definition.cmdLine, 4, logPad);
        }
    }


    private async open(selection: TaskItem)
    {
        const clickAction = configuration.get<string>("clickAction") || "Open";

        //
        // As of v1.30.0, added option to change the entry item click to execute.  In order to avoid having
        // to re-register the handler when the setting changes, we just re-route the request here
        //
        if (clickAction === "Execute") {
            await this.run(selection);
            return;
        }

        const uri = selection.taskFile.resourceUri;

        if (uri)
        {
            log.methodStart("open document at position", 1, "", true, [
                [ "command", selection.command?.command ], [ "source", selection.taskSource ],
                [ "uri path", uri.path ], [ "fs path", uri.fsPath ]
            ]);

            if (util.pathExists(uri.fsPath))
            {
                const document: TextDocument = await workspace.openTextDocument(uri);
                const offset = this.findDocumentPosition(document, selection instanceof TaskItem ? selection : undefined);
                const position = document.positionAt(offset);
                await window.showTextDocument(document, { selection: new Selection(position, position) });
            }
        }
    }


    private openTerminal(taskItem: TaskItem)
    {
        const term = this.getTerminal(taskItem);
        if (term) {
            term.show();
        }
    }


    private pause(taskItem: TaskItem)
    {
        if (!taskItem || this.busy)
        {
            window.showInformationMessage("Busy, please wait...");
            return;
        }

        if (taskItem.task?.execution)
        {
            const terminal = this.getTerminal(taskItem);
            if (terminal)
            {
                if (taskItem.paused)
                {
                    taskItem.paused = false;
                    terminal.sendText("N");
                }
                else
                {
                    taskItem.paused = true;
                    terminal.sendText("\u0003");
                }
            }
        }
    }


    private pushToTopOfSpecialFolder(taskItem: TaskItem, label: string, treeIndex: number, logPad = "")
    {
        let taskItem2: TaskItem | undefined;
        const ltfolder = this.taskTree ? this.taskTree[treeIndex] as TaskFolder : undefined;
        const taskId = label + ":" + this.getTaskItemId(taskItem);

        if (!ltfolder || !taskItem.task) {
            return;
        }

        for (const t of ltfolder.taskFiles)
        {
            if (t instanceof TaskItem && t.id === taskId) {
                taskItem2 = t;
                break;
            }
        }

        if (taskItem2)
        {
            ltfolder.removeTaskFile(taskItem2);
        }
        else if (ltfolder.taskFiles.length >= configuration.get<number>("numLastTasks"))
        {
            ltfolder.removeTaskFile(ltfolder.taskFiles[ltfolder.taskFiles.length - 1]);
        }

        if (!taskItem2)
        {
            taskItem2 = new TaskItem(this.extensionContext, taskItem.taskFile, taskItem.task);
            taskItem2.id = taskId;
            taskItem2.label = this.getSpecialTaskName(taskItem2);
        }

        log.value(logPad + "   add item", taskItem2.id, 2);
        ltfolder.insertTaskFile(taskItem2, 0);
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
     * Can also be one of the task types (FileSystemWatcher event):
     *
     *     "ant"
     *     "app-publisher"
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
     * the expludes list is a group/folder, then invalidate will be set to the task source, i.e.
     * npm, ant, workspace, etc.
     *
     * If invalidate is true and opt is false, then the refresh button was clicked
     *
     * If invalidate is "tests" and opt undefined, then extension.refreshTree() called in tests
     *
     * If task is truthy, then a task has started/stopped, opt will be the task deifnition's
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
    public async refresh(invalidate?: any, opt?: Uri | boolean, logPad = ""): Promise<void>// , skipAskTasks?: boolean): Promise<boolean>
    {
        log.methodStart("refresh task tree", 1, logPad, true, [
            [ "from view", this.name ], [ "invalidate", invalidate ],
            [ "opt fsPath", opt && opt instanceof Uri ? opt.fsPath : "n/a" ]
        ]);

        //
        // If a view was turned off in settings, the disposable view still remains and will still
        // receive events.  If this view is hidden/disabled, then nothing to do right now, save the
        // event paramters to process later.
        //
        if (this.taskTree && views.get(this.name) && invalidate !== "tests")
        {
            if (!views.get(this.name)?.visible ||
                !configuration.get<boolean>(this.name === "taskExplorer" ? "enableExplorerView" : "enableSideBar"))
            {
                log.write("   Delay refresh, exit");
                util.pushIfNotExists(this.needsRefresh, { invalidate, opt });
                return;
            }
        }

        //
        // The invalidate param will be equal to 'visible-event' when this method is called from the
        // visibility change event in extension.ts.
        //
        // If a view isnt visible on any refresh request, a requested refresh will exit and record the refresh
        // parameters in an object (above block of code).  When the view becomes visible again, we refresh if
        // we need to, if not then just exit on this refresh request
        //
        if (invalidate === "visible-event")
        {
            if (this.taskTree)
            {   //
                // If we await on the same function within that awaited function, bad. things. happen. So
                // timeout the the handling of the visible event, which calls back into this function.
                //
                setTimeout(async () => {
                    await this.handleVisibleEvent(logPad);
                }, 1);
                return;
            }
            invalidate = undefined;
        }

        if (invalidate !== false) // if anything but 'add to excludes'
        {
            await this.handleFileWatcherEvent(invalidate, opt, logPad);
        }

        if (opt && opt instanceof Uri)
        {   //
            // TODO - Performance Enhanceement
            // Get the invalidated treeitem.treefile and invalidate that instead of rebuilding
            // the entire tree. We set currentInvalidation here, this will cause the resulting
            // call to getChildren() from the VSCode task engine to only re-provide the invalidated
            // task type, instead of all task types
            //
            this.currentInvalidation = invalidate;
            this.taskTree = null;                      // see todo above
            this._onDidChangeTreeData.fire(null);      // see todo above // task.definition.treeItem
        }                                              // not sure if its even possible
        else //
        {   // Re-ask for all tasks from all providers and rebuild tree
            //
            this.tasks = null; // !skipAskTasks ? null : this.tasks;
            this.taskTree = null;
            this._onDidChangeTreeData.fire(null);
        }

        log.methodDone("refresh task tree", 1, logPad, true);

        return;
    }


    private removeGroupedTasks(folder: TaskFolder, subfolders: Map<string, TaskFile>, logPad = "")
    {
        const taskTypesRmv: TaskFile[] = [];

        log.methodStart("remove grouped tasks", 2, logPad);

        for (const each of folder.taskFiles)
        {
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
                    this.removeScripts(each2 as TaskFile, folder, subfolders, 0, logPad);
                    if (each2 instanceof TaskFile && each2.isGroup && each2.groupLevel > 0)
                    {
                        for (const each3 of each2.treeNodes)
                        {
                            if (each3 instanceof TaskFile)
                            {
                                this.removeScripts(each3, folder, subfolders, 0, logPad);
                            }
                        }
                    }
                }
            }
            else {
                this.removeScripts(each, folder, subfolders, 0, logPad);
            }
        }

        for (const each of taskTypesRmv)
        {
            folder.removeTaskFile(each);
        }

        log.methodDone("remove grouped tasks", 2, logPad);
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
    private removeScripts(taskFile: TaskFile, folder: TaskFolder, subfolders: Map<string, TaskFile>, level = 0, logPad = "")
    {
        const me = this;
        const taskTypesRmv: (TaskItem|TaskFile)[] = [];
        const groupSeparator = util.getGroupSeparator();

        log.methodStart("remove scripts", 3, logPad, false);

        for (const each of taskFile.treeNodes)
        {
            const label = each.label?.toString();

            if (!label) {
                continue;
            }

            const labelPart = label?.split(groupSeparator)[level];
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
                    me.removeScripts(each, folder, subfolders, level + 1, logPad);
                }
            }
        }

        for (const each2 of taskTypesRmv)
        {
            taskFile.removeTreeNode(each2);
        }

        log.methodStart("remove scripts", 3, logPad);
    }


    private async renameGroupedTasks(taskFile: TaskFile)
    {
        if (!configuration.get<boolean>("groupStripTaskLabel", true)) {
            return;
        }

        const groupSeparator = util.getGroupSeparator();
        let rmvLbl = taskFile.label?.toString();
        rmvLbl = rmvLbl?.replace(/\(/gi, "\\(").replace(/\[/gi, "\\[");
        rmvLbl = rmvLbl?.replace(/\)/gi, "\\)").replace(/\]/gi, "\\]");

        for (const each2 of taskFile.treeNodes)
        {
            if (each2 instanceof TaskItem)
            {
                const rgx = new RegExp(rmvLbl + groupSeparator, "i");
                each2.label = each2.label?.toString().replace(rgx, "");

                if (each2.groupLevel > 0)
                {
                    let label = "";
                    const labelParts = each2.label?.split(groupSeparator);
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
        if (!taskItem || this.busy)
        {
            window.showInformationMessage("Busy, please wait...");
        }
        else {
            this.stop(taskItem);
            await this.run(taskItem);
        }
    }


    private async resumeTask(taskItem: TaskItem)
    {
        const term = this.getTerminal(taskItem);
        if (term) {
            term.sendText("N", true);
            taskItem.paused = false;
        }
        else {
            window.showInformationMessage("Terminal not found");
        }
    }


    /**
     * Run/execute a command.
     * The refresh() function will eventually be called by the VSCode task engine when
     * the task is launched
     *
     * @param taskItem TaskItem instance
     * @param noTerminal Whether or not to show the terminal
     * Note that the terminal will be shown if there is an error
     * @param withArgs Whether or not to prompt for argumants
     * Note that only script type tasks use arguments (and Gradle, ref ticket #88)
     */
    private async run(taskItem: TaskItem, noTerminal = false, withArgs = false, args?: string)
    {
        if (!taskItem || this.busy)
        {
            window.showInformationMessage("Busy, please wait...");
            return;
        }
        log.write("run task", 1);
        log.value("   task name", taskItem.label, 2);
        if (withArgs === true)
		{
            await this.runWithArgs(taskItem, args, noTerminal);
		}
        else if (taskItem.paused)
        {
            await this.resumeTask(taskItem);
        }
        else //
        {   // Create a new instance of 'task' if this is to be ran with no termainl (see notes below)
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
                const def = newTask.definition;
                const p = providers.get(util.getScriptProviderType(def.type)),
                      folder = taskItem.getFolder();
                if (folder) {
                    newTask = p?.createTask(def.target, undefined, folder, def.uri, undefined, "   ");
                    //
                    // Since this task doesnt belong to a treeItem, then set the treeItem id that represents
                    // an instance of this task.
                    //
                    if (newTask) {
                        newTask.definition.taskItemId = def.taskItemId;
                    }
                }
            }
            if (await this.runTask(newTask, noTerminal)) {
                await this.saveTask(taskItem, configuration.get<number>("numLastTasks"), false, "   ");
            }
        }
    }


    private async runLastTask()
    {
        if (this.busy)
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

        log.value("Run last task", lastTaskId);

        const taskItem = await this.getTaskItems(lastTaskId);

        if (taskItem && taskItem instanceof TaskItem)
        {
            await this.run(taskItem);
        }
        else
        {
            window.showInformationMessage("Task not found!  Check log for details");
            await util.removeFromArrayAsync(lastTasks, lastTaskId);
            await storage.update(constants.LAST_TASKS_STORE, lastTasks);
            await this.showSpecialTasks(true);
        }
    }


    private async runNpmCommand(taskFile: TaskFile, command: string)
    {
        const pkgMgr = util.getPackageManager();

        if (!taskFile.resourceUri) {
            return;
        }

        const options = {
            cwd: path.dirname(taskFile.resourceUri.fsPath)
        };

        const kind: TaskDefinition = {
            type: "npm",
            script: "install",
            path: path.dirname(taskFile.resourceUri.fsPath)
        };

        if (command.indexOf("<packagename>") === -1)
        {
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


    private async runTask(task: Task | undefined, noTerminal?: boolean): Promise<boolean>
    {
        if (!task) {
            return false;
        }

        if (noTerminal === true) {
            task.presentationOptions.reveal = TaskRevealKind.Silent;
        }
        else {
            task.presentationOptions.reveal = TaskRevealKind.Always;
        }

        try {
            await tasks.executeTask(task);
        }
        catch (e) {
            const err = e.toString();
            if (err.indexOf("No workspace folder") !== -1)
            {
                window.showErrorMessage("Task executon failed:  No workspace folder.  NOTE: You must " +
                                        "save your workspace first before running 'User' tasks");
            }
            else {
                window.showErrorMessage("Task executon failed: " + err);
            }
            log.write("Task execution failed: " + err);
            return false;
        }
        return true;
    }


    /**
     * Run/execute a command, with arguments (prompt for args)
     *
     * @param taskItem TaskItem instance
     * @param noTerminal Whether or not to show the terminal
     * Note that the terminal will be shown if there is an error
     */
    public async runWithArgs(taskItem: TaskItem, args?: string, noTerminal?: boolean)
    {
        if (taskItem.task && !(taskItem.task.execution instanceof CustomExecution))
        {
            const me = this;
            const opts: InputBoxOptions = { prompt: "Enter command line arguments separated by spaces"};

            const _run = async (_args: string | undefined) =>
            {
                if (_args)
                {
                    let newTask: Task | undefined = taskItem?.task;
                    if (newTask && taskItem.task) {
                        const def = taskItem.task.definition,
                                folder = taskItem.getFolder();
                        if (folder) {
                            newTask = providers.get("script")?.createTask(def.script, undefined, folder, def.uri, _args.trim().split(" "));
                            //
                            // Since this task doesnt belong to a treeItem, then set the treeItem id that represents
                            // an instance of this task.
                            //
                            if (newTask) {
                                newTask.definition.taskItemId = def.taskItemId;
                            }
                        }
                    }
                    if (newTask) {
                        if (await this.runTask(newTask, noTerminal)) {
                            await me.saveTask(taskItem, configuration.get<number>("numLastTasks"));
                        }
                    }
                }
            };

            if (!args) {
                window.showInputBox(opts).then(async (str) => { _run(str); });
            }
            else {
                await _run(args);
            }
        }
        else {
            window.showInformationMessage("Custom execution tasks cannot have the cmd line altered");
        }
    }


    private async saveTask(taskItem: TaskItem, maxTasks: number, isFavorite = false, logPad = "")
    {
        const storeName: string = !isFavorite ? constants.LAST_TASKS_STORE : constants.FAV_TASKS_STORE;
        const label: string = !isFavorite ? constants.LAST_TASKS_LABEL : constants.FAV_TASKS_LABEL;
        const cstTasks = storage.get<string[]>(storeName, []);
        const taskId =  this.getTaskItemId(taskItem);

        log.methodStart("save task", 1, logPad, false, [
            [ "treenode label", label ], [ "max tasks", maxTasks ], [ "is favorite", isFavorite ],
            [ "task id", taskId ], [ "current saved task ids", cstTasks.toString() ]
        ]);

        if (!taskId) {
            log.write("   invalid task id, exit", 1, logPad);
            return;
        }

        //
        // Moving it to the top of the list it if it already exists
        //
        if (util.existsInArray(cstTasks, taskId) !== false) {
            await util.removeFromArrayAsync(cstTasks, taskId);
        }

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

        await this.showSpecialTasks(true, isFavorite, taskItem, logPad);
    }


    public async showSpecialTasks(show: boolean, isFavorite = false, taskItem?: TaskItem, logPad = "")
    {
        let changed = true;
        const tree = this.taskTree;
        const storeName: string = !isFavorite ? constants.LAST_TASKS_STORE : constants.FAV_TASKS_STORE;
        const label: string = !isFavorite ? constants.LAST_TASKS_LABEL : constants.FAV_TASKS_LABEL;
        const showLastTasks = configuration.get<boolean>("showLastTasks");
        const favIdx = showLastTasks ? 1 : 0;
        const treeIdx = !isFavorite ? 0 : favIdx;

        log.methodStart("show special tasks", 1, logPad, false, [
            [ "is favorite", isFavorite ], [ "fav index", favIdx ], [ "tree index", treeIdx ],
            [ "show", show ], [ "has task item", !!taskItem ], [ "showLastTasks setting", showLastTasks ]
        ]);

        if (!showLastTasks && !isFavorite) {
            return;
        }

        if (!tree || tree.length === 0 ||
            (tree.length === 1 && tree[0].contextValue === "noscripts")) {
            log.write(logPad + "   no tasks found in tree", 1);
            return;
        }

        if (show)
        {
            if (!taskItem || isFavorite) // refresh
            {
                taskItem = undefined;
                if (tree[treeIdx]?.label === label) {
                    tree.splice(treeIdx, 1);
                }
                changed = true;
            }

            if (!isFavorite && tree[0]?.label !== label)
            {
                await this.createSpecialFolder(storeName, label, 0, false, "   ");
                changed = true;
            }
            else if (isFavorite && tree[favIdx]?.label !== label)
            {
                await this.createSpecialFolder(storeName, label, favIdx, true, "   ");
                changed = true;
            }
            else if (taskItem) // only 'last tasks' case here.  'favs' are added
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

        if (changed) {
            this._onDidChangeTreeData.fire(taskItem || null);
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
                if ((task.scope as WorkspaceFolder).name) {
                    statusMsg += " (" + (task.scope as WorkspaceFolder).name + ")";
                }
                TaskTreeDataProvider.statusBarSpace.text = "$(loading~spin) " + statusMsg;
                TaskTreeDataProvider.statusBarSpace.show();
            }
            else {
                log.write("Could not find task execution!!");
                if (TaskTreeDataProvider.statusBarSpace) {
                    TaskTreeDataProvider.statusBarSpace.dispose();
                }
            }
        }
    }


    private async sortFolder(folder: TaskFolder, logPad = "")
    {
        this.sortTasks(folder.taskFiles, logPad);
        for (const each of folder.taskFiles)
        {
            if ((each instanceof TaskFile)) { // && each.isGroup) {
                this.sortTasks(each.treeNodes, logPad);
            }
        }
    }


    private sortLastTasks(items: (TaskFile | TaskItem)[] | undefined, lastTasks: string[], logPad = "")
    {
        log.write(logPad + "sort last tasks", 1);
        items?.sort((a: TaskItem | TaskFile, b: TaskItem | TaskFile) =>
        {
            if (a.id && b.id) {
                const aIdx = lastTasks.indexOf(a.id.replace(constants.LAST_TASKS_LABEL + ":", ""));
                const bIdx = lastTasks.indexOf(b.id.replace(constants.LAST_TASKS_LABEL + ":", ""));
                return (aIdx < bIdx ? 1 : (bIdx < aIdx ? -1 : 0));
            }
            return 0;
        });
    }


    private sortTasks(items: (TaskFile | TaskItem)[] | undefined, logPad = "")
    {
        log.write("sort tasks", 1, logPad);
        items?.sort((a: TaskFile| TaskItem, b: TaskFile| TaskItem) =>
        {
            if (a.label && b.label)
            {
                if ((a instanceof TaskFile && b instanceof TaskFile || a instanceof TaskItem && b instanceof TaskItem)) {
                    return a.label?.toString()?.localeCompare(b.label?.toString());
                }
                //
                // TaskFiles we keep at the  top, like a folder in Windows Explorer
                //
                else if (a instanceof TaskFile && b instanceof TaskItem)
                {
                    return -1;
                }
                return 1;
            }
            return 0;
        });
    }


    private stop(taskItem: TaskItem)
    {
        if (!taskItem || this.busy)
        {
            window.showInformationMessage("Busy, please wait...");
            return;
        }

        const task = taskItem.task,        // taskItem.execution will not be set if the view hasnt been visible yet
              exec = taskItem.execution || // this really would only occur in the tests
                     tasks.taskExecutions.find(e => e.task.name === task?.name && e.task.source === task.source &&
                     e.task.scope === task.scope && e.task.definition.path === task.definition.path);
        if (exec)
        {
            if (configuration.get<boolean>("keepTermOnStop") === true)
            {
                const terminal = this.getTerminal(taskItem);
                if (terminal)
                {
                    if (taskItem.paused)
                    {
                        terminal.sendText("Y");
                    }
                    else
                    {
                        terminal.sendText("\u0003");
                        setTimeout(() => {
                            terminal.sendText("Y", true);
                        }, 300);
                    }
                    taskItem.paused = false;
                }
            }
            else {
                exec.terminate();
            }
        }
    }


    private async taskStartEvent(e: TaskStartEvent)
    {
        log.write("task started", 1);
        //
        // Show status bar message (if ON in settings)
        //
        this.showStatusMessage(e.execution.task);
        //
        // Fire change event which will update tree loading icons, etc
        //
        this.fireTaskChangeEvents(await this.getTaskItems(e.execution.task.definition.taskItemId) as TaskItem);
    }


    private async taskFinishedEvent(e: TaskEndEvent)
    {
        log.write("task finished", 1);
        //
        // Hide status bar message (if ON in settings)
        //
        this.showStatusMessage(e.execution.task);
        //
        // Fire change event which will update tree loading icons, etc
        //
        this.fireTaskChangeEvents(await this.getTaskItems(e.execution.task.definition.taskItemId) as TaskItem);
    }

}