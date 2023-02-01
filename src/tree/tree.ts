
import * as util from "../lib/utils/utils";
import * as task from "./task";
import * as sortTasks from "../lib/sortTasks";
import TaskItem from "./item";
import TaskFile from "./file";
import log from "../lib/log/log";
import TaskFolder from "./folder";
import constants from "../lib/constants";
import statusBarItem from "../lib/statusBarItem";
import SpecialTaskFolder from "./specialFolder";
import { dirname, join } from "path";
import { IEvent } from "../interface/IEvent";
import { isDirectory } from "../lib/utils/fs";
import { rebuildCache } from "../lib/fileCache";
import { getTerminal } from "../lib/getTerminal";
import { addToExcludes } from "../lib/addToExcludes";
import { isTaskIncluded } from "../lib/isTaskIncluded";
import { TaskWatcher } from "../lib/watcher/taskWatcher";
import { configuration } from "../lib/utils/configuration";
import { TaskExplorerProvider } from "../providers/provider";
import { ITaskFile, ITaskItem, IDictionary } from "../interface";
import { ITaskExplorer, TaskMap } from "../interface/ITaskExplorer";
import { InitScripts, LoadScripts, NoScripts } from "../lib/noScripts";
import { getLicenseManager, providers, providersExternal } from "../extension";
import { getTaskTypeFriendlyName, isScriptType } from "../lib/utils/taskTypeUtils";
import {
    Event, EventEmitter, ExtensionContext, Task, TreeDataProvider, TreeItem,
    TreeItemCollapsibleState, Uri, commands, tasks, Disposable, workspace
} from "vscode";
import { ILicenseManager } from "../interface/ILicenseManager";


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
export class TaskTreeDataProvider implements TreeDataProvider<TreeItem>, ITaskExplorer, Disposable
{
    private static firstTreeBuildDone = false;
    private defaultGetChildrenLogLevel = 1;
    private defaultGetChildrenLogPad = "";
    private currentRefreshEvent: string | undefined;
    private eventQueue: IEvent[] = [];
    private name: string;
    private disposables: Disposable[];
    private tasks: Task[] | null = null;
    private refreshPending = false;
    private visible = false;
    private enabled = false;
    private setEnableCalled = false;
    private treeBuilding = false;
    private scanningFilesItem: InitScripts | undefined;
    private buildingTreeItem: LoadScripts | undefined;
    private getChildrenLogLevel = this.defaultGetChildrenLogLevel;
    private getChildrenLogPad = this.defaultGetChildrenLogPad;
    private extensionContext: ExtensionContext;
    private taskMap: TaskMap = {};
    private taskTree: TaskFolder[] | NoScripts[] | undefined | null | void = null;
    private taskWatcher: TaskWatcher;
    private currentInvalidation: string | undefined;
    private currentInvalidationUri: Uri | undefined;
    private onTreeDataChangeEventComplete: (() => void) | undefined;
    private _onDidChangeTreeData: EventEmitter<TreeItem | undefined | null | void> = new EventEmitter<TreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: Event<TreeItem | undefined | null | void> = this._onDidChangeTreeData.event;
    private specialFolders: {
        favorites: SpecialTaskFolder;
        lastTasks: SpecialTaskFolder;
    };


    constructor(name: "taskExplorer"|"taskExplorerSideBar", context: ExtensionContext)
    {
        this.name = name;
        this.disposables = [];
        this.extensionContext = context;

        const nodeExpandedeMap: any = configuration.get<any>("specialFolders.expanded");
        const favoritesExpanded = nodeExpandedeMap.favorites !== false ?
                                  TreeItemCollapsibleState.Expanded : /* istanbul ignore next */TreeItemCollapsibleState.Collapsed;
        const lastTaskExpanded = nodeExpandedeMap.lastTasks !== false ?
                                TreeItemCollapsibleState.Expanded : /* istanbul ignore next */TreeItemCollapsibleState.Collapsed;
        this.specialFolders = {
            favorites: new SpecialTaskFolder(context, name, this, constants.FAV_TASKS_LABEL, favoritesExpanded),
            lastTasks: new SpecialTaskFolder(context, name, this, constants.LAST_TASKS_LABEL, lastTaskExpanded)
        };
        this.disposables.push(this.specialFolders.favorites);
        this.disposables.push(this.specialFolders.lastTasks);

        this.taskWatcher = new TaskWatcher(this, this.specialFolders);
        this.disposables.push(this.taskWatcher);

        // task.registerTreeTasks(this, this.specialFolders.lastTasks);
        this.disposables.push(commands.registerCommand(name + ".run",  async (item: TaskItem) => task.run(this, item, this.specialFolders.lastTasks), this));
        this.disposables.push(commands.registerCommand(name + ".runNoTerm",  async (item: TaskItem) => task.run(this, item, this.specialFolders.lastTasks, true, false), this));
        this.disposables.push(commands.registerCommand(name + ".runWithArgs",  async (item: TaskItem, args?: string) => task.run(this, item, this.specialFolders.lastTasks, false, true, args), this));
        this.disposables.push(commands.registerCommand(name + ".runLastTask",  async () => task.runLastTask(this, this.taskMap, this.specialFolders.lastTasks), this));
        this.disposables.push(commands.registerCommand(name + ".stop", async (item: TaskItem) => task.stop(this, item), this));
        this.disposables.push(commands.registerCommand(name + ".restart",  async (item: TaskItem) => task.restart(this, item, this.specialFolders.lastTasks), this));
        this.disposables.push(commands.registerCommand(name + ".pause",  (item: TaskItem) => task.pause(this, item), this));
        this.disposables.push(commands.registerCommand(name + ".open", async (item: TaskItem, itemClick?: boolean) => task.open(this, item, this.specialFolders.lastTasks, itemClick), this));
        this.disposables.push(commands.registerCommand(name + ".openTerminal", (item: TaskItem) => this.openTerminal(item), this));
        this.disposables.push(commands.registerCommand(name + ".refresh", () => this.refresh(true, false, ""), this));
        this.disposables.push(commands.registerCommand(name + ".runInstall", async (taskFile: TaskFile) => task.runNpmCommand(taskFile, "install"), this));
        this.disposables.push(commands.registerCommand(name + ".runUpdate", async (taskFile: TaskFile) => task.runNpmCommand(taskFile, "update"), this));
        this.disposables.push(commands.registerCommand(name + ".runUpdatePackage", async (taskFile: TaskFile) => task.runNpmCommand(taskFile, "update <packagename>"), this));
        this.disposables.push(commands.registerCommand(name + ".runAudit", async (taskFile: TaskFile) => task.runNpmCommand(taskFile, "audit"), this));
        this.disposables.push(commands.registerCommand(name + ".runAuditFix", async (taskFile: TaskFile) => task.runNpmCommand(taskFile, "audit fix"), this));
        this.disposables.push(commands.registerCommand(name + ".addToExcludes", async (taskFile: TaskFile | TaskItem) => this.addToExcludes(taskFile), this));
        this.disposables.push(commands.registerCommand(name + ".addRemoveCustomLabel", async(taskItem: TaskItem) => this.addRemoveSpecialTaskLabel(taskItem), this));

        context.subscriptions.push(this);
    }


    dispose = () =>
    {
        this.disposables.forEach((d) => {
            d.dispose();
        });
        // this.extensionContext.subscriptions.splice(this.subscriptionIndex, 1);
        this.disposables = [];
    };


    private addRemoveSpecialTaskLabel = async(taskItem: TaskItem) =>
    {
        /* istanbul ignore else */
        if (taskItem.folder)
        {
            const folderName = util.lowerCaseFirstChar(taskItem.folder.label as string, true) as "favorites"|"lastTasks";
            return this.specialFolders[folderName].addRemoveRenamedLabel(taskItem);
        }
    };


    private addToExcludes = async(selection: TaskFile | TaskItem) =>
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
                for (const each of selection.treeNodes.filter(n => !!n.resourceUri))
                {
                    const  uri = each.resourceUri as Uri;
                    log.value("      adding file path", uri.path, 3);
                    pathValues.push(uri.path);
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
            if (isScriptType(selection.taskSource))
            {
                const resourceUri = selection.resourceUri as Uri;
                log.value("   adding file path", resourceUri.path, 2);
                pathValues.push(resourceUri.path);
            }
            else {
                excludesList = "excludeTask";
                pathValues.push(selection.task.name);
            }
        }

        await addToExcludes(pathValues, excludesList, true, "   ");

        await this.refresh(selection.taskSource, uri, "   ");

        log.methodDone("add to excludes", 1);
    };


    private buildGroupings = async(folders: IDictionary<TaskFolder|SpecialTaskFolder>, logPad: string, logLevel: number) =>
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
        for (const [ key, folder ] of Object.entries(folders))
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
    };


    private buildTaskTree = async(tasksList: Task[], logPad: string, logLevel: number): Promise<TaskFolder[]|NoScripts[]> =>
    {
        let taskCt = 0;
        const folders: IDictionary<TaskFolder> = {};
        const files: IDictionary<TaskFile> = {};
        let sortedFolders: TaskFolder[]|NoScripts[];

        log.methodStart("build task tree", logLevel, logPad);

        //
        // Set a busy flag for all external functions
        //
        this.treeBuilding = true;

        //
        // The 'Last Tasks' folder will be 1st in the tree
        //
        this.specialFolders.lastTasks.clearTaskItems();
        if (this.specialFolders.lastTasks.isEnabled())
        {
            folders[this.specialFolders.lastTasks.label as string] = this.specialFolders.lastTasks;
        }

        //
        // The 'Favorites' folder will be 2nd in the tree (or 1st if configured to hide
        // the 'Last Tasks' folder)
        //
        this.specialFolders.favorites.clearTaskItems();
        if (this.specialFolders.favorites.isEnabled())
        {
            folders[this.specialFolders.favorites.label as string] = this.specialFolders.favorites;
        }

        //
        // Loop through each task provided by the engine and build a task tree
        //
        for (const each of tasksList)
        {
            log.blank(logLevel + 1);
            log.write(`   Processing task ${++taskCt} of ${tasksList.length} (${each.source})`, logLevel + 1, logPad);
            await this.buildTaskTreeList(each, folders, files, logPad + "   ");
        }

        if (!util.isObjectEmpty(folders))
        {   //
            // Sort and build groupings
            //
            await this.buildGroupings(folders, logPad + "   ", logLevel);
            //
            // Get sorted root project folders (only project folders are sorted, special folders 'Favorites',
            // 'User Tasks' and 'Last Tasks' are kept at the top of the list.
            //
            sortedFolders = sortTasks.sortFolders(folders);
        }     //
        else // If 'folders' is an empty map, or, all tasks are disabled but Workspace+NPM (and Gulp+Grunt
        {   // if their respective 'autoDetect' settings are `on`) tasks are returned in fetchTasks() since
            // they are internally provided, and we ignored them in buildTaskTreeList().
            //
            sortedFolders = [ new NoScripts() ];
        }

        //
        // Done!
        //
        log.methodDone("build task tree", logLevel, logPad);
        this.treeBuilding = false;

        return sortedFolders;
    };


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
    private buildTaskTreeList = async(each: Task, folders: IDictionary<TaskFolder>, files: IDictionary<TaskFile>, logPad: string) =>
    {
        let folder: TaskFolder | undefined,
            scopeName: string;

        log.methodStart("build task tree list", 2, logPad, true, [
            [ "name", each.name ], [ "source", each.source ], [ "definition type", each.definition.type ],
            [ "definition path", each.definition.path ]
        ]);
        log.value("   scope", each.scope, 4, logPad);

        const nodeExpandedeMap: any = configuration.get<any>("specialFolders.expanded"),
              relativePath = this.getTaskRelativePath(each);
        //
        // Set scope name and create the TaskFolder, a "user" task will have a TaskScope scope, not
        // a WorkspaceFolder scope.
        //
        /* istanbul ignore else */
        if (util.isWorkspaceFolder(each.scope))
        {
            scopeName = each.scope.name;
            folder = folders[scopeName];
            if (!folder)
            {
                folder = new TaskFolder(each.scope, nodeExpandedeMap[util.lowerCaseFirstChar(scopeName, true)] !== false ?
                                                    TreeItemCollapsibleState.Expanded : TreeItemCollapsibleState.Collapsed);
                folders[scopeName] = folder;
                log.value("constructed tree taskfolder", `${scopeName} (${folder.id})`, 3, logPad + "   ");
            }
        }     //
        else // User Task (not related to a ws or project)
        {   //
            scopeName = constants.USER_TASKS_LABEL;
            folder = folders[scopeName];
            if (!folder)
            {
                folder = new TaskFolder(scopeName, nodeExpandedeMap[util.lowerCaseFirstChar(scopeName, true)] !== false ?
                                                TreeItemCollapsibleState.Expanded : TreeItemCollapsibleState.Collapsed);
                folders[scopeName] = folder;
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
        const isNpmInstallTask = each.source === "npm" && (each.name === "install" || each.name.startsWith("install - "));
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
    };


    private clearFlags = () =>
    {
        this.currentInvalidation = undefined;
        this.currentRefreshEvent = undefined;
        this.currentInvalidationUri = undefined;
        this.getChildrenLogPad = this.defaultGetChildrenLogPad;
        this.getChildrenLogLevel = this.defaultGetChildrenLogLevel;
    };

    /**
     * @method createTaskGroupings
     * @since 1.28.0
     *
     * Creates main task groupings, i.e. 'npm', 'vscode', 'batch', etc, for a given {@link TaskFolder}
     *
     * @param folder The TaskFolder to process
     */
    private createTaskGroupings = async(folder: TaskFolder, logPad: string, logLevel: number) =>
    {
        let prevTaskFile: TaskItem | TaskFile | undefined;
        const subfolders: IDictionary<TaskFile> = {};

        log.methodStart("create tree node folder grouping", logLevel, logPad, true, [[ "project folder", folder.label ]]);

        for (const each of folder.taskFiles)
        {   //
            const taskFile = each as TaskFile; // Guaranteed to be TaskFile, only SpecialFolder can have TaskItem
            //                                 // and SpecialFolder is skipped in caller .buildGroupings()
            // Check if current taskfile source is equal to previous (i.e. ant, npm, vscode, etc)
            //
            if (prevTaskFile && prevTaskFile.taskSource === taskFile.taskSource)
            {
                const id = folder.label + taskFile.taskSource;
                let subfolder: TaskFile | undefined = subfolders[id];
                if (!subfolder)
                {
                    log.values(logLevel + 2, logPad, [
                        [ "   Add source file sub-container", taskFile.path ],
                        [ "      id", id ]
                    ]);
                    const node = taskFile.treeNodes[0];
                    /* istanbul ignore else */
                    if (node instanceof TaskItem)
                    {
                        subfolder = new TaskFile(this.extensionContext, folder, node.task.definition,
                                                 taskFile.taskSource, taskFile.path, 0, id, undefined, "   ");
                        subfolders[id] = subfolder;
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
                if (subfolder && subfolder.nodePath !== taskFile.nodePath) {
                    subfolder.addTreeNode(taskFile); // addScript will set the group level on the TaskItem
                }
            }
            prevTaskFile = taskFile;
            //
            // Create the grouping
            //
            await this.createTaskGroupingsBySep(folder, taskFile, subfolders, 0, logPad + "   ", logLevel + 1);
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
    };


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
    private createTaskGroupingsBySep = async(folder: TaskFolder, taskFile: TaskFile, subfolders: IDictionary<TaskFile>, treeLevel: number, logPad: string, logLevel: number) =>
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
                const id = TaskFile.getGroupedId(folder, taskFile, label, treeLevel);
                subfolder = subfolders[id];

                if (!subfolder)
                {   //
                    // Create the new node, add it to the list of nodes to add to the tree.  We must
                    // add them after we loop since we are looping on the array that they need to be
                    // added to
                    //
                    subfolder = new TaskFile(this.extensionContext, folder, each.task.definition, taskFile.taskSource,
                                             each.taskFile.path, treeLevel, id, prevName[treeLevel], logPad);
                    subfolders[id] = subfolder;
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
    };


    private createTaskTree = async(licMgr: ILicenseManager, logPad: string, logLevel: number) =>
    {
        let ctRmv = 0;
        TaskExplorerProvider.logPad = logPad + "   ";
        statusBarItem.show();

        log.methodStart("create task tree", logLevel, logPad, true, [[ "current invalidation", this.currentInvalidation ]]);

        if (!this.tasks || !this.currentInvalidation || this.currentInvalidation  === "Workspace" || this.currentInvalidation === "tsc") // || this.currentInvalidationUri)
        {
            log.write("   fetching all tasks via VSCode fetchTasks call", logLevel, logPad);
            statusBarItem.update("Requesting all tasks from all providers");
            this.tasks = await tasks.fetchTasks();
            //
            // Process the tasks cache array for any removals that might need to be made
            //
            this.doTaskCacheRemovals(undefined, logPad); // removes tasks that already exist that were just re-parsed
        }     //                                         // as we will replace them a few lines down
        else // this.currentInvalidation guaranteed to be a string (task type) here
        {   //
            const taskName = getTaskTypeFriendlyName(this.currentInvalidation);
            log.write(`   fetching ${taskName} tasks via VSCode fetchTasks call`, logLevel, logPad);
            statusBarItem.update("Requesting  tasks from " + taskName + " task provider");
            //
            // Get all tasks of the type defined in 'currentInvalidation' from VSCode, remove
            // all tasks of the type defined in 'currentInvalidation' from the tasks list cache,
            // and add the new tasks from VSCode into the tasks list.
            //
            const taskItems = await tasks.fetchTasks({ type: this.currentInvalidation });
            //
            // Process the tasks cache array for any removals that might need to be made
            //                                                          // removes tasks that already exist that were just re-parsed
            this.doTaskCacheRemovals(this.currentInvalidation, logPad); // of the same task type (this.currentInvalidation)
            log.write(`   adding ${taskItems.length} new ${this.currentInvalidation} tasks`, logLevel + 1, logPad);
            this.tasks.push(...taskItems);
        }

        //
        // Check the finalized task cache array for any ignores that still need to be processed,
        // e.g. 'grunt' or 'gulp' tasks that are internally provided by VSCode and we have no
        // control over the provider returning them.  Internally provided Grunt and Gulp tasks
        // are differentiable from TE provided Gulp and Grunt tasks in that the VSCode provided
        // tasks do no not have task.definition.uri set.
        //                                      //
        this.cleanFetchedTasks(logPad + "   "); // good byte shitty ass Grunt and Gulp providers, whoever
        //                                      // coded you should hang it up and retire, what a damn joke.
        // Check License Manager for any task count restrictions
        //
        const maxTasks = licMgr.getMaxNumberOfTasks();
        log.write("   checking un-licensed task count restrictions", logLevel + 1, logPad);
        if (this.tasks.length > maxTasks)
        {
            ctRmv = this.tasks.length - maxTasks;
            log.write(`      removing ${ctRmv} tasks, max count reached (no license)`, logLevel + 2, logPad);
            this.tasks.splice(maxTasks, ctRmv);
            util.showMaxTasksReachedMessage(licMgr);
        }
        log.write("   completed un-licensed restriction check", logLevel + 1, logPad);

        //
        // Instantiate/construct the ui tree
        //
        this.taskTree = await this.buildTaskTree(this.tasks, logPad + "   ", logLevel + 1);

        //
        // All done...
        //
        TaskExplorerProvider.logPad = "";
        statusBarItem.update("Building task explorer tree");
        statusBarItem.hide();
        log.methodDone("create task tree", logLevel, logPad, [[ "current task count", this.tasks.length ]]);
    };


    private cleanFetchedTasks = (logPad: string) =>
    {
        let ctRmv = 0;
        const tasksCache = this.tasks as Task[];
        log.write("removing any ignored tasks from new fetch", 3, logPad);
        tasksCache.slice().reverse().forEach((item, index, object) => // niftiest loop ever
        {   //
            // Make sure this task shouldn't be ignored based on various criteria...
            // Process only if this task type/source is enabled in settings or is scope is empty (VSCode provided task)
            // By default, also ignore npm 'install' tasks, since its available in the context menu, ignore
            // other providers unless it has registered as an external provider via Task Explorer API.
            // Only internally provided tasks will be present in the this.tasks cache at this point, as extension
            // provided tasks will have been skipped/ignored in the provideTasks() processing.
            //
            if (!isTaskIncluded(item, this.getTaskRelativePath(item), logPad + "   "))
            {
                ++ctRmv;
                tasksCache.splice(object.length - 1 - index, 1);
                log.value("   ignoring task", item.name, 3, logPad);
            }
        });
        log.write(`ignored ${ctRmv} ${this.currentInvalidation} tasks from new fetch`, 3, logPad);
    };


    private doTaskCacheRemovals = (invalidation: string | undefined, logPad: string) =>
    {
        let ctRmv = 0;
        const tasksCache = this.tasks as Task[];
        log.write("   removing current invalidated tasks from cache", 3, logPad);
        const showUserTasks = configuration.get<boolean>("specialFolders.showUserTasks");
        tasksCache.slice().reverse().forEach((item, index, object) => // niftiest loop ever
        {   //
            // Note that requesting a task type can return Workspace tasks (tasks.json/vscode)
            // if the script type set for the task in tasks.json is of type 'currentInvalidation'.
            // Remove any Workspace type tasks returned as well, in this case the source type is
            // != currentInvalidation, but the definition type == currentInvalidation
            //
            if (invalidation && item.source === invalidation || item.source === "Workspace")
            {
                if (item.source !== "Workspace" || item.definition.type === invalidation)
                {
                    tasksCache.splice(object.length - 1 - index, 1);
                    log.write(`      removed task '${item.source}/${item.name}'`, 3, logPad);
                    ++ctRmv;
                }
            }
            //
            // Remove User tasks if they're not enabled
            //
            if (!showUserTasks && item.source === "Workspace" && !util.isWorkspaceFolder(item.scope))
            {
                tasksCache.splice(object.length - 1 - index, 1);
            }
        });
        log.write(`   removed ${ctRmv} ${invalidation} current tasks from cache`, 3, logPad);
    };


    fireTreeRefreshEvent = (logPad: string, logLevel: number, taskFile?: TreeItem) =>
    {
        const id = "pendingFireTreeRefreshEvent-" + (taskFile ? taskFile.id?.replace(/\W/g, "") : "g");
        log.methodStart("fire tree refresh event", logLevel, logPad, false, [[ "node id", id ]]);
        if (this.visible)
        {
            this.refreshPending = true;
            this.getChildrenLogPad = logPad;
            this.getChildrenLogLevel = logLevel;
            this.currentRefreshEvent = id;
            this._onDidChangeTreeData.fire(taskFile);
            log.write("   refresh event fired", logLevel, logPad);
            this.onTreeDataChangeEventComplete = () => {
                log.write("fire tree refresh event has been processed", logLevel, logPad);
            };
        }
        else
        {   // if (!this.eventQueue.find((e => e.type === "refresh" && e.id === id)))
            if (id !== this.currentRefreshEvent && !this.eventQueue.find((e => e.type === "refresh" && e.id === id)))
            {
                if (!taskFile || !this.eventQueue.find(e => e.type === "refresh" && !e.args[0]))
                {
                    if (!taskFile)
                    {   // if this is a global refresh, remove all other refresh events from the q
                        this.eventQueue.slice().reverse().forEach((value, index, obj) => {
                            // As of v3.0, there's only one event type, "refresh"
                            // if (value.type === "wsFolderRemove" || value.type === "refresh") {
                                this.eventQueue.splice(obj.length - 1 - index, 1);
                            // }
                        });
                    }
                    this.eventQueue.push(
                    {
                        id,
                        delay: 1,
                        fn: this.fireTreeRefreshEvent,
                        args: [ taskFile ],
                        type: "refresh"
                    });
                    log.write("   refresh event has been queued", logLevel, logPad);
                }
                else {
                    log.write("   a global refresh event is already queued, skip", logLevel, logPad);
                }
            }
            else {
                log.write("   a refresh event for this item is already running or queued, skip", logLevel, logPad);
            }
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
        if (!this.enabled)
        {
            this.refreshPending = false;
            this.scanningFilesItem = this.scanningFilesItem || new InitScripts(this);
            return [ this.scanningFilesItem ]; // 'scanningFilesItem' continually fires tree refresh events
        }                                      // to roll it's elipsis
        // this.scanningFilesItem?.dispose();
        this.scanningFilesItem = undefined;

        // if (!this.fistTreeBuildComplete && this.fistTreeBuildStarted && this.buildingTreeItem) // && this.refreshPending)
        // {
        //     return [ this.buildingTreeItem ]; // 'buildingTreeItem' continually fires tree refresh events
        // }                                     // to roll it's elipsis
        //
        // Set pretty muy importante flag,  usually is set in refresh() or fireTreeRefreshEvent(),
        // but other callers can enter here too (tests), so we'll set in in any case.
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
            this.setEnableCalled = false; // 'buildingTreeItem' continually fires tree refresh events
            this.buildingTreeItem = new LoadScripts(this); // || new LoadScripts(this);
            setTimeout(() => this.fireTreeRefreshEvent("", 1), 10);
            return [ this.buildingTreeItem ];
        }

        this.getChildrenLogPad = "";  // just can't see a nice way to ever line this up unless we use the log queue
        this.getChildrenLogLevel = 1; // just can't see a nice way to ever line this up unless we use the log queue

        const logPad = this.getChildrenLogPad,
              logLevel = this.getChildrenLogLevel,
              licMgr = getLicenseManager();

        this.logGetChildrenStart(element, logPad, logLevel);

        //
        // Create/build the ui task tree if not built already
        //
        if (!this.taskTree || this.currentInvalidationUri)
        {
            await this.createTaskTree(licMgr, logPad, logLevel);
        }
        // this.buildingTreeItem?.dispose();
        this.buildingTreeItem = undefined;

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
            items = this.taskTree as TaskFolder[] | NoScripts[];
        }

        if (!TaskTreeDataProvider.firstTreeBuildDone)
        {   //
            // Update license manager w/ tasks, display info / license page if needed
            //
            await licMgr.setTasks(this.tasks || /* istanbul ignore next */[], logPad + "   ");
        }

        //
        // Reset flags and refresh task variables, set 'first tree build done' flag
        //
        this.clearFlags();
        TaskTreeDataProvider.firstTreeBuildDone = true;

        //
        // Process event queue
        //
        this.refreshPending = this.processEventQueue(logPad + "   ");

        log.methodDone("get tree children", logLevel, logPad, [
            [ "# of tasks total", this.tasks ? this.tasks.length : /* istanbul ignore next */0 ],
            [ "# of tree task items returned", items.length ], [ "pending event", this.refreshPending ]
        ]);

        //
        // Callback to caller
        //
        if (this.onTreeDataChangeEventComplete) {
            this.onTreeDataChangeEventComplete();
            this.onTreeDataChangeEventComplete = undefined;
        }

        return items;
    };


    getName = () => this.name;


    /* istanbul ignore next */  // Needed for TaskResolve API and/or TreeView/Reveal API?
    public getParent(element: TreeItem): TreeItem | null
    {
        /* istanbul ignore next */
        if (element instanceof TaskFolder)
        {
            /* istanbul ignore next */
            return null;
        }
        /* istanbul ignore next */
        if (element instanceof TaskFile)
        {
            /* istanbul ignore next */
            return element.folder;
        }
        /* istanbul ignore next */
        if (element instanceof TaskItem)
        {
            /* istanbul ignore next */
            return element.taskFile;
        }
        /* istanbul ignore next */
        if (element instanceof NoScripts || element instanceof InitScripts || element instanceof LoadScripts)
        {
            /* istanbul ignore next */
            return null;
        }
        /* istanbul ignore next */
        return null;
    }


    getTasks = () => this.tasks || /* istanbul ignore next */[];


    private getTaskFileNode = async(task: Task, folder: TaskFolder, files: IDictionary<TaskFile>, relativePath: string, scopeName: string, logPad: string) =>
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

        taskFile = files[id];

        if (!taskFile) // Create taskfile node if needed
        {
            log.value("   Add source file container", task.source, 2, logPad);
            taskFile = new TaskFile(this.extensionContext, folder, task.definition, task.source, relativePath, 0, undefined, undefined, logPad + "   ");
            await folder.addTaskFile(taskFile);
            files[id] = taskFile;
        }

        log.methodDone("get task file node", 2, logPad);
        return taskFile;
    };


    getTaskMap = () => this.taskMap;


    private getTaskRelativePath = (task: Task) =>
    {
        let relativePath = task.definition.path ?? "";
        if (task.source === "tsc" && util.isWorkspaceFolder(task.scope))
        {
            if (task.name.indexOf(" - ") !== -1 && task.name.indexOf(" - tsconfig.json") === -1)
            {
                relativePath = dirname(task.name.substring(task.name.indexOf(" - ") + 3));
            }
        }
        return relativePath;
    };


    getTaskTree = () => this.taskTree;


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


    private handleRebuildEvent = async(invalidate: any, opt: boolean | Uri | undefined, logPad: string) =>
    {   //
        // The file cache only needs to update once on any change, since this will get called through
        // twice if both the Explorer and Sidebar Views are enabled, do a lil check here to make sure
        // we don't double scan for nothing.
        //
        const explorerViewEnabled = configuration.get<boolean>("enableExplorerView");
        const doWorkSon = ((explorerViewEnabled && this.name === "taskExplorer") ||
                          (!explorerViewEnabled && this.name === "taskExplorerSideBar"));
        log.methodStart("handle tree rebuild event", 1, logPad, false, [[ "main tree handling event", doWorkSon ]]);
        if (doWorkSon)
        {
            if (invalidate === true && !opt)
            {
                log.write("   handling 'rebuild cache' event", 1, logPad + "   ");
                await rebuildCache(logPad + "   ");
                log.write("   handling 'rebuild cache' event complete", 1, logPad + "   ");
            }
            log.write("   handling 'invalidate tasks cache' event", 1, logPad);
            await this.invalidateTasksCache(invalidate !== true ? invalidate : undefined, opt, logPad + "   ");
        }
        log.methodDone("   handle tree rebuild event", 1, logPad);
    };


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
     *     "composer"
     *     "gradle"
     *     "grunt"
     *     "gulp"
     *     "jenkins"
     *     "make"
     *     "npm"
     *     "nsis"
     *     "perl"
     *     "pipenv"
     *     "powershell"
     *     "python"
     *     "ruby"
     *     "webpack"
     *     "Workspace"
     * @param opt2 The uri of the file that contains/owns the task
     */
    private invalidateTasksCache = async(opt1?: string, opt2?: Uri | boolean, logPad?: string) =>
    {
        log.methodStart("invalidate tasks cache", 1, logPad, false, [
            [ "opt1", opt1 ], [ "opt2", opt2 && opt2 instanceof Uri ? opt2.fsPath : opt2 ]
        ]);

        try {
            if (opt1 && opt2 instanceof Uri)
            {
                log.write("   invalidate '" + opt1 + "' task provider file ", 1, logPad);
                log.value("      file", opt2.fsPath, 1, logPad);
                const provider = providers[opt1] ||
                                 providersExternal[opt1];
                // NPM/Workspace/TSC tasks don't implement TaskExplorerProvider
                await provider?.invalidate(opt2, logPad + "   ");
            }
            else //
            {   // If opt1 is undefined, refresh all providers
                //
                if (!opt1)
                {
                    log.write("   invalidate all providers", 1, logPad);
                    for (const [ key, p ] of Object.entries(providers))
                    {
                        log.write("   invalidate '" + key + "' task provider", 1, logPad);
                        await p.invalidate(undefined, logPad + "   ");
                    }
                }
                else { // NPM/Workspace/TSC tasks don't implement TaskExplorerProvider
                    log.write("   invalidate '" + opt1 + "' task provider", 1, logPad);
                    const provider = providers[opt1] || providersExternal[opt1];
                    provider?.invalidate(undefined, logPad + "   ");
                }
            }
        }
        catch (e: any) {
            /* istanbul ignore next */
            log.error([ "Error invalidating task cache", e ]);
        }

        log.methodDone("invalidate tasks cache", 1, logPad);
    };


    isBusy = () => this.refreshPending || this.treeBuilding;


    isVisible = () => this.visible;


    private logGetChildrenStart = (element: TreeItem | undefined, logPad: string, logLevel: number) =>
    {
        log.methodStart("get tree children", logLevel, logPad, false, [
            [ "task folder", element?.label ], [ "all tasks need to be retrieved", !this.tasks ],
            [ "specific task type need to be retrieved", !!this.currentInvalidation ],
            [ "current invalidation", this.currentInvalidation ], [ "tree needs rebuild", !this.taskTree ],
            [ "first run", !TaskTreeDataProvider.firstTreeBuildDone ], [ "view", this.name ]
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


    private logTask = (task: Task, scopeName: string, logPad: string) =>
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
    };


    private onWorkspaceFolderRemoved = (uri: Uri, logPad: string) =>
    {
        log.methodStart("workspace folder removed event", 1, logPad, false, [[ "path", uri.fsPath ]]);
        if (this.visible)
        {
            let ctRmv = 0;
            const tasks = this.tasks as Task[],
                  taskTree = this.taskTree as TaskFolder[];
            log.write("   removing project tasks from cache", 1, logPad);
            log.values(1, logPad + "      ", [
                [ "current # of tasks", tasks.length ], [ "current # of tree folders", taskTree.length ],
                [ "project path removed", uri.fsPath ]
            ]);
            statusBarItem.update("Deleting all tasks from removed project folder");
            tasks.reverse().forEach((item, index, object) =>
            {
                if (item.definition.uri && item.definition.uri.fsPath.startsWith(uri.fsPath))
                {
                    log.write(`      removing task '${item.source}/${item.name}' from task cache`, 2, logPad);
                    tasks.splice(object.length - 1 - index, 1);
                    ++ctRmv;
                }
            });
            for (const tId of Object.keys(this.taskMap))
            {
                const item = this.taskMap[tId] as TaskItem;
                if  (item.resourceUri?.fsPath.startsWith(uri.fsPath) || item.taskFile.resourceUri.fsPath.startsWith(uri.fsPath))
                {
                    delete this.taskMap[tId];
                }
            }
            const folderIdx = taskTree.findIndex((f: TaskFolder) => f.resourceUri?.fsPath === uri.fsPath);
            taskTree.splice(folderIdx, 1);
            log.write(`      removed ${ctRmv} tasks from task cache`, 1, logPad);
            log.values(1, logPad + "      ", [
                [ "new # of tasks", tasks.length ], [ "new # of tree folders", taskTree.length ]
            ]);
            log.write("   workspace folder event has been processed", 1, logPad);
        }
        else {
            this.eventQueue.push(
            {
                delay: 1,
                id: "wsFolderRemove-" + uri.fsPath,
                fn: this.onWorkspaceFolderRemoved,
                args: [ uri, logPad ],
                type: "wsFolderRemove"
            });
            log.write("   workspace folder event has been queued", 1, logPad);
        }
        log.methodDone("workspace folder removed event", 1, logPad);
    };


    onVisibilityChanged = (visible: boolean) =>
    {   //
        // VSCode engine calls getChildren() when the view changes to 'visible'
        //
        log.methodStart("visibility event received", 1, "", true, [[ "is visible", visible ]]);
        this.visible = visible;
        if (this.visible)
        {
            this.processEventQueue("   ");
        }
        log.methodDone("visibility event received", 1, "");
        log.blank(this.defaultGetChildrenLogLevel);
    };


    private openTerminal = (taskItem: TaskItem) =>
    {
        const term = getTerminal(taskItem);
        if (term) {
            term.show();
        }
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
            }, next.delay);
        }

        log.methodDone("process task explorer main event queue", 1, logPad);
        return firedEvent;
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
     *     "composer"
     *     "gradle"
     *     "grunt"
     *     "gulp"
     *     "jenkins"
     *     "make"
     *     "npm"
     *     "nsis"
     *     "perl"
     *     "pipenv"
     *     "powershell"
     *     "python"
     *     "ruby"
     *     "webpack"
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
     * If invalidate is a string and opt is a Uri, then a filesystemwatcher event or a task just triggered
     *
     * If invalidate and opt are both undefined, then a configuration has changed
     *
     * invalidate can be false when a grouping settingshas changed, where the tree needs to be rebuilt
     * but the file cache does not need to rebuild and  do not need to invalidate any task providers
     *
     * @param opt Uri of the invalidated resource
     */
    refresh = async(invalidate: string | boolean | undefined, opt: Uri | false | undefined, logPad: string) =>
    {
        log.methodStart("refresh task tree", 1, logPad, logPad === "", [
            [ "invalidate", invalidate ], [ "opt fsPath", util.isUri(opt) ? opt.fsPath : "n/a" ],
            [ "tree is null", !this.taskTree ], [ "view", this.name ]
        ]);

        let refreshItem: TreeItem | undefined;

        await this.waitForRefreshComplete();
        this.refreshPending = true;

        if (util.isUri(opt) && isDirectory(opt.fsPath) && !workspace.getWorkspaceFolder(opt))
        {   //
            // A workspace folder was removed.  We know it's a workspace folder because isDirectory()
            // returned true and getWorkspaceFolder() returned false.  If it was a regular directory
            // getting deleted from within a ws folder, then isDirectory() will not return true due
            // to no existing dir anymore to stat.  The getWorkspaceFolder() would also return a valid
            // ws project folder if it was just a dir delete or a dir add, or a ws folder add.  We
            // break out thiscase with a differenthandler since we can improve the performance pretty
            // significantly for this specific event.
            //
            this.onWorkspaceFolderRemoved(opt, logPad);
        }
        else
        {
            if (invalidate !== false) {
                await this.handleRebuildEvent(invalidate, opt, logPad + "   ");
            }

            if (opt !== false && util.isString(invalidate, true))
            {
                log.write(`   invalidation is for type '${invalidate}'`, 1, logPad);                                  //
                this.currentInvalidation = invalidate; // 'invalidate' will be taskType if 'opt' is uri of add/remove resource
                this.currentInvalidationUri = opt;     // 'invalidate' will be undefined if 'opt' is uri of add/remove ws folder
                this.taskTree = null;
                this.taskMap = {};
            }
            else //
            {   // Re-ask for all tasks from all providers and rebuild tree
                //
                log.write("   invalidation is for all types", 1, logPad);
                this.tasks = null;
                this.taskTree = null;
                this.taskMap = {};
                this.currentInvalidation = undefined;
                this.currentInvalidationUri = util.isUri(opt)  ? opt : undefined;
            }
        }

        log.write("   fire tree data change event", 2, logPad);
        this.fireTreeRefreshEvent(logPad + "   ", 1, refreshItem);
        if (!this.visible) {
            setTimeout(() => { this.refreshPending = false; }, 1);
        }

        log.methodDone("refresh task tree", 1, logPad);
    };


    private removeGroupedTasks = (folder: TaskFolder, subfolders: IDictionary<TaskFile>, logPad: string, logLevel: number) =>
    {
        const taskTypesRmv: TaskFile[] = [];

        log.methodStart("remove grouped tasks", logLevel, logPad);

        for (const each of folder.taskFiles.filter(t => util.isTaskFile(t) && !!t.label))
        {
            const taskFile = each as TaskFile,
                  taskFileLabel = taskFile.label as string,
                  id = folder.label + taskFile.taskSource,
                  id2 = TaskFile.getGroupedId(folder, taskFile, taskFileLabel, taskFile.groupLevel);

            if (!taskFile.isGroup && subfolders[id])
            {
                taskTypesRmv.push(taskFile);
            }
            else /* istanbul ignore if */if (id2 && !taskFile.isGroup && subfolders[id2])
            {
                taskTypesRmv.push(taskFile);
            }
            else if (taskFile.isGroup)
            {
                for (const each2 of taskFile.treeNodes)
                {
                    this.removeTreeNodes(each2 as TaskFile, folder, subfolders, 0, logPad, logLevel + 1);
                    /* istanbul ignore if */ /* istanbul ignore next */
                    if (util.isTaskFile(each2) && each2.isGroup && each2.groupLevel > 0)
                    {
                        for (const each3 of each2.treeNodes.filter(e => util.isTaskFile(e)))
                        {
                            this.removeTreeNodes(each3 as TaskFile, folder, subfolders, 0, logPad, logLevel + 1);
                        }
                    }
                }
            }
            else {
                this.removeTreeNodes(taskFile, folder, subfolders, 0, logPad, logLevel + 1);
            }
        }

        for (const each of taskTypesRmv)
        {
            folder.removeTaskFile(each, logPad + "   ");
        }

        log.methodDone("remove grouped tasks", logLevel, logPad);
    };


    /**
     * Perform some removal based on groupings with separator.  The nodes added within the new
     * group nodes need to be removed from the old parent node still...
     *
     * @param taskFile TaskFile instance to remove tasks from
     * @param folder Project task folder
     * @param subfolders Current tree subfolders map
     * @param level Current grouping level
     */
    private removeTreeNodes = (taskFile: ITaskFile, folder: TaskFolder, subfolders: IDictionary<TaskFile>, level: number, logPad: string, logLevel: number) =>
    {
        const me = this;
        const taskTypesRmv: (ITaskFile | ITaskItem)[] = [];
        const groupSeparator = util.getGroupSeparator();

        log.methodStart("remove tree nodes", logLevel, logPad, false);

        for (const each of taskFile.treeNodes)
        {   /* istanbul ignore if */
            if (!each.label) {
                continue;
            }
            const label = each.label.toString();

            const labelPart = label.split(groupSeparator)[level];
            const id = TaskFile.getGroupedId(folder, taskFile, label, level);

            if (each instanceof TaskItem)
            {
                if (label.split(groupSeparator).length > 1 && labelPart)
                {
                    if (subfolders[id])
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

        log.methodDone("remove tree nodes", logLevel, logPad);
    };


    private renameGroupedTasks = async(taskFile: TaskFile) =>
    {
        const groupStripTaskLabel = configuration.get<boolean>("groupStripTaskLabel", true);
        if (!groupStripTaskLabel || !taskFile.label) {
            return;
        }

        const groupSeparator = util.getGroupSeparator();
        let rmvLbl = taskFile.label as string;
        rmvLbl = rmvLbl.replace(/\(/gi, "\\(").replace(/\[/gi, "\\[");
        rmvLbl = rmvLbl.replace(/\)/gi, "\\)").replace(/\]/gi, "\\]");

        for (const each2 of taskFile.treeNodes.filter(n => !!n.label))
        {
            if (each2 instanceof TaskItem)
            {
                const rgx = new RegExp(rmvLbl + groupSeparator, "i");
                each2.label = (each2.label as string).replace(rgx, "");

                if (each2.groupLevel > 0)
                {
                    let label = "";
                    const labelParts = each2.label.split(groupSeparator);
                    for (let i = each2.groupLevel; i < labelParts.length; i++)
                    {
                        label += (label ? groupSeparator : "") + labelParts[i];
                    }
                    each2.label = label || /* istanbul ignore next */each2.label;
                }
            }
            else {
                await this.renameGroupedTasks(each2 as TaskFile);
            }
        }
    };


    // resolveTreeItem = (item: TreeItem, element: TaskItem | TaskFile | TaskFolder, token: CancellationToken): ProviderResult<TreeItem> =>
    // {
    //
    // };


    setEnabled = (enable: boolean, logPad: string) =>
    {
        log.methodStart("set tree enabled", 1, logPad, false, [[ "enable", enable ]]);
        if (enable !== this.enabled)
        {
            this.enabled = enable;
            if (!enable) {
                this.tasks = null;
                this.taskTree = null;
                this.taskMap = {};
            }
            else {
                this.setEnableCalled = enable;
                this.fireTreeRefreshEvent(logPad + "   ", 1);
            }
        }
        log.methodDone("set tree enabled", 1, logPad);
    };


    waitForRefreshComplete = async(maxWait = 15000, logPad = "   ") =>
    {
        let waited = 0;
        if (this.refreshPending) {
            log.write("waiting for previous refresh to complete...", 1, logPad);
        }
        while (this.refreshPending && waited < maxWait) {
            await util.timeout(250);
            waited += 250;
        }
    };

}
