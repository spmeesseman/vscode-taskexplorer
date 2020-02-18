/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as path from "path";
import * as util from "./util";
import * as assert from "assert";
import {
    Event, EventEmitter, ExtensionContext, Task, TaskDefinition,
    TextDocument, TreeDataProvider, TreeItem, TreeItemCollapsibleState, Uri,
    commands, window, workspace, tasks, Selection, WorkspaceFolder, InputBoxOptions,
    ShellExecution
} from "vscode";
import { visit, JSONVisitor } from "jsonc-parser";
import * as nls from "vscode-nls";
import { TaskFolder, TaskFile, TaskItem } from "./tasks";
import { storage } from "./common/storage";
import { views } from "./views";
import { rebuildCache } from "./cache";
import { configuration } from "./common/configuration";
import { invalidateTasksCacheAnt } from "./taskProviderAnt";
import { invalidateTasksCacheMake } from "./taskProviderMake";
import { invalidateTasksCacheScript } from "./taskProviderScript";
import { invalidateTasksCacheGradle } from "./taskProviderGradle";
import { invalidateTasksCacheGrunt } from "./taskProviderGrunt";
import { invalidateTasksCacheGulp } from "./taskProviderGulp";
import { invalidateTasksCacheAppPublisher } from "./taskProviderAppPublisher";


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
    private name: string;
    private taskTree: TaskFolder[] | TaskFile[] | NoScripts[] | null = null;
    private tasks: Task[] = null;
    private needsRefresh: any[] = [];
    // private processIds: any[] = [];
    private extensionContext: ExtensionContext;
    private _onDidChangeTreeData: EventEmitter<TreeItem | null> = new EventEmitter<TreeItem | null>();
    readonly onDidChangeTreeData: Event<TreeItem | null> = this._onDidChangeTreeData.event;
    private busy = false;


    constructor(name: string, context: ExtensionContext)
    {
        const subscriptions = context.subscriptions;
        this.extensionContext = context;
        this.name = name;
        subscriptions.push(commands.registerCommand(name + ".run", this.run, this));
        subscriptions.push(commands.registerCommand(name + ".runLastTask", this.runLastTask, this));
        subscriptions.push(commands.registerCommand(name + ".stop", this.stop, this));
        subscriptions.push(commands.registerCommand(name + ".restart", this.restart, this));
        subscriptions.push(commands.registerCommand(name + ".pause", this.pause, this));
        subscriptions.push(commands.registerCommand(name + ".open", this.open, this));
        subscriptions.push(commands.registerCommand(name + ".refresh", () => { this.refresh(true, false); }, this));
        subscriptions.push(commands.registerCommand(name + ".runInstall", (taskFile: TaskFile) => { this.runNpmCommand(taskFile, "install"); }, this));
        subscriptions.push(commands.registerCommand(name + ".runUpdate", (taskFile: TaskFile) => { this.runNpmCommand(taskFile, "update"); }, this));
        subscriptions.push(commands.registerCommand(name + ".runUpdatePackage", (taskFile: TaskFile) => { this.runNpmCommand(taskFile, "update <packagename>"); }, this));
        subscriptions.push(commands.registerCommand(name + ".runAudit", (taskFile: TaskFile) => { this.runNpmCommand(taskFile, "audit"); }, this));
        subscriptions.push(commands.registerCommand(name + ".runAuditFix", (taskFile: TaskFile) => { this.runNpmCommand(taskFile, "audit fix"); }, this));
        subscriptions.push(commands.registerCommand(name + ".addToExcludes", (taskFile: TaskFile | string, global: boolean) => { this.addToExcludes(taskFile, global); }, this));

        tasks.onDidStartTask((_e) => this.refresh(false, _e.execution.task.definition.uri, _e.execution.task));
        tasks.onDidEndTask((_e) => this.refresh(false, _e.execution.task.definition.uri, _e.execution.task));
    }


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
            if (opt1 === "ant")
            {
                await invalidateTasksCacheAnt(opt2);
            }
            else if (opt1 === "gradle")
            {
                await invalidateTasksCacheGradle(opt2);
            }
            else if (opt1 === "grunt")
            {
                await invalidateTasksCacheGrunt(opt2);
            }
            else if (opt1 === "gulp")
            {
                await invalidateTasksCacheGulp(opt2);
            }
            else if (opt1 === "make")
            {
                await invalidateTasksCacheMake(opt2);
            }
            else if (opt1 === "app-publisher")
            {
                await invalidateTasksCacheAppPublisher(opt2);
            }
            else if (opt1 === "bash" || opt1 === "batch" || opt1 === "nsis" || opt1 === "perl" || opt1 === "powershell" || opt1 === "python" || opt1 === "ruby")
            {
                await invalidateTasksCacheScript(opt2);
            }
        }
        else
        {
            await invalidateTasksCacheAnt();
            await invalidateTasksCacheMake();
            await invalidateTasksCacheScript();
            await invalidateTasksCacheGradle();
            await invalidateTasksCacheGrunt();
            await invalidateTasksCacheGulp();
            await invalidateTasksCacheAppPublisher();
        }

        this.busy = false;
    }


    private async run(taskItem: TaskItem)
    {
        const me = this;

        if (!taskItem || this.busy)
        {
            window.showInformationMessage("Busy, please wait...");
            return;
        }

        //
        // If this is a script, check to see if args are required
        //
        // A script task will set the 'requiresArgs' parameter to true if command line arg
        // parameters are detected in the scripts contents when inported.  For example, if a
        // batch script contains %1, %2, etc, the task definition's requiresArgs parameter
        // will be set.
        //
        /*
		if (taskItem.task.definition.requiresArgs === true)
		{
			let opts: InputBoxOptions = { prompt: 'Enter command line arguments separated by spaces'};
			window.showInputBox(opts).then(function(str)
			{
				if (str !== undefined)
				{
					//let origArgs = taskItem.task.execution.args ? taskItem.task.execution.args.slice(0) : []; // clone
					if (str) {
						//origArgs.push(...str.split(' '));
						taskItem.task.execution  = new ShellExecution(taskItem.task.definition.cmdLine + ' ' + str, taskItem.task.execution.options);
					}
					else {
						taskItem.task.execution  = new ShellExecution(taskItem.task.definition.cmdLine, taskItem.task.execution.options);
					}
					tasks.executeTask(taskItem.task)
					.then(function(execution) {
						//taskItem.task.execution.args = origArgs.slice(0); // clone
						me.saveRunTask(taskItem);
					},
					function(reason) {
						//taskItem.task.execution.args = origArgs.slice(0); // clone
					});
				}
			});
		}
		else
		{*/
        // Execute task
        //
        if (taskItem.paused)
        {
            window.terminals.forEach(async (term, idx) =>
            {
                const termTaskName = "Task - " + taskItem.taskFile.label + ": " + taskItem.label + " (" + taskItem.taskFile.folder.workspaceFolder.name + ")";
                if (term.name.toLowerCase() === termTaskName.toLowerCase())
                {
                    term.sendText("N", true);
                    taskItem.paused = false;
                    // taskItem.contextValue = "runningScript";
                }
            });
        }
        else
        {
            try {
                await tasks.executeTask(taskItem.task);
                me.saveRunTask(taskItem);
            }
            catch {}
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
            const termTaskName = "Task - " + taskItem.taskFile.label + ": " + taskItem.label + " (" + taskItem.taskFile.folder.workspaceFolder.name + ")";
            window.terminals.forEach(async (term, idx) =>
            {
                if (termTaskName.toLowerCase().replace("task - ", "").indexOf(term.name.toLowerCase().replace("task - ", "")) !== -1)
                {
                    if (taskItem.paused)
                    {
                        taskItem.paused = false;
                        term.sendText("N");
                        // taskItem.contextValue = "runningScript";
                    }
                    else
                    {
                        // taskItem.paused = true;
                        term.sendText("\u0003");
                        function yes() {
                            term.sendText("Y", true);
                        }
                        setTimeout(yes, 100);
                        // taskItem.contextValue = "pausedScript";
                    }
                }
            });
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
            // if (taskItem.paused)
            // {
            //     window.terminals.forEach(async (term, idx) =>
            //     {
            //         const termTaskName = "Task - " + taskItem.taskFile.label + ": " + taskItem.label + " (" + taskItem.taskFile.folder.workspaceFolder.name + ")";
            //         if (term.name.toLowerCase() === termTaskName.toLowerCase())
            //         {
            //             term.sendText("Y", true);
            //             taskItem.paused = false;
            //             //taskItem.contextValue = "script";
            //         }
            //     });
            // }
            // else {
            //     taskItem.execution.terminate();
            // }

            if (configuration.get<boolean>("keepTermOnStop") === true)
            {
                const termTaskName = "Task - " + taskItem.taskFile.label + ": " + taskItem.label + " (" + taskItem.taskFile.folder.workspaceFolder.name + ")";
                window.terminals.forEach(async (term, idx) =>
                {
                    if (termTaskName.toLowerCase().replace("task - ", "").indexOf(term.name.toLowerCase().replace("task - ", "")) !== -1)
                    {
                        if (taskItem.paused)
                        {
                            taskItem.paused = false;
                            term.sendText("N");
                            // taskItem.contextValue = "runningScript";
                        }
                        else
                        {
                            // taskItem.paused = true;
                            term.sendText("\u0003");
                            function yes() {
                                term.sendText("Y", true);
                            }
                            setTimeout(yes, 300);
                            // taskItem.contextValue = "pausedScript";
                        }
                    }
                });
            }
            else
            {
                taskItem.execution.terminate();
            }
        }
    }


    private async restart(taskItem: TaskItem)
    {
        this.stop(taskItem);
        this.run(taskItem);
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
        }
    }


    public async getTaskItems(taskId: string, logPad = "", executeOpenForTests = false): Promise<Map<string, TaskItem> | TaskItem>
    {
        const me = this;
        const taskMap: Map<string, TaskItem> = new Map();

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

        async function processItem2g(pitem2: TaskFile)
        {
            const treeFiles: any[] = await me.getChildren(pitem2, "   ");
            if (treeFiles.length > 0)
            {
                await util.asyncForEach(treeFiles, async(item2) =>
                {
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
                    else {
                        assert.fail("Invalid taskfile node found");
                    }
                });
            }
            else {
                assert.fail("No task files found");
            }
        }

        async function processItem2(pitem2: any)
        {
            const treeTasks: any[] = await me.getChildren(pitem2, "   ");
            if (treeTasks.length > 0)
            {
                await util.asyncForEach(treeTasks, async item3 =>
                {
                    if (item3 instanceof TaskItem)
                    {
                        if (executeOpenForTests) {
                            await commands.executeCommand("taskExplorer.open", item3);
                        }

                        const tmp = me.getParent(item3);
                        assert(
                            tmp instanceof TaskFile,
                            "Invaid parent type, should be TaskFile for TaskItem"
                        );
                        if (item3.task && item3.task.definition)
                        {
                            const tpath: string = item3.task.definition.uri ? item3.task.definition.uri.fsPath :
                                                (item3.task.definition.path ? item3.task.definition.path : "root");
                            util.log(logPad + "   ✔ Processed " + item3.task.name);
                            util.logValue(logPad + "        id", item3.id);
                            util.logValue(logPad + "        type", item3.taskSource + " @ " + tpath);
                            taskMap.set(item3.id, item3);
                        }
                        else
                        {
                            util.log(logPad + "      ✘ " + item3.label + "does not contain a task or task definition");
                        }
                    }
                    else if (item3 instanceof TaskFile && item3.isGroup)
                    {
                        await processItem2(item3);
                    }
                    else {
                        assert.fail("Invalid taskitem node found");
                    }
                });
            }
            else {
                assert.fail("No tasks found in treefile");
            }
        }

        async function processItem(pitem: any)
        {
            let tmp: any;
            const treeFiles: any[] = await me.getChildren(pitem, "   ");
            if (treeFiles.length > 0)
            {
                await util.asyncForEach(treeFiles, async item2 =>
                {
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
                    else {
                        assert.fail("Invalid taskfile node found");
                    }
                });
            }
            else {
                assert.fail("No task files found");
            }
        }

        await util.asyncForEach(treeItems, async item =>
        {
            try {
                if (item instanceof TaskFolder)
                {
                    const tmp: any = me.getParent(item);
                    assert(tmp === null, "Invaid parent type, should be null for TaskFolder");
                    util.log(logPad + "Task Folder " + item.label + ":  " + item.resourceUri.fsPath);
                    await processItem(item);
                }
                else {
                    assert.fail("Invalid root folder");
                }
            }
            catch (error) {
                assert.fail("Exception error: " + error.toString());
            }
        });

        util.log(logPad + "   finished task tree scan");
        util.logValue(logPad + "   # of items found", taskMap.keys.length, 2);

        if (taskId) {
            return taskMap.get(taskId);
        }
        return taskMap;
    }


    private saveRunTask(taskItem: TaskItem)
    {
        const lastTasks = storage.get<string[]>("lastTasks", []);
        if (util.existsInArray(lastTasks, taskItem.id))
        {
            util.removeFromArray(lastTasks, taskItem.id);
        }
        if (lastTasks.length > 4)
        { // store max 5 tasks
            lastTasks.shift();
        }
        lastTasks.push(taskItem.id);
        storage.update("lastTasks", lastTasks);
    }


    private async pickLastTask()
    {
        // let taskItem: TaskItem;

        // let lastTasks = storage.get<Array<string>>("lastTasks", []);
        // lastTasks.forEach(each =>
        // {

        // });

        // this.run(taskItem);
    }


    private async open(selection: TaskFile | TaskItem)
    {
        let uri: Uri | undefined;
        if (selection instanceof TaskFile) {
            uri = selection.resourceUri!;
        }
        else if (selection instanceof TaskItem)
        {
            uri = selection.taskFile.resourceUri;
        }

        if (uri)
        {
            util.log("Open script at position");
            util.logValue("   command", selection.command.command);
            util.logValue("   source", selection.taskSource);
            util.logValue("   uri path", uri.path);
            util.logValue("   file path", uri.fsPath);

            if (util.pathExists(uri.fsPath))
            {
                const document: TextDocument = await workspace.openTextDocument(uri);
                const offset = this.findScriptPosition(document, selection instanceof TaskItem ? selection : undefined);
                const position = document.positionAt(offset);
                await window.showTextDocument(document, { selection: new Selection(position, position) });
            }
        }
    }


    public async refresh(invalidate?: any, opt?: Uri | boolean, task?: Task)
    {
        util.log("Refresh task tree");
        util.logValue("   invalidate", invalidate, 2);
        util.logValue("   opt fsPath", opt && opt instanceof Uri ? opt.fsPath : "n/a", 2);
        util.logValue("   task name", task ? task.name : "n/a", 2);

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
                return;
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
        if (this.taskTree && invalidate === "visible-event")
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

            return;
        }

        if (invalidate === "visible-event")
        {
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
            if ((invalidate === true || invalidate === "tests") && !opt) {
                util.log("   Handling 'rebuild cache' event");
                this.busy = true;
                await rebuildCache();
                this.busy = false;
            }
            util.log("   Handling 'invalidate tasks cache' event");
            await this.invalidateTasksCache(invalidate, opt);
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


    private async addToExcludes(selection: TaskFile | string, global?: boolean)
    {
        const me = this;
        let uri: Uri | undefined;
        let pathValue = "";

        if (selection instanceof TaskFile)
        {
            uri = selection.resourceUri!;
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

        function saveExclude(str: string)
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
                me.refresh(selection instanceof TaskFile ? selection.taskSource : false, uri);
            }
        }

        if (selection instanceof TaskFile)
        {
            const opts: InputBoxOptions = { prompt: "Add the following file to excluded tasks list?", value: pathValue };
            window.showInputBox(opts).then(str =>
            {
                saveExclude(str);
            });
        }
        else {
            saveExclude(pathValue);
        }
    }


    private async runNpmCommand(taskFile: TaskFile, command: string)
    {
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
            const execution = new ShellExecution("npm " + command, options);
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
                    const execution = new ShellExecution("npm " + command.replace("<packagename>", "").trim() + " " + str.trim(), options);
                    const task = new Task(kind, taskFile.folder.workspaceFolder, command.replace("<packagename>", "").trim() + str.trim(), "npm", execution, undefined);
                    await tasks.executeTask(task);
                }
            });
        }
    }


    private findPosWithJsonVisitor(documentText: string, script?: TaskItem)
    {
        const me = this;
        let inScripts = false;
        let inTasks = false;
        let inTaskLabel: any;
        let scriptOffset = 0;

        const visitor: JSONVisitor = {
            onError()
            {
                return scriptOffset;
            },
            onObjectEnd()
            {
                if (inScripts)
                {
                    inScripts = false;
                }
            },
            onLiteralValue(value: any, offset: number, _length: number)
            {
                if (inTaskLabel)
                {
                    if (typeof value === "string")
                    {
                        if (inTaskLabel === "label")
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
            onObjectProperty(property: string, offset: number, _length: number)
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
                else if (property === "label" && inTasks && !inTaskLabel)
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


    private findScriptPosition(document: TextDocument, script?: TaskItem): number
    {
        let scriptOffset = 0;
        const documentText = document.getText();

        util.log("findScriptPosition");
        util.logValue("   task source", script.taskSource);
        util.logValue("   task name", script.task.name);

        if (script.taskSource === "tsc")
        {
            scriptOffset = 0;
        }
        if (script.taskSource === "make")
        {
            scriptOffset = documentText.indexOf(script.task.name + ":");
            if (scriptOffset === -1)
            {
                scriptOffset = documentText.indexOf(script.task.name);
                let bLine = documentText.lastIndexOf("\n", scriptOffset) + 1;
                let eLine = documentText.indexOf("\n", scriptOffset);
                if (eLine === -1) { eLine = documentText.length; }
                let line = documentText.substring(bLine, eLine).trim();
                while (bLine !== -1 && bLine !== scriptOffset && scriptOffset !== -1 && line.indexOf(":") === -1)
                {
                    scriptOffset = documentText.indexOf(script.task.name, scriptOffset + 1);
                    bLine = documentText.lastIndexOf("\n", scriptOffset) + 1;
                    eLine = documentText.indexOf("\n", scriptOffset);
                    if (bLine !== -1)
                    {
                        if (eLine === -1) { eLine = documentText.length; }
                        line = documentText.substring(bLine, eLine).trim();
                    }
                }
                if (scriptOffset === -1)
                {
                    scriptOffset = 0;
                }
            }
        }
        else if (script.taskSource === "ant")
        {
            //
            // TODO This is crap - need regex search
            //
            scriptOffset = documentText.indexOf("name=\"" + script.task.name);
            if (scriptOffset === -1)
            {
                scriptOffset = documentText.indexOf("name='" + script.task.name);
            }
            if (scriptOffset === -1)
            {
                scriptOffset = 0;
            }
            else
            {
                scriptOffset += 6;
            }
        }
        else if (script.taskSource === "gulp")
        {
            //
            // TODO This is crap - need regex search
            //
            scriptOffset = documentText.indexOf("gulp.task('" + script.task.name);
            if (scriptOffset === -1)
            {
                scriptOffset = documentText.indexOf("gulp.task(\"" + script.task.name);
            }
            if (scriptOffset === -1)
            {
                scriptOffset = 0;
            }
        }
        else if (script.taskSource === "grunt")
        {
            //
            // TODO This is crap - need regex search
            //
            scriptOffset = documentText.indexOf("grunt.registerTask('" + script.task.name);
            if (scriptOffset === -1)
            {
                scriptOffset = documentText.indexOf("grunt.registerTask(\"" + script.task.name);
            }
            if (scriptOffset === -1)
            {
                scriptOffset = 0;
            }
        }
        else if (script.taskSource === "npm" || script.taskSource === "Workspace")
        {
            scriptOffset = this.findPosWithJsonVisitor(documentText, script);
        }

        util.logValue("   Offset", scriptOffset);
        return scriptOffset;
    }


    getTreeItem(element: TreeItem): TreeItem
    {
        return element;
    }


    getParent(element: TreeItem): TreeItem | null
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


    private isInstallTask(task: Task): boolean
    {
        const fullName = this.getTaskName("install", task.definition.path);
        return fullName === task.name;
    }


    private getTaskName(script: string, relativePath: string | undefined, forcePathInName?: boolean)
    {
        if (relativePath && relativePath.length && forcePathInName === true)
        {
            return `${script} - ${relativePath.substring(0, relativePath.length - 1)}`;
        }
        return script;
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


    private buildTaskTree(tasks: Task[]): TaskFolder[] | NoScripts[]
    {
        let taskCt = 0;
        const folders: Map<string, TaskFolder> = new Map();
        const files: Map<string, TaskFile> = new Map();
        let folder = null;
        let taskFile = null;

        //
        // Loop through each task provided by the engine and build a task tree
        //
        tasks.forEach(each =>
        {
            taskCt++;
            util.log("");
            util.log("Processing task " + taskCt.toString() + " of " + tasks.length.toString());
            util.logValue("   name", each.name, 2);
            util.logValue("   source", each.source, 2);

            let settingName: string = "enable" + util.properCase(each.source);
            if (settingName === "enableApp-publisher") {
                settingName = "enableAppPublisher";
            }

            if (configuration.get(settingName) && this.isWorkspaceFolder(each.scope) && !this.isInstallTask(each))
            {
                folder = folders.get(each.scope.name);
                if (!folder)
                {
                    folder = new TaskFolder(each.scope);
                    folders.set(each.scope.name, folder);
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
                if (each.source === "tsc")
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
                // Create an id so group tasks together with
                //
                let id = each.source + ":" + path.join(each.scope.name, relativePath);
                if (definition.fileName && !definition.scriptFile)
                {
                    id = path.join(id, definition.fileName);
                }

                //
                // Logging
                //
                util.logValue("   scope.name", each.scope.name, 2);
                util.logValue("   scope.uri.path", each.scope.uri.path, 2);
                util.logValue("   scope.uri.fsPath", each.scope.uri.fsPath, 2);
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
        const subfolders: Map<string, TaskFile> = new Map();

        folders.forEach((folder, key) =>
        {
            folder.taskFiles.forEach(each =>
            {
                each.scripts.sort((a, b) =>
                {
                    return a.label.localeCompare(b.label);
                });
            });

            folder.taskFiles.sort((a, b) =>
            {
                return a.taskSource.localeCompare(b.taskSource);
            });

            //
            // Create groupings by task type
            //
            let prevTaskFile: TaskItem | TaskFile;
            folder.taskFiles.forEach(each =>
            {
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
                    }
                    subfolder.addScript(each);
                }
                prevTaskFile = each;

                if (configuration.get("groupDashed"))
                {
                    let prevName: string[];
                    let prevTaskItem: TaskItem | TaskFile;
                    each.scripts.forEach(each2 =>
                    {
                        let id = folder.label + each.taskSource;
                        let subfolder: TaskFile;
                        const prevNameThis = each2.label.split("-");
                        if (prevName && prevName.length > 1 && prevNameThis.length > 1 && prevName[0] === prevNameThis[0])
                        {
                            id += prevName[0];
                            subfolder = subfolders.get(id);
                            if (!subfolder)
                            {
                                subfolder = new TaskFile(this.extensionContext, folder, (each2 as TaskItem).task.definition, each.taskSource, (each2 as TaskItem).taskFile.path, true, prevName[0]);
                                subfolders.set(id, subfolder);
                                subfolder.addScript(prevTaskItem);
                                each.addScript(subfolder);
                            }
                            subfolder.addScript(each2);
                        }

                        prevName = each2.label.split("-");
                        prevTaskItem = each2;
                    });
                }
            });

            function removeScripts(each: any)
            {
                const taskTypesRmv2: TaskItem[] = [];
                each.scripts.forEach(each2 =>
                {
                    if (each2.label.split("-").length > 1)
                    {
                        const id = folder.label + each.taskSource + each2.label.split("-")[0];
                        if (subfolders.get(id))
                        {
                            taskTypesRmv2.push(each2);
                        }
                    }
                });
                taskTypesRmv2.forEach(each2 =>
                {
                    each.removeScript(each2);
                });
            }

            const taskTypesRmv: TaskFile[] = [];
            folder.taskFiles.forEach(each =>
            {
                const id = folder.label + each.taskSource;
                if (!each.isGroup && subfolders.get(id))
                {
                    taskTypesRmv.push(each);
                }
                else if (each.isGroup)
                {
                    each.scripts.forEach(each2 =>
                    {
                        removeScripts(each2);
                    });
                }
                else
                {
                    removeScripts(each);
                }
            });

            taskTypesRmv.forEach(each =>
            {
                folder.removeTaskFile(each);
            });

            //
            // Grouped task items
            //
            folder.taskFiles.forEach(each =>
            {
                each.scripts.forEach(each2 =>
                {
                    if (each2 instanceof TaskFile && each2.isGroup)
                    {
                        const rmvLbl = each2.label;
                        each2.scripts.forEach(each3 =>
                        {
                            each3.label = each3.label.replace(rmvLbl + "-", "");
                        });
                    }
                });
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
                if (each.isGroup)
                {
                    each.scripts.sort((a, b) =>
                    {
                        return a.label.localeCompare(b.label);
                    });
                }
            });
        });

        // if (folders.size === 1) { // return just fi
        // 	return [...packages.values()];
        // }
        return [...folders.values()];
    }
}
