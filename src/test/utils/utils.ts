/* eslint-disable import/no-extraneous-dependencies */

import * as path from "path";
import * as assert from "assert";
import * as treeUtils from "./treeUtils";
import figures from "../../lib/figures";
import constants from "../../lib/constants";
import { expect } from "chai";
import { deactivate, getLicenseManager } from "../../extension";
import { testControl } from "../control";
import { getSuiteFriendlyName, getSuiteKey, processTimes } from "./bestTimes";
import { deleteFile, pathExists } from "../../lib/utils/fs";
import { configuration } from "../../lib/utils/configuration";
import { ILicenseManager } from "../../interface/ILicenseManager";
import { commands, extensions, Task, TaskExecution, tasks, window, workspace } from "vscode";
import { ITaskExplorer, ITaskExplorerApi, ITaskItem } from "@spmeesseman/vscode-taskexplorer-types";
import initSettings from "./initSettings";
import { getWsPath, getTestsPath } from "./sharedUtils";
import { ITaskExplorerProvider } from "../../interface/ITaskProvider";

export { figures };
export { testControl };
export { treeUtils };
export { getWsPath, getTestsPath };
export let teApi: ITaskExplorerApi;

let activated = false;
let hasRollingCountError = false;
let teExplorer: ITaskExplorer;
let explorerHasFocused = false;
let timeStarted: number;
let overridesShowInputBox: any[] = [];
let overridesShowInfoBox: any[] = [];

const tc = testControl;
const originalShowInputBox = window.showInputBox;
const originalShowInfoBox = window.showInformationMessage;

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
            tc.tests.suiteResults[suiteKey] = {
                timeStarted: Date.now(),
                numTests: suite.tests.length,
                success: false,
                successCount: -1,
                suiteName: getSuiteFriendlyName(suite.title),
                timeFinished: 0,
                numTestsFailed: 0
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
        waitForTeIdle();
        //
        // Write to console is just a tests feature, it's not controlled by settings, set it here if needed
        //
        teApi.log.setWriteToConsole(tc.log.console, tc.log.level);
        //
        // Set to 'licensed mode'
        //
        setLicensed(true, getLicenseManager());
        //
        // All done
        //
        activated = true;
        console.log(`    ${figures.color.info} ${figures.withColor("Tests ready", figures.colors.grey)}`);
        console.log(`    ${figures.color.info}`);
    }
    return { teApi, testsApi: teApi.testsApi, fsApi: teApi.testsApi.fs, configApi: teApi.config, explorer: teApi.testsApi.explorer, utils: teApi.utilities };
};


export const cleanup = async () =>
{
    console.log(`    ${figures.color.info}`);
    console.log(`    ${figures.color.info} ${figures.withColor("Tests complete, clean up", figures.colors.grey)}`);

    if (tc.log.enabled && tc.log.file && tc.log.openFileOnFinish)
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
    await configuration.updateVs("grunt.autoDetect", tc.vsCodeAutoDetectGrunt);
    await configuration.updateVs("gulp.autoDetect", tc.vsCodeAutoDetectGulp);

    console.log(`    ${figures.color.info} ${figures.withColor("Cleanup complete", figures.colors.grey)}`);

    //
    // Process execution timesand do the dorky best time thing that I forsome reason spent a whole
    // day of my life coding.
    //
    try { await processTimes(timeStarted, hasRollingCountError); } catch (e) { console.error(e); }

    //
    // Exit
    //
    console.log(`    ${figures.color.info} ${figures.withColor("Exiting", figures.colors.grey)}`);
    console.log(`    ${figures.color.info}`);

    //
    // If rolling count error is set, then Mocha think we're successful, throw here to make the
    // test run fail.
    //
    expect(hasRollingCountError === false, "There was a rolling count failure");
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
    await waitForTeIdle(minWait === 0 ? minWait : (minWait || tc.waitTime.config.event),
                        maxWait === 0 ? maxWait : (maxWait || tc.waitTime.max));
    return rc;
};


export const executeTeCommandAsync = async (command: string, minWait?: number, maxWait?: number, ...args: any[]) =>
{
    commands.executeCommand(`taskExplorer.${command}`, ...args);
    await waitForTeIdle(minWait === 0 ? minWait : (minWait || tc.waitTime.command),
                        maxWait === 0 ? maxWait : (maxWait || tc.waitTime.max));
};


export const executeTeCommand2Async = (command: string, args: any[], minWait?: number, maxWait?: number) => executeTeCommandAsync(command, minWait, maxWait, ...args);


export const executeTeCommand = async (command: string, minWait?: number, maxWait?: number, ...args: any[]) =>
{
    const rc = await commands.executeCommand(`taskExplorer.${command}`, ...args);
    await waitForTeIdle(minWait === 0 ? minWait : (minWait || tc.waitTime.command),
                        maxWait === 0 ? maxWait : (maxWait || tc.waitTime.max));
    return rc;
};


export const executeTeCommand2 = (command: string, args: any[], minWait?: number, maxWait?: number) => executeTeCommand(command, minWait, maxWait, ...args);


export const getSuccessCount = (instance: Mocha.Context) =>
{

    const mTest = instance.test || instance.currentTest as Mocha.Runnable,
          suite = mTest.parent as Mocha.Suite,
          suiteKey = getSuiteKey(suite.title),
          suiteResults = tc.tests.suiteResults[suiteKey];
    return suiteResults.successCount;
};


export const endRollingCount = (instance: Mocha.Context, isSetup?: boolean) =>
{

    const mTest = (!isSetup ? instance.test : instance.currentTest) as Mocha.Runnable,
          suite = mTest.parent as Mocha.Suite,
          suiteKey = getSuiteKey(suite.title),
          suiteResults = tc.tests.suiteResults[suiteKey];
    ++suiteResults.successCount;
};


export const exitRollingCount = (instance: Mocha.Context) =>
{

    const mTest = instance.test as Mocha.Runnable,
          suite = mTest.parent as Mocha.Suite,
          suiteKey = getSuiteKey(suite.title),
          suiteResults = tc.tests.suiteResults[suiteKey],
          testIdx = suite.tests.findIndex(t => t.title === mTest.title && !t.isFailed() && !t.isPassed());

    try
    {
        expect(suiteResults.successCount).to.be.equal(testIdx);
    }
    catch (e: any)
    {
        const msg = `skip test ${testIdx} due to rolling success count failure`;
        console.log(`    ${figures.color.info} ${figures.withColor(msg, figures.colors.grey)}`);
        hasRollingCountError = true;
        if (suite.tests.filter(t => t.isFailed).length === 0) {
            throw new Error("Rolling count error: " + e.message);
        }
    }

    return hasRollingCountError;
};


export const focusExplorerView = async (instance?: any) =>
{
    if (!teExplorer.isVisible())
    {
        if (instance) {
            instance.slow(tc.slowTime.focusCommand + tc.slowTime.refreshCommand +
                          (tc.waitTime.focusCommand * 2) + tc.waitTime.min + 100);
        }
        await executeTeCommand("focus", tc.waitTime.focusCommand);
        await waitForTeIdle(tc.waitTime.focusCommand);
        explorerHasFocused = true;
    }
    else if (instance) {
        instance.slow(tc.slowTime.focusCommandAlreadyFocused);
        await waitForTeIdle(tc.waitTime.min);
    }
};


export const focusSearchView = () => commands.executeCommand("workbench.view.search.focus", tc.waitTime.focusCommand) as Thenable<void>;


export const getSpecialTaskItemId = (taskItem: ITaskItem) =>
    taskItem.id.replace(constants.LAST_TASKS_LABEL + ":", "").replace(constants.FAV_TASKS_LABEL + ":", "").replace(constants.USER_TASKS_LABEL + ":", "");


export const getTeApi = () => teApi;


const isExecuting = (task: Task) =>
{
    const execs = tasks.taskExecutions.filter(e => e.task.name === task.name && e.task.source === task.source &&
                                            e.task.scope === task.scope && e.task.definition.path === task.definition.path);
    const exec = execs.find(e => e.task.name === task.name && e.task.source === task.source &&
                            e.task.scope === task.scope && e.task.definition.path === task.definition.path);
    return exec;
};


export const needsTreeBuild = (isFocus?: boolean) => (isFocus || !treeUtils.hasRefreshed()) && !explorerHasFocused;


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
        if (!teApi.providers[taskType])         err = `    ${figures.color.error} ${taskType} ${figures.withColor("Provider == null", figures.colors.grey)}`;
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


export const logErrorsAreFine = (willFail = true) =>
{
    if (willFail && tc.log.enabled && teApi.config.get<boolean>("logging.enabled"))
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
              suiteResults = tc.tests.suiteResults[suiteKey];
        tc.tests.numTestsFail += numTestsFailedThisSuite;
        tc.tests.numTestsSuccess += suite.tests.filter(t => t.isPassed()).length;
        tc.tests.numSuites++;
        tc.tests.numTests += suite.tests.length;
        if (numTestsFailedThisSuite > 0) {
            tc.tests.numSuitesFail++;
        }
        else {
            tc.tests.numSuitesSuccess++;
        }
        tc.tests.suiteResults[suiteKey] = Object.assign(suiteResults,
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


export const testInvDocPositions = (provider: ITaskExplorerProvider) =>
{
    provider.getDocumentPosition(undefined, undefined);
    provider.getDocumentPosition("test", undefined);
    provider.getDocumentPosition(undefined, "test");
    provider.getDocumentPosition("test", "");
    provider.getDocumentPosition("test", " ");
    provider.getDocumentPosition("test", "\n");
};


/**
 * @param taskType Task type / source
 * @param expectedCount Expected # of tasks
 * @param retries Number of retries to make if expected count doesn'tmatch.  100ms sleep between each retry.
 */
export const verifyTaskCount = async (taskType: string, expectedCount: number, retries = 0, retryWait = 250) =>
{
    let tTasks = await tasks.fetchTasks({ type: taskType !== "Workspace" ? taskType : undefined });
    if (taskType === "Workspace") {
        tTasks = tTasks.filter(t => t.source === "Workspace");
    }
    while (--retries >= 0 && tTasks.length !== expectedCount)
    {
        await sleep(retryWait > 0 ? retryWait : tc.waitTime.verifyTaskCountRetryInterval);
        tTasks = await tasks.fetchTasks({ type: taskType !== "Workspace" ? taskType : undefined });
        if (taskType === "Workspace") {
            tTasks = tTasks.filter(t => t.source === "Workspace");
        }
    }
    if (expectedCount >= 0) {
        expect(tTasks.length).to.be.equal(expectedCount, `${figures.color.error} Unexpected ${taskType} task count (Found ${tTasks.length} of ${expectedCount})`);
    }
    return tTasks.length;
};


export const waitForTaskExecution = async (exec: TaskExecution | undefined, maxWait?: number) =>
{
    if (exec)
    {
        const taskName = exec.task.name;
        let waitedAfterStarted = 0,
            waitedHasNotStarted = 0,
            hasExec = false,
            isExec = !!isExecuting(exec.task);
        console.log(`    ${figures.color.infoTask}   ${figures.withColor(`Waiting for '${taskName}' task execution`, figures.colors.grey)}`);
        while ((isExec && (maxWait === undefined || waitedAfterStarted < maxWait)) || (!isExec && !hasExec && waitedHasNotStarted < tc.slowTime.taskCommandStartupMax))
        {
            await sleep(50);
            isExec = !!isExecuting(exec.task);
            if (isExec) {
                if (!hasExec) {
                    console.log(`    ${figures.color.infoTask}     ${figures.withColor(`Task execution started, waited ${waitedAfterStarted + waitedHasNotStarted} ms`, figures.colors.grey)}`);
                }
                hasExec = isExec;
                waitedAfterStarted += 50;
            }
            else if (!hasExec) { waitedHasNotStarted += 50; }
        }
        console.log(`    ${figures.color.infoTask}     ${figures.withColor(`Task execution wait finished, waited ${waitedAfterStarted + waitedHasNotStarted} ms`, figures.colors.grey)}`);
    }
};


export const waitForTeIdle = async (minWait = 1, maxWait = 15000) =>
{
    let waited = 0;
    const _wait = async (iterationsIdle: number) =>
    {
        // let gotNotIdle = false;
        while (((iterationsIdle < 3 && waited < minWait /* && !gotNotIdle */) || teApi.isBusy()) && waited < maxWait)
        {
            await sleep(20);
            waited += 20;
            ++iterationsIdle;
            if (teApi.isBusy()) {
                // gotNotIdle = true;
                iterationsIdle = 0;
            }
        }
    };
    await _wait(3);
    await sleep(1);
    await _wait(3);
    if (minWait > waited)
    {
        const sleepTime = Math.round((minWait - waited) / 3);
        while (minWait > waited) {
            await sleep(sleepTime);
            waited += sleepTime;
        }
    }
};
