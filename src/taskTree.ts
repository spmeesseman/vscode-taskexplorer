/* ---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as path from "path";
import * as util from "./util";
import * as assert from "assert";
import {
    Event, EventEmitter, ExtensionContext, Task, TaskDefinition, TaskRevealKind,
    TextDocument, TreeDataProvider, TreeItem, TreeItemCollapsibleState, Uri,
    commands, window, workspace, tasks, Selection, WorkspaceFolder, InputBoxOptions, TaskExecution,
    ShellExecution, Terminal, StatusBarItem, StatusBarAlignment, CustomExecution, ProcessExecution, ShellQuotedString
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

    private busy = false;
    private extensionContext: ExtensionContext;
    private lastTasksText = "Last Tasks";
    private name: string;
    private needsRefresh: any[] = [];
    private taskTree: TaskFolder[] | TaskFile[] | NoScripts[] | null = null;
    private tasks: Task[] = null;
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
        subscriptions.push(commands.registerCommand(name + ".stop",  async (item: TaskItem) => { await this.stop(item); }, this));
        subscriptions.push(commands.registerCommand(name + ".restart",  async (item: TaskItem) => { await this.restart(item); }, this));
        subscriptions.push(commands.registerCommand(name + ".pause",  async (item: TaskItem) => { await this.pause(item); }, this));
        subscriptions.push(commands.registerCommand(name + ".open", async (item: TaskItem) => { await this.open(item); }, this));
        subscriptions.push(commands.registerCommand(name + ".openTerminal", async (item: TaskItem) => { await this.openTerminal(item); }, this));
        subscriptions.push(commands.registerCommand(name + ".refresh", async () => { await this.refresh(true, false); }, this));
        subscriptions.push(commands.registerCommand(name + ".runInstall", async (taskFile: TaskFile) => { await this.runNpmCommand(taskFile, "install"); }, this));
        subscriptions.push(commands.registerCommand(name + ".runUpdate", async (taskFile: TaskFile) => { await this.runNpmCommand(taskFile, "update"); }, this));
        subscriptions.push(commands.registerCommand(name + ".runUpdatePackage", async (taskFile: TaskFile) => { await this.runNpmCommand(taskFile, "update <packagename>"); }, this));
        subscriptions.push(commands.registerCommand(name + ".runAudit", async (taskFile: TaskFile) => { await this.runNpmCommand(taskFile, "audit"); }, this));
        subscriptions.push(commands.registerCommand(name + ".runAuditFix", async (taskFile: TaskFile) => { await this.runNpmCommand(taskFile, "audit fix"); }, this));
        subscriptions.push(commands.registerCommand(name + ".addToExcludes", async (taskFile: TaskFile | string, global: boolean, prompt: boolean) => { await this.addToExcludes(taskFile, global, prompt); }, this));

        tasks.onDidStartTask((_e) => this.refresh(false, _e.execution.task.definition.uri, _e.execution.task));
        tasks.onDidEndTask((_e) => this.refresh(false, _e.execution.task.definition.uri, _e.execution.task));
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

        util.log("Add to excludes");
        util.logValue("   global", global === false ? "false" : "true", 2);

        if (selection instanceof TaskFile)
        {
            if (selection.isGroup)
            {
                util.log("  File group");
                pathValue = "";
                selection.scripts.forEach(each =>
                {
                    pathValue += each.resourceUri.path;
                    pathValue += ",";
                });
                if (pathValue) {
                    pathValue = pathValue.substring(0, pathValue.length - 1);
                }
            }
            else
            {
                util.logValue("  File glob", uri.path);
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
                else if (excludes2 instanceof String) {
                    excludes.push(excludes2.toString());
                }
                const strs = str.split(",");
                for (const s in strs) {
                    if (!util.existsInArray(excludes, strs[s])) {
                        excludes.push(strs[s]);
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
    }


    private buildTaskTree(tasksList: Task[]): TaskFolder[] | NoScripts[]
    {
        let taskCt = 0;
        const folders: Map<string, TaskFolder> = new Map();
        const files: Map<string, TaskFile> = new Map();
        let folder = null,
            ltfolder = null;
        let taskFile = null;

        //
        // The 'Last Tasks' folder will be 1st in the tree
        //
        const lastTasks = storage.get<string[]>("lastTasks", []);
        if (configuration.get<boolean>("showLastTasks") === true)
        {
            if (lastTasks && lastTasks.length > 0)
            {
                ltfolder = new TaskFolder(this.lastTasksText);
                folders.set(this.lastTasksText, ltfolder);
            }
        }

        //
        // Loop through each task provided by the engine and build a task tree
        //
        tasksList.forEach(async each =>
        {
            let scopeName: string;
            let settingName: string = "enable" + util.properCase(each.source);

            taskCt++;
            util.log("");
            util.log("Processing task " + taskCt.toString() + " of " + tasksList.length.toString());
            util.logValue("   name", each.name, 2);
            util.logValue("   source", each.source, 2);

            //
            // Remove the '-' from app-publisher task
            //
            if (settingName === "enableApp-publisher") {
                settingName = "enableAppPublisher";
            }

            if ((configuration.get(settingName) || !this.isWorkspaceFolder(each.scope)) && !this.isInstallTask(each))
            {
                if (this.isWorkspaceFolder(each.scope))
                {
                    scopeName = each.scope.name;
                    folder = folders.get(scopeName);
                    if (!folder)
                    {
                        folder = new TaskFolder(each.scope);
                        folders.set(scopeName, folder);
                    }
                }
                else // User Task (not related to a ws or project)
                {
                    scopeName = "User";
                    folder = folders.get(scopeName);
                    if (!folder)
                    {
                        folder = new TaskFolder(scopeName);
                        folders.set(scopeName, folder);
                    }
                }

                const definition: TaskDefinition = each.definition;
                let relativePath = definition.path ? definition.path : "";

                //
                // Ignore VSCode provided gulp and grunt tasks, which are always and only from a gulp/gruntfile
                // in a workspace folder root directory.  All internaly provided tasks will have the 'uri' property
                // set in its task definition
                //
                if (!definition.uri && (each.source === "gulp" || each.source === "grunt"))
                {
                    return; // continue forEach() loop
                }

                //
                // TSC tasks are returned with no path value, the relative path is in the task name:
                //
                //     watch - tsconfig.json
                //     watch - .vscode-test\vscode-1.32.3\resources\app\tsconfig.schema.json
                //
                if (each.source === "tsc" && this.isWorkspaceFolder(each.scope))
                {
                    if (each.name.indexOf(" - ") !== -1 && each.name.indexOf(" - tsconfig.json") === -1)
                    {
                        relativePath = path.dirname(each.name.substring(each.name.indexOf(" - ") + 3));
                        if (util.isExcluded(path.join(each.scope.uri.path, relativePath)))
                        {
                            return; // continue forEach loop
                        }
                    }
                }

                //
                // Create an id to group tasks together with
                //
                let id = each.source + ":" + path.join(scopeName, relativePath);
                if (definition.fileName && !definition.scriptFile)
                {
                    id = path.join(id, definition.fileName);
                }

                //
                // Logging
                //
                util.logValue("   scope.name", scopeName, 2);
                if (this.isWorkspaceFolder(each.scope))
                {
                    util.logValue("   scope.uri.path", each.scope.uri.path, 2);
                    util.logValue("   scope.uri.fsPath", each.scope.uri.fsPath, 2);
                }
                else // User tasks
                {
                    util.logValue("   scope.uri.path", "N/A (User)", 2);
                }
                util.logValue("   relative Path", relativePath, 2);
                this.logTaskDefinition(definition);

                taskFile = files.get(id);

                //
                // Create taskfile node if needed
                //
                if (!taskFile)
                {
                    taskFile = new TaskFile(this.extensionContext, folder, definition, each.source, relativePath);
                    folder.addTaskFile(taskFile);
                    files.set(id, taskFile);
                    util.logValue("   Added source file container", each.source);
                }

                //
                // Create and add task item to task file node
                //
                const taskItem = new TaskItem(this.extensionContext, taskFile, each);
                taskItem.task.definition.taskItem = taskItem;
                taskFile.addScript(taskItem);

                //
                // Addd this task to the 'Last Tasks' folder if we need to
                //
                if (ltfolder && lastTasks.includes(taskItem.id))
                {
                    const taskItem2 = new TaskItem(this.extensionContext, taskFile, each);
                    taskItem2.id = this.lastTasksText + ":" + taskItem2.id;
                    taskItem2.label = this.getLastTaskName(taskItem2);
                    ltfolder.insertTaskFile(taskItem2, 0);
                }
            }
            else
            {
                util.log("   Skipping");
                util.logValue("   enabled", configuration.get(settingName));
                util.logValue("   is install task", this.isInstallTask(each));
            }
        });

        //
        // Sort nodes.  By default the project folders are sorted in the same order as that
        // of the Explorer.  Sort TaskFile nodes and TaskItems nodes alphabetically, by default
        // its entirley random as to when the individual providers report tasks to the engine
        //
        // After the initial sort, create any task groupings based on the task group separator
        //
        folders.forEach((folder, key) =>
        {
            if (key === this.lastTasksText) {
                return; // continue forEach()
            }

            folder.taskFiles.forEach(each =>
            {
                if (each instanceof TaskFile)
                {
                    each.scripts.sort((a, b) =>
                    {
                        return a.label.toString().localeCompare(b.label.toString());
                    });
                }
            });

            folder.taskFiles.sort((a, b) =>
            {
                return a.taskSource.localeCompare(b.taskSource);
            });

            //
            // Create groupings by task type
            //
            if (configuration.get("groupWithSeparator"))
            {
                this.createTaskGroupings(folder);
            }
        });

        //
        // Sort the 'Last Tasks' folder by last time run
        //
        if (ltfolder)
        {
            ltfolder.taskFiles.sort((a, b) =>
            {
                const aIdx = lastTasks.indexOf(a.id.replace(this.lastTasksText + ":", ""));
                const bIdx = lastTasks.indexOf(b.id.replace(this.lastTasksText + ":", ""));
                return (aIdx < bIdx ? 1 : (bIdx < aIdx ? -1 : 0));
            });
        }

        return [...folders.values()];
    }


    /**
     * @param folder The TaskFolder to process
     * @param subfolders Tree taskfile map
     */
    private createTaskGroupings(folder: TaskFolder)
    {
        let prevTaskFile: TaskItem | TaskFile;
        const subfolders: Map<string, TaskFile> = new Map();

        folder.taskFiles.forEach(each =>
        {   //
            // Only processitems of type 'TaskFile'
            //
            if (!(each instanceof TaskFile)) {
                return; // continue forEach()
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
                    subfolder = new TaskFile(this.extensionContext, folder, (each.scripts[0] as TaskItem).task.definition, each.taskSource, each.path, true);
                    subfolders.set(id, subfolder);
                    folder.addTaskFile(subfolder);
                    subfolder.addScript(prevTaskFile);
                    util.logValue("   Added source file sub-container", each.path);
                }
                subfolder.addScript(each);
            }
            prevTaskFile = each;
            //
            // Create the grouping
            //
            this.createTaskGroupingsBySep(folder, each, subfolders);
        });

        //
        // For groupings with separator, when building the task tree, when tasks are grouped new task definitions
        // are created but the old task remains in the parent folder.  Remove all tasks that have been moved down
        // into the tree hierarchy due to groupings
        //
        this.removeGroupedTasks(folder, subfolders);

        //
        // For groupings with separator, now go through and rename the labels within each group minus the
        // first part of the name split by the separator character (the name of the new grouped-with-separator node)
        //
        folder.taskFiles.forEach(each =>
        {
            if (!(each instanceof TaskFile)) {
                return; // continue forEach()
            }
            this.renameGroupedTasks(each);
        });

        //
        // Resort after making adds/removes
        //
        folder.taskFiles.sort((a, b) =>
        {
            return a.taskSource.localeCompare(b.taskSource);
        });
        folder.taskFiles.forEach(each =>
        {
            if (!(each instanceof TaskFile)) {
                return; // continue forEach()
            }
            if (each.isGroup)
            {
                each.scripts.sort((a, b) =>
                {
                    return a.label.toString().localeCompare(b.label.toString());
                });
            }
        });
    }


    /**
     * @private
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
    private createTaskGroupingsBySep(folder: TaskFolder, taskFile: TaskFile, subfolders: Map<string, TaskFile>, treeLevel = 0)
    {
        let prevName: string[];
        let prevTaskItem: TaskItem;
        const newNodes: TaskFile[] = [];
        const groupSeparator = configuration.get<string>("groupSeparator") || "-";
        const atMaxLevel: boolean = configuration.get<number>("groupMaxLevel") <= treeLevel + 1;

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

        taskFile.scripts.forEach(each =>
        {
            if (!(each instanceof TaskItem)) {
                return; // continue forEach()
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
                                             each.taskFile.path, true, prevName[treeLevel], treeLevel);
                    subfolders.set(id, subfolder);

                    _setNodePath(prevTaskItem, each.nodePath);

                    subfolder.addScript(prevTaskItem);
                    newNodes.push(subfolder);
                }

                _setNodePath(each, each.nodePath);
                subfolder.addScript(each);
            }

            prevName = label.split(groupSeparator);
            prevTaskItem = each;
        });

        //
        // If there are new grouped by separator nodes to add to the tree...
        //
        if (newNodes.length > 0)
        {
            let numGrouped = 0;
            newNodes.forEach(n =>
            {
                taskFile.insertScript(n, numGrouped++);
                if (!atMaxLevel) {
                    //
                    // VSCode Tasks - Bug, something to do with "relativepath" of the acutal task being empty,
                    // but in this extension we user /.vcsode as the path, cant go deeper then one level, for
                    // now until I can find time to look at more
                    //
                    if (n.taskSource === "Workspace") {
                        return;
                    }
                    this.createTaskGroupingsBySep(folder, n, subfolders, treeLevel + 1);
                }
            });
        }
    }


    private async executeTask(task: Task, noTerminal?: boolean): Promise<boolean>
    {
        if (noTerminal === true) {
            task.presentationOptions.reveal = TaskRevealKind.Never;
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


    private async handleFileWatcherEvent(invalidate: any, opt: boolean | Uri)
    {
        util.log("   Handling 'FileWatcher/test' event");
        //
        // invalidate=true means the refresh button was clicked (opt will be false)
        // invalidate="tests" means this is being called from unit tests (opt will be undefined)
        //
        if ((invalidate === true || invalidate === "tests") && !opt) {
            util.log("   Handling 'rebuild cache' event");
            this.busy = true;
            await rebuildCache();
            this.busy = false;
        }
        //
        // If this is not from unit testing, then invalidate the appropriate task cache/file
        //
        if (invalidate !== "tests") {
            util.log("   Handling 'invalidate tasks cache' event");
            await this.invalidateTasksCache(invalidate, opt);
        }
    }


    private handleVisibleEvent()
    {
        util.log("   Handling 'visible' event");
        if (this.needsRefresh && this.needsRefresh.length > 0)
        {
            // If theres more than one pending refresh request, just refresh the tree
            //
            if (this.needsRefresh.length > 1 || this.needsRefresh[0].invalidate === undefined)
            {
                this.refresh();
            }
            else
            {
                this.refresh(this.needsRefresh[0].invalidate, this.needsRefresh[0].uri, this.needsRefresh[0].task);
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
     * @param opt2 The uri of the file that contains the task
     */
    public async invalidateTasksCache(opt1: string, opt2: Uri | boolean)
    {
        this.busy = true;
        //
        // All internal task providers export an invalidate() function...
        //
        // If 'opt1' is a string then a filesystemwatcher or taskevent was triggered for the
        // task type defined in the 'opt1' parameter.
        //
        // 'opt2' should contain the Uri of the file that was edited, or the Task if this was
        // a task event
        //
        if (opt1 && opt1 !== "tests" && opt2 instanceof Uri)
        {
            await providers.get(!util.isScriptType(opt1) ? opt1 : "script").invalidateTasksCache(opt2);
        }
        else {
            await util.asyncForEach(providers, (p: TaskExplorerProvider) => {
                p.invalidateTasksCache();
            });
        }

        this.busy = false;
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


    async getChildren(element?: TreeItem, logPad = ""): Promise<TreeItem[]>
    {
        let items: any = [];

        util.log("");
        util.log(logPad + "Tree get children");

        if (!this.taskTree)
        {
            util.log(logPad + "   Build task tree");
            //
            // TODO - search enable* settings and apply enabled types to filter
            //
            // let taskItems = await tasks.fetchTasks({ type: 'npm' });
            //
            // The main junk here.  tasks.fetchTasks() retrieves all tasks from all providers
            // (including this extension).  Get the tasks, and build the task tree...
            //
            if (!this.tasks) {
                this.tasks = await tasks.fetchTasks();
            }
            if (this.tasks)
            {
                this.taskTree = this.buildTaskTree(this.tasks);
                if (this.taskTree.length === 0)
                {
                    this.taskTree = [new NoScripts()];
                }
            }
        }

        if (element instanceof TaskFolder)
        {
            util.log(logPad + "   Get folder task files");
            items = element.taskFiles;
        }
        else if (element instanceof TaskFile)
        {
            util.log(logPad + "   Get file tasks/scripts");
            items = element.scripts;
        }
        else if (!element)
        {
            util.log(logPad + "   Get task tree");
            if (this.taskTree)
            {
                items = this.taskTree;
            }
        }

        return items;
    }


    private getGroupedId(folder: TaskFolder, file: TaskFile, label: string, treeLevel: number)
    {
        const groupSeparator = configuration.get<string>("groupSeparator") || "-";
        const labelSplit = label?.split(groupSeparator);
        let id = "";
        for (let i = 0; i <= treeLevel; i++)
        {
            id += labelSplit[i];
        }
        return folder.label + file.taskSource + id + (treeLevel || treeLevel === 0 ? treeLevel.toString() : "");
    }


    private getLastTaskName(taskItem: TaskItem)
    {
        return taskItem.label = taskItem.label + " (" + taskItem.taskFile.folder.label + " - " + taskItem.taskSource + ")";
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
            storage.update("lastTasks", []);
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
                await util.asyncForEach(treeFiles, async(item2) =>
                {
                    if (done) {
                        return false;
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
                });
            }
        };

        const processItem2 = async (pitem2: any) =>
        {
            const treeTasks: any[] = await me.getChildren(pitem2, "   ");
            if (treeTasks.length > 0)
            {
                await util.asyncForEach(treeTasks, async item3 =>
                {
                    if (done) {
                        return false;
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
                });
            }
        };

        const processItem = async (pitem: any) =>
        {
            let tmp: any;
            const treeFiles: any[] = await me.getChildren(pitem, "   ");
            if (treeFiles.length > 0)
            {
                await util.asyncForEach(treeFiles, async item2 =>
                {
                    if (done) {
                        return false;
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
                });
            }
        };

        await util.asyncForEach(treeItems, async item =>
        {
            if (item instanceof TaskFolder)
            {
                const tmp: any = me.getParent(item);
                assert(tmp === null, "Invaid parent type, should be null for TaskFolder");
                util.log(logPad + "Task Folder " + item.label + ":  " + (item.resourceUri ?
                    item.resourceUri.fsPath : me.lastTasksText));
                await processItem(item);
            }
        });

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
            let term: Terminal = null;
            util.logValue("   Checking possible task terminal name #" + (++checkNum).toString(), taskName, 2);
            window.terminals.forEach(async (t, i) =>
            {
                util.logValue("      == terminal " + i + " name", t.name, 2);
                if (taskName.toLowerCase().replace("task - ", "").indexOf(t.name.toLowerCase().replace("task - ", "")) !== -1)
                {
                    term = t;
                    util.log("   found!", 2);
                    return false; // break forEach()
                }
            });
            return term;
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


    public getTreeItem(element: TreeItem): TreeItem
    {
        return element;
    }


    private isInstallTask(task: Task): boolean
    {
        const fullName = this.getTaskName("install", task.definition.path);
        return fullName === task.name;
    }


    private isWorkspaceFolder(value: any): value is WorkspaceFolder
    {
        return value && typeof value !== "number";
    }


    private logTaskDefinition(definition: TaskDefinition)
    {
        util.logValue("   type", definition.type, 2);
        if (definition.scriptType)
        {
            util.logValue("      script type", definition.scriptType, 2);	// if 'script' is defined, this is type npm
        }
        if (definition.script)
        {
            util.logValue("   script", definition.script, 2);	// if 'script' is defined, this is type npm
        }
        if (definition.path)
        {
            util.logValue("   path", definition.path, 2);
        }
        //
        // Internal task providers will set a fileName property
        //
        if (definition.fileName)
        {
            util.logValue("   file name", definition.fileName, 2);
        }
        //
        // Internal task providers will set a uri property
        //
        if (definition.uri)
        {
            util.logValue("   file path", definition.uri.fsPath, 2);
        }
        //
        // Script task providers will set a fileName property
        //
        if (definition.requiresArgs)
        {
            util.logValue("   script requires args", "true", 2);
        }
        if (definition.cmdLine)
        {
            util.logValue("   script cmd line", definition.cmdLine, 2);
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
            this.run(selection);
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


    private async openTerminal(taskItem: TaskItem)
    {
        const term = this.getTerminal(taskItem);
        if (term) {
            term.show();
        }
    }


    private async pause(taskItem: TaskItem)
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
     * Can also be one of the task types (FileSystemWatcher event):
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
     * @param opt Uri of the invalidated resource
     * @param task If defined, a task that has just started or finished. Used to re-paint
     * the loading icons.  If defined, 'invalidate' should be `false`.
     */
    public async refresh(invalidate?: any, opt?: Uri | boolean, task?: Task): Promise<boolean>
    {
        util.log("Refresh task tree");
        util.logValue("   invalidate", invalidate, 2);
        util.logValue("   opt fsPath", opt && opt instanceof Uri ? opt.fsPath : "n/a", 2);
        util.logValue("   task name", task ? task.name : "n/a", 2);

        //
        // Show status bar message (if ON in settings)
        //
        this.showStatusMessage(task);

        //
        // If a view was turned off in settings, the disposable view still remains
        // ans will still receive events.  CHeck visibility property, and of this view
        // is hidden/disabled, then exit.  Unless opt is defined, in which case this is just a
        // task ending, so we can proceed just invalidating that task set
        //
        if (this.taskTree && views.get(this.name) && invalidate !== "tests")
        {
            if (!views.get(this.name).visible)
            {
                util.log("   Delay refresh, exit");
                this.needsRefresh.push({ invalidate, opt, task });
                return false;
            }
        }

        //
        // The invalidate param will be equal to 'visible-event' when this method is called from the
        // visibility change event in extension.ts.
        //
        // If a view isnt visible on any refresh request, a requested refresh will exit and record the refresh
        // parameters in an object (above block of code).  When the view becomes visible again, we refresh if we
        // need to, if not then just exit on this refresh request
        //
        if (invalidate === "visible-event")
        {
            if (this.taskTree) {
                this.handleVisibleEvent();
                return;
            }
            invalidate = undefined;
        }

        //
        // TODO - performance enhancement
        // Can only invalidate a section of the tree depending on tasktype/uri?
        //
        this.taskTree = null;

        //
        // If invalidate is false, then this is a task start/stop
        //
        // If invalidate is true and opt is false, then the refresh button was clicked
        //
        // If invalidate is "tests" and opt undefined, then extension.refreshTree() called in tests
        //
        // If task is truthy, then a task has started/stopped, opt will be the task deifnition's
        // 'uri' property, note that task types not internally provided will not contain this property.
        //
        // If invalidate and opt are both truthy, then a filesystemwatcher event or a task just triggered
        //
        // If invalidate and opt are both undefined, then a configuration has changed
        //
        let treeItem: TreeItem;

        if (invalidate !== false)
        {
            await this.handleFileWatcherEvent(invalidate, opt);
        }

        if (task)
        {
            treeItem = task.definition.treeItem;
        }
        else {
            this.tasks = null;
        }

        this._onDidChangeTreeData.fire(treeItem);

        util.log("   Refresh task tree finished");
        return true;
    }


    private removeGroupedTasks(folder: TaskFolder, subfolders: Map<string, TaskFile>)
    {
        const taskTypesRmv: TaskFile[] = [];

        folder.taskFiles.forEach(each =>
        {
            if (!(each instanceof TaskFile)) {
                return; // continue forEach()
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
                each.scripts.forEach(each2 =>
                {
                    this.removeScripts(each2 as TaskFile, folder, subfolders);
                    if (each2 instanceof TaskFile && each2.isGroup && each2.groupLevel > 0)
                    {
                       // me.removeGroupedTasks(folder, each2, subfolders);
                        each2.scripts.forEach(each3 =>
                        {
                            this.removeScripts(each3 as TaskFile, folder, subfolders);
                        });
                    }
                });
            }
            else {
                this.removeScripts(each, folder, subfolders);
            }
        });

        taskTypesRmv.forEach(each =>
        {
            folder.removeTaskFile(each);
        });
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
        const groupSeparator = configuration.get<string>("groupSeparator") || "-";

        taskFile.scripts.forEach(each =>
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
                        break; // break each
                    }
                }

                if (!allTasks) {
                    me.removeScripts(each, folder, subfolders, level + 1);
                }
            }
        });

        taskTypesRmv.forEach(each2 =>
        {
            taskFile.removeScript(each2);
        });
    }


    private renameGroupedTasks(taskFile: TaskFile)
    {
        const groupSeparator = configuration.get<string>("groupSeparator") || "-";

        taskFile.scripts.forEach(each =>
        {
            if (each instanceof TaskFile)
            {
                if (each.isGroup)
                {
                    let rmvLbl = each.label.toString();
                    rmvLbl = rmvLbl.replace(/\(/gi, "\\(").replace(/\[/gi, "\\[");
                    rmvLbl = rmvLbl.replace(/\)/gi, "\\)").replace(/\]/gi, "\\]");
                    each.scripts.forEach(each2 =>
                    {
                        const rgx = new RegExp(rmvLbl + groupSeparator, "i");
                        each2.label = each2.label.toString().replace(rgx, "");
                    });
                }
                else
                {
                    this.renameGroupedTasks(each);
                }
            }
        });
    }


    private async restart(taskItem: TaskItem)
    {
        if (!taskItem || this.busy)
        {
            window.showInformationMessage("Busy, please wait...");
            return;
        }

        this.stop(taskItem);
        this.run(taskItem);
    }


    private async resumeTask(taskItem: TaskItem)
    {
        const term = this.getTerminal(taskItem);
        if (term) {
            term.sendText("N", true);
            taskItem.paused = false;
        }
        else {
            await window.showInformationMessage("Terminal not found");
        }
    }


    private async run(taskItem: TaskItem, noTerminal = false, withArgs = false)
    {
        const me = this;

        if (!taskItem || this.busy)
        {
            window.showInformationMessage("Busy, please wait...");
            return;
        }

        if (withArgs === true)
		{
            await this.runWithArgs(taskItem);
            return;
		}

        if (taskItem.paused)
        {
            await this.resumeTask(taskItem);
        }
        else if (await this.executeTask(taskItem.task, noTerminal))
        {
            me.saveRunTask(taskItem);
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
        const lastTasks = storage.get<string[]>("lastTasks", []);
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
            this.run(taskItem);
        }
        else
        {
            window.showInformationMessage("Task not found!  Check log for details");
            util.removeFromArray(lastTasks, lastTaskId);
            storage.update("lastTasks", lastTasks);
            this.showLastTasks(true);
        }
    }


    private async runNpmCommand(taskFile: TaskFile, command: string)
    {
        const pkgMgr = workspace.getConfiguration("npm").get<string>("packageManager") || "npm";

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
                    const exec = taskItem.task.execution as (ShellExecution | ProcessExecution);
                    let newExec: (ShellExecution | ProcessExecution);
                    let newTask: Task = taskItem.task;

                    if (str) {
                        const def = taskItem.task.definition;
                        newTask = providers.get("script").createTask(path.extname(def.uri.fsPath).substring(1), null,
                                                                     taskItem.getFolder(),  def.uri, str.trim().split(" "));
                    }
                    if (await this.executeTask(newTask, noTerminal)) {
                        me.saveRunTask(taskItem);
                    }
                }
            });
        }
        else {
            window.showInformationMessage("Custom execution tasks cannot have the cmd line altered");
        }
    }


    private saveRunTask(taskItem: TaskItem, logPad = "")
    {
        util.log(logPad + "save run task");

        const lastTasks = storage.get<string[]>("lastTasks", []);
        util.logValue(logPad + "   current saved task ids", lastTasks.toString(), 2);

        const taskId = taskItem.id.replace(this.lastTasksText + ":", "");

        if (util.existsInArray(lastTasks, taskId))
        {
            util.removeFromArray(lastTasks, taskId);
        }
        while (lastTasks.length >= configuration.get<number>("numLastTasks"))
        {
            lastTasks.shift();
        }

        lastTasks.push(taskId);
        util.logValue(logPad + "   pushed taskitem id", taskItem.id, 2);

        storage.update("lastTasks", lastTasks);
        util.logValue(logPad + "   new saved task ids", lastTasks.toString(), 2);

        if (configuration.get<boolean>("showLastTasks") === true)
        {
            util.log(logPad + "   call showLastTasks()");
            this.showLastTasks(true, taskItem);
        }
    }


    public async showLastTasks(show: boolean, taskItem?: TaskItem, logPad = "")
    {
        let changed = true;
        const tree = this.taskTree;

        util.log(logPad + "show last tasks");
        util.logValue(logPad + "   show", show);

        if (!this.taskTree || this.taskTree.length === 0 ||
            (this.taskTree.length === 1 && this.taskTree[0].contextValue === "noscripts")) {
            return;
        }

        if (show)
        {
            if (!taskItem) // refresh
            {
                tree.splice(0, 1);
                changed = true;
            }

            if (tree[0].label !== this.lastTasksText)
            {
                util.log(logPad + "   create last tasks folder", 2);
                const lastTasks = storage.get<string[]>("lastTasks", []);
                const ltfolder = new TaskFolder(this.lastTasksText);
                tree.splice(0, 0, ltfolder);
                await util.asyncForEach(lastTasks, async (tId: string) =>
                {
                    const taskItem2 = await this.getTaskItems(tId);
                    if (taskItem2 && taskItem2 instanceof TaskItem) {
                        const taskItem3 = new TaskItem(this.extensionContext, taskItem2.taskFile, taskItem2.task);
                        taskItem3.id = this.lastTasksText + ":" + taskItem3.id;
                        taskItem3.label = this.getLastTaskName(taskItem3);
                        ltfolder.insertTaskFile(taskItem3, 0);
                    }
                });
                changed = true;
            }
            else if (taskItem)
            {
                let taskItem2: TaskItem;
                const ltfolder = tree[0] as TaskFolder;
                let taskId = taskItem.id.replace(this.lastTasksText + ":", "");
                taskId = this.lastTasksText + ":" + taskItem.id;

                ltfolder.taskFiles.forEach((t: TaskItem) =>
                {
                    if (t.id === taskId) {
                        taskItem2 = t;
                        return false;
                    }
                });

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
                    taskItem2.label = this.getLastTaskName(taskItem2);
                }

                util.logValue(logPad + "   add item", taskItem2.id, 2);
                ltfolder.insertTaskFile(taskItem2, 0);
                changed = true;
            }
        }
        else {
            if (tree[0].label === this.lastTasksText)
            {
                tree.splice(0, 1);
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


    private async stop(taskItem: TaskItem)
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
                }
            }
            else {
                taskItem.execution.terminate();
            }
        }
    }

}
