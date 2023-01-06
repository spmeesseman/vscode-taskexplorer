/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */
import * as path from "path";
import * as assert from "assert";
import figures from "../lib/figures";
import TaskItem from "../tree/item";
import { deactivate } from "../extension";
import { testControl } from "./control";
import { configuration } from "../lib/utils/configuration";
import constants from "../lib/constants";
import TreeUtils from "./treeUtils";
import { deleteFile, pathExists } from "../lib/utils/fs";
import { IExplorerApi, ITaskExplorerApi, TaskMap } from "@spmeesseman/vscode-taskexplorer-types";
import { commands, extensions, Task, TaskExecution, tasks, Uri, window, workspace } from "vscode";
import { isObjectEmpty } from "../lib/utils/utils";

let activated = false;
let teApi: ITaskExplorerApi;
let teExplorer: IExplorerApi;
const originalShowInputBox = window.showInputBox;
const originalShowInfoBox = window.showInformationMessage;
const overridesShowInputBox: any[] = [];
const overridesShowInfoBox: any[] = [];

export const testsControl = testControl;
export let treeUtils: TreeUtils;
export { figures };

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
    assert(ext, "✘ Could not find extension");

    if (instance) instance.timeout(60 * 1000);

    if (!activated)
    {   //
        // Init settings
        // Note that the '*' is removed from package.json[activationEvents] before the runTest() call
        //
        await initSettings();
        //
        // Activate extension
        //
        console.log(`        ${figures.tick} Activating extension 'spmeesseman.vscode-taskexplorer'`);
        teApi = await ext.activate();
        console.log(`        ${figures.tick} Extension 'spmeesseman.vscode-taskexplorer' successfully activated`);
        //
        // Ensure extension initialized successfully
        //
        assert(isReady() === true, `        ${figures.cross} TeApi not ready`);
        if (!teApi.explorer) {
            assert.fail(`        ${figures.cross} Explorer instance does not exist`);
        }
        //
        // Enable tests mode within the application, it alters the flow in a few spots, not many.
        //
        teApi.setTests();
        //
        // Instantiate the treeUtils helper.  why a class? i don't know, got rid of it in production code
        // within a class and then added it to the test suite to still use the file walker to open and
        // find script locations within task files
        //
        treeUtils = new TreeUtils(teApi);
        //
        // _api pre-test suite will reset after disable/enable
        //
        setExplorer(teApi.explorer);
        //
        // waitForIdle() added 1/2/03 - Tree loads in delay 'after' activate()
        //
        teApi.waitForIdle();
        //
        // Write to console is just a tests feature, it's not controlled by settings, set it here if needed
        //
        teApi.log.setWriteToConsole(testsControl.logToConsole, testsControl.logLevel);
        //
        // All done
        //
        activated = true;
        console.log(`        ${figures.tick} Tests ready`);
    }
    return teApi;
}


export async function cleanup()
{
    const rootPath = getWsPath(".");

    await deactivate();

    window.showInputBox = originalShowInputBox;
    window.showInformationMessage = originalShowInfoBox;

    //
    // 1/5/23 - Removed and added to runTest.ts, before VSCoe is launched. leaving here
    //          commented in case i realize i need it again, 'cause that never happens
    //
    // if (!testsControl.keepSettingsFileChanges)
    // {
    //     settingsFile = path.join(rootPath, ".vscode", "settings.json");
    //     try {
    //         if (await pathExists(settingsFile)) {
    //             await writeFile(settingsFile, settingsJsonOrig);
    //         }
    //     } catch (e: any) { console.error(e.message); }
    // }

    try {
        const packageLockFile = path.join(rootPath, "package-lock.json");
        if (await pathExists(packageLockFile)) {
            await deleteFile(packageLockFile);
        }
    } catch (e) { console.error(e); }

    if (testsControl.logEnabled && testsControl.logToFile && testsControl.logOpenFileOnFinish)
    {
        const logFilePath = teApi.log.getLogFileName();
        if (logFilePath) {
            try {
                const doc = await workspace.openTextDocument(Uri.file(logFilePath));
                await window.showTextDocument(doc);
            } catch (e) { console.error(e); }
        }
    }
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
        if (taskItem)
        {
            if (taskItem.id?.includes(id) && !taskItem.isUser) {
                if (taskItem.id === ":ant") {
                    console.error("ant: " + taskItem.resourceUri?.fsPath);
                }
                found++;
            }
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


export function getSpecialTaskItemId(taskItem: TaskItem)
{
    return taskItem.id.replace(constants.LAST_TASKS_LABEL + ":", "")
                      .replace(constants.FAV_TASKS_LABEL + ":", "")
                      .replace(constants.USER_TASKS_LABEL + ":", "");
}


export async function getTreeTasks(taskType: string, expectedCount: number)
{
    const taskItems: TaskItem[] = [];
    //
    // Get the task mapped tree items
    //
    let taskMap = (teApi.explorer as IExplorerApi).getTaskMap();
    if (!taskMap || isObjectEmpty(taskMap)) {
        console.log(`        ${figures.warning} Task map is empty, fall back to walkTreeItems`);
        taskMap = await treeUtils.walkTreeItems(undefined);
        if (!taskMap || isObjectEmpty(taskMap)) {
            console.log(`        ${figures.cross} Task map is empty, getTreeTasks will fail`);
        }
    }
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
        if (taskItem && taskItem.taskSource === taskType) {
            taskItems.push(taskItem);
        }
    });
    return taskItems;
}


export const getWsPath = (p: string) =>
{
	return path.normalize(path.resolve(__dirname, "../../test-files", p));
};


async function initSettings()
{   //
    // Create .vscode directory if it doesn't exist, so the we have perms to
    // remove it after tests are done
    //
    // 1/5/23 - Removed and added to runTest.ts, before VSCoe is launched. leaving here
    //          commented in case i realize i need it again, 'cause that never happens
    //
    // const dirNameCode = getWsPath(".vscode"),
    //       settingsFile = path.join(dirNameCode, "settings.json");
    //
    // if (await pathExists(settingsFile)) {
    //     settingsJsonOrig = await readFileAsync(settingsFile);
    // }
    // await writeFile(settingsFile, "{}");

    await configuration.updateVsWs("terminal.integrated.shell.windows",
                                   "C:\\Windows\\System32\\cmd.exe");
    //
    // Use update() here for coverage, since these two settings wont trigger any processing
    //
    testsControl.userLogLevel = configuration.get<number>("logging.level");
    testsControl.userPathToAnt = configuration.get<string>("pathToPrograms.ant");
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
    await configuration.updateWs("groupWithSeparator", true);
    await configuration.updateWs("groupSeparator", "-");
    await configuration.updateWs("keepTermOnStop", false);
    await configuration.updateWs("logging.enable", testsControl.logEnabled);
    await configuration.updateWs("logging.level", testsControl.logLevel);
    await configuration.updateWs("logging.enableFile", testsControl.logToFile);
    await configuration.updateWs("logging.enableOutputWindow", testsControl.logToOutput);
    await configuration.updateWs("pathToPrograms", configuration.get<object>("pathToPrograms"));
    await configuration.updateWs("showHiddenWsTasks", true);
    await configuration.updateWs("showRunningTask", true);
    await configuration.updateWs("specialFolders.expanded", configuration.get<object>("specialFolders.expanded"));
    await configuration.updateWs("specialFolders.numLastTasks", 10);
    await configuration.updateWs("specialFolders.showFavorites", true);
    await configuration.updateWs("specialFolders.showLastTasks", true);
    await configuration.updateWs("specialFolders.showUserTasks", true);
    await configuration.updateWs("taskButtons.clickAction", "Open");
    await configuration.updateWs("taskButtons.showFavoritesButton", true);
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


function isReady(taskType?: string)
{
    let err: string | undefined;
    if (!teApi)                                 err = `        ${figures.cross} TeApi null`;
    else {
        if (!teApi.explorer)                    err = `        ${figures.cross} TeApi Explorer provider == null`;
        else if (teApi.sidebar)                err = `         ${figures.cross} TeApi Sidebar Provider != null`;
        else if (!teApi.providers)              err = `        ${figures.cross} Providers null`;
    }
    if (!err && taskType) {
        if (!teApi.providers.get(taskType))     err = `        ${figures.cross} ${taskType} Provider == null`;
    }
    if (!err && !(workspace.workspaceFolders ? workspace.workspaceFolders[0] : undefined)) {
                                                err = `        ${figures.cross} Workspace folder does not exist`;
    }
    if (!err && !extensions.getExtension("spmeesseman.vscode-taskexplorer")) {
                                                err = `        ${figures.cross} Extension not found`;
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


export function setExplorer(explorer: IExplorerApi)
{
    teExplorer = explorer;
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
    const tasksMap = (taskMap || (await treeUtils.walkTreeItems(undefined))),
    // const tasksMap = (teApi.explorer as IExplorerApi).getTaskMap(),
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

