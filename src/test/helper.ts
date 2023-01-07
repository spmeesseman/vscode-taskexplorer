/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */
import * as path from "path";
import * as assert from "assert";
import * as treeUtils from "./treeUtils";
import figures from "../lib/figures";
import TaskItem from "../tree/item";
import { deactivate } from "../extension";
import { testControl } from "./control";
import { configuration } from "../lib/utils/configuration";
import constants from "../lib/constants";
import { deleteFile, pathExists } from "../lib/utils/fs";
import { IExplorerApi, ITaskExplorerApi } from "@spmeesseman/vscode-taskexplorer-types";
import { commands, extensions, Task, TaskExecution, tasks, window, workspace } from "vscode";
import { log } from "console";

let activated = false;
let teApi: ITaskExplorerApi;
let teExplorer: IExplorerApi;
const originalShowInputBox = window.showInputBox;
const originalShowInfoBox = window.showInformationMessage;
const overridesShowInputBox: any[] = [];
const overridesShowInfoBox: any[] = [];

export { figures };
export { testControl };
export { treeUtils };

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
    assert(ext, `    ${figures.color.error} Could not find extension`);

    if (instance) instance.timeout(60 * 1000);

    if (!activated)
    {
        console.log(`    ${figures.color.info}`);
        console.log(`    ${figures.color.info} ${figures.withColor("Tests startup", figures.colors.grey)}`);
        //
        // Init settings
        // Note that the '*' is removed from package.json[activationEvents] before the runTest() call
        //
        console.log(`    ${figures.color.info} ${figures.withColor("Initializing settings", figures.colors.grey)}`);
        await initSettings();
        //
        // Activate extension
        //
        console.log(`    ${figures.color.info} ${figures.withColor("Activating extension 'spmeesseman.vscode-taskexplorer'", figures.colors.grey)}`);
        teApi = await ext.activate();
        console.log(`    ${figures.color.info} ${figures.withColor("Extension 'spmeesseman.vscode-taskexplorer' successfully activated", figures.colors.grey)}`);
        //
        // Ensure extension initialized successfully
        //
        assert(isReady() === true, `    ${figures.color.error} TeApi not ready`);
        if (!teApi.explorer) {
            assert.fail(`    ${figures.color.error} Explorer instance does not exist`);
        }
        //
        // _api pre-test suite will reset after disable/enable
        //
        console.log(`    ${figures.color.info} ${figures.withColor("Settings tests active explorer instance", figures.colors.grey)}`);
        setExplorer(teApi.explorer);
        //
        // waitForIdle() added 1/2/03 - Tree loads in delay 'after' activate()
        //
        console.log(`    ${figures.color.info} ${figures.withColor("Waiting for extension to initialize", figures.colors.grey)}`);
        teApi.waitForIdle();
        //
        // Write to console is just a tests feature, it's not controlled by settings, set it here if needed
        //
        teApi.log.setWriteToConsole(testControl.logToConsole, testControl.logLevel);
        //
        // All done
        //
        activated = true;
        console.log(`    ${figures.color.info} ${figures.withColor("Tests ready", figures.colors.grey)}`);
        console.log(`    ${figures.color.info}`);
    }
    return teApi;
}


export async function cleanup()
{
    console.log(`    ${figures.color.info}`);
    console.log(`    ${figures.color.info} ${figures.withColor("Tests complete, clean up", figures.colors.grey)}`);

    if (testControl.logEnabled && testControl.logToFile && testControl.logOpenFileOnFinish)
    {
        console.log(`    ${figures.color.info}`);
        console.log(`    ${figures.color.info} ${figures.withColor("Log File Location:", figures.colors.grey)}`);
        console.log(`    ${figures.color.info} ${figures.withColor("   " + teApi.log.getLogFileName(), figures.colors.grey)}`);
        console.log(`    ${figures.color.info}`);
    }

    console.log(`    ${figures.color.info} ${figures.withColor("Deactivating extension 'spmeesseman.vscode-taskexplorer'", figures.colors.grey)}`);
    await deactivate();
    console.log(`    ${figures.color.info} ${figures.withColor("Extension 'spmeesseman.vscode-taskexplorer' successfully deactivated", figures.colors.grey)}`);

    window.showInputBox = originalShowInputBox;
    window.showInformationMessage = originalShowInfoBox;

    //
    // 1/5/23 - Removed and added to runTest.ts, before VSCoe is launched. leaving here
    //          commented in case i realize i need it again, 'cause that never happens
    //
    // if (!testControl.keepSettingsFileChanges)
    // {
    //     settingsFile = path.join(rootPath, ".vscode", "settings.json");
    //     try {
    //         if (await pathExists(settingsFile)) {
    //             await writeFile(settingsFile, settingsJsonOrig);
    //         }
    //     } catch (e: any) { console.error(e.message); }
    // }

    console.log(`    ${figures.color.info} ${figures.withColor("Removing any leftover temporary files", figures.colors.grey)}`);
    try {
        const packageLockFile = path.join(getWsPath("."), "package-lock.json");
        if (await pathExists(packageLockFile)) {
            await deleteFile(packageLockFile);
        }
    } catch (e) { console.error(e); }

    console.log(`    ${figures.color.info} ${figures.withColor("Cleanup complete", figures.colors.grey)}`);
    console.log(`    ${figures.color.info} ${figures.withColor("Exiting", figures.colors.grey)}`);
    console.log(`    ${figures.color.info}`);
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
    await teApi.waitForIdle(minWait === 0 ? minWait : (minWait || testControl.waitTime.configEvent),
                            maxWait === 0 ? maxWait : (maxWait || testControl.waitTime.max));
    return rc;
}


export async function executeTeCommand(command: string, minWait?: number, maxWait?: number, ...args: any[])
{
    const rc = await commands.executeCommand(`taskExplorer.${command}`, ...args);
    await teApi.waitForIdle(minWait === 0 ? minWait : (minWait || testControl.waitTime.command),
                            maxWait === 0 ? maxWait : (maxWait || testControl.waitTime.max));
    return rc;
}


export function executeTeCommand2(command: string, args: any[], minWait?: number, maxWait?: number)
{
    return executeTeCommand(command, minWait, maxWait, ...args);
}


export async function focusExplorer(instance: any)
{
    if (!teExplorer.isVisible()) {
        instance.slow(testControl.slowTime.refreshCommand);
        await executeTeCommand("focus", 500, testControl.slowTime.focusCommand);
        await teApi.waitForIdle(500, testControl.slowTime.refreshCommand);
    }
}


export function getSpecialTaskItemId(taskItem: TaskItem)
{
    return taskItem.id.replace(constants.LAST_TASKS_LABEL + ":", "")
                      .replace(constants.FAV_TASKS_LABEL + ":", "")
                      .replace(constants.USER_TASKS_LABEL + ":", "");
}


export const getTeApi = () => teApi;


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
    testControl.userLogLevel = configuration.get<number>("logging.level");
    testControl.userPathToAnt = configuration.get<string>("pathToPrograms.ant");
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
    await configuration.updateWs("logging.enable", testControl.logEnabled);
    await configuration.updateWs("logging.level", testControl.logLevel);
    await configuration.updateWs("logging.enableFile", testControl.logToFile);
    await configuration.updateWs("logging.enableOutputWindow", testControl.logToOutput);
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
    if (!teApi)                                 err = `    ${figures.color.error} ${figures.withColor("TeApi null", figures.colors.grey)}`;
    else {
        if (!teApi.explorer)                    err = `    ${figures.color.error} ${figures.withColor("TeApi Explorer provider == null", figures.colors.grey)}`;
        else if (teApi.sidebar)                 err = `    ${figures.color.error} ${figures.withColor("TeApi Sidebar Provider != null", figures.colors.grey)}`;
        else if (!teApi.providers)              err = `    ${figures.color.error} ${figures.withColor("Providers null", figures.colors.grey)}`;
    }
    if (!err && taskType) {
        if (!teApi.providers.get(taskType))     err = `    ${figures.color.error} ${taskType} ${figures.withColor("Provider == null", figures.colors.grey)}`;
    }
    if (!err && !(workspace.workspaceFolders ? workspace.workspaceFolders[0] : undefined)) {
                                                err = `    ${figures.color.error} ${figures.withColor("Workspace folder does not exist", figures.colors.grey)}`;
    }
    if (!err && !extensions.getExtension("spmeesseman.vscode-taskexplorer")) {
                                                err = `    ${figures.color.error} ${figures.withColor("Extension not found", figures.colors.grey)}`;
    }
    if (err) {
        console.log(err);
    }
    return !err ? true : err;
}


export const logItsSupposedToHappenSoICanStopShittingMyselfOverRedErrorMsgs = (willFail = true) =>
{
    if (willFail) {
        console.log(`    ${figures.color.success}  ${figures.color.success}  ${figures.color.success}  ${figures.color.success}  ${figures.color.success}  ` +
                    `${figures.color.success}  ${figures.color.success}  ${figures.color.success}  ${figures.color.success}  ${figures.color.success}  ` +
                    `${figures.color.success}  ${figures.color.success}  ${figures.color.success}  ${figures.color.success}  ${figures.color.success}  ` +
                    `${figures.color.success}  ${figures.color.success}  ${figures.color.success}  ${figures.color.success}  ${figures.color.success}  ` +
                    `${figures.color.success}  ${figures.color.success}  ${figures.color.success}  ${figures.color.success}  ${figures.color.success}`);
        console.log(`    ${figures.color.success}  ${figures.color.success}  ${figures.color.success}  ${figures.color.success}  ` +
                    `${figures.color.up}  ${figures.withColor("  THESE ERRORS WERE SUPPOSED TO HAPPEN!!!  ", figures.colors.green)}  ` +
                    `${figures.color.up}  ${figures.color.success}  ${figures.color.success}  ${figures.color.success}  ${figures.color.success}`);
        console.log(`    ${figures.color.success}  ${figures.color.success}  ${figures.color.success}  ${figures.color.success}  ${figures.color.success}  ` +
                    `${figures.color.success}  ${figures.color.success}  ${figures.color.success}  ${figures.color.success}  ${figures.color.success}  ` +
                    `${figures.color.success}  ${figures.color.success}  ${figures.color.success}  ${figures.color.success}  ${figures.color.success}  ` +
                    `${figures.color.success}  ${figures.color.success}  ${figures.color.success}  ${figures.color.success}  ${figures.color.success}  ` +
                    `${figures.color.success}  ${figures.color.success}  ${figures.color.success}  ${figures.color.success}  ${figures.color.success}`);
    }
};


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


export function tagLog(test: string, suite: string)
{
    teApi.log.write("******************************************************************************************");
    teApi.log.write(" SUITE: " + suite.toUpperCase() + "  -  TEST : " + test);
    teApi.log.write("******************************************************************************************");
}


export async function verifyTaskCount(taskType: string, expectedCount: number)
{
    let tTasks = await tasks.fetchTasks({ type: taskType !== "Workspace" ? taskType : undefined });
    if (taskType === "Workspace") {
        tTasks = tTasks.filter(t => t.source === "Workspace");
    }
    try {
        assert(tTasks && tTasks.length === expectedCount, `${figures.color.error} Unexpected ${taskType} task count (Found ${tTasks.length} of ${expectedCount})`);
    }
    catch (e) { throw e; }
}


export async function waitForTaskExecution(exec: TaskExecution | undefined)
{
    if (exec) {
        while (isExecuting(exec.task)) {
            await sleep(25);
        }
    }
}

