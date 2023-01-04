/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */
import * as fs from "fs";
import * as path from "path";
import * as assert from "assert";
import TaskItem from "../tree/item";
import { deactivate } from "../extension";
import { testControl } from "./control";
import { IExplorerApi, ITaskExplorerApi, TaskMap } from "@spmeesseman/vscode-taskexplorer-types";
import { configuration } from "../lib/utils/configuration";
import { commands, extensions, Task, TaskExecution, tasks, window, workspace } from "vscode";

let activated = false;
let teApi: ITaskExplorerApi;
let teExplorer: IExplorerApi;
const originalShowInputBox = window.showInputBox;
const originalShowInfoBox = window.showInformationMessage;
const overridesShowInputBox: any[] = [];
const overridesShowInfoBox: any[] = [];

export const testsControl = testControl;


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
        teApi.setTests();
        teApi.waitForIdle(); // added 1/2/03 - Tree loads in delay 'after' activate()
        activated = true;
        if (!teApi.explorer) {
            assert.fail("        ✘ Explorer instance does not exist");
        }
        teExplorer = teApi.explorer;
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

    await executeSettingsUpdate("groupWithSeparator", true);
    await executeSettingsUpdate("groupSeparator", "-");
    await executeSettingsUpdate("groupMaxLevel", 5);

    //
    // A special refresh() for test suite, will open all task files and open to position
    //
    await teExplorer.refresh("tests");
    await teApi.waitForIdle(testsControl.waitTimeForBuildTree, 22500);
    return teExplorer.getChildren();
}


export async function cleanup()
{
    const rootPath = getWsPath("."),
          settingsFile = path.join(rootPath, ".vscode", "settings.json");

    await deactivate();

    window.showInputBox = originalShowInputBox;
    window.showInformationMessage = originalShowInfoBox;

    if (!testsControl.keepSettingsFile && fs.existsSync(settingsFile)) {
        try {
            fs.unlinkSync(settingsFile);
        } catch (e: any) { console.error(e.message); }
    }

    try {
        const packageLockFile = path.join(rootPath, "package-lock.json");
        if (fs.existsSync(packageLockFile)) {
            fs.unlinkSync(packageLockFile);
        }
    } catch (e: any) { console.error(e.message); }
}


export async function closeActiveDocument()
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
    const rc = await teApi.config.updateWs(key, value);
    await teApi.waitForIdle(minWait === 0 ? minWait : (minWait || testsControl.waitTimeForConfigEvent),
                            maxWait === 0 ? maxWait : (maxWait || testsControl.waitTimeMax));
    return rc;
}


export async function executeTeCommand(command: string, minWait?: number, maxWait?: number, ...args: any[])
{
    const rc = await commands.executeCommand(`taskExplorer.${command}`, ...args);
    await teApi.waitForIdle(minWait === 0 ? minWait : (minWait || testsControl.waitTimeForCommand),
                            maxWait === 0 ? maxWait : (maxWait || testsControl.waitTimeMax));
    return rc;
}


export function executeTeCommand2(command: string, args: any[], minWait?: number, maxWait?: number)
{
    return executeTeCommand(command, minWait, maxWait, ...args);
}


export function findIdInTaskMap(id: string, taskMap: TaskMap)
{
    let found = 0;
    Object.values(taskMap).forEach((taskItem) =>
    {
        if (taskItem.id?.includes(id) && !taskItem.isUser) {
            if (taskItem.id === ":ant") {
                console.error("ant: " + taskItem.resourceUri?.fsPath);
            }
            found++;
        }
    });
    return found;
}


export async function focusExplorer(instance: any)
{
    if (!teExplorer.isVisible()) {
        instance.slow(testsControl.slowTimeForRefreshCommand);
        await executeTeCommand("focus", 500, testsControl.slowTimeForFocusCommand);
        await teApi.waitForIdle(500, testsControl.slowTimeForRefreshCommand);
    }
}


export async function getTreeTasks(taskType: string, expectedCount: number)
{
    const taskItems: TaskItem[] = [];
    //
    // Get the task mapped tree items
    //
    const taskMap = await (teApi.explorer as IExplorerApi).getTaskItems(undefined, "   ");
    //
    // Make sure the tasks have been mapped in the explorer tree
    //
    const taskCount = findIdInTaskMap(`:${taskType}:`, taskMap);
    if (taskCount !== expectedCount) {
        assert.fail(`Unexpected ${taskType} task count (Found ${taskCount} of ${expectedCount})`);
    }
    //
    // Get the NPM tasks from the tree mappings
    //
    Object.values(taskMap).forEach((taskItem) =>
    {
        if (taskItem.taskSource === taskType) {
            taskItems.push(taskItem);
        }
    });
    return taskItems;
}


export const getWsPath = (p: string) =>
{
	return path.normalize(path.resolve(__dirname, "../../test-files", p));
};


async function initSettings(enable = true)
{
    await configuration.updateVsWs("terminal.integrated.shell.windows",
                                   "C:\\Windows\\System32\\cmd.exe");
    //
    // Enable views, use workspace level so that running this test from Code itself
    // in development doesn't trigger the TaskExplorer instance installed in the dev IDE
    //
    await configuration.updateWs("enableExplorerView", true);
    await configuration.updateWs("enableSideBar", false);
    //
    // Set misc settings, use workspace level so that running this test from Code itself
    // in development doesn't trigger the TaskExplorer instance installed in the dev IDE
    //
    await configuration.updateWs("autoRefresh", enable);
    await configuration.updateWs("enabledTasks",
    {
        ant: true,
        apppublisher: false,
        bash: true,
        batch: true,
        composer: false,
        gradle: true,
        grunt: true,
        gulp: true,
        make: true,
        maven: false,
        npm: true,
        nsis: false,
        perl: false,
        pipenv: false,
        powershell: false,
        python: true,
        ruby: false,
        tsc: true,
        workspace: true
    });
    await configuration.updateWs("exclude", [ "**/tasks_test_ignore_/**", "**/ant/**" ]);
    await configuration.updateWs("includeAnt", []); // Deprecated, use `globPatternsAnt`
    await configuration.updateWs("globPatternsAnt", [ "**/test.xml", "**/emptytarget.xml", "**/emptyproject.xml", "**/hello.xml" ]);
    await configuration.updateWs("groupSeparator", "-");
    await configuration.updateWs("groupMaxLevel", 1);
    await configuration.updateWs("groupWithSeparator", enable);
    await configuration.updateWs("groupSeparator", "-");
    await configuration.updateWs("keepTermOnStop", false);
    await configuration.updateWs("logging.enable", testsControl.writeToOutput);
    await configuration.updateWs("logging.level", testsControl.logLevel);
    await configuration.updateWs("logging.enableFile", testsControl.writeToFile);
    await configuration.updateWs("pathToPrograms", configuration.get<object>("pathToPrograms"));
    await configuration.updateWs("showHiddenWsTasks", enable);
    await configuration.updateWs("showRunningTask", enable);
    await configuration.updateWs("specialFolders.expanded", configuration.get<object>("specialFolders.expanded"));
    await configuration.updateWs("specialFolders.numLastTasks", 10);
    await configuration.updateWs("specialFolders.showFavorites", enable);
    await configuration.updateWs("specialFolders.showLastTasks", enable);
    await configuration.updateWs("specialFolders.showUserTasks", enable);
    await configuration.updateWs("taskButtons.clickAction", "Open");
    await configuration.updateWs("taskButtons.showFavoritesButton", enable);
    await configuration.updateWs("useGulp", false);
    await configuration.updateWs("useAnt", false);
}


function isExecuting(task: Task)
{
    const execs = tasks.taskExecutions.filter(e => e.task.name === task.name && e.task.source === task.source &&
                                            e.task.scope === task.scope && e.task.definition.path === task.definition.path);
    const exec = execs.find(e => e.task.name === task.name && e.task.source === task.source &&
                            e.task.scope === task.scope && e.task.definition.path === task.definition.path);
    return exec;
}


export function isReady(taskType?: string)
{
    let err: string | undefined;
    if (!teApi)                                 err = "        ✘ TeApi null";
    else {
        if (!teApi.explorer)                    err = "        ✘ TeApi Explorer provider == null";
        else if (teApi.sidebar)                err = "         ✘ TeApi Sidebar Provider != null";
        else if (!teApi.providers)              err = "        ✘ Providers null";
    }
    if (!err && taskType) {
        if (!teApi.providers.get(taskType))     err = `        ✘ ${taskType} Provider == null`;
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


export async function verifyTaskCount(taskType: string, expectedCount: number)
{
    let tTasks = await tasks.fetchTasks({ type: taskType !== "Workspace" ? taskType : undefined });
    if (taskType === "Workspace") {
        tTasks = tTasks.filter(t => t.source === "Workspace");
    }
    try {
        assert(tTasks && tTasks.length === expectedCount, `Unexpected ${taskType} task count (Found ${tTasks.length} of ${expectedCount})`);
    }
    catch (e) { throw e; }
}


export async function verifyTaskCountByTree(taskType: string, expectedCount: number, taskMap?: TaskMap)
{
    const tasksMap = (taskMap || (await (teApi.explorer as IExplorerApi).getTaskItems(undefined, "   "))),
            taskCount = findIdInTaskMap(`:${taskType}:`, tasksMap);
    assert(taskCount === expectedCount, `Unexpected ${taskType} task count (Found ${taskCount} of ${expectedCount})`);
}


export async function waitForTaskExecution(exec: TaskExecution | undefined)
{
    if (exec) {
        while (isExecuting(exec.task)) {
            await sleep(25);
        }
    }
}
