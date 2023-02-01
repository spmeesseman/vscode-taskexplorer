/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable import/no-extraneous-dependencies */

import * as path from "path";
import * as treeUtils from "./treeUtils";
import figures from "../../lib/figures";
import initSettings from "./initSettings";
import constants from "../../lib/constants";
import { expect } from "chai";
import { testControl } from "../control";
import { deactivate } from "../../extension";
import { startInput, stopInput } from "./input";
import { hasExplorerFocused } from "./commandUtils";
import { getWsPath, getProjectsPath } from "./sharedUtils";
import { deleteFile, pathExists } from "../../lib/utils/fs";
import { configuration } from "../../lib/utils/configuration";
import { ITaskExplorerProvider } from "../../interface/ITaskProvider";
import { getSuiteFriendlyName, getSuiteKey, processTimes } from "./bestTimes";
import { commands, ConfigurationTarget, Extension, extensions, Task, TaskExecution, tasks, Uri, ViewColumn, window, workspace } from "vscode";
import { ITaskExplorer, ITaskExplorerApi, ITaskItem } from "@spmeesseman/vscode-taskexplorer-types";
import { ILicenseManager } from "../../interface/ILicenseManager";

const { symbols } = require("mocha/lib/reporters/base");

export { figures };
export { testControl };
export { treeUtils };
export { getWsPath, getProjectsPath };
export let teApi: ITaskExplorerApi;
export let teExplorer: ITaskExplorer;

let activated = false;
let caughtControlC = false;
let hasRollingCountError = false;
let timeStarted: number;
let overridesShowInputBox: any[] = [];
let overridesShowInfoBox: any[] = [];
let NODE_TLS_REJECT_UNAUTHORIZED: string | undefined;

const tc = testControl;
const originalShowInputBox = window.showInputBox;
const originalShowInfoBox = window.showInformationMessage;
const disableSSLMsg = "Disabling certificate validation due to Electron Main Process Issue w/ LetsEncrypt DST Root CA X3 Expiry";

//
// Suppress some stderr messages.  It's just tests.
//
// process.stderr.on("data", data => {
//     if (!data.includes("UNRESPONSIVE ext") && !data.includes("(node:22580)")) {
//         process.stdout.write(data);
//     }
// });
// process.on("warning", (warning) => {
//     if (!warning.message.includes("UNRESPONSIVE ext") && !warning.message.includes("(node:22580)")) {
//         console.warn(warning.name);    // Print the warning name
//         console.warn(warning.message); // Print the warning message
//         console.warn(warning.stack);   // Print the stack trace
//     }
// });
// process.on("warning", (warning) => {});


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

    const ext = extensions.getExtension("spmeesseman.vscode-taskexplorer");
    expect(ext).to.not.be.undefined;

    if (!activated)
    {
        timeStarted = Date.now();
        const tzOffset = (new Date()).getTimezoneOffset() * 60000,
              locISOTime = (new Date(Date.now() - tzOffset)).toISOString().slice(0, -1).replace("T", " ").replace(/[\-]/g, "/");

        console.log(`    ${figures.color.info}`);
        console.log(`    ${figures.color.info} ${figures.withColor("Tests startup", figures.colors.grey)}`);
        console.log(`    ${figures.color.info} ${figures.withColor("Time started: " + locISOTime, figures.colors.grey)}`);
        //
        // Set startup settings for this tests run using workspace settings scope.
        // The initSettings() functions does it's own logging to the console.
        //
        await initSettings();
        //
		// The LetsEncrypt certificate is rejected by VSCode/Electron Test Suite (?).
		// See https://github.com/electron/electron/issues/31212. Expiry of DST Root CA X3.
		// Works fine when debugging, works fine when the extension is installed, just fails in the
		// tests with the "certificate is expired" error as explained in the link above.  For tests,
		// and until this is resolved in vscode/test-electron (I think that's wherethe problem is?),
		// we just disable TLS_REJECT_UNAUTHORIZED in the NodeJS environment.
		//
		NODE_TLS_REJECT_UNAUTHORIZED = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
		process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
        //
        // Activate extension
        // Note that the '*' is removed from package.json[activationEvents] before the runTest() call
        //
        console.log(`    ${figures.color.info} ${figures.withColor("Activating extension", figures.colors.grey)}`);
        teApi = await (ext as any).activate();
        console.log(`    ${figures.color.info} ${figures.withColor("Extension successfully activated", figures.colors.grey)}`);
        //
        // Ensure extension initialized successfully
        //
        expect(isReady()).to.be.equal(true, `    ${figures.color.error} TeApi not ready`);
        expect(teApi.explorer).to.not.be.empty;
        //
        // Set a valid license key to run in 'licensed mode' at startup
        //
        await teApi.testsApi.storage.updateSecret("license_key", "1234-5678-9098-7654321");
        //
        // _api pre-test suite will reset after disable/enable
        //
        console.log(`    ${figures.color.info} ${figures.withColor("Settings tests active explorer instance", figures.colors.grey)}`);
        setExplorer(teApi.explorer as ITaskExplorer);
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
        // Catch CTRL+C and set hasRollingCountError if caught
        //
        startInput(setFailed);
        //
        // All done
        //
        activated = true;
        console.log(`    ${figures.color.info} ${figures.withColor("Tests initialization completed, ready", figures.colors.grey)}`);
        console.log(`    ${figures.color.info}`);
		console.log(`    ${figures.color.warningTests} ${figures.withColor(disableSSLMsg, figures.colors.grey)}`);
    }
    return {
        extension: ext as Extension<any>,
        teApi, testsApi:
        teApi.testsApi,
        fsApi: teApi.testsApi.fs,
        configApi: teApi.config,
        explorer: teApi.testsApi.explorer,
        utils: teApi.utilities
    };
};


export const cleanup = async () =>
{
    console.log(`    ${figures.color.info}`);
    console.log(`    ${figures.color.info} ${figures.withColor("Tests complete, clean up", figures.colors.grey)}`);
    if (caughtControlC) {
        console.log(`    ${figures.color.info} ${figures.withColor("User cancelled (caught CTRL+C)", figures.colors.grey)}`);
    }

    if (tc.log.enabled && tc.log.file && tc.log.openFileOnFinish)
    {
        console.log(`    ${figures.color.info}`);
        console.log(`    ${figures.color.info} ${figures.withColor("Log File Location:", figures.colors.grey)}`);
        console.log(`    ${figures.color.info} ${figures.withColor("   " + teApi.log.getLogFileName(), figures.colors.grey)}`);
        console.log(`    ${figures.color.info}`);
    }

    //
    // Stop CTRL+C and set hasRollingCountError
    //
    stopInput();

    console.log(`    ${figures.color.info} ${figures.withColor("Deactivating extension", figures.colors.grey)}`);
    try { await deactivate(); } catch {}
    console.log(`    ${figures.color.info} ${figures.withColor("Extension successfully deactivated", figures.colors.grey)}`);

    window.showInputBox = originalShowInputBox;
    window.showInformationMessage = originalShowInfoBox;
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = NODE_TLS_REJECT_UNAUTHORIZED;

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
    // await workspace.getConfiguration("grunt").update("autoDetect", tc.vsCodeAutoDetectGrunt, ConfigurationTarget.Global);
    // await workspace.getConfiguration("gulp").update("autoDetect", tc.vsCodeAutoDetectGulp, ConfigurationTarget.Global);

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
    // If rolling count error is set, reset the mocha success icon for "cleanup" final test/step
    //
    if (hasRollingCountError) {
        symbols.ok = figures.color.success;
    }
};


export const clearOverrideShowInputBox = () => overridesShowInputBox = [];


export const clearOverrideShowInfoBox = () => overridesShowInfoBox = [];


export const closeEditors = () => commands.executeCommand("openEditors.closeAll");


export const createwebviewForRevive = (viewTitle: string, viewType: string) =>
{
    const resourceDir = Uri.joinPath(teApi.testsApi.extensionContext.extensionUri, "res");
    const panel = window.createWebviewPanel(
        viewType,
        viewTitle,
        ViewColumn.One,
        {
            enableScripts: true,
            localResourceRoots: [ resourceDir ]
        }
    );
    return panel;
};


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


export const exitRollingCount = (instance: Mocha.Context, isSetup?: boolean, isTeardown?: boolean) =>
{

    const mTest = (!isSetup && !isTeardown ? instance.test : instance.currentTest) as Mocha.Runnable,
          suite = mTest.parent as Mocha.Suite,
          suiteKey = getSuiteKey(suite.title),
          suiteResults = tc.tests.suiteResults[suiteKey],
          testIdx = !isSetup && !isTeardown ? suite.tests.findIndex(t => t.title === mTest.title && !t.isFailed() && !t.isPassed()) :
                                              (isSetup ? undefined : (suiteResults ? suite.tests.length : undefined));

    try
    {
        expect(suiteResults?.successCount).to.be.equal(testIdx);
    }
    catch (e: any)
    {
        if (!hasRollingCountError) {
            const msg = `rolling success count failure @ test ${(testIdx || -1) + 1}, all further tests will be skipped`;
            console.log(`    ${figures.color.info} ${figures.withColor(msg, figures.colors.grey)}`);
        }
        setFailed(false);
        if (suite.tests.filter(t => t.isFailed).length === 0) {
            throw new Error("Rolling count error: " + e.message);
        }
    }

    return !isTeardown ? hasRollingCountError : !suiteResults && hasRollingCountError;
};


export const getSpecialTaskItemId = (taskItem: ITaskItem) =>
    taskItem.id.replace(constants.LAST_TASKS_LABEL + ":", "").replace(constants.FAV_TASKS_LABEL + ":", "").replace(constants.USER_TASKS_LABEL + ":", "");


export const getTeApi = () => teApi;


export const isRollingCountError = () => hasRollingCountError;


const isExecuting = (task: Task) =>
{
    const execs = tasks.taskExecutions.filter(e => e.task.name === task.name && e.task.source === task.source &&
                                            e.task.scope === task.scope && e.task.definition.path === task.definition.path);
    const exec = execs.find(e => e.task.name === task.name && e.task.source === task.source &&
                            e.task.scope === task.scope && e.task.definition.path === task.definition.path);
    return exec;
};


export const needsTreeBuild = (isFocus?: boolean) => (isFocus || !treeUtils.hasRefreshed()) && !hasExplorerFocused();


const isReady = (taskType?: string) =>
{
    let err: string | undefined;
    if (!teApi)                                 err = `    ${figures.color.error} ${figures.withColor("TeApi null", figures.colors.grey)}`;
    else {
        if (!teApi.explorer)                    err = `    ${figures.color.error} ${figures.withColor("TeApi Explorer provider == null", figures.colors.grey)}`;
        else if (!teApi.sidebar)                 err = `    ${figures.color.error} ${figures.withColor("TeApi Sidebar Provider != null", figures.colors.grey)}`;
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


export const overrideNextShowInputBox = (value: any) => overridesShowInputBox.push(value);


export const overrideNextShowInfoBox = (value: any) => overridesShowInfoBox.push(value);


export const setExplorer = (explorer: ITaskExplorer) => teExplorer = explorer;


export const setFailed = (ctrlc = true) =>
{
    caughtControlC = ctrlc;
    hasRollingCountError = true;
    symbols.ok = figures.withColor(figures.pointer, figures.colors.blue);
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


export const updateInternalProviderAutoDetect = async(source: "grunt"|"gulp", value: "on"|"off") =>
{
    await workspace.getConfiguration(source).update("autoDetect", value, ConfigurationTarget.Global);
};


/**
 * @param taskType Task type / source
 * @param expectedCount Expected # of tasks
 * @param retries Number of retries to make if expected count doesn'tmatch.  100ms sleep between each retry.
 */
export const verifyTaskCount = async (taskType: string, expectedCount: number, retries = 1, retryWait = 300) =>
{
    let tTasks = await tasks.fetchTasks({ type: taskType !== "Workspace" ? taskType : undefined });
    if (taskType === "Workspace") {
        tTasks = tTasks.filter(t => t.source === "Workspace");
    }
    else if (taskType === "grunt" || taskType === "gulp") { // cheap.  we ignore internal grunt/gulp while building
        tTasks = tTasks.filter(t => !!t.definition.uri);    // the task tree so ignore them here  too.
    }
    while (--retries >= 0 && tTasks.length !== expectedCount)
    {
        await sleep(retryWait > 0 ? retryWait : tc.waitTime.verifyTaskCountRetryInterval);
        tTasks = await tasks.fetchTasks({ type: taskType !== "Workspace" ? taskType : undefined });
        if (taskType === "Workspace") {
            tTasks = tTasks.filter(t => t.source === "Workspace");
        }
        else if (taskType === "grunt" || taskType === "gulp") {
            tTasks = tTasks.filter(t => !!t.definition.uri);
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
        if (tc.log.taskExecutionSteps) {
            console.log(`    ${figures.color.infoTask}   ${figures.withColor(`Waiting for '${taskName}' task execution`, figures.colors.grey)}`);
        }
        while ((isExec && (maxWait === undefined || waitedAfterStarted < maxWait)) || (!isExec && !hasExec && waitedHasNotStarted < 3000))
        {
            await sleep(50);
            isExec = !!isExecuting(exec.task);
            if (isExec) {
                if (!hasExec && tc.log.taskExecutionSteps) {
                    console.log(`    ${figures.color.infoTask}     ${figures.withColor(`Task execution started, waited ${waitedAfterStarted + waitedHasNotStarted} ms`, figures.colors.grey)}`);
                }
                hasExec = isExec;
                waitedAfterStarted += 50;
            }
            else if (!hasExec) { waitedHasNotStarted += 50; }
        }
        if (tc.log.taskExecutionSteps) {
            console.log(`    ${figures.color.infoTask}     ${figures.withColor(`Task execution wait finished, waited ${waitedAfterStarted + waitedHasNotStarted} ms`, figures.colors.grey)}`);
        }
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
