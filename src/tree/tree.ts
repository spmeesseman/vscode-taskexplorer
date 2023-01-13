
import * as util from "../lib/utils/utils";
import * as sortTasks from "../lib/sortTasks";
import constants from "../lib/constants";
import log from "../lib/log/log";
import SpecialTaskFolder from "./specialFolder";
import TaskItem from "./item";
import TaskFile from "./file";
import TaskFolder from "./folder";
import { storage } from "../lib/utils/storage";
import { rebuildCache } from "../lib/cache";
import { InitScripts, LoadScripts, NoScripts } from "../lib/noScripts";
import { configuration } from "../lib/utils/configuration";
import { getLicenseManager, providers, providersExternal } from "../extension";
import { ScriptTaskProvider } from "../providers/script";
import { ITaskFileApi, ITaskFolderApi, ITaskItemApi, TaskExplorerDefinition } from "../interface";
import { isTaskIncluded } from "../lib/isTaskIncluded";
import { findDocumentPosition } from "../lib/findDocumentPosition";
import { getTerminal } from "../lib/getTerminal";
import { IExplorerApi, TaskMap } from "../interface/explorer";
import { enableConfigWatcher } from "../lib/configWatcher";
import { TaskExplorerProvider } from "../providers/provider";
import { pathExists } from "../lib/utils/fs";
import { TaskWatcher } from "../lib/taskWatcher";
import {
    Event, EventEmitter, ExtensionContext, Task, TaskDefinition, TaskRevealKind, TextDocument,
    TreeDataProvider, TreeItem, TreeItemCollapsibleState, Uri, commands, window, workspace, tasks,
    Selection, InputBoxOptions, ShellExecution, CustomExecution, Disposable, TaskExecution
} from "vscode";
import { dirname, join } from "path";
import { IEvent } from "../interface/IEvent";


/**
 * @class TaskTreeDataProvider
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
export class TaskTreeDataProvider implements TreeDataProvider<TreeItem>, IExplorerApi
{
    private defaultGetChildrenLogLevel = 1;
    private defaultGetChildrenLogPad = "";
    private eventQueue: IEvent[] = [];
    private name: string;
    private disposables: Disposable[];
    private subscriptionStartIndex: number;
    private tasks: Task[] | null = null;
    private treeBuilding = false;
    private isTests = false;
    private refreshPending = false;
    private visible = false;
    private enabled = false;
    private setEnableCalled = false;
    private busy = false;
    private getChildrenLogLevel = this.defaultGetChildrenLogLevel;
    private getChildrenLogPad = this.defaultGetChildrenLogPad;
    private extensionContext: ExtensionContext;
    private taskMap: TaskMap = {};
    private taskTree: TaskFolder[] | NoScripts[] | undefined | null | void = null;
    private taskWatcher: TaskWatcher;
    private currentInvalidation: string | undefined;
    private _onDidChangeTreeData: EventEmitter<TreeItem | undefined | null | void> = new EventEmitter<TreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: Event<TreeItem | undefined | null | void> = this._onDidChangeTreeData.event;
    private specialFolders: {
        favorites: SpecialTaskFolder;
        lastTasks: SpecialTaskFolder;
    };

    constructor(name: "taskExplorer"|"taskExplorerSideBar", context: ExtensionContext, testsRunning: boolean)
    {
        this.name = name;
        this.isTests = testsRunning;
        this.extensionContext = context;
        this.subscriptionStartIndex = -1;

        this.disposables = [];
        this.disposables.push(commands.registerCommand(name + ".run",  async (item: TaskItem) => this.run(item), this));
        this.disposables.push(commands.registerCommand(name + ".runNoTerm",  async (item: TaskItem) => this.run(item, true, false), this));
        this.disposables.push(commands.registerCommand(name + ".runWithArgs",  async (item: TaskItem, args: string) => this.run(item, false, true, args), this));
        this.disposables.push(commands.registerCommand(name + ".runLastTask",  async () => this.runLastTask(), this));
        this.disposables.push(commands.registerCommand(name + ".stop", async (item: TaskItem) => this.stop(item), this));
        this.disposables.push(commands.registerCommand(name + ".restart",  async (item: TaskItem) => this.restart(item), this));
        this.disposables.push(commands.registerCommand(name + ".pause",  (item: TaskItem) => this.pause(item), this));
        this.disposables.push(commands.registerCommand(name + ".open", async (item: TaskItem, itemClick?: boolean) => this.open(item, itemClick), this));
        this.disposables.push(commands.registerCommand(name + ".openTerminal", (item: TaskItem) => this.openTerminal(item), this));
        this.disposables.push(commands.registerCommand(name + ".refresh", () => this.refresh(true, false, ""), this));
        this.disposables.push(commands.registerCommand(name + ".runInstall", async (taskFile: TaskFile) => this.runNpmCommand(taskFile, "install"), this));
        this.disposables.push(commands.registerCommand(name + ".runUpdate", async (taskFile: TaskFile) => this.runNpmCommand(taskFile, "update"), this));
        this.disposables.push(commands.registerCommand(name + ".runUpdatePackage", async (taskFile: TaskFile) => this.runNpmCommand(taskFile, "update <packagename>"), this));
        this.disposables.push(commands.registerCommand(name + ".runAudit", async (taskFile: TaskFile) => this.runNpmCommand(taskFile, "audit"), this));
        this.disposables.push(commands.registerCommand(name + ".runAuditFix", async (taskFile: TaskFile) => this.runNpmCommand(taskFile, "audit fix"), this));
        this.disposables.push(commands.registerCommand(name + ".addToExcludes", async (taskFile: TaskFile | TaskItem) => this.addToExcludes(taskFile), this));
        this.disposables.push(commands.registerCommand(name + ".addRemoveCustomLabel", async(taskItem: TaskItem) => this.addRemoveSpecialTaskLabel(taskItem), this));

        context.subscriptions.push(...this.disposables);
        this.subscriptionStartIndex = context.subscriptions.length - (this.disposables.length + 1);

        const nodeExpandedeMap: any = configuration.get<any>("specialFolders.expanded");
        const favoritesExpanded = nodeExpandedeMap.favorites !== false ?
                                  TreeItemCollapsibleState.Expanded : /* istanbul ignore next */TreeItemCollapsibleState.Collapsed;
        const lastTaskExpanded = nodeExpandedeMap.lastTasks !== false ?
                                TreeItemCollapsibleState.Expanded : /* istanbul ignore next */TreeItemCollapsibleState.Collapsed;
        this.specialFolders = {
            favorites: new SpecialTaskFolder(context, name, this, constants.FAV_TASKS_LABEL, favoritesExpanded),
            lastTasks: new SpecialTaskFolder(context, name, this, constants.LAST_TASKS_LABEL, lastTaskExpanded)
        };

        this.taskWatcher = new TaskWatcher(this, this.specialFolders, context);
    }


    public dispose(context: ExtensionContext)
    {
        this.disposables.forEach((d) => {
            d.dispose();
        });
        this.taskWatcher.dispose(context);              // <-- must be in this order
        this.specialFolders.favorites.dispose(context); // <-- must be in this order
        this.specialFolders.lastTasks.dispose(context); // <-- must be in this order
        context.subscriptions.splice(this.subscriptionStartIndex, this.disposables.length);
        this.disposables = [];
    }


    private async addRemoveSpecialTaskLabel(taskItem: TaskItem)
    {
        /* istanbul ignore else */
        if (taskItem.folder)
        {
            const folderName = util.lowerCaseFirstChar(taskItem.folder.label as string, true) as "favorites"|"lastTasks";
            return this.specialFolders[folderName].addRemoveRenamedLabel(taskItem);
        }
    }


    private async addToExcludes(selection: TaskFile | TaskItem)
    {
        let uri: Uri | false;
        let excludesList = "exclude";
        const pathValues: string[] = [];

        log.methodStart("add to excludes", 1, "", true, [[ "global", global ]]);

        if (selection instanceof TaskFile)
        {
            uri = selection.resourceUri;
            if (selection.isGroup)
            {
                log.value("   adding file group", uri.path, 2);
                for (const each of selection.treeNodes)
                {
                    if (each.resourceUri) {
                        log.value("      adding file path", each.resourceUri.path, 3);
                        pathValues.push(each.resourceUri.path);
                    }
                }
            }
            else {
                log.value("   adding file path", uri.path, 2);
                pathValues.push(uri.path);
            }
        }
        else // if (selection instanceof TaskItem)
        {
            uri = false;
            if (util.isScriptType(selection.taskSource))
            {
                /* istanbul ignore else */ /* istanbul ignore next */
                if (selection.resourceUri) {
                    /* istanbul ignore next */
                    log.value("   adding file path", selection.resourceUri.path, 2);
                    /* istanbul ignore next */
                    pathValues.push(selection.resourceUri.path);
                }
                else if (selection.taskFile) {
                    log.value("   adding file path", selection.taskFile.resourceUri.path, 2);
                    pathValues.push(selection.taskFile.resourceUri.path);
                }
            }
            else {
                excludesList = "excludeTask";
                pathValues.push(selection.task.name);
            }
        }

        log.value("   path value(s)", pathValues.join(", "), 1);
        if (pathValues.length > 0)
        {
            const excludes = configuration.get<string[]>(excludesList);
            for (const p of pathValues) {
                util.pushIfNotExists(excludes, p);
            }
            enableConfigWatcher(false);
            /* istanbul ignore else */
            if (this.isTests) {
                await configuration.updateWs(excludesList, excludes);
            }
            else {
                await configuration.update(excludesList, excludes);
            }
            await this.refresh(selection.taskSource, uri, "   ");
            enableConfigWatcher(true);
        }

        log.methodDone("add to excludes", 1);
    }


    private async buildGroupings(folders: Map<string, TaskFolder|SpecialTaskFolder>, logPad: string, logLevel: number)
    {
        const groupWithSep = configuration.get<boolean>("groupWithSeparator");
        log.methodStart("build tree node groupings", logLevel, logPad, false, [[ "group withseparator", groupWithSep ]]);
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
            if (folder instanceof SpecialTaskFolder) {
                log.write(`   skipping ${folder.label} folder for grouping`, logLevel, logPad);
                continue;
            }
            sortTasks.sortTaskFolder(folder, logPad + "   ", logLevel + 1);
            //
            // Create groupings by task type
            //
            /* istanbul ignore else */
            if (groupWithSep) // && key !== constants.USER_TASKS_LABEL)
            {
                await this.createTaskGroupings(folder, logPad + "   ", logLevel + 1);
            }
        }

        log.methodDone("build tree node groupings", logLevel, logPad);
    }


    public async buildTaskTree(tasksList: Task[], logPad: string, logLevel: number, force?: boolean): Promise<TaskFolder[]|NoScripts[]>
    {
        let taskCt = 0;
        const folders: Map<string, TaskFolder> = new Map();
        const files: Map<string, TaskFile> = new Map();

        log.methodStart("build task tree", logLevel, logPad);

        if (tasksList.length === 0 && force !== true)
        {
            log.methodDone("build task tree", logLevel, logPad);
            return [ new NoScripts() ];
        }

        this.treeBuilding = true;

        //
        // The 'Last Tasks' folder will be 1st in the tree
        //
        this.specialFolders.lastTasks.clearTaskItems();
        if (this.specialFolders.lastTasks.isEnabled())
        {
            folders.set(this.specialFolders.lastTasks.label as string, this.specialFolders.lastTasks);
        }

        //
        // The 'Favorites' folder will be 2nd in the tree (or 1st if configured to hide
        // the 'Last Tasks' folder)
        //
        this.specialFolders.favorites.clearTaskItems();
        if (this.specialFolders.favorites.isEnabled())
        {
            folders.set(this.specialFolders.favorites.label as string, this.specialFolders.favorites);
        }

        //
        // Loop through each task provided by the engine and build a task tree
        //
        for (const each of tasksList)
        {
            log.blank(2);
            log.write(`   Processing task ${++taskCt} of ${tasksList.length} (${each.source})`, logLevel + 1, logPad);
            await this.buildTaskTreeList(each, folders, files, logPad + "   ");
        }

        //
        // Sort and build groupings
        //
        await this.buildGroupings(folders, logPad + "   ", logLevel);

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
    private async buildTaskTreeList(each: Task, folders: Map<string, TaskFolder>, files: Map<string, TaskFile>, logPad: string)
    {
        let folder: TaskFolder | undefined,
            scopeName: string;

        log.methodStart("build task tree list", 2, logPad, true, [
            [ "name", each.name ], [ "source", each.source ], [ "definition type", each.definition.type ],
            [ "definition path", each.definition.path ]
        ]);
        log.value("   scope", each.scope, 3, logPad);

        const definition: TaskExplorerDefinition | TaskDefinition = each.definition;
        let relativePath = definition.path ?? "";
        const nodeExpandedeMap: any = configuration.get<any>("specialFolders.expanded");
        if (each.source === "tsc" && util.isWorkspaceFolder(each.scope))
        {
            if (each.name.indexOf(" - ") !== -1 && each.name.indexOf(" - tsconfig.json") === -1)
            {
                relativePath = dirname(each.name.substring(each.name.indexOf(" - ") + 3));
            }
        }
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
                log.value("constructed tree taskfolder", `${scopeName} (${folder.id})`, 3, logPad + "   ");
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
                log.value("constructed tree user taskfolder", `${scopeName} (${folder.id})`, 3, logPad + "   ");
            }
        }

        //
        // Log the task details
        //
        this.logTask(each, scopeName, logPad + "   ");

        //
        // Get task file node, this will create one of it doesn't exist
        //
        const taskFile = await this.getTaskFileNode(each, folder, files, relativePath, scopeName, logPad + "   ");

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
        const isNpmInstallTask = each.source === "npm" && each.name === "install" || each.name.startsWith("install - ");
        if (!isNpmInstallTask)
        {   //
            // Create "tree item" node and add it to the owner "tree file" node
            //
            const taskItem = new TaskItem(this.extensionContext, taskFile, each, logPad + "   ");
            taskFile.addTreeNode(taskItem);
            this.taskMap[taskItem.id] = taskItem;
            //
            // Maybe add this task to the 'Favorites' and 'Last Tasks' folders
            //
            await this.specialFolders.lastTasks.addTaskFile(taskItem, logPad + "   ");
            await this.specialFolders.favorites.addTaskFile(taskItem, logPad + "   ");
        }

        log.methodDone("build task tree list", 2, logPad);
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
                    ]);
                    const node = each.treeNodes[0];
                    /* istanbul ignore else */
                    if (node instanceof TaskItem)
                    {
                        subfolder = new TaskFile(this.extensionContext, folder, node.task.definition,
                                                each.taskSource, each.path, 0, true, undefined, "   ");
                        subfolders.set(id, subfolder);
                        await folder.addTaskFile(subfolder);
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
                    t.nodePath = join(".vscode", prevName[treeLevel]);
                }
                else if (!t.nodePath) {
                    t.nodePath = prevName[treeLevel];
                }
                else {
                    t.nodePath = join(cPath, prevName[treeLevel]);
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


    public fireTreeRefreshEvent(logPad: string, logLevel: number, taskFile?: TreeItem)
    {
        this.getChildrenLogPad = logPad;
        this.getChildrenLogLevel = logLevel;
        log.methodStart("fire tree refresh event", logLevel, logPad, false, [[ "node id", taskFile ? taskFile.id : "all" ]]);
        if (this.visible) // || (this.enabled && this.setEnableCalled === false)) {
        {
            log.write("   fire 'tree data changed' main event", logLevel, logPad);
            this._onDidChangeTreeData.fire(taskFile);
        }
        else
        {
            const id = "pendingFireTreeRefreshEvent-" + (taskFile ? taskFile.id?.replace(/\W/g, "") : "g");
            if (!this.eventQueue.find((e => e.id === id)))
            {
                this.eventQueue.push(
                {
                    id,
                    fn: this.fireTreeRefreshEvent,
                    args: [ taskFile ]
                });
                log.write("   view is not visible or not initialized yet, delay firing data change event", logLevel, logPad);
            }
            else {
                log.write("   an event of this type has already been queued, skip firing data change event", logLevel, logPad);
            }
        }
        log.methodDone("fire tree refresh event", logLevel, logPad);
    }


    /**
     * The main method VSCode TaskTreeProvider calls into
     *
     * @param element The tree item requested
     * @param logPad Log padding
     * @param logLevel Log level
     */
    async getChildren(element?: TreeItem): Promise<TreeItem[]>
    {

        if (!this.enabled)
        {
            return [ !this.tasks && !this.taskTree ? new InitScripts() : /* istanbul ignore next */new NoScripts() ];
        }

        let ctRmv = 0;
        let waited = 0;
        const logPad = this.getChildrenLogPad;
        const logLevel = this.getChildrenLogLevel;
        const licMgr = getLicenseManager();
        const explorerViewEnabled = configuration.get<boolean>("enableExplorerView");
        const firstRun = ((explorerViewEnabled && this.name === "taskExplorer") ||
                          /* istanbul ignore next */(!explorerViewEnabled && this.name === "taskExplorerSideBar")) &&
                          !this.tasks && this.enabled && (!this.taskTree ||
                          /* istanbul ignore next */this.taskTree[0].contextValue === "initscripts");
        //
        //  Set pretty muy importante flag
        //
        this.refreshPending = true;

        //
        // If this is just after activation, or the view getting enabled, the current displayed text
        // in the view will be 'Scanning task files...'.  Reset the text 'Scanning task files...' to
        // 'Building task tree...' for a nice status update, as the tree build can be a multi-second
        // process as well depending on the size of the workspace.
        //
        // Typically this.visible will be `true` if this function is called by the VSCode engine, but
        // our test suites will mimic tree loads calling this function directly, so we check the flag
        //
        if (this.setEnableCalled && !this.taskTree && !element) // && this.visible)
        {
            this.setEnableCalled = false;
            setTimeout(() => this.fireTreeRefreshEvent("", 1), 10);
            return [ new LoadScripts() ];
        }

        log.methodStart("get tree children", logLevel, logPad, false, [
            [ "task folder", element?.label ], [ "all tasks need to be retrieved", !this.tasks ],
            [ "specific task type need to be retrieved", !!this.currentInvalidation ],
            [ "current invalidation", this.currentInvalidation ], [ "tree needs rebuild", !this.taskTree ],
            [ "first run", firstRun ], [ "view", this.name ]
        ]);
        /* istanbul ignore else */
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
        else if (element instanceof TaskItem)
        {
            log.values(logLevel + 1, logPad + "   ", [
                [ "tree item type", "task item" ], [ "label", element.label ], [ "id", element.id ],
                [ "taskitem id", element.task.definition.taskItemId ], [ "description", element.description ],
                [ "resource path", element.resourceUri?./* istanbul ignore next */fsPath ],
            ]);
        }
        else if (!element)
        {
            log.value("tree item type", "asking for all (null)", logLevel + 1, logPad + "   ");
        }
        else
        {
            log.values(logLevel + 1, logPad + "   ", [
                [ "tree item type", "unknown" ], [ "label", element.label ], [ "id", element.id ],
                [ "resource path", element.resourceUri?./* istanbul ignore next */fsPath ]
            ]);
        }

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
        {
            TaskExplorerProvider.logPad = logPad + "   ";
            //
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
                log.write("   fetching all tasks via VSCode.fetchTasks", logLevel, logPad);
                this.tasks = await tasks.fetchTasks();
                // .filter((t) => !util.isWatchTask(t.source) || !util.isExcluded(t.definition.path, logPad + "   "));
            }
            else if (this.tasks && this.currentInvalidation)
            {
                log.write(`   fetching ${this.currentInvalidation} tasks via VSCode.fetchTasks`, logLevel, logPad);
                //
                // Get all tasks of the type defined in 'currentInvalidation' from VSCode, remove
                // all tasks of the type defined in 'currentInvalidation' from the tasks list cache,
                // and add the new tasks from VSCode into the tasks list.
                //
                const taskItems = await tasks.fetchTasks(
                {
                    type: this.currentInvalidation
                });
                // .filter((t) => this.currentInvalidation !== "npm" || !util.isExcluded(t.definition.path, logPad + "   "));
                //
                // Remove tasks of type '' from the 'tasks'array
                //
                log.write(`   removing current ${this.currentInvalidation} tasks from cache`, logLevel + 1, logPad);
                this.tasks.slice().reverse().forEach((item, index, object) =>
                {   //
                    // Note that requesting a task type can return Workspace tasks (tasks.json/vscode)
                    // if the script type set for the task in tasks.json is of type 'currentInvalidation'.
                    // Remove any Workspace type tasks returned as well, in this case the source type is
                    // != currentInvalidation, but the definition type == currentInvalidation
                    //
                    if (item.source === this.currentInvalidation || item.source === "Workspace")
                    {
                        if (item.source !== "Workspace" || item.definition.type === this.currentInvalidation)
                        {
                            log.write(`      removing task '${item.source}/${item.name}'`, logLevel + 2, logPad);
                            (this.tasks as Task[]).splice(object.length - 1 - index, 1);
                            ++ctRmv;
                        }
                    }
                });
                log.write(`   removed ${ctRmv} ${this.currentInvalidation} current tasks from cache`, logLevel + 1, logPad);
                log.write(`   adding ${taskItems.length} new ${this.currentInvalidation} tasks from cache`, logLevel + 1, logPad);
                this.tasks.push(...taskItems);
            }

            TaskExplorerProvider.logPad = "";

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
                //
                // Check License Manager for any task count restrictions
                //
                const maxTasks = licMgr.getMaxNumberOfTasks();
                log.write("   checking license manager for restrictions", logLevel + 1, logPad);
                //
                // TODO - remove below ignore tag when test for copy/move folder w/files is implemented
                //
                /* istanbul ignore if */
                if (this.tasks.length > maxTasks)
                {
                    ctRmv = this.tasks.length - maxTasks;
                    log.write(`      removing ${ctRmv} tasks, max count reached (no license)`, logLevel + 2, logPad);
                    this.tasks.splice(maxTasks, ctRmv);
                    util.showMaxTasksReachedMessage();
                }
                log.write("   finished license manager restriction check", logLevel + 1, logPad);
                //
                // Build the entire task tree
                // TODO - See notes above on the try/catch here 12/21/22
                // Note 1-10-23 - The sweet lil queue stopped being filled up in provider interfaces, and it
                // might be because of this?  Need to learn what the try/catch is actually doing,
                // thought I knew, maybe not
                //
                // try {
                    this.taskTree = await this.buildTaskTree(this.tasks, logPad + "   ", logLevel + 1);
                // }
                // catch (e: any) { /* istanbul ignore next */ log.error(e); }
            }
            else {
                this.taskTree = [ new NoScripts() ];
            }
        }

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
        else if (!element)
        {
            log.write("   Return full task tree", logLevel + 1, logPad);
            items = this.taskTree;
        }

        if (firstRun && licMgr)
        {   //
            // Update license manager w/ tasks, display info / license page if needed
            //
            await licMgr.setTasks(this.tasks || /* istanbul ignore next */[], logPad + "   ");
        }

        await this.processEventQueue(logPad + "   ", logLevel);

        this.refreshPending = false;
        this.currentInvalidation = undefined;
        this.getChildrenLogPad = this.defaultGetChildrenLogPad;
        this.getChildrenLogLevel = this.defaultGetChildrenLogLevel;

        log.methodDone("get tree children", logLevel, logPad, [
            [ "# of tasks total", this.tasks ? this.tasks.length : /* istanbul ignore next */0 ],
            [ "# of tree task items returned", items.length ]
        ]);

        return items;
    }


    private getGroupedId(folder: ITaskFolderApi, file: ITaskFileApi, label: string, treeLevel: number)
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


    public getName = () => this.name;


    public getTasks = () => this.tasks || [];


    private async getTaskFileNode(task: Task, folder: TaskFolder, files: any, relativePath: string, scopeName: string, logPad: string)
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

        let id = task.source + ":" + join(scopeName, relPathAdj);
        if (task.definition.fileName && !task.definition.scriptFile)
        {
            id = join(id, task.definition.fileName);
        }

        taskFile = files.get(id);

        //
        // Create taskfile node if needed
        //
        if (!taskFile)
        {
            log.value("   Add source file container", task.source, 2, logPad);
            taskFile = new TaskFile(this.extensionContext, folder, task.definition, task.source, relativePath, 0, false, undefined, logPad + "   ");
            await folder.addTaskFile(taskFile);
            files.set(id, taskFile);
        }

        log.methodDone("get task file node", 2, logPad);
        return taskFile;
    }


    public getTaskMap = () => this.taskMap;


    public getTaskTree = () => this.taskTree;


    public getTreeItem(element: TaskItem | TaskFile | TaskFolder): TreeItem
    {
        /* istanbul ignore else */
        if (element instanceof TaskItem)
        {
            log.methodStart("get tree item", 3, "", true, [[ "label", element.label ]]);
            log.write("   refresh task item state", 3);
            element.refreshState("   ", 3);
            log.methodDone("get tree item", 3);
        }
        return element;
    }


    private async handleFileWatcherEvent(invalidate: any, opt: boolean | Uri | undefined, logPad: string)
    {
        log.methodStart("handle filewatcher / settings change / test event", 1, logPad);
        if (invalidate === true && !opt)
        {   //
            // The file cache oly needs to update once on any change, since this will get called through
            // twice if both the Explorer and Sidebar Views are enabled, do a lil check here to make sure
            // we don't double scan for nothing.
            //
            const explorerViewEnabled = configuration.get<boolean>("enableExplorerView");
            /* istanbul ignore else */
            if ((explorerViewEnabled && this.name === "taskExplorer") ||
                /* istanbul ignore next */(!explorerViewEnabled && this.name === "taskExplorerSideBar"))
            {
                log.write("   handling 'rebuild cache' event", 1, logPad + "   ");
                this.busy = true; // reset in invalidateTasksCache
                await rebuildCache(logPad + "   ");
                log.write("   handling 'rebuild cache' eventcomplete", 1, logPad + "   ");
            }
        }
        //
        // If this is not from unit testing, then invalidate the appropriate task cache/file
        //
        log.write("   handling 'invalidate tasks cache' event", 1, logPad);
        await this.invalidateTasksCache(invalidate !== true ? invalidate : undefined, opt, logPad + "   ");
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
     *     "Workspace"
     * @param opt2 The uri of the file that contains/owns the task
     */
    private async invalidateTasksCache(opt1?: string, opt2?: Uri | boolean, logPad?: string)
    {
        log.methodStart("invalidate tasks cache", 1, logPad, false, [
            [ "opt1", opt1 ], [ "opt2", opt2 && opt2 instanceof Uri ? opt2.fsPath : opt2 ]
        ]);

        this.busy = true;

        try {
            if (opt1 && opt2 instanceof Uri)
            {
                log.write("   invalidate '" + opt1 + "' task provider file ", 1, logPad);
                log.value("      file", opt2.fsPath, 1, logPad);
                const provider = providers.get(opt1) ||
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
                    const provider = providers.get(opt1) ||
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
        /* istanbul ignore if */
        if (definition.icon)
        {
            log.value("   icon", definition.icon, 4, logPad);
        }
        //
        // External task providers can set a icon/iconDark property
        //
        /* istanbul ignore if */
        if (definition.iconDark)
        {
            log.value("   icon dark", definition.iconDark, 4, logPad);
        }
        log.write("Task Details Done", 3, logPad);
    }


    public async onVisibilityChanged(visible: boolean)
    {   //
        // VSCode engine calls getChildren() when the view changes to 'visible'
        //
        log.methodStart("visibility event received", this.defaultGetChildrenLogLevel, this.getChildrenLogPad, true, [[ "is visible", visible ]]);
        this.visible = visible;
        if (this.visible)
        {
            await this.processEventQueue(this.getChildrenLogPad, this.defaultGetChildrenLogLevel);
        }
        log.methodDone("visibility event received", this.defaultGetChildrenLogLevel, this.getChildrenLogPad);
        log.blank(this.defaultGetChildrenLogLevel);
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
        if (await pathExists(uri.fsPath))
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

        /* istanbul ignore else */
        if (taskItem.task.execution)
        {
            const terminal = getTerminal(taskItem, "   ");
            /* istanbul ignore else */
            if (terminal)
            {   //
                // TODO - see ticket.  I guess its not CTRL+C in some parts.
                // so make the control chars a setting.  Also in stop().
                //
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
            taskItem.refreshState("   ", 1);
            this.taskWatcher.fireTaskChangeEvents(taskItem, "   ", 1);
        }

        log.methodDone("pause", 1);
    }


    private processEventQueue = async (logPad: string, logLevel: number) =>
    {
        log.methodStart("process task explorer main event queue", 1, logPad, true, [[ "# of queued events", this.eventQueue.length ]]);

        if (this.eventQueue.length > 0)
        {
            const processedEvents: string[] = [],
                  next = this.eventQueue.shift() as IEvent; // get the next event

            if (!processedEvents.includes(next.id)) // Ensure no dups
            {
                log.write(`   process event # ${processedEvents.length + 1}`, logLevel, logPad);
                log.value("      event id", next.id, 1, logPad);
                log.write(`      calling queued event method with ${next.args.length} args`, logLevel, logPad);

                await next.fn.call(this, ...next.args);

                processedEvents.push(next.id);
                log.write(`   finished processing event # ${processedEvents.length}`, logLevel, logPad);
            } //
             // Reverse splice the array and removes this event and any duplicates if there are any
            //
            this.eventQueue.slice().reverse().forEach((item, index, object) =>
            {
                if (item.id === next.id) {
                    this.eventQueue.splice(object.length - 1 - index, logLevel);
                }
            });
        }

        log.methodDone("process task explorer main event queue", logLevel, logPad);
    };


    /**
     * Responsible for refreshing the tree content and tasks cache
     * This function is called each time and event occurs, whether its a modified or new
     * file (via FileSystemWatcher event), or when the view first becomes active/visible, etc.
     *
     * @param invalidate The invalidation event.
     * Can be one of the custom values:
     *     false
     *     null
     *     undefined
     *
     * Or one of the task types (from FileSystemWatcher event):
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
     *     "Workspace"
     *
     * If invalidate is false, then this is both an event as a result from adding to excludes list
     * and the item being added is a file, not a group / set of files.  If the item being added to
     * the excludes list is a group/folder, then invalidate will be set to the task source, i.e.
     * npm, ant, workspace, etc.
     *
     * If invalidate is true and opt is false, then the refresh button was clicked i.e. the 'refresh'
     * registered VSCode command was received
     *
     * If invalidate and opt are both truthy, then a filesystemwatcher event or a task just triggered
     *
     * If invalidate and opt are both undefined, then a configuration has changed
     *
     * @param opt Uri of the invalidated resource
     */
    public async refresh(invalidate: string | boolean | undefined, opt: Uri | false | undefined, logPad: string): Promise<void>
    {
        log.methodStart("refresh task tree", 1, logPad, logPad === "", [
            [ "invalidate", invalidate ], [ "opt fsPath", opt && opt instanceof Uri ? opt.fsPath : "n/a" ],
            [ "tree is null", !this.taskTree ], [ "view", this.name ]
        ]);

        await this.waitForRefreshComplete();
        this.refreshPending = true;

        if (invalidate !== false) // if anything but 'add to excludes'
        {
            await this.handleFileWatcherEvent(invalidate, opt, logPad + "   ");
        }

        if (opt !== false && util.isString(invalidate, true))
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
            this.taskMap = {};                         //
            // this._onDidChangeTreeData.fire();       // see todo above // task.definition.treeItem
        }                                              // not sure if its even possible
        else //                                        //
        {   // Re-ask for all tasks from all providers and rebuild tree
            //
            log.write("   invalidation is for all types", 1, logPad);
            this.tasks = null; // !skipAskTasks ? null : this.tasks;
            this.taskTree = null;
            this.taskMap = {};
        }

        log.write("   fire tree data change event", 2, logPad);
        this.fireTreeRefreshEvent(logPad + "   ", 1);
        setTimeout(() => { this.refreshPending = false; }, 1);

        log.methodDone("refresh task tree", 1, logPad);
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
                const _rmv = (treeNodes: (ITaskFileApi | ITaskItemApi)[]) =>
                {
                    for (const each2 of treeNodes)
                    {
                        this.removeTreeNodes(each2 as TaskFile, folder, subfolders, 0, logPad, logLevel + 1);
                        if (each2 instanceof TaskFile && each2.isGroup && each2.groupLevel > 0)
                        {
                            for (const each3 of each2.treeNodes)
                            {
                                if (each3 instanceof TaskFile)
                                {
                                    this.removeTreeNodes(each3, folder, subfolders, 0, logPad, logLevel + 1);
                                }
                            }
                        }
                    }
                };
                _rmv(each.treeNodes);
            }
            else {
                this.removeTreeNodes(each, folder, subfolders, 0, logPad, logLevel + 1);
            }
        }

        for (const each of taskTypesRmv)
        {
            folder.removeTaskFile(each, logPad + "   ");
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
    private removeTreeNodes(taskFile: ITaskFileApi, folder: TaskFolder, subfolders: Map<string, TaskFile>, level: number, logPad: string, logLevel: number)
    {
        const me = this;
        const taskTypesRmv: (ITaskFileApi | ITaskItemApi)[] = [];
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
                for (const each2 of (each as TaskFile).treeNodes)
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
                    me.removeTreeNodes(each as TaskFile, folder, subfolders, level + 1, logPad, logLevel + 1);
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
                            label += (label ? /* istanbul ignore next */ groupSeparator : "") + labelParts[i];
                        }
                        each2.label = label || /* istanbul ignore next */each2.label;
                    }
                }
            }
            else {
                await this.renameGroupedTasks(each2 as TaskFile);
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
            await this.stop(taskItem);
            await this.run(taskItem);
        }
        log.methodDone("restart task", 1);
    }


    private async resumeTask(taskItem: TaskItem)
    {
        let exec: TaskExecution | undefined;
        log.methodStart("resume task", 1, "", true);
        const term = getTerminal(taskItem, "   ");
        if (term)
        {
            log.value("   send to terminal", "N", 1);
            term.sendText("N", true);
            taskItem.paused = false;
            exec = taskItem.execution;
        }
        else {
            window.showInformationMessage("Terminal not found");
        }
        log.methodDone("resume task", 1);
        return exec;
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
        let exec: TaskExecution | undefined;

        if (this.isBusy() || !taskItem)
        {
            window.showInformationMessage("Busy, please wait...");
            return exec;
        }

        log.methodStart("run task", 1, "", true, [[ "task name", taskItem.label ]]);
        taskItem.taskDetached = undefined;

        if (withArgs === true)
		{
            exec = await this.runWithArgs(taskItem, args, noTerminal);
		}
        else if (taskItem.paused)
        {
            exec = await this.resumeTask(taskItem);
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
                      p = providers.get(def.type) || /* istanbul ignore next */providersExternal.get(def.type);
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
            exec = await this.runTask(newTask, noTerminal);
            /* istanbul ignore else */
            if (exec)
            {
                await this.specialFolders.lastTasks.saveTask(taskItem, "   ");
            }
        }

        log.methodDone("run task", 1);
        return exec;
    }


    private async runLastTask()
    {
        if (this.isBusy())
        {
            window.showInformationMessage("Busy, please wait...");
            return;
        }

        const lastTaskId = this.specialFolders.lastTasks.getLastRanId();
        if (!lastTaskId) { return; }

        log.methodStart("run last task", 1, "", true, [[ "last task id", lastTaskId ]]);

        const taskItem = this.taskMap[lastTaskId];
        let exec: TaskExecution | undefined;

        /* istanbul ignore else */
        if (taskItem && taskItem instanceof TaskItem)
        {
            exec = await this.run(taskItem);
        }
        else {
            window.showInformationMessage("Task not found!  Check log for details");
            await this.specialFolders.lastTasks.removeTaskFile(lastTaskId, "   ");
        }

        log.methodDone("run last task", 1);
        return exec;
    }


    private async runNpmCommand(taskFile: TaskFile, command: string)
    {
        const pkgMgr = util.getPackageManager(),
              uri = taskFile.resourceUri;

        const options = {
            cwd: dirname(uri.fsPath)
        };

        const kind: TaskDefinition = {
            type: "npm",
            script: "install",
            path: dirname(uri.fsPath)
        };

        if (command.indexOf("<packagename>") === -1)
        {   /* istanbul ignore else */
            if (taskFile.folder.workspaceFolder)
            {
                const execution = new ShellExecution(pkgMgr + " " + command, options);
                const task = new Task(kind, taskFile.folder.workspaceFolder, command, "npm", execution, undefined);
                return tasks.executeTask(task);
            }
        }
        else
        {
            const opts: InputBoxOptions = { prompt: "Enter package name to " + command };
            await window.showInputBox(opts).then(async (str) =>
            {
                /* istanbul ignore else */
                if (str !== undefined && taskFile.folder.workspaceFolder)
                {
                    const execution = new ShellExecution(pkgMgr + " " + command.replace("<packagename>", "").trim() + " " + str.trim(), options);
                    const task = new Task(kind, taskFile.folder.workspaceFolder, command.replace("<packagename>", "").trim() + str.trim(), "npm", execution, undefined);
                    return tasks.executeTask(task);
                }
            });
        }
    }


    private async runTask(task: Task, noTerminal?: boolean, logPad = "   ")
    {
        let exec: TaskExecution | undefined;
        log.methodStart("run task", 1, logPad, false, [[ "no terminal", noTerminal ]]);

        if (noTerminal === true) {
            task.presentationOptions.reveal = TaskRevealKind.Silent;
        }
        else {
            task.presentationOptions.reveal = TaskRevealKind.Always;
        }

        try {
            exec = await tasks.executeTask(task);
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
        }

        log.methodDone("run task", 1, logPad, [[ "success", !!exec ]]);
        return exec;
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
        let exec: TaskExecution | undefined;
        log.methodStart("run task with arguments", 1, logPad, false, [[ "no terminal", noTerminal ]]);
        /* istanbul ignore else */
        if (taskItem.task && !(taskItem.task.execution instanceof CustomExecution))
        {
            const me = this;
            const opts: InputBoxOptions = { prompt: "Enter command line arguments separated by spaces"};

            const _run = async (_args: string | undefined) =>
            {
                let exec: TaskExecution | undefined;
                /* istanbul ignore else */
                if (_args)
                {
                    let newTask = taskItem.task;
                    const def = taskItem.task.definition,
                          folder = taskItem.getFolder();
                    /* istanbul ignore else */
                    if (folder)
                    {
                        newTask = (new ScriptTaskProvider()).createTask(
                            def.script, undefined, folder, def.uri, _args.trim().split(" "), logPad + "   "
                        ) as Task;
                        newTask.definition.taskItemId = def.taskItemId;
                    }
                    exec = await this.runTask(newTask, noTerminal, logPad + "   ");
                    /* istanbul ignore else */
                    if (exec)
                    {
                        await this.specialFolders.lastTasks.saveTask(taskItem, logPad);
                    }
                }
                return exec;
            };

            taskItem.taskDetached = undefined;
            if (!args) {
                exec = await _run(await window.showInputBox(opts));
            }
            else {
                exec = await _run(args);
            }
        }
        else {
            window.showInformationMessage("Custom execution tasks cannot have the cmd line altered");
        }
        log.methodDone("run task with arguments", 1, logPad);
        return exec;
    }


    public setEnabled(enable: boolean)
    {
        if (enable !== this.enabled)
        {
            this.enabled = enable;
            if (!enable) {
                this.tasks = null;
                this.taskTree = null;
                this.setEnableCalled = true;
            }
            else {
                this.setEnableCalled = enable;
                this._onDidChangeTreeData.fire();
            }
        }
    }


    private async stop(taskItem: TaskItem)
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
            const terminal = getTerminal(taskItem, "   ");
            /* istanbul ignore else */
            if (terminal)
            {
                if (configuration.get<boolean>("keepTermOnStop") === true && !taskItem.taskDetached)
                {
                    log.write("   keep terminal open", 1);
                    //
                    // TODO - see ticket.  I guess its not CTRL+C in some parts.  so make the control
                    //                     chars a setting.  Also in pause().
                    //
                    if (taskItem.paused)
                    {
                        log.value("   send to terminal", "Y", 1);
                        terminal.sendText("Y");
                    }
                    else
                    {
                        log.value("   send sequence to terminal", "\\u0003", 1);
                        terminal.sendText("\u0003");
                        await util.timeout(50);
                        log.value("   send to terminal", "Y", 1);
                        // terminal = getTerminal(taskItem, "   ");
                        try { if (getTerminal(taskItem, "   ")) terminal.sendText("Y", true); } catch {}
                    }
                    taskItem.paused = false;
                }
                else {
                    log.write("   kill task execution", 1);
                    try { exec.terminate(); } catch {}
                }
            }
            else {
                window.showInformationMessage("Terminal not found");
            }
        }
        else {
            window.showInformationMessage("Executing task not found");
            taskItem.refreshState("   ", 1);
            this.taskWatcher.fireTaskChangeEvents(taskItem, "   ", 1);
        }

        log.methodDone("stop", 1);
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
