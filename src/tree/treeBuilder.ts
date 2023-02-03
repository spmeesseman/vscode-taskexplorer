
import * as utils from "../lib/utils/utils";
import * as sortTasks from "../lib/sortTasks";
import log from "../lib/log/log";
import statusBarItem from "../lib/statusBarItem";
import TaskFolder from "./folder";
import TaskItem from "./item";
import { TaskTreeManager } from "./treeManager";
import { Disposable, Task, TreeItemCollapsibleState } from "vscode";
import { configuration } from "../lib/utils/configuration";
import SpecialTaskFolder from "./specialFolder";
import { IDictionary, ITaskTreeManager, TaskMap } from "../interface";
import TaskFile from "./file";
import { join } from "path";
import { NoScripts } from "../lib/noScripts";
import constants from "../lib/constants";
import { getTaskRelativePath } from "../lib/utils/pathUtils";

export default class TaskTreeBuilder implements Disposable
{
    private static treeBuilding = false;
    private static taskMap: TaskMap = {};
    private static taskTree: TaskFolder[] | NoScripts[] | undefined | null | void = null;

    private treeManager: ITaskTreeManager;
    private taskMap: TaskMap;
    private taskTree: TaskFolder[] | NoScripts[] | undefined | null | void = null;
    private specialFolders: { favorites: SpecialTaskFolder; lastTasks: SpecialTaskFolder };


    constructor(treeManager: ITaskTreeManager, specialFolders: { favorites: SpecialTaskFolder; lastTasks: SpecialTaskFolder })
    {
        this.treeManager = treeManager;
        this.specialFolders = specialFolders;
        this.taskMap = TaskTreeBuilder.taskMap;
        this.taskTree = TaskTreeBuilder.taskTree;
    }

    dispose()
    {
        this.taskMap = {};
        this.taskTree = null;
    }


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


    private buildTaskItemTree = async(logPad: string, logLevel: number): Promise<TaskFolder[] | NoScripts[]> =>
    {
        let taskCt = 0;
        const folders: IDictionary<TaskFolder> = {};
        const files: IDictionary<TaskFile> = {};
        let sortedFolders: TaskFolder[]|NoScripts[];
        const tasks = this.treeManager.getTasks();

        log.methodStart("build task tree", logLevel, logPad);

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
        for (const each of tasks)
        {
            log.blank(logLevel + 1);
            log.write(`   Processing task ${++taskCt} of ${ tasks.length} (${each.source})`, logLevel + 1, logPad);
            await this.buildTaskTreeList(each, folders, files, logPad + "   ");
        }

        if (!utils.isObjectEmpty(folders))
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
              relativePath = getTaskRelativePath(each);
        //
        // Set scope name and create the TaskFolder, a "user" task will have a TaskScope scope, not
        // a WorkspaceFolder scope.
        //
        if (utils.isWorkspaceFolder(each.scope))
        {
            scopeName = each.scope.name;
            folder = folders[scopeName];
            if (!folder)
            {
                folder = new TaskFolder(each.scope, nodeExpandedeMap[utils.lowerCaseFirstChar(scopeName, true)] !== false ?
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
                folder = new TaskFolder(scopeName, nodeExpandedeMap[utils.lowerCaseFirstChar(scopeName, true)] !== false ?
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
            const taskItem = new TaskItem(taskFile, each, logPad + "   ");
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


    createTaskItemTree = async(logPad: string, logLevel: number) =>
    {
        log.methodStart("create task tree", logLevel, logPad);
        TaskTreeBuilder.treeBuilding = true;
        statusBarItem.show();
        this.taskTree = await this.buildTaskItemTree(logPad + "   ", logLevel + 1);
        statusBarItem.update("Building task explorer tree");
        statusBarItem.hide();
        TaskTreeBuilder.treeBuilding = false;
        log.methodDone("create task tree", logLevel, logPad, [[ "current task count", this.treeManager.getTasks().length ]]);
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
                        subfolder = new TaskFile(folder, node.task.definition, taskFile.taskSource, taskFile.path, 0, id, undefined, "   ");
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
                subfolder.addTreeNode(taskFile);
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
        const groupSeparator = utils.getGroupSeparator();
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
            if (!each || !(each instanceof TaskItem) || !each.task || !each.label) {
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
                    subfolder = new TaskFile(folder, each.task.definition, taskFile.taskSource,
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
            taskFile = new TaskFile(folder, task.definition, task.source, relativePath, 0, undefined, undefined, logPad + "   ");
            await folder.addTaskFile(taskFile);
            files[id] = taskFile;
        }

        log.methodDone("get task file node", 2, logPad);
        return taskFile;
    };


    getTaskMap = () => this.taskMap;


    getTaskTree = () => this.taskTree;


    static getTaskMap = () => this.taskMap;


    invalidate  = () =>
    {
        this.taskMap = TaskTreeBuilder.taskMap = {};
        this.taskTree = TaskTreeBuilder.taskTree = null;
    };


    static isBusy = () => this.treeBuilding;


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
        if (utils.isWorkspaceFolder(task.scope))
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


    private removeGroupedTasks = (folder: TaskFolder, subfolders: IDictionary<TaskFile>, logPad: string, logLevel: number) =>
    {
        const taskTypesRmv: TaskFile[] = [];

        log.methodStart("remove grouped tasks", logLevel, logPad);

        for (const each of folder.taskFiles.filter(t => utils.isTaskFile(t) && !!t.label))
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
                    if (utils.isTaskFile(each2) && each2.isGroup && each2.groupLevel > 0)
                    {
                        for (const each3 of each2.treeNodes.filter(e => utils.isTaskFile(e)))
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
    private removeTreeNodes = (taskFile: TaskFile, folder: TaskFolder, subfolders: IDictionary<TaskFile>, level: number, logPad: string, logLevel: number) =>
    {
        const me = this;
        const taskTypesRmv: (TaskFile | TaskItem)[] = [];
        const groupSeparator = utils.getGroupSeparator();

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

        const groupSeparator = utils.getGroupSeparator();
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

}
