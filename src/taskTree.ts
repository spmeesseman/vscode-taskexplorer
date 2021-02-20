/* ---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as path from "path";
import * as util from "./util";
import * as assert from "assert";
import {
    Event, EventEmitter, ExtensionContext, Task, TaskDefinition, TaskRevealKind, TextDocument,
    TreeDataProvider, TreeItem, TreeItemCollapsibleState, Uri, TaskStartEvent, TaskEndEvent,
    commands, window, workspace, tasks, Selection, WorkspaceFolder, InputBoxOptions,
    ShellExecution, Terminal, StatusBarItem, StatusBarAlignment, CustomExecution
} from "vscode";
import { visit, JSONVisitor } from "jsonc-parser";
import * as nls from "vscode-nls";
import { TaskFolder, TaskFile, TaskItem } from "./tasks";
import { storage } from "./common/storage";
import { views } from "./views";
import { rebuildCache } from "./cache";
import { configuration } from "./common/configuration";
import { providers } from "./extension";
import { TaskExplorerProvider } from "./taskProvider";
import * as constants from "./common/constants";


const localize = nls.loadMessageBundle();


class NoScripts extends TreeItem
{
    constructor()
    {
        super(localize("noScripts", "No scripts found"), TreeItemCollapsibleState.None);
        this.contextValue = "noscripts";
    }
}


export class TaskTreeDataProvider implements TreeDataProvider<TreeItem>
{
    private static statusBarSpace: StatusBarItem;
    private tasks: Task[] = null;
    private treeBuilding = false;
    private busy = false;
    private extensionContext: ExtensionContext;
    private name: string;
    private needsRefresh: any[] = [];
    private taskTree: TaskFolder[] | TaskFile[] | NoScripts[] | null = null;
    private currentInvalidation: string;
    private _onDidChangeTreeData: EventEmitter<TreeItem | null> = new EventEmitter<TreeItem | null>();
    readonly onDidChangeTreeData: Event<TreeItem | null> = this._onDidChangeTreeData.event;


    constructor(name: string, context: ExtensionContext)
    {
        const subscriptions = context.subscriptions;
        this.extensionContext = context;
        this.name = name;

        subscriptions.push(commands.registerCommand(name + ".run",  async (item: TaskItem) => { await this.run(item); }, this));
        subscriptions.push(commands.registerCommand(name + ".runNoTerm",  async (item: TaskItem) => { await this.run(item, true, false); }, this));
        subscriptions.push(commands.registerCommand(name + ".runWithArgs",  async (item: TaskItem) => { await this.run(item, false, true); }, this));
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
        subscriptions.push(commands.registerCommand(name + ".addToExcludes", async (taskFile: TaskFile | string, global: boolean, prompt: boolean) => { await this.addToExcludes(taskFile, global, prompt); }, this));
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
        const favTasks = storage.get<string[]>(constants.FAV_TASKS_STORE, []) || [];
        const favId = this.getTaskItemId(taskItem);

        util.logMethodStart("add/remove favorite", 1);

        if (!taskItem) {
            return;
        }

        util.logValue("   id", taskItem.id, 2);
        util.logValue("   current fav count", favTasks.length, 2);

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
            util.logValue("   new fav count", favTasks.length, 2);
            //
            // Update local storage for persistence
            //
            await storage.update(constants.FAV_TASKS_STORE, favTasks);
            //
            // Update
            //
            this.showSpecialTasks(true, true, null, "   ");
        }

        util.logMethodDone("add/remove favorite", 1);
    }


    private async addToExcludes(selection: TaskFile | string, global?: boolean, prompt?: boolean)
    {
        const me = this;
        let uri: Uri | undefined;
        let pathValue = "";

        if (selection instanceof TaskFile)
        {
            uri = selection.resourceUri;
            if (!uri && !selection.isGroup)
            {
                return;
            }
        }

        util.logMethodStart("add to excludes", 1, "", [[ "global", global ]]);

        if (selection instanceof TaskFile)
        {
            if (selection.isGroup)
            {
                util.log("  file group");
                pathValue = "";
                for (const each of selection.scripts)
                {
                    pathValue += each.resourceUri.path;
                    pathValue += ",";
                }
                if (pathValue) {
                    pathValue = pathValue.substring(0, pathValue.length - 1);
                }
            }
            else
            {
                util.logValue("  file glob", uri.path);
                pathValue = uri.path;
            }
        }
        else {
            pathValue = selection;
        }

        if (!pathValue) {
            return;
        }
        util.logValue("   path value", pathValue, 2);

        const saveExclude = async (str: string) =>
        {
            if (str)
            {
                let excludes: string[] = [];
                const excludes2 = configuration.get<string[]>("exclude");
                if (excludes2 && excludes2 instanceof Array) {
                    excludes = excludes2;
                }
                else if (typeof excludes2 === "string") {
                    excludes.push(excludes2);
                }
                const strs = str.split(",");
                for (const s in strs) {
                    if (strs.hasOwnProperty(s)) { // skip properties inherited from prototype
                        util.pushIfNotExists(excludes, strs[s]);
                    }
                }
                if (global !== false) {
                    configuration.update("exclude", excludes);
                }
                else {
                    configuration.updateWs("exclude", excludes);
                }
                await me.refresh(selection instanceof TaskFile ? selection.taskSource : false, uri);
            }
        };

        if (selection instanceof TaskFile && prompt !== false)
        {
            const opts: InputBoxOptions = { prompt: "Add the following file to excluded tasks list?", value: pathValue };
            window.showInputBox(opts).then(async str =>
            {
                await saveExclude(str);
            });
        }
        else {
            await saveExclude(pathValue);
        }

        util.logMethodDone("add to excludes", 1);
    }


    private addToSpecialFolder(taskItem: TaskItem, folder: any, tasks: string[], label: string)
    {
        if (taskItem && folder && tasks && label && tasks.includes(taskItem.id))
        {
            const taskItem2 = new TaskItem(this.extensionContext, taskItem.taskFile, taskItem.task);
            taskItem2.id = label + ":" + taskItem2.id;
            taskItem2.label = this.getSpecialTaskName(taskItem2);
            folder.insertTaskFile(taskItem2, 0);
        }
    }


    private async buildGroupings(folders: Map<string, TaskFolder>, logPad = "")
    {
        util.logMethodStart("build tree node groupings", 1, logPad);

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

        util.logMethodDone("build tree node groupings", 1, logPad);
    }


    private async buildTaskTree(tasksList: Task[], logPad = ""): Promise<TaskFolder[] | NoScripts[]>
    {
        let taskCt = 0;
        const folders: Map<string, TaskFolder> = new Map();
        const files: Map<string, TaskFile> = new Map();
        let ltfolder: TaskFolder = null,
            favfolder: TaskFolder = null;

        util.logMethodStart("build task tree", 1, logPad, null, util.LogColor.cyan);
        this.treeBuilding = true;

        //
        // The 'Last Tasks' folder will be 1st in the tree
        //
        const lastTasks = storage.get<string[]>(constants.LAST_TASKS_STORE, []) || [];
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
        const favTasks = storage.get<string[]>(constants.FAV_TASKS_STORE, []) || [];
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
            taskCt++;
            util.logBlank(1);
            util.log(logPad + "   Processing task " + (++taskCt).toString() + " of " + tasksList.length.toString(), 1, util.LogColor.cyan);
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
        util.logMethodDone("build task tree", 1, logPad);
        this.treeBuilding = false;

        return sortedFolders;
    }


    private buildTaskTreeList(each: Task, folders: Map<string, TaskFolder>, files: Map<string, TaskFile>, ltfolder: TaskFolder, favfolder: TaskFolder, lastTasks: string[], favTasks: string[], logPad = "")
    {
        let folder: TaskFolder,
            taskFile: TaskFile = null,
            scopeName: string;

        util.logMethodStart("build task tree list", 2, logPad, [
            [ "name", each.name ], [ "source", each.source ], [ "scope", each.scope ], [ "scope", each.scope ],
            [ "definition type", each.definition.type ], [ "definition path", each.definition.path ]
        ]);

        const definition: TaskDefinition = each.definition;
        let relativePath = definition.path ? definition.path : "";

        //
        // Make sure this task shouldnt be ignored based on various criteria...
        // Process only if this task type/source is enabled in settings or is scope is empty (VSCode provided task)
        // By default, also ignore npm 'install' tasks, since its available in the context menu
        //
        const include: any = this.isTaskIncluded(each, relativePath, logPad);
        if (!include) {
            util.logMethodDone("build task tree list", 2, logPad);
            return;
        }

        if (typeof include === "string") { // TSC tasks may have had their rel. pathchanged
            relativePath = include;
            util.logValue(logPad + "   set relative path", relativePath, 2);
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
        // Get task file node
        //
        taskFile = this.getTaskFileNode(each, folder, files, relativePath, scopeName, logPad);

        //
        // Create and add task item to task file node
        //
        const taskItem = new TaskItem(this.extensionContext, taskFile, each);
        taskFile.addScript(taskItem);

        //
        // Add this task to the 'Last Tasks' folder if we need to
        //
        this.addToSpecialFolder(taskItem, ltfolder, lastTasks, constants.LAST_TASKS_LABEL);
        //
        // Add this task to the 'Favorites' folder if we need to
        //
        this.addToSpecialFolder(taskItem, favfolder, favTasks, constants.FAV_TASKS_LABEL);

        util.logMethodDone("build task tree list", 2, logPad);
    }


    private async clearSpecialFolder(folder: TaskFolder)
    {
        const choice = await window.showInformationMessage("Clear all tasks from this folder?", "Yes", "No");
        if (choice === "Yes")
        {
            if (folder.label === constants.FAV_TASKS_LABEL) {
                await storage.update(constants.FAV_TASKS_STORE, "");
                await this.showSpecialTasks(false, true);
            }
            else if (folder.label === constants.LAST_TASKS_LABEL) {
                await storage.update(constants.LAST_TASKS_STORE, "");
                await this.showSpecialTasks(false);
            }
        }
    }


    private async createSpecialFolder(storeName: string, label: string, treeIndex: number, sort: boolean, logPad = "")
    {
        const lTasks = storage.get<string[]>(storeName, []) || [];
        const folder = new TaskFolder(label);

        util.logMethodStart("create special tasks folder", 1, logPad, [
            [ "store",  storeName ], [ "name",  label ]
        ]);

        this.taskTree.splice(treeIndex, 0, folder);

        for (const tId of lTasks)
        {
            const taskItem2 = await this.getTaskItems(tId);
            if (taskItem2 && taskItem2 instanceof TaskItem)
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

        util.logMethodDone("create special tasks folder", 1, logPad);
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
        let prevTaskFile: TaskItem | TaskFile;
        const subfolders: Map<string, TaskFile> = new Map();

        util.logMethodStart("create tree node folder grouping", 1, logPad, [[ "project folder", folder.label ]]);

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
                let subfolder: TaskFile = subfolders.get(id);
                if (!subfolder)
                {
                    util.logValue(logPad + "   Add source file sub-container", each.path, 3);
                    subfolder = new TaskFile(this.extensionContext, folder, (each.scripts[0] as TaskItem).task.definition,
                                             each.taskSource, each.path, 0, true, undefined, "   ");
                    subfolders.set(id, subfolder);
                    folder.addTaskFile(subfolder);
                    //
                    // Since we add the grouping when we find two or more equal group names, we are iterating
                    // over the 2nd one at this point, and need to add the previous iteration's TaskItem to the
                    // new group just created
                    //
                    subfolder.addScript(prevTaskFile); // addScript will set the group level on the TaskItem
                }
                subfolder.addScript(each); // addScript will set the group level on the TaskItem
            }
            prevTaskFile = each;
            //
            // Create the grouping
            //
            util.logValue(logPad + "   folder", folder.label, 3);
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
        util.log(logPad + "   rename grouped tasks", 1);
        for (const each of folder.taskFiles)
        {
            if (!(each instanceof TaskFile)) {
                continue;
            }
            await this.renameGroupedTasks(each);
        }

        //
        // Resort after making adds/removes
        //
        await this.sortFolder(folder, logPad + "   ");

        util.logMethodDone("create tree node folder grouping", 1, logPad);
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
        let prevName: string[];
        let prevTaskItem: TaskItem;
        const newNodes: TaskFile[] = [];
        const groupSeparator = util.getGroupSeparator();
        const atMaxLevel: boolean = configuration.get<number>("groupMaxLevel") <= treeLevel + 1;

        util.logMethodStart("create task groupings by defined separator", 2, logPad, [
            [ "label (node name)", taskFile.label ], [ "grouping level", treeLevel ], [ "is group", taskFile.isGroup ],
            [ "file name", taskFile.path ], [ "folder", folder.label ], [ "path", taskFile.path ]
        ]);

        const _setNodePath = (t: TaskItem, cPath: string) =>
        {
            if (!atMaxLevel) {
                if (!t.nodePath && taskFile.taskSource === "Workspace") {
                    t.nodePath = path.join(".vscode", prevName[treeLevel]);
                }
                else if (!t.nodePath) {
                    t.nodePath = prevName[treeLevel];
                }
                else {
                    t.nodePath = path.join(cPath, prevName[treeLevel]);
                }
            }
        };

        for (const each of taskFile.scripts)
        {
            if (!(each instanceof TaskItem)) {
                continue;
            }
            const label = each.label.toString();
            let subfolder: TaskFile;
            const prevNameThis = label.split(groupSeparator);

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
            if (prevName && prevName.length > treeLevel && prevName[treeLevel] && prevNameThis.length > treeLevel)
            {
                for (let i = 0; i <= treeLevel; i++)
                {
                    if (prevName[i] === prevNameThis[i]) {
                        foundGroup = true;
                    }
                    else {
                        foundGroup = false;
                        break;
                    }
                }
            }

            if (foundGroup)
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
                    subfolder.addScript(prevTaskItem); // addScript will set the group level on the TaskItem
                    newNodes.push(subfolder);
                }

                _setNodePath(each, each.nodePath);
                subfolder.addScript(each); // addScript will set the group level on the TaskItem
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
                taskFile.insertScript(n, numGrouped++);
                if (!atMaxLevel)
                {   //
                    // TODO !!!
                    // Ref ticket #133
                    // VSCode Tasks - Bug, something to do with "relativepath" of the acutal task being empty,
                    // but in this extension we user /.vcsode as the path, cant go deeper then one level, for
                    // now until I can find time to look at more
                    //
                    if (n.taskSource === "Workspace") {
                        continue;
                    }
                    await this.createTaskGroupingsBySep(folder, n, subfolders, treeLevel + 1, logPad + "   ");
                }
            }
        }

        util.logMethodDone("create task groupings by defined separator", 2, logPad);
    }


    private findScriptPosition(document: TextDocument, script?: TaskItem): number
    {
        let scriptOffset = 0;
        const documentText = document.getText();

        util.log("findScriptPosition");
        util.logValue("   task source", script.taskSource);
        util.logValue("   task name", script.task.name);

        if (script.taskSource === "ant")
        {
            scriptOffset = this.findScriptPositionAnt(script.task.name, documentText);
        }
        else if (script.taskSource === "gulp")
        {
            scriptOffset = this.findScriptPositionGulp(script.task.name, documentText);
        }
        else if (script.taskSource === "grunt")
        {
            scriptOffset = this.findScriptPositionLine("grunt.registerTask(", script.task.name, documentText);
        }
        else if (script.taskSource === "make")
        {
            scriptOffset = this.findScriptPositionMake(script.task.name, documentText);
        }
        else if (script.taskSource === "npm" || script.taskSource === "Workspace")
        {
            scriptOffset = this.findScriptPositionJson(documentText, script);
        }
        else
        {
            util.log("   Does not support task find, file open only");
        }

        if (scriptOffset === -1)
        {
            scriptOffset = 0;
        }

        util.logValue("   Offset", scriptOffset);
        return scriptOffset;
    }


    private findScriptPositionAnt(scriptName: string, documentText: string): number
    {
        scriptName = scriptName.replace(" - Default", "");
        let idx = this.findScriptPositionLine("name=", scriptName, documentText, 6);
        if (idx > 0)
        {   //
            // Check to make sure this isnt the 'default task' position,i.e.:
            //
            //     <project basedir="." default="test-build">
            //
            const scriptOffset2 = this.findScriptPositionLine("name=", scriptName, documentText, 6, idx + 1);
            if (scriptOffset2 > 0) {
                idx = scriptOffset2;
            }
        }
        return idx;
    }


    private findScriptPositionJson(documentText: string, script?: TaskItem)
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
                            if (script.task.name === value)
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
                    if (!script)
                    { // select the script section
                        scriptOffset = offset;
                    }
                }
                else if (inScripts && script)
                {
                    const label = me.getTaskName(property, script.task.definition.path, true);
                    if (script.task.name === label)
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


    private findScriptPositionLine(lineName: string, scriptName: string, documentText: string, advance = 0, start = 0, skipQuotes = false): number
    {   //
        // TODO - This is crap, use regex to detect spaces between quotes
        //
        let idx = documentText.indexOf(lineName + (!skipQuotes ? "\"" : "") + scriptName + (!skipQuotes ? "\"" : ""), start);
        if (idx === -1)
        {
            idx = documentText.indexOf(lineName + (!skipQuotes ? "'" : "") + scriptName + (!skipQuotes ? "'" : ""), start);
        }
        if (advance !== 0 && idx !== -1)
        {
            idx += advance;
        }
        return idx;
    }


    private findScriptPositionGulp(scriptName: string, documentText: string): number
    {
        let idx = this.findScriptPositionLine("gulp.task(", scriptName, documentText);
        if (idx === -1) {
            idx = this.findScriptPositionLine("exports[", scriptName, documentText);
        }
        if (idx === -1) {
            idx = this.findScriptPositionLine("exports.", scriptName, documentText, 0, 0, true);
        }
        return idx;
    }


    private findScriptPositionMake(scriptName: string, documentText: string): number
    {
        let idx = documentText.indexOf(scriptName + ":");
        if (idx === -1)
        {
            idx = documentText.indexOf(scriptName);
            let bLine = documentText.lastIndexOf("\n", idx) + 1;
            let eLine = documentText.indexOf("\n", idx);
            if (eLine === -1) { eLine = documentText.length; }
            let line = documentText.substring(bLine, eLine).trim();
            while (bLine !== -1 && bLine !== idx && idx !== -1 && line.indexOf(":") === -1)
            {
                idx = documentText.indexOf(scriptName, idx + 1);
                bLine = documentText.lastIndexOf("\n", idx) + 1;
                eLine = documentText.indexOf("\n", idx);
                if (bLine !== -1)
                {
                    if (eLine === -1) { eLine = documentText.length; }
                    line = documentText.substring(bLine, eLine).trim();
                }
            }
        }
        return idx;
    }


    private fireTaskChangeEvents(taskItem: TaskItem)
    {
        if (!this.taskTree || !taskItem) {
            util.logError("task change event fire, invalid argument");
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
            const lastTasks = storage.get<string[]>(constants.LAST_TASKS_STORE, []) || [];
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
        const favTasks = storage.get<string[]>(constants.FAV_TASKS_STORE, []) || [];
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

        util.logBlank(1);
        util.log(logPad + "get tree children", 1);
        util.logValue(logPad + "   task folder", element?.label, 1);
        util.logValue(logPad + "   all tasks need to be retrieved", !this.tasks, 2);
        util.logValue(logPad + "   specific tasks need to be retrieved", !!this.currentInvalidation, 2);
        if (this.currentInvalidation) {
            util.logValue(logPad + "      current invalidation", this.currentInvalidation, 2);
        }
        util.logValue(logPad + "   task tree needs to be built", !this.taskTree, 2);

        //
        // The vscode task engine processing will call back in multiple time while we are awaiting
        // the call to buildTaskTree().  This occurs on the await of buildGroupings() in buildTaskTree.
        // To prevent bad. things. happening. sleep the call here until the tree has finished building.
        // This "could"" be prevented by re-implementing the tree the "right way", where we dont build the
        // whole tree if it doesnt exist and build it node by node as theyare expanded, but, because we
        // have 'LastTasks' and 'Favorites', we need to load everything.  Oh well.
        //
        while (this.treeBuilding) {
            util.log(logPad + "   waiting...", 1);
            await util.timeout(100);
            waited += 100;
        }
        if (waited) {
            util.log(logPad + "   waited " + waited + " ms", 1);
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
                util.logBlank(1);
                if (this.taskTree.length === 0)
                {
                    this.taskTree = [new NoScripts()];
                }
            }
        }

        if (element instanceof TaskFolder)
        {
            util.log(logPad + "   Get folder task files", 2);
            items = element.taskFiles;
        }
        else if (element instanceof TaskFile)
        {
            util.log(logPad + "   Get file tasks/scripts", 2);
            items = element.scripts;
        }
        else if (!element)
        {
            util.log(logPad + "   Get task tree", 1);
            if (this.taskTree)
            {
                items = this.taskTree;
            }
        }

        util.logBlank(1);
        util.log(logPad + "completed get tree children", 1);

        this.currentInvalidation = null; // reset file modification task type flag
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
            return a.label?.localeCompare(b.label?.toString());
        });
    }


    private getSpecialTaskName(taskItem: TaskItem)
    {
        return taskItem.label + " (" + taskItem.taskFile.folder.label + " - " + taskItem.taskSource + ")";
    }


    public async getTaskItems(taskId: string, logPad = "", executeOpenForTests = false): Promise<Map<string, TaskItem> | TaskItem>
    {
        const me = this;
        const taskMap: Map<string, TaskItem> = new Map();
        let done = false;

        util.log(logPad + "Get task tree items, start task tree scan");
        util.logValue(logPad + "   task id", taskId ? taskId : "all tasks");
        util.logValue(logPad + "   execute open", executeOpenForTests.toString());

        const treeItems = await this.getChildren(undefined, "   ");
        if (!treeItems || treeItems.length === 0)
        {
            window.showInformationMessage("No tasks found!");
            await storage.update(constants.FAV_TASKS_STORE, []);
            await storage.update(constants.LAST_TASKS_STORE, []);
            return;
        }

        if (!treeItems || treeItems.length === 0)
        {
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
                        util.log("        Task File (grouped): " + item2.path + item2.fileName);
                        await processItem2g(item2);
                    }
                    else if (item2 instanceof TaskFile && !item2.isGroup)
                    {
                        util.log("        Task File (grouped): " + item2.path + item2.fileName);
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

                            util.log(logPad + "   ✔ Processed " + item3.task.name);
                            util.logValue(logPad + "        id", item3.id);
                            util.logValue(logPad + "        type", item3.taskSource + " @ " + tpath);
                            taskMap.set(item3.id, item3);
                            if (taskId && taskId === item3.id) {
                                done = true;
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
                        util.log(logPad + "   Task File: " + item2.path + item2.fileName);
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
                const isFav = item.label.includes(constants.FAV_TASKS_LABEL);
                const isLast = item.label.includes(constants.LAST_TASKS_LABEL);
                const isUser = item.label.includes(constants.USER_TASKS_LABEL);
                const tmp: any = me.getParent(item);
                assert(tmp === null, "Invaid parent type, should be null for TaskFolder");
                util.log(logPad + "Task Folder " + item.label + ":  " + (!isFav && !isLast && !isUser ?
                         item.resourceUri.fsPath : (isLast ? constants.LAST_TASKS_LABEL :
                            (isUser ? constants.USER_TASKS_LABEL : constants.FAV_TASKS_LABEL))));
                await processItem(item);
            }
        }

        util.log(logPad + "   finished task tree scan");
        util.logValue(logPad + "   # of items found", taskMap.keys.length, 2);

        if (taskId) {
            return taskMap.get(taskId);
        }
        return taskMap;
    }


    private getTaskName(script: string, relativePath: string | undefined, forcePathInName?: boolean)
    {
        if (relativePath && relativePath.length && forcePathInName === true)
        {
            return `${script} - ${relativePath.substring(0, relativePath.length - 1)}`;
        }
        return script;
    }


    private getTaskFileNode(task: Task, folder: TaskFolder, files: any, relativePath: string, scopeName: string, logPad = ""): TaskFile
    {
        let taskFile: TaskFile;

        let id = task.source + ":" + path.join(scopeName, relativePath);
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
            util.logValue(logPad + "   Add source file container", task.source);
            taskFile = new TaskFile(this.extensionContext, folder, task.definition, task.source, relativePath, 0, false, null, logPad);
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


    private getTerminal(taskItem: TaskItem): Terminal | null
    {
        const me = this;
        let checkNum = 0;
        let term: Terminal = null;

        util.log("Get terminal", 1);

        if (!window.terminals || window.terminals.length === 0)
        {
            util.log("   zero terminals alive", 2);
            return term;
        }

        if (window.terminals.length === 1)
        {
            util.log("   return only terminal alive", 2);
            return window.terminals[0];
        }

        const check = (taskName: string) =>
        {
            let termNum = 0,
                term2: Terminal = null;
            util.logValue("   Checking possible task terminal name #" + (++checkNum).toString(), taskName, 2);
            for (const t of window.terminals)
            {
                util.logValue("      == terminal " + (++termNum) + " name", t.name, 2);
                if (taskName.toLowerCase().replace("task - ", "").indexOf(t.name.toLowerCase().replace("task - ", "")) !== -1)
                {
                    term2 = t;
                    util.log("   found!", 2);
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
            taskName = taskItem.getFolder().name + " (" + relPath + ")";
            term = check(taskName);
        }

        if (!term)
        {
            taskName = taskItem.getFolder().name + " (" + path.basename(relPath) + ")";
            term = check(taskName);
        }

        return term;
    }


    public getTreeItem(element: TaskItem | TaskFile | TaskFolder): TreeItem
    {
        util.logBlank(3);
        util.log("get tree item", 3);
        util.logValue("   label", element?.label, 3);
        if (element instanceof TaskItem) {
            util.log("   refresh task item state", 3);
            element.refreshState();
        }
        return element;
    }


    private async handleFileWatcherEvent(invalidate: any, opt?: boolean | Uri)
    {
        util.log("   handling FileWatcher / settings change / test event");
        //
        // invalidate=true means the refresh button was clicked (opt will be false)
        // invalidate="tests" means this is being called from unit tests (opt will be undefined)
        //
        if ((invalidate === true || invalidate === "tests") && !opt) {
            util.log("   Handling 'rebuild cache' event", 1);
            this.busy = true;
            await rebuildCache();
            util.log("   Handling 'rebuild cache' eventcomplete", 1);
            this.busy = false;
        }
        //
        // If this is not from unit testing, then invalidate the appropriate task cache/file
        //
        if (invalidate !== "tests") {
            util.log("   handling 'invalidate tasks cache' event");
            await this.invalidateTasksCache(invalidate, opt);
        }
    }


    private async handleVisibleEvent()
    {
        util.log("   handling 'visible' event");
        if (this.needsRefresh && this.needsRefresh.length > 0)
        {   //
            // If theres more than one pending refresh request, just refresh the tree
            //
            if (this.needsRefresh.length > 1 || this.needsRefresh[0].invalidate === undefined)
            {
                await this.refresh();
            }
            else
            {
                await this.refresh(this.needsRefresh[0].invalidate, this.needsRefresh[0].uri);
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
    public async invalidateTasksCache(opt1: string, opt2?: Uri | boolean)
    {
        util.logBlank(1);
        util.log("Invalidate tasks cache", 1);
        util.logValue("   opt1", opt1, 2);
        util.logValue("   opt2", opt2 && opt2 instanceof Uri ? opt2.fsPath : opt2, 2);

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
            util.log("   invalidate " + opt1 + " provider file ", 1);
            util.logValue("      file", opt2, 1);
            const provider = providers.get(util.getScriptProviderType(opt1));
            await provider?.invalidateTasksCache(opt2); // NPM/Workspace tasks don't implement TaskExplorerProvider
        }
        else { // If opt1 is undefined, refresh all providers
            if (!opt1) {
                util.log("   invalidate all providers", 1);
                for (const [ key, p ] of providers)
                {
                    util.log("   invalidate " + key + " provider", 1);
                    await p.invalidateTasksCache();
                }
            }
            else {
                util.log("   invalidate " + opt1 + " provider", 1);
                await providers.get(opt1)?.invalidateTasksCache();  // NPM/Workspace tasks don't implement TaskExplorerProvider
            }
        }

        util.log("Invalidate tasks cache complete", 1);
        this.busy = false;
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

        if ((configuration.get(settingName) || !this.isWorkspaceFolder(task.scope)) && !this.isNpmInstallTask(task))
        {
            return true;
        }

        util.log(logPad + "   Skipping", 1);
        util.logValue(logPad + "   enabled", configuration.get(settingName), 1);
        util.logValue(logPad + "   is npm install task", this.isNpmInstallTask(task), 1);

        return false;
    }


    private isWorkspaceFolder(value: any): value is WorkspaceFolder
    {
        return value && typeof value !== "number";
    }


    private logTask(task: Task, scopeName: string, logPad = "")
    {
        const definition = task.definition;

        if (!util.isLoggingEnabled()) {
            return;
        }

        util.logValue(logPad + "name", task.name, 2);
        util.logValue(logPad + "source", task.source, 2);
        util.logValue(logPad + "scopeName", scopeName, 3);
        util.logValue(logPad + "scope.name", scopeName, 3);
        if (this.isWorkspaceFolder(task.scope))
        {
            util.logValue(logPad + "scope.uri.path", task.scope.uri.path, 3);
            util.logValue(logPad + "scope.uri.fsPath", task.scope.uri.fsPath, 3);
        }
        else // User tasks
        {
            util.logValue(logPad + "scope.uri.path", "N/A (User)", 3);
        }
        util.logValue(logPad + "relative Path", definition.path ? definition.path : "", 3);
        util.logValue(logPad + "type", definition.type, 3);
        if (definition.scriptType)
        {
            util.logValue(logPad + "   script type", definition.scriptType, 3);	// if 'script' is defined, this is type npm
        }
        if (definition.scriptFile)
        {
            util.logValue(logPad + "   script file", definition.scriptFile, 3);	// if 'script' is defined, this is type npm
        }
        if (definition.script)
        {
            util.logValue(logPad + "script", definition.script, 3);	// if 'script' is defined, this is type npm
        }
        if (definition.path)
        {
            util.logValue(logPad + "path", definition.path, 3);
        }
        //
        // Internal task providers will set a fileName property
        //
        if (definition.fileName)
        {
            util.logValue(logPad + "file name", definition.fileName, 3);
        }
        //
        // Internal task providers will set a uri property
        //
        if (definition.uri)
        {
            util.logValue(logPad + "file path", definition.uri.fsPath, 3);
        }
        //
        // Script task providers will set a fileName property
        //
        if (definition.takesArgs)
        {
            util.logValue(logPad + "script requires args", "true", 3);
        }
        if (definition.cmdLine)
        {
            util.logValue(logPad + "script cmd line", definition.cmdLine, 3);
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
            util.log("Open script at position");
            util.logValue("   command", selection.command.command);
            util.logValue("   source", selection.taskSource);
            util.logValue("   uri path", uri.path);
            util.logValue("", uri.fsPath);

            if (util.pathExists(uri.fsPath))
            {
                const document: TextDocument = await workspace.openTextDocument(uri);
                const offset = this.findScriptPosition(document, selection instanceof TaskItem ? selection : undefined);
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

        if (taskItem.execution)
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
        let taskItem2: TaskItem;
        const ltfolder = this.taskTree[treeIndex] as TaskFolder;
        const taskId = label + ":" + this.getTaskItemId(taskItem);

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

        util.logValue(logPad + "   add item", taskItem2.id, 2);
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
    public async refresh(invalidate?: any, opt?: Uri | boolean): Promise<boolean>// , skipAskTasks?: boolean): Promise<boolean>
    {
        util.logBlank(1);
        util.log("Refresh task tree", 1);
        util.logValue("   from view", this.name, 2);
        util.logValue("   invalidate", invalidate, 2);
        util.logValue("   opt fsPath", opt && opt instanceof Uri ? opt.fsPath : "n/a", 2);

        //
        // If a view was turned off in settings, the disposable view still remains and will still
        // receive events.  If this view is hidden/disabled, then nothing to do right now, save the
        // event paramters to process later.
        //
        if (this.taskTree && views.get(this.name) && invalidate !== "tests")
        {
            if (!views.get(this.name).visible ||
                !configuration.get<boolean>(this.name === "taskExplorer" ? "enableExplorerView" : "enableSideBar"))
            {
                util.log("   Delay refresh, exit");
                util.pushIfNotExists(this.needsRefresh, { invalidate, opt });
                return false;
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
                    await this.handleVisibleEvent();
                }, 1);
                return;
            }
            invalidate = undefined;
        }

        if (invalidate !== false) // if anything but 'add to excludes'
        {
            await this.handleFileWatcherEvent(invalidate, opt);
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
            this._onDidChangeTreeData.fire(undefined); // see todo above // task.definition.treeItem
        }                                              // not sure if its even possible
        else //
        {   // Re-ask for all tasks from all providers and rebuild tree
            //
            this.tasks = null; // !skipAskTasks ? null : this.tasks;
            this.taskTree = null;
            this._onDidChangeTreeData.fire(undefined);
        }

        util.log("Refresh task tree finished");
        return true;
    }


    private removeGroupedTasks(folder: TaskFolder, subfolders: Map<string, TaskFile>, logPad = "")
    {
        const taskTypesRmv: TaskFile[] = [];

        util.log(logPad + "remove grouped tasks", 1);

        for (const each of folder.taskFiles)
        {
            if (!(each instanceof TaskFile)) {
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
                for (const each2 of each.scripts)
                {
                    this.removeScripts(each2 as TaskFile, folder, subfolders);
                    if (each2 instanceof TaskFile && each2.isGroup && each2.groupLevel > 0)
                    {
                        for (const each3 of each2.scripts)
                        {
                            if (each3 instanceof TaskFile)
                            {
                                this.removeScripts(each3, folder, subfolders);
                            }
                        }
                    }
                }
            }
            else {
                this.removeScripts(each, folder, subfolders);
            }
        }

        for (const each of taskTypesRmv)
        {
            folder.removeTaskFile(each);
        }
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
    private removeScripts(taskFile: TaskFile, folder: TaskFolder, subfolders: Map<string, TaskFile>, level = 0)
    {
        const me = this;
        const taskTypesRmv: (TaskItem|TaskFile)[] = [];
        const groupSeparator = util.getGroupSeparator();

        for (const each of taskFile.scripts)
        {
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
                for (const each2 of each.scripts)
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
                    me.removeScripts(each, folder, subfolders, level + 1);
                }
            }
        }

        for (const each2 of taskTypesRmv)
        {
            taskFile.removeScript(each2);
        }
    }


    private async renameGroupedTasks(taskFile: TaskFile)
    {
        if (!configuration.get<boolean>("groupStripTaskLabel", true)) {
            return;
        }

        const groupSeparator = util.getGroupSeparator();
        let rmvLbl = taskFile.label.toString();
        rmvLbl = rmvLbl.replace(/\(/gi, "\\(").replace(/\[/gi, "\\[");
        rmvLbl = rmvLbl.replace(/\)/gi, "\\)").replace(/\]/gi, "\\]");

        for (const each2 of taskFile.scripts)
        {
            if (each2 instanceof TaskItem)
            {
                const rgx = new RegExp(rmvLbl + groupSeparator, "i");
                each2.label = each2.label.toString().replace(rgx, "");

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
            return;
        }

        this.stop(taskItem);
        await this.run(taskItem);
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
    private async run(taskItem: TaskItem, noTerminal = false, withArgs = false)
    {
        if (!taskItem || this.busy)
        {
            window.showInformationMessage("Busy, please wait...");
            return;
        }
        util.log("run task", 1);
        util.logValue("   task name", taskItem.label, 2);
        if (withArgs === true)
		{
            await this.runWithArgs(taskItem);
		}
        else if (taskItem.paused)
        {
            await this.resumeTask(taskItem);
        }
        else //
        {   // Create a new instance of 'task' if this is to be ran with no termainl (see notes below)
            //
            let newTask = taskItem.task;
            if (noTerminal)
            {   //
                // For some damn reason, setting task.presentationOptions.reveal = TaskRevealKind.Silent or
                // task.presentationOptions.reveal = TaskRevealKind.Never does not work if we do it on the task
                // that was instantiated when the providers were asked for tasks.  If we create a new instance
                // here, same exact task, then it works.  Same kind of thing with running with args, but in that
                // case I can understand it because a new execution class has to be instantiated with the command
                // line arguments.  In this case, its simply a property task.presentationOption on an instantiated
                // task.  No idea.  But this works fine for now.
                //
                const def = taskItem.task.definition;
                const p = providers.get(util.getScriptProviderType(def.type));
                newTask = p.createTask(def.target, null, taskItem.getFolder(), def.uri);
                //
                // Since this task doesnt belong to a treeItem, then set the treeItem id that represents
                // an instance of this task.
                //
                newTask.definition.taskItemId = def.taskItemId;
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

        let lastTaskId: string;
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

        util.logValue("Run last task", lastTaskId);

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
            const execution = new ShellExecution(pkgMgr + " " + command, options);
            const task = new Task(kind, taskFile.folder.workspaceFolder, command, "npm", execution, undefined);
            await tasks.executeTask(task);
        }
        else
        {
            const opts: InputBoxOptions = { prompt: "Enter package name to " + command };
            await window.showInputBox(opts).then(async (str) =>
            {
                if (str !== undefined)
                {
                    const execution = new ShellExecution(pkgMgr + " " + command.replace("<packagename>", "").trim() + " " + str.trim(), options);
                    const task = new Task(kind, taskFile.folder.workspaceFolder, command.replace("<packagename>", "").trim() + str.trim(), "npm", execution, undefined);
                    await tasks.executeTask(task);
                }
            });
        }
    }


    private async runTask(task: Task, noTerminal?: boolean): Promise<boolean>
    {
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
            util.log("Task execution failed: " + err);
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
    private async runWithArgs(taskItem: TaskItem, noTerminal?: boolean)
    {
        if (!(taskItem.task.execution instanceof CustomExecution))
        {
            const me = this;
            const opts: InputBoxOptions = { prompt: "Enter command line arguments separated by spaces"};
            window.showInputBox(opts).then(async (str) =>
            {
                if (str !== undefined)
                {
                    let newTask: Task = taskItem.task;
                    if (str) {
                        const def = taskItem.task.definition;
                        newTask = providers.get("script").createTask(def.script, null,
                                                                     taskItem.getFolder(), def.uri, str.trim().split(" "));
                        //
                        // Since this task doesnt belong to a treeItem, then set the treeItem id that represents
                        // an instance of this task.
                        //
                        newTask.definition.taskItemId = def.taskItemId;
                    }
                    if (await this.runTask(newTask, noTerminal)) {
                        await me.saveTask(taskItem, configuration.get<number>("numLastTasks"));
                    }
                }
            });
        }
        else {
            window.showInformationMessage("Custom execution tasks cannot have the cmd line altered");
        }
    }


    private async saveTask(taskItem: TaskItem, maxTasks: number, isFavorite = false, logPad = "")
    {
        const storeName: string = !isFavorite ? constants.LAST_TASKS_STORE : constants.FAV_TASKS_STORE;
        const label: string = !isFavorite ? constants.LAST_TASKS_LABEL : constants.FAV_TASKS_LABEL;
        const cstTasks = storage.get<string[]>(storeName, []) || [];
        const taskId =  this.getTaskItemId(taskItem);

        util.log(logPad + "save task", 1);
        util.logValue(logPad + "   treenode label", label, 2);
        util.logValue(logPad + "   max tasks", maxTasks, 2);
        util.logValue(logPad + "   is favorite", isFavorite, 2);
        util.logValue(logPad + "   task id", taskId, 2);
        util.logValue(logPad + "   current saved task ids", cstTasks.toString(), 2);
        if (!taskId) {
            util.log(logPad + "   invalid task id, exit", 1);
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
        util.logValue(logPad + "   new saved task ids", cstTasks.toString(), 3);

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

        util.log(logPad + "show special tasks", 1);
        util.logValue(logPad + "   is favorite", isFavorite, 2);
        util.logValue(logPad + "   fav index", favIdx, 2);
        util.logValue(logPad + "   tree index", treeIdx, 2);
        util.logValue(logPad + "   show", show, 2);
        util.logValue(logPad + "   has task item", !!taskItem, 2);
        util.logValue(logPad + "   showLastTasks setting", showLastTasks, 2);

        if (!showLastTasks && !isFavorite) {
            return;
        }

        if (!this.taskTree || this.taskTree.length === 0 ||
            (this.taskTree.length === 1 && this.taskTree[0].contextValue === "noscripts")) {
            util.log(logPad + "   no tasks found in tree", 1);
            return;
        }

        if (show)
        {
            if (!taskItem || isFavorite) // refresh
            {
                taskItem = null;
                if (tree[treeIdx].label === label) {
                    tree.splice(treeIdx, 1);
                }
                changed = true;
            }

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
                if ((task.scope as WorkspaceFolder).name) {
                    statusMsg += " (" + (task.scope as WorkspaceFolder).name + ")";
                }
                TaskTreeDataProvider.statusBarSpace.text = "$(loading~spin) " + statusMsg;
                TaskTreeDataProvider.statusBarSpace.show();
            }
            else {
                util.log("Could not find task execution!!");
                if (TaskTreeDataProvider.statusBarSpace) {
                    TaskTreeDataProvider.statusBarSpace.dispose();
                    TaskTreeDataProvider.statusBarSpace = undefined;
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
                this.sortTasks(each.scripts, logPad);
            }
        }
    }


    private sortLastTasks(items: (TaskFile | TaskItem)[], lastTasks: string[], logPad = "")
    {
        util.log(logPad + "sort last tasks", 1);
        items?.sort((a: TaskItem, b: TaskItem) =>
        {
            const aIdx = lastTasks.indexOf(a.id.replace(constants.LAST_TASKS_LABEL + ":", ""));
            const bIdx = lastTasks.indexOf(b.id.replace(constants.LAST_TASKS_LABEL + ":", ""));
            return (aIdx < bIdx ? 1 : (bIdx < aIdx ? -1 : 0));
        });
    }


    private sortTasks(items: (TaskFile | TaskItem)[], logPad = "")
    {
        util.log(logPad + "sort tasks", 1);
        items?.sort((a: TaskFile| TaskItem, b: TaskFile| TaskItem) =>
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
            else {
                return 1;
            }
        });
    }


    private stop(taskItem: TaskItem)
    {
        if (!taskItem || this.busy)
        {
            window.showInformationMessage("Busy, please wait...");
            return;
        }

        if (taskItem.execution)
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
                }  //
            }     // After vscode 1.50, sometimes terminate() caused a lock up, try
            else // a timeout to see if that makes it any better...
            {   //
                setTimeout(() => {
                    taskItem.execution.terminate();
                }, 1);
            }
        }
    }


    private async taskStartEvent(e: TaskStartEvent)
    {
        util.log("task started", 1);
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
        util.log("task finished", 1);
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