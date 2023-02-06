
import TaskFile from "./file";
import TaskItem from "./item";
import log from "../lib/log/log";
import { dirname } from "path";
import { TaskMap } from "../interface";
import { pathExists } from "../lib/utils/fs";
import { TeContainer } from "../lib/container";
import { TaskTreeManager } from "./treeManager";
import { getTerminal } from "../lib/getTerminal";
import { ScriptTaskProvider } from "../providers/script";
import { configuration } from "../lib/utils/configuration";
import { isScriptType } from "../lib/utils/taskTypeUtils";
import { getPackageManager, timeout } from "../lib/utils/utils";
import { findDocumentPosition } from "../lib/findDocumentPosition";
import {
    CustomExecution, InputBoxOptions, Selection, ShellExecution, Task, TaskDefinition,
    TaskExecution, TaskRevealKind, tasks, TextDocument, Uri, window, workspace, WorkspaceFolder
} from "vscode";

// const views: IDictionary<any> = {};


export const open = async(selection: TaskItem, itemClick = false) =>
{
    const clickAction = configuration.get<string>("taskButtons.clickAction", "Open");

    //
    // As of v1.30.0, added option to change the entry item click to execute.  In order to avoid having
    // to re-register the handler when the setting changes, we just re-route the request here
    //
    if (clickAction === "Execute" && itemClick === true) {
        return run(selection);
    }

    const uri = !isScriptType(selection.taskSource) ?
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
};


// export const registerTreeTasks = (tree: TaskTreeDataProvider, disposables: Disposable[]) =>
// {
//     const name = tree.getName();
//     views[tree.getName()] = { tree, lastTasks };
//     disposables.push(commands.registerCommand(name + ".run",  async (item: TaskItem) => run(tree, item, lastTasks), tree));
//     disposables.push(commands.registerCommand(name + ".runNoTerm",  async (item: TaskItem) => run(tree, item, lastTasks, true, false), tree));
//     disposables.push(commands.registerCommand(name + ".runWithArgs",  async (item: TaskItem, args?: string) => run(tree, item, lastTasks, false, true, args), tree));
//     disposables.push(commands.registerCommand(name + ".runLastTask",  async () => runLastTask(tree, taskMap, lastTasks), tree));
//     disposables.push(commands.registerCommand(name + ".stop", async (item: TaskItem) => stop(tree, item), tree));
//     disposables.push(commands.registerCommand(name + ".restart",  async (item: TaskItem) => restart(tree, item, lastTasks), tree));
//     disposables.push(commands.registerCommand(name + ".pause",  (item: TaskItem) => pause(tree, item), tree));
// };


export const pause = (taskItem: TaskItem) =>
{
    if (taskItem.paused || TaskTreeManager.isBusy())
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
        {
            taskItem.paused = true;
            log.value("   send to terminal", "\\u0003", 1);
            terminal.sendText("\u0003");
        }
        else {
            window.showInformationMessage("Terminal not found");
        }
    }
    else {
        window.showInformationMessage("Executing task not found");
    }

    log.methodDone("pause", 1);
};


export const restart = async(taskItem: TaskItem) =>
{
    let exec: TaskExecution | undefined;
    log.methodStart("restart task", 1, "", true);
    if (TaskTreeManager.isBusy())
    {
        window.showInformationMessage("Busy, please wait...");
    }
    else {
        await stop(taskItem);
        exec = await run(taskItem);
    }
    log.methodDone("restart task", 1);
    return exec;
};


const resumeTask = (taskItem: TaskItem) =>
{
    let exec: TaskExecution | undefined;
    log.methodStart("resume task", 1, "", true);
    const term = getTerminal(taskItem, "   ");
    if (term)
    {   //
        // TODO - see ticket.  I guess its not CTRL+C in some parts.
        // so make the control chars a setting.  Also in stop().
        //
        log.value("   send to terminal", "N", 1);
        term.sendText("N", true);
        exec = taskItem.execution;
    }
    else {
        window.showInformationMessage("Terminal not found");
    }
    taskItem.paused = false;
    log.methodDone("resume task", 1);
    return exec;
};


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
export const run = async(taskItem: TaskItem, noTerminal = false, withArgs = false, args?: string) =>
{
    let exec: TaskExecution | undefined;

    if (TaskTreeManager.isBusy())
    {
        window.showInformationMessage("Busy, please wait...");
        return exec;
    }

    log.methodStart("run task", 1, "", true, [[ "task name", taskItem.label ]]);
    taskItem.taskDetached = undefined;

    if (withArgs === true)
    {
        exec = await runWithArgs(taskItem, args, noTerminal);
    }
    else if (taskItem.paused)
    {
        exec = resumeTask(taskItem);
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
                  p = TeContainer.instance.providers[def.type];
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
        exec = await runTask(newTask, taskItem, noTerminal);
    }

    log.methodDone("run task", 1);
    return exec;
};


export const runNpmCommand = async(taskFile: TaskFile, command: string) =>
{
    const pkgMgr = getPackageManager(),
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
};


export const runLastTask = async(taskMap: TaskMap) =>
{
    if (TaskTreeManager.isBusy())
    {
        window.showInformationMessage("Busy, please wait...");
        return;
    }

    const lastTasks = TaskTreeManager.getlastTasksFolder();
    const lastTaskId = lastTasks.getLastRanId();
    if (!lastTaskId) { return; }

    log.methodStart("run last task", 1, "", true, [[ "last task id", lastTaskId ]]);

    const taskItem = taskMap[lastTaskId];
    let exec: TaskExecution | undefined;

    if (taskItem && taskItem instanceof TaskItem)
    {
        exec = await run(taskItem);
    }
    else {
        window.showInformationMessage("Task not found!  Check log for details");
        await lastTasks.removeTaskFile(lastTaskId, "   ", true);
    }

    log.methodDone("run last task", 1);
    return exec;
};


export const runTask = async (task: Task, taskItem: TaskItem, noTerminal?: boolean, logPad = "   ") =>
{
    log.methodStart("run task", 1, logPad, false, [[ "no terminal", noTerminal ]]);
    task.presentationOptions.reveal = noTerminal !== true ? TaskRevealKind.Always : TaskRevealKind.Silent;
    const exec = await tasks.executeTask(task);
    const lastTasks = TaskTreeManager.getlastTasksFolder();
    await lastTasks.saveTask(taskItem, logPad);
    log.methodDone("run task", 1, logPad, [[ "success", !!exec ]]);
    return exec;
};


/**
 * Run/execute a command, with arguments (prompt for args)
 *
 * @param taskItem TaskItem instance
 * @param noTerminal Whether or not to show the terminal
 * Note that the terminal will be shown if there is an error
 */
export const runWithArgs = async(taskItem: TaskItem, args?: string, noTerminal?: boolean, logPad = "   ") =>
{
    let exec: TaskExecution | undefined;
    log.methodStart("run task with arguments", 1, logPad, false, [[ "no terminal", noTerminal ]]);
    /* istanbul ignore else */
    if (taskItem.task && !(taskItem.task.execution instanceof CustomExecution))
    {
        const opts: InputBoxOptions = { prompt: "Enter command line arguments separated by spaces"};

        const _run = async (_args: string | undefined) =>
        {
            let exec: TaskExecution | undefined;
            if (_args)
            {
                let newTask = taskItem.task;
                const def = taskItem.task.definition,
                      folder = taskItem.getFolder();
                // if (folder)
                // {
                    newTask = (new ScriptTaskProvider()).createTask(
                        def.script, undefined, folder as WorkspaceFolder, def.uri, _args.trim().split(" "), logPad + "   "
                    ) as Task;
                    newTask.definition.taskItemId = def.taskItemId;
                // }
                exec = await runTask(newTask, taskItem, noTerminal, logPad + "   ");
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
};


export const stop = async(taskItem: TaskItem) =>
{
    log.methodStart("stop", 1, "", true);

    if (TaskTreeManager.isBusy())
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
            /* istanbul ignore else */
            if (terminal)
            {
                const ctrlChar = configuration.get<string>("taskButtons.controlCharacter", "Y");
                log.write("   keep terminal open", 1);
                if (taskItem.paused)
                {
                    taskItem.paused = false;
                    log.value("   send to terminal", ctrlChar, 1);
                    terminal.sendText(ctrlChar);
                }
                else
                {
                    log.value("   send sequence to terminal", "\\u0003", 1);
                    terminal.sendText("\u0003");
                    await timeout(50);
                    log.value("   send to terminal", ctrlChar, 1);
                    // terminal = getTerminal(taskItem, "   ");
                    try { /* istanbul ignore else */if (getTerminal(taskItem, "   ")) terminal.sendText(ctrlChar, true); } catch {}
                }
            }
            else {
                window.showInformationMessage("Terminal not found");
            }
        }
        else {
            log.write("   kill task execution", 1);
            try { exec.terminate(); } catch {}
        }
    }
    else {
        window.showInformationMessage("Executing task not found");
    }

    taskItem.paused = false;
    log.methodDone("stop", 1);
};
