/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */

import * as utils from "../utils/utils";
import { ITestsApi } from "@spmeesseman/vscode-taskexplorer-types";

let testsApi: ITestsApi;
const tc = utils.testControl;
const checkTaskCountsTime = (4 * tc.slowTime.taskCount.verify) + tc.slowTime.taskCount.verifyNpm + tc.slowTime.taskCount.verifyWorkspace;


suite("File Cache Tests", () =>
{
    suiteSetup(async function()
    {
        ({ testsApi } = await utils.activate(this));
        await testsApi.storage.update2("fileCacheTaskFilesMap", undefined);
        await testsApi.storage.update2("fileCacheProjectFilesMap", undefined);
        await testsApi.storage.update2("fileCacheProjectFileToFileCountMap", undefined);
        utils.endRollingCount(this);
    });


    suiteTeardown(async function()
    {
        await utils.executeSettingsUpdate("enablePersistentFileCaching", false);
        await testsApi.storage.update2("fileCacheTaskFilesMap", undefined);
        await testsApi.storage.update2("fileCacheProjectFilesMap", undefined);
        await testsApi.storage.update2("fileCacheProjectFileToFileCountMap", undefined);
        utils.suiteFinished(this);
    });


    test("Build Tree", async function()
    {
        if (utils.exitRollingCount(this)) return;
        if (utils.needsTreeBuild()) {
            await utils.treeUtils.refresh(this);
        }
        utils.endRollingCount(this);
    });


    test("Check Task Counts", async function()
    {
        if (utils.exitRollingCount(this)) return;
        await checkTaskCounts(this);
        utils.endRollingCount(this);
    });


    test("Enable Persistent Cache", async function()
    {
        if (utils.exitRollingCount(this)) return;
        this.slow(tc.slowTime.config.event + tc.slowTime.fileCachePersist);
        await utils.executeSettingsUpdate("enablePersistentFileCaching", true); // enabling setting willpersist *now*
        utils.endRollingCount(this);
    });


    test("Rebuild File Cache (Mimic Startup)", async function()
    {
        if (utils.exitRollingCount(this)) return;
        this.slow(tc.slowTime.cache.rebuild + tc.slowTime.min);
        // await treeUtils.refresh(this);
        await testsApi.fileCache.rebuildCache("", true);
        await utils.sleep(tc.waitTime.min);
        utils.endRollingCount(this);
    });


    test("Check Task Counts", async function()
    {
        if (utils.exitRollingCount(this)) return;
        await checkTaskCounts(this);
        utils.endRollingCount(this);
    });


    test("Rebuild File Cache w Empty Persisted Cache (Mimic Startup)", async function()
    {
        if (utils.exitRollingCount(this)) return;
        this.slow(tc.slowTime.cache.rebuild + (tc.slowTime.config.event * 3) + checkTaskCountsTime);
        await testsApi.storage.update2("fileCacheTaskFilesMap", undefined);
        await testsApi.storage.update2("fileCacheProjectFilesMap", undefined);
        await testsApi.storage.update2("fileCacheProjectFileToFileCountMap", undefined);
        await testsApi.fileCache.rebuildCache("", true);
        await utils.sleep(tc.waitTime.min);
        await checkTaskCounts();
        utils.endRollingCount(this);
    });


    test("Disable Persistent Cache", async function()
    {
        if (utils.exitRollingCount(this)) return;
        this.slow(tc.slowTime.config.event + tc.slowTime.config.event);
        await utils.executeSettingsUpdate("enablePersistentFileCaching", false);
        utils.endRollingCount(this);
    });


    test("Rebuild File Cache (Mimic Startup)", async function()
    {
        if (utils.exitRollingCount(this)) return;
        this.slow(tc.slowTime.cache.rebuild + tc.slowTime.commandFast);
        // await treeUtils.refresh(this);
        await testsApi.fileCache.rebuildCache("", true);
        await utils.waitForTeIdle(tc.waitTime.commandFast);
        utils.endRollingCount(this);
    });


    test("Check Task Counts", async function()
    {
        if (utils.exitRollingCount(this)) return;
        await checkTaskCounts(this);
        utils.endRollingCount(this);
    });


    test("Cancel Rebuild Cache (Not Busy)", async function()
    {
        if (utils.exitRollingCount(this)) return;
        await testsApi.fileCache.cancelBuildCache();
        await utils.sleep(tc.waitTime.min);
        utils.endRollingCount(this);
    });


    test("Cancel Rebuild Cache (Busy No Delay)", async function()
    {
        if (utils.exitRollingCount(this)) return;
        this.slow(tc.slowTime.cache.rebuildCancel);
        testsApi.fileCache.rebuildCache(""); // Don't 'await'
        await testsApi.fileCache.cancelBuildCache();
        await utils.sleep(tc.waitTime.min);
        utils.endRollingCount(this);
    });


    test("Cancel Rebuild Cache (Busy 40ms Delay)", async function()
    {
        if (utils.exitRollingCount(this)) return;
        this.slow(tc.slowTime.cache.rebuildCancel + 40);
        testsApi.fileCache.rebuildCache(""); // Don't 'await'
        await utils.sleep(40);
        await testsApi.fileCache.cancelBuildCache();
        await utils.sleep(tc.waitTime.min);
        utils.endRollingCount(this);
    });


    test("Cancel Rebuild Cache (Busy 75ms Delay)", async function()
    {
        if (utils.exitRollingCount(this)) return;
        this.slow(tc.slowTime.cache.rebuildCancel + 75);
        testsApi.fileCache.rebuildCache(""); // Don't 'await'
        await utils.sleep(75);
        await testsApi.fileCache.cancelBuildCache();
        await utils.sleep(tc.waitTime.min);
        utils.endRollingCount(this);
    });


    test("Cancel Rebuild Cache (Busy 100ms Delay)", async function()
    {
        if (utils.exitRollingCount(this)) return;
        this.slow(tc.slowTime.cache.rebuildCancel + 100);
        testsApi.fileCache.rebuildCache(""); // Don't 'await'
        await utils.sleep(100);
        await testsApi.fileCache.cancelBuildCache();
        await utils.sleep(tc.waitTime.min);
        utils.endRollingCount(this);
    });


    test("Cancel Rebuild Cache (Busy 250ms Delay)", async function()
    {
        if (utils.exitRollingCount(this)) return;
        this.slow(tc.slowTime.cache.rebuildCancel + 250);
        testsApi.fileCache.rebuildCache(""); // Don't 'await'
        await utils.sleep(250);
        await testsApi.fileCache.cancelBuildCache();
        await utils.sleep(tc.waitTime.min);
        utils.endRollingCount(this);
    });


    test("Cancel Rebuild Cache (Busy 500ms Delay)", async function()
    {
        if (utils.exitRollingCount(this)) return;
        this.slow(tc.slowTime.cache.rebuildCancel + 500);
        testsApi.fileCache.rebuildCache(""); // Don't 'await'
        await utils.sleep(500);
        await testsApi.fileCache.cancelBuildCache();
        await utils.sleep(tc.waitTime.min);
        utils.endRollingCount(this);
    });


    test("Cancel Rebuild Cache (Busy 750ms Delay)", async function()
    {
        if (utils.exitRollingCount(this)) return;
        this.slow(tc.slowTime.cache.rebuildCancel + 750);
        testsApi.fileCache.rebuildCache(""); // Don't 'await'
        await utils.sleep(750);
        await testsApi.fileCache.cancelBuildCache();
        await utils.sleep(tc.waitTime.min);
        utils.endRollingCount(this);
    });


    test("Cancel Rebuild Cache (Busy 1s Delay)", async function()
    {
        if (utils.exitRollingCount(this)) return;
        this.slow(tc.slowTime.cache.rebuildCancel + 1000);
        testsApi.fileCache.rebuildCache(""); // Don't 'await'
        await utils.sleep(1000);
        await testsApi.fileCache.cancelBuildCache();
        await utils.sleep(tc.waitTime.min);
        utils.endRollingCount(this);
    });


    test("Cancel Build Cache (FileWatcher Build) (No Delay)", async function()
    {
        if (utils.exitRollingCount(this)) return;
        this.slow(tc.slowTime.cache.buildCancel);
        testsApi.fileCache.buildTaskTypeCache("gulp", undefined, true, ""); // Don't 'await'
        await testsApi.fileCache.cancelBuildCache();
        await utils.sleep(tc.waitTime.min);
        utils.endRollingCount(this);
    });


    test("Cancel Build Cache (FileWatcher Build) (Busy 10ms Delay)", async function()
    {
        if (utils.exitRollingCount(this)) return;
        this.slow(tc.slowTime.cache.buildCancel + 10);
        testsApi.fileCache.buildTaskTypeCache("gulp", undefined, true, ""); // Don't 'await'
        await utils.sleep(tc.waitTime.min);
        await testsApi.fileCache.cancelBuildCache();
        await utils.sleep(10);
        utils.endRollingCount(this);
    });


    test("Cancel Build Cache (FileWatcher Build) (Busy 20ms Delay)", async function()
    {
        if (utils.exitRollingCount(this)) return;
        this.slow(tc.slowTime.cache.buildCancel + 20);
        testsApi.fileCache.buildTaskTypeCache("python", undefined, true, ""); // Don't 'await'
        await utils.sleep(20);
        await testsApi.fileCache.cancelBuildCache();
        await utils.sleep(tc.waitTime.min);
        utils.endRollingCount(this);
    });


    test("Cancel Build Cache (FileWatcher Build) (Busy 50ms Delay)", async function()
    {
        if (utils.exitRollingCount(this)) return;
        this.slow(tc.slowTime.cache.buildCancel + 50);
        testsApi.fileCache.buildTaskTypeCache("batch", undefined, true, ""); // Don't 'await'
        await utils.sleep(50);
        await testsApi.fileCache.cancelBuildCache();
        await utils.sleep(tc.waitTime.min);
        utils.endRollingCount(this);
    });


    test("Cancel Build Cache (FileWatcher Build) (Busy 75ms Delay)", async function()
    {
        if (utils.exitRollingCount(this)) return;
        this.slow(tc.slowTime.cache.buildCancel + 75);
        testsApi.fileCache.buildTaskTypeCache("bash", undefined, true, ""); // Don't 'await'
        await utils.sleep(75);
        await testsApi.fileCache.cancelBuildCache();
        await utils.sleep(tc.waitTime.min);
        utils.endRollingCount(this);
    });


    test("Cancel Build Cache (FileWatcher Build) (Busy 150ms Delay)", async function()
    {
        if (utils.exitRollingCount(this)) return;
        this.slow(tc.slowTime.cache.buildCancel + 150);
        testsApi.fileCache.buildTaskTypeCache("ant", undefined, true, ""); // Don't 'await'
        await utils.sleep(150);
        await testsApi.fileCache.cancelBuildCache();
        await utils.sleep(tc.waitTime.min);
        utils.endRollingCount(this);
    });


    test("Cancel Build Cache (FileWatcher Build) (Busy 250ms Delay)", async function()
    {
        if (utils.exitRollingCount(this)) return;
        this.slow(tc.slowTime.cache.buildCancel + 250);
        testsApi.fileCache.buildTaskTypeCache("npm", undefined, true, ""); // Don't 'await'
        await utils.sleep(250);
        await testsApi.fileCache.cancelBuildCache();
        await utils.sleep(tc.waitTime.min);
        utils.endRollingCount(this);
    });


    test("Cancel Build Cache (FileWatcher Build) (Busy 500ms Delay)", async function()
    {
        if (utils.exitRollingCount(this)) return;
        this.slow(tc.slowTime.cache.buildCancel + 500);
        testsApi.fileCache.buildTaskTypeCache("grunt", undefined, true, ""); // Don't 'await'
        await utils.sleep(500);
        await testsApi.fileCache.cancelBuildCache();
        await utils.sleep(tc.waitTime.min);
        utils.endRollingCount(this);
    });


    test("Rebuild Cache and Invaldate Providers after Cancel", async function()
    {
        if (utils.exitRollingCount(this)) return;
        this.slow(tc.slowTime.refreshCommand + 100);
        await utils.executeTeCommand("refresh", tc.waitTime.refreshCommand);
        await utils.sleep(100);
        utils.endRollingCount(this);
    });


    test("Check Task Counts", async function()
    {
        if (utils.exitRollingCount(this)) return;
        await checkTaskCounts(this);
        utils.endRollingCount(this);
    });

});


const checkTaskCounts = async (instance?: Mocha.Context) =>
{
    if (instance) {
        instance.slow(checkTaskCountsTime);
    }
    await utils.verifyTaskCount("bash", 1);
    await utils.verifyTaskCount("batch", 2);
    await utils.verifyTaskCount("npm", 2);
    await utils.verifyTaskCount("grunt", 7);
    await utils.verifyTaskCount("gulp", 17);
    await utils.verifyTaskCount("Workspace", 13); // 10 + 3 User Tasks
};
