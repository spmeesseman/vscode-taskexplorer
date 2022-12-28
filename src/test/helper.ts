/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */
import * as cp from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as assert from "assert";
import TaskItem from "../tree/item";
import { deactivate } from "../extension";
import { TaskExplorerApi } from "@spmeesseman/vscode-taskexplorer-types";
import { configuration } from "../common/configuration";
import { commands, extensions, tasks, window, workspace } from "vscode";

export const testsControl = {
    keepSettingsFile: false,
    logLevel: 3,
    writeToConsole: false,
    writeToOutput: true,
    slowTimeForCommand: 1000,
    slowTimeForConfigEvent: 200,
    slowTimeForConfigEnableEvent: 750,
    slowTimeForFocusCommand: 2000,
    slowTimeForFsCreateEvent: 1000,
    slowTimeForFsDeleteEvent: 750,
    slowTimeForRefreshCommand: 7500,
    userLogLevel: configuration.get<number>("debugLevel"),
    userPathToAnt: configuration.get<string>("pathToPrograms.ant"),
    waitTimeForFsCreateEvent: 200,
    waitTimeForFsDeleteEvent: 200,
    waitTimeForFsModifyEvent: 150,
    waitTimeForConfigEvent: 125,
    waitTimeForConfigEnableEvent: 175,
    waitTimeForCommand: 150,
    waitTimeForCommandFast: 50,
    waitTimeForRefreshCommand: 5000,
    waitTimeForRefreshTaskTypeCommand: 1000,
    waitTimeForRunCommand: 3000,
    waitTimeMax: 15000
};

let activated = false;
let teApi: TaskExplorerApi;
const originalShowInputBox = window.showInputBox;
const originalShowInfoBox = window.showInformationMessage;
const overridesShowInputBox: any[] = [];
const overridesShowInfoBox: any[] = [];

window.showInputBox = (...args: any[]) =>
{
    let next = overridesShowInputBox.shift();
    if (typeof next === "undefined")
    {
        // return originalShowInputBox.call(null, args as any);
        // overrideNextShowInputBox("");
        next = undefined;
    }
    return new Promise((resolve, reject) =>
    {
        resolve(next);
    });
};

window.showInformationMessage = (str: string, ...args: any[]) =>
{
    let next = overridesShowInfoBox.shift();
    if (typeof next === "undefined")
    {
        next = undefined;
        // return originalShowInfoBox(str, args as any);
    }
    return new Promise<string | undefined>((resolve, reject) =>
    {
        resolve(next);
    });
};


/**
 * Activates the spmeesseman.vscode-taskexplorer extension
 */
export async function activate(instance?: any)
{
    const ext = extensions.getExtension("spmeesseman.vscode-taskexplorer");
    assert(ext, "Could not find extension");
    if (instance) instance.timeout(60 * 1000);

    if (!activated)
    {   //
        // Create .vscode directory if it doesn't exist, so the we have perms to
		// remove it after tests are done
        //
        const dirNameCode = getWsPath(".vscode"),
			  settingsFile = path.join(dirNameCode, "settings.json");
        if (!fs.existsSync(settingsFile)) {
            fs.writeFileSync(settingsFile, "{}");
        }
        //
        // Init settings
        // Note that the '*' is removed from package.json[activationEvents] before the runTest() call
        //
        await initSettings(true);
        //
        // Activate extension
        //
        teApi = await ext.activate();
        activated = true;
        //
        // For debugging
        //
        teApi.log.setWriteToConsole(testsControl.writeToConsole, testsControl.logLevel);
    }
    return teApi;
}


/**
 * Pretty much mimics the tree construction in cases when we want to construct it
 * when the tree view is collapsed and not updating automatically via GUI events.
 * Once the view/shelf is focused/opened somewhere within the running tests, there'd
 * be no need to call this function anymore.
 *
 * @param instance The test instance to set the timeout and slow time on.
 */
export async function buildTree(instance: any)
{
    instance.slow(20000);
    instance.timeout(30000);

    if (!teApi.explorer) {
        return [];
    }

    await executeSettingsUpdate("groupWithSeparator", true);
    await executeSettingsUpdate("groupSeparator", "-");
    await executeSettingsUpdate("groupMaxLevel", 5);

    //
    // A special refresh() for test suite, will open all task files and open to position
    //
    await teApi.explorer.refresh("tests");
    await teApi.waitForIdle(testsControl.waitTimeForRefreshCommand, 40000);
    return teApi.explorer.getChildren();
}


export async function cleanup()
{
    const rootPath = getWsPath("."),
          dirNameCode = getWsPath(".vscode"),
          settingsFile = path.join(dirNameCode, "settings.json");

    await deactivate();

    window.showInputBox = originalShowInputBox;
    window.showInformationMessage = originalShowInfoBox;

    if (!testsControl.keepSettingsFile && fs.existsSync(settingsFile)) {
        try {
            fs.unlinkSync(settingsFile);
        } catch {}
    }

    try {
        const packageLockFile = path.join(rootPath, "package-lock.json");
        if (fs.existsSync(packageLockFile)) {
            fs.unlinkSync(settingsFile);
        }
    } catch {}
}


export async function closeActiveDocuments()
{
	try {
		// while (window.activeTextEditor) {
			await commands.executeCommand("workbench.action.closeActiveEditor");
		// }
	}
	catch (e) {
		console.error(e);
	}
	// await waitForValidation();
}


export async function executeSettingsUpdate(key: string, value?: any, minWait?: number, maxWait?: number)
{
    const rc = await configuration.updateWs(key, value);
    await teApi.waitForIdle(minWait || testsControl.waitTimeForConfigEvent, maxWait || testsControl.waitTimeMax);
    return rc;
}


export async function executeTeCommand(command: string, minWait?: number, maxWait?: number, ...args: any[])
{
    const rc = await commands.executeCommand(`taskExplorer.${command}`, ...args);
    await teApi.waitForIdle(minWait || testsControl.waitTimeForCommand, maxWait || testsControl.waitTimeMax);
    return rc;
}


export function executeTeCommand2(command: string, args: any[], minWait?: number, maxWait?: number)
{
    return executeTeCommand(command, minWait, maxWait, ...args);
}


export function findIdInTaskMap(id: string, taskMap: Map<string, TaskItem>)
{
    let found = 0;
    for (const [ k, task ] of taskMap)
    {
        if (task.id?.includes(id) && !task.isUser) {
            if (task.id === ":ant") {
                console.error("ant: " + task.resourceUri?.fsPath);
            }
            found++;
        }
    }
    return found;
}


export async function getTreeTasks(taskType: string, expectedCount: number)
{
    const taskItems: TaskItem[] = [];
    //
    // Get the task mapped tree items
    //
    const taskMap = await teApi.explorer?.getTaskItems(undefined, "   ") as unknown as Map<string, TaskItem>;
    //
    // Make sure the tasks have been mapped in the explorer tree
    // There should be one less task as the VSCode enginereturned above as the Explorer
    // tree does not display the 'install' task
    //
    const taskCount = findIdInTaskMap(`:${taskType}:`, taskMap);
    if (taskCount !== expectedCount) {
        assert.fail(`Unexpected ${taskType} task count (Found ${taskCount} of ${expectedCount})`);
    }
    //
    // Get the NPM tasks from the tree mappings
    //
    for (const map of taskMap)
    {
        if (map[1] && map[1].taskSource === taskType) {
            taskItems.push(map[1]);
        }
    }
    return taskItems;
}


export const getWsPath = (p: string) =>
{
	return path.normalize(path.resolve(__dirname, "../../test-files", p));
};


export async function initSettings(enable = true)
{
    await configuration.updateVsWs("terminal.integrated.shell.windows",
                                 "C:\\Windows\\System32\\cmd.exe");
    await configuration.updateWs("exclude", [ "**/tasks_test_ignore_/**", "**/ant/**" ]);
    //
    // Enable views, use workspace level so that running this test from Code itself
    // in development doesn't trigger the TaskExplorer instance installed in the dev IDE
    //
    await configuration.updateWs("enableExplorerView", true);
    await configuration.updateWs("enableSideBar", true);
    //
    // Set misc settings, use workspace level so that running this test from Code itself
    // in development doesn't trigger the TaskExplorer instance installed in the dev IDE
    //
    await configuration.updateWs("includeAnt", [ "**/test.xml", "**/emptytarget.xml", "**/emptyproject.xml", "**/hello.xml" ]);
    // Use update() here for coverage, since these two settings wont trigger any processing
    await configuration.updateWs("debug", testsControl.writeToOutput);
    await configuration.updateWs("debugLevel", testsControl.logLevel);
    await configuration.updateWs("autoRefresh", enable);
    await configuration.updateWs("useGulp", false);
    await configuration.updateWs("useAnt", false);
    await configuration.updateWs("groupSeparator", "-");
    await configuration.updateWs("numLastTasks", 10);
    await configuration.updateWs("groupMaxLevel", 1);
    await configuration.updateWs("clickAction", "Open");
    //
    // Enabled all options, use workspace level so that running this test from Code itself
    // in development doesnt trigger the TaskExplorer instance installed in the dev IDE
    //
    await configuration.updateWs("groupWithSeparator", enable);
    await configuration.updateWs("groupSeparator", "-");
    await configuration.updateWs("showLastTasks", enable);
    await configuration.updateWs("keepTermOnStop", false);
    await configuration.updateWs("readUserTasks", enable);
    await configuration.updateWs("showFavoritesButton", enable);
    await configuration.updateWs("showHiddenWsTasks", enable);
    await configuration.updateWs("showRunningTask", enable);
    await configuration.updateWs("enabledTasks", configuration.get<object>("enabledTasks"));
    await configuration.updateWs("pathToPrograms", configuration.get<object>("pathToPrograms"));
}


export function isReady(taskType?: string)
{
    let err: string | undefined;
    if (!teApi)                                 err = "        ✘ TeApi null";
    else {
        if (!teApi.explorer)                    err = "        ✘ TeApi Explorer provider null";
        else if (!teApi.sidebar)                err = "        ✘ TeApi Sidebar Provider null";
        else if (!teApi.providers)              err = "        ✘ Providers null";
    }
    if (!err && taskType) {
        if (!teApi.providers.get(taskType))     err = `        ✘ ${taskType} Provider null`;
    }
    if (!err && !(workspace.workspaceFolders ? workspace.workspaceFolders[0] : undefined)) {
                                                err = "        ✘ Workspace folder does not exist";
    }
    if (!err && !extensions.getExtension("spmeesseman.vscode-taskexplorer")) {
                                                err = "        ✘ Extension not found";
    }
    if (err) {
        console.log(err);
    }
    return !err ? true : err;
}


export function overrideNextShowInputBox(value: any)
{
    overridesShowInputBox.push(value);
}


export function overrideNextShowInfoBox(value: any)
{
    overridesShowInfoBox.push(value);
}


export async function sleep(ms: number)
{
	return new Promise(resolve => setTimeout(resolve, ms));
}


export function spawn(command: string, args?: string[], options?: cp.SpawnOptions): cp.ChildProcess
{
    let proc: cp.ChildProcess;
    if (options) {
        proc = cp.spawn(command, args || [], options);
    }
    else {
        proc = cp.spawn(command, args || []);
    }

    // let fullCommand = "command: " + command;

    // if (args) {
    //   fullCommand += ' "' + args.join('" "') + '"';
    // }
    // console.log(fullCommand);

    // proc.stdout.on("data", function(data) {
    //   console.log("stdout: " + data.toString());
    // });

    // proc.stderr.on("data", function(data) {
    //   console.log("stderr: " + data.toString());
    // });

    // proc.on("exit", function(code) {
    //   console.log("child process exited with code " + code.toString());
    // });

    return proc;
}


export async function testCommand(command: string, ...args: any[])
{
	return commands.executeCommand("taskExplorer." + command, ...args);
}


export async function verifyTaskCount(taskType: string, expectedCount: number, scriptType?: string)
{
    let tTasks = await (await tasks.fetchTasks({ type: taskType !== "Workspace" ? taskType : undefined }));
    if (scriptType) {
        tTasks = tTasks.filter(t => !scriptType || scriptType === t.source);
    }
    else if (taskType === "Workspace") {
        tTasks = tTasks.filter(t => t.source === "Workspace");
    }
    try {
        assert(tTasks && tTasks.length === expectedCount, `Unexpected ${taskType} task count (1)(Found ${tTasks.length} of ${expectedCount})`);
    }
    catch (e) { throw e; }
}
