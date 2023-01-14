/* eslint-disable import/no-extraneous-dependencies */

import * as path from "path";
import * as assert from "assert";
import * as treeUtils from "./treeUtils";
import constants from "../../lib/constants";
import figures from "../../lib/figures";
import { expect } from "chai";
import { deactivate } from "../../extension";
import { testControl } from "../control";
import { getSuiteFriendlyName, getSuiteKey, processTimes } from "./bestTimes";
import { deleteFile, pathExists } from "../../lib/utils/fs";
import { configuration } from "../../lib/utils/configuration";
import { ILicenseManager } from "../../interface/ILicenseManager";
import { commands, extensions, Task, TaskExecution, tasks, window, workspace } from "vscode";
import { ITaskExplorer, ITaskExplorerApi, ITaskItem, IDictionary } from "@spmeesseman/vscode-taskexplorer-types";

export { figures };
export { testControl };
export { treeUtils };
export let teApi: ITaskExplorerApi;

let activated = false;
let teExplorer: ITaskExplorer;
let timeStarted: number;
const originalShowInputBox = window.showInputBox;
const originalShowInfoBox = window.showInformationMessage;
let overridesShowInputBox: any[] = [];
let overridesShowInfoBox: any[] = [];

window.showInputBox = (...args: any[]) =>
{
    let next = overridesShowInputBox.shift();
    if (typeof next === "undefined") {
        // return originalShowInputBox.call(null, args as any);
        // overrideNextShowInputBox("");
        next = undefined;
    }
    return new Promise((resolve, reject) => { resolve(next); });
};

window.showInformationMessage = (str: string, ...args: any[]) =>
{
    let next = overridesShowInfoBox.shift();
    if (typeof next === "undefined") {
        next = undefined;
        // return originalShowInfoBox(str, args as any);
    }
    return new Promise<string | undefined>((resolve, reject) => { resolve(next); });
};


export const activate = async (instance?: Mocha.Context) =>
{
    const ext = extensions.getExtension("spmeesseman.vscode-taskexplorer");
    assert(ext, `    ${figures.color.error} Could not find extension`);

    if (instance)
    {
        instance.timeout(60 * 1000);
        const suite = instance.currentTest?.parent;
        if (suite)
        {
            const suiteKey = getSuiteKey(suite.title);
            testControl.tests.suiteResults[suiteKey] = {
                timeStarted: Date.now(),
                numTests: suite.tests.length,
                suiteName: getSuiteFriendlyName(suite.title)
            };
        }
    }

    if (!activated)
    {
        timeStarted = Date.now();
        const tzOffset = (new Date()).getTimezoneOffset() * 60000,
              locISOTime = (new Date(Date.now() - tzOffset)).toISOString().slice(0, -1).replace("T", " ").replace(/[\-]/g, "/");

        console.log(`    ${figures.color.info}`);
        console.log(`    ${figures.color.info} ${figures.withColor("Tests startup", figures.colors.grey)}`);
        console.log(`    ${figures.color.info} ${figures.withColor("Time started: " + locISOTime, figures.colors.grey)}`);
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
        teApi.log.setWriteToConsole(testControl.log.console, testControl.log.level);
        //
        // All done
        //
        activated = true;
        console.log(`    ${figures.color.info} ${figures.withColor("Tests ready", figures.colors.grey)}`);
        console.log(`    ${figures.color.info}`);
    }
    return teApi;
};


export const cleanup = async () =>
{
    console.log(`    ${figures.color.info}`);
    console.log(`    ${figures.color.info} ${figures.withColor("Tests complete, clean up", figures.colors.grey)}`);

    if (testControl.log.enabled && testControl.log.file && testControl.log.openFileOnFinish)
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

    console.log(`    ${figures.color.info} ${figures.withColor("Removing any leftover temporary files", figures.colors.grey)}`);
    try {
        const packageLockFile = path.join(getWsPath("."), "package-lock.json");
        if (await pathExists(packageLockFile)) {
            await deleteFile(packageLockFile);
        }
    } catch (e) { console.error(e); }

    //
    // Reset Grunt and Gulp VSCode internal task providers, which we enabled b4 extension activation.
    // These get reset at the end of the Gulp suite's tests, but just in case we do it again here...
    //
    console.log(`    ${figures.color.info} ${figures.withColor("Resetting modified global settings", figures.colors.grey)}`);
    await configuration.updateVs("grunt.autoDetect", testControl.vsCodeAutoDetectGrunt);
    await configuration.updateVs("gulp.autoDetect", testControl.vsCodeAutoDetectGulp);

    //
    // Process execution timesand do the dorky best time thing that I forsome reason spent a whole
    // day of my life coding.
    //
    try { await processTimes(timeStarted); } catch (e) { console.error(e); }

    //
    // Exit
    //
    console.log(`    ${figures.color.info} ${figures.withColor("Exiting", figures.colors.grey)}`);
    console.log(`    ${figures.color.info}`);
};


export const clearOverrideShowInputBox = () =>
{
    overridesShowInputBox = [];
};


export const clearOverrideShowInfoBox = () =>
{
    overridesShowInfoBox = [];
};


export const closeActiveDocument = async () =>
{
	try {
		while (window.activeTextEditor) {
			await commands.executeCommand("workbench.action.closeActiveEditor");
            await sleep(10);
		}
	}
	catch (e) { console.error(e); }
};


export const executeSettingsUpdate = async (key: string, value?: any, minWait?: number, maxWait?: number) =>
{
    const rc = await teApi.config.updateWs(key, value);
    await teApi.waitForIdle(minWait === 0 ? minWait : (minWait || testControl.waitTime.configEvent),
                            maxWait === 0 ? maxWait : (maxWait || testControl.waitTime.max));
    return rc;
};


export const executeTeCommand = async (command: string, minWait?: number, maxWait?: number, ...args: any[]) =>
{
    const rc = await commands.executeCommand(`taskExplorer.${command}`, ...args);
    await teApi.waitForIdle(minWait === 0 ? minWait : (minWait || testControl.waitTime.command),
                            maxWait === 0 ? maxWait : (maxWait || testControl.waitTime.max));
    return rc;
};


export const executeTeCommand2 = (command: string, args: any[], minWait?: number, maxWait?: number) => executeTeCommand(command, minWait, maxWait, ...args);


export const exitRollingCount = (expectedCount: number) =>
{
    try {
        expect(expectedCount).to.be.equal(expectedCount);
    }
    catch {
        const msg = "skip test, rolling success count failure " + expectedCount;
        console.log(`    ${figures.color.warning} ${figures.withColor(msg, figures.colors.grey)}`);
        return false;
    }
    return true;
};


export const focusExplorerView = async (instance: any) =>
{
    if (!teExplorer.isVisible()) {
        instance.slow(testControl.slowTime.focusCommand + testControl.slowTime.refreshCommand +
                      (testControl.waitTime.focusCommand * 2) + testControl.waitTime.min + 100);
        await executeTeCommand("focus", testControl.waitTime.focusCommand);
        await teApi.waitForIdle(testControl.waitTime.focusCommand);
        sleep(100);
    }
    else {
        instance.slow(testControl.waitTime.min * 2);
    }
    await teApi.waitForIdle(testControl.waitTime.min);
};


export const getSpecialTaskItemId = (taskItem: ITaskItem) =>
    taskItem.id.replace(constants.LAST_TASKS_LABEL + ":", "").replace(constants.FAV_TASKS_LABEL + ":", "").replace(constants.USER_TASKS_LABEL + ":", "");


export const getTeApi = () => teApi;


export const getTestsPath = (p: string) => path.normalize(path.resolve(__dirname, p));


export const getWsPath = (p: string) => path.normalize(path.resolve(__dirname, "../../../test-files", p));


const initSettings = async () =>
{   //
    // This function runs BEFORE the extension is initialized, so any updates have no immediate
    // effect.  All settings set here will get read on on extension activation, coming up next.
    //
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


    testControl.user.logLevel = configuration.get<number>("logging.level");
    await configuration.updateVsWs("terminal.integrated.shell.windows", "C:\\Windows\\System32\\cmd.exe");
    //
    // Grunt / Gulp VSCode internal task providers. Gulp suite will disable when done.
    //
    testControl.vsCodeAutoDetectGrunt = configuration.getVs<string>("grunt.autoDetect", "off");
    testControl.vsCodeAutoDetectGulp = configuration.getVs<string>("gulp.autoDetect", "off");
    await configuration.updateVs("grunt.autoDetect", "on");
    await configuration.updateVs("gulp.autoDetect", "on");
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
        gradle: false,
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

    await configuration.updateWs("pathToPrograms",
    {
        ant: getWsPath("..\\tools\\ant\\bin\\ant.bat"), // "c:\\Code\\ant\\bin\\ant.bat",
        apppublisher: "",
        ansicon: getWsPath("..\\tools\\ansicon\\x64\\ansicon.exe"), // "c:\\Code\\ansicon\\x64\\ansicon.exe",
        bash: "bash",
        composer: "composer",
        gradle: "c:\\Code\\gradle\\bin\\gradle.bat",
        make: "C:\\Code\\compilers\\c_c++\\9.0\\VC\\bin\\nmake.exe",
        maven: "mvn",
        nsis: "c:\\Code\\nsis\\makensis.exe",
        perl: "perl",
        pipenv: "pipenv",
        powershell: "powershell",
        python: "c:\\Code\\python\\python.exe",
        ruby: "ruby"
    });
    // await configuration.updateWs("pathToPrograms.ant", testControl.userPathToAnt);
    // await configuration.updateWs("pathToPrograms.ansicon", testControl.userPathToAnsicon);

    await configuration.updateWs("logging.enable", testControl.log.enabled);
    await configuration.updateWs("logging.level", testControl.log.level);
    await configuration.updateWs("logging.enableFile", testControl.log.file);
    await configuration.updateWs("logging.enableFileSymbols", testControl.log.fileSymbols);
    await configuration.updateWs("logging.enableOutputWindow", testControl.log.output);

    await configuration.updateWs("specialFolders.numLastTasks", 10);
    await configuration.updateWs("specialFolders.showFavorites", true);
    await configuration.updateWs("specialFolders.showLastTasks", true);
    await configuration.updateWs("specialFolders.showUserTasks", true);
    // await configuration.updateWs("specialFolders.expanded", configuration.get<object>("specialFolders.expanded"));
    await configuration.updateWs("specialFolders.expanded", {
        favorites: true,
        lastTasks: true,
        userTasks: true
    });

    await configuration.updateWs("taskButtons.clickAction", "Open");
    await configuration.updateWs("taskButtons.showFavoritesButton", true);
    await configuration.updateWs("taskButtons.showExecuteWithArgumentsButton", false);
    await configuration.updateWs("taskButtons.showExecuteWithNoTerminalButton", false);

    await configuration.updateWs("visual.disableAnimatedIcons", true);
    await configuration.updateWs("visual.enableAnsiconForAnt", false);

    await configuration.updateWs("groupMaxLevel", 1);
    await configuration.updateWs("groupSeparator", "-");
    await configuration.updateWs("groupWithSeparator", true);

    await configuration.updateWs("exclude", [ "**/tasks_test_ignore_/**", "**/ant/**" ]);
    await configuration.updateWs("includeAnt", []); // Deprecated, use `globPatternsAnt`
    await configuration.updateWs("globPatternsAnt", [ "**/test.xml", "**/emptytarget.xml", "**/emptyproject.xml", "**/hello.xml" ]);
    await configuration.updateWs("keepTermOnStop", false);
    await configuration.updateWs("showHiddenWsTasks", true);
    await configuration.updateWs("showRunningTask", true);
    await configuration.updateWs("useGulp", false);
    await configuration.updateWs("useAnt", false);

    if (testControl.log.enabled)
    {
        const slowTimes = testControl.slowTime as IDictionary<number>;
        // const waitTimes = testControl.waitTime as IDictionary<number>;
        let factor = 1.01;
        if (testControl.log.output) {
            factor += 0.026;
        }
        if (testControl.log.file) {
            factor += 0.035;
        }
        if (testControl.log.console) {
            factor += 0.051;
        }
        // Object.keys(waitTimes).forEach((k) =>
        // {
        //     waitTimes[k] = Math.round(waitTimes[k] * factor);
        // });
        Object.keys(slowTimes).forEach((k) =>
        {
            slowTimes[k] = Math.round(slowTimes[k] * factor);
        });
    }
};


const isExecuting = (task: Task) =>
{
    const execs = tasks.taskExecutions.filter(e => e.task.name === task.name && e.task.source === task.source &&
                                            e.task.scope === task.scope && e.task.definition.path === task.definition.path);
    const exec = execs.find(e => e.task.name === task.name && e.task.source === task.source &&
                            e.task.scope === task.scope && e.task.definition.path === task.definition.path);
    return exec;
};


const isReady = (taskType?: string) =>
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
};


export const logItsSupposedToHappenSoICanStopShittingMyselfOverRedErrorMsgs = (willFail = true) =>
{
    if (willFail && testControl.log.enabled && teApi.config.get<boolean>("logging.enabled"))
    {
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


export const overrideNextShowInputBox = (value: any) =>
{
    overridesShowInputBox.push(value);
};


export const overrideNextShowInfoBox = (value: any) =>
{
    overridesShowInfoBox.push(value);
};


export const setExplorer = (explorer: ITaskExplorer) =>
{
    teExplorer = explorer;
};


export const setLicensed = async (valid: boolean, licMgr: ILicenseManager) =>
{
    teApi.setTests(!valid);
    await licMgr.setLicenseKey(valid ? "1234-5678-9098-7654321" : undefined);
    await licMgr.checkLicense();
    teApi.setTests(true);
};


export const sleep = async (ms: number) => new Promise(resolve => setTimeout(resolve, ms));


export const suiteFinished = (instance: Mocha.Context) =>
{
    const suite = instance.currentTest?.parent;
    if (suite)
    {
        const numTestsFailedThisSuite = suite.tests.filter(t => t.isFailed()).length,
              suiteKey = getSuiteKey(suite.title),
              suiteResults = testControl.tests.suiteResults[suiteKey] || {};
        testControl.tests.numTestsFail += numTestsFailedThisSuite;
        testControl.tests.numTestsSuccess += suite.tests.filter(t => t.isPassed()).length;
        testControl.tests.numSuites++;
        testControl.tests.numTests += suite.tests.length;
        if (numTestsFailedThisSuite > 0) {
            testControl.tests.numSuitesFail++;
        }
        else {
            testControl.tests.numSuitesSuccess++;
        }
        testControl.tests.suiteResults[suiteKey] = Object.assign(suiteResults,
        {
            success: numTestsFailedThisSuite === 0,
            timeFinished: Date.now(),
            numTestsFailed: numTestsFailedThisSuite
        });
    }
    else {
        teApi.log.warn("Suite Finished: Instance is undefined!");
    }
};


export const tagLog = (test: string, suite: string) =>
{
    teApi.log.write("******************************************************************************************");
    teApi.log.write(" SUITE: " + suite.toUpperCase() + "  -  TEST : " + test);
    teApi.log.write("******************************************************************************************");
};


/**
 * @param taskType Task type / source
 * @param expectedCount Expected # of tasks
 * @param retries Number of retries to make if expected count doesn'tmatch.  100ms sleep between each retry.
 */
export const verifyTaskCount = async (taskType: string, expectedCount: number, retries = 0, retryWait = 250) =>
{
    let tTasks = await tasks.fetchTasks({ type: taskType !== "Workspace" ? taskType : undefined });
    while (--retries >= 0 && tTasks.length !== expectedCount)
    {
        await sleep(retryWait > 0 ? retryWait : testControl.waitTime.verifyTaskCountRetryInterval);
        tTasks = await tasks.fetchTasks({ type: taskType !== "Workspace" ? taskType : undefined });
        if (taskType === "Workspace") {
            tTasks = tTasks.filter(t => t.source === "Workspace");
        }
    }
    try {
        assert(tTasks.length === expectedCount, `${figures.color.error} Unexpected ${taskType} task count (Found ${tTasks.length} of ${expectedCount})`);
    }
    catch (e) { throw e; }
};


export const waitForTaskExecution = async (exec: TaskExecution | undefined, maxWait?: number) =>
{
    if (exec)
    {
        let waited = 0;
        while (isExecuting(exec.task) && (!maxWait || waited < maxWait))
        {
            await sleep(50);
            waited += 50;
        }
    }
};
