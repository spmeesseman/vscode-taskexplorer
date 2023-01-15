/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */

import * as utils from "../utils/utils";
import constants from "../../lib/constants";
import { ITaskExplorerApi } from "@spmeesseman/vscode-taskexplorer-types";

let teApi: ITaskExplorerApi;
let successCount = -1;


suite("File Cache Tests", () =>
{
    suiteSetup(async function()
    {
        teApi = await utils.activate(this);
        await teApi.testsApi.storage.update2("fileCacheTaskFilesMap", undefined);
        await teApi.testsApi.storage.update2("fileCacheProjectFilesMap", undefined);
        await teApi.testsApi.storage.update2("fileCacheProjectFileToFileCountMap", undefined);
        ++successCount;
    });


    suiteTeardown(async function()
    {
        await utils.executeSettingsUpdate("enablePersistentFileCaching", false);
        await teApi.testsApi.storage.update2("fileCacheTaskFilesMap", undefined);
        await teApi.testsApi.storage.update2("fileCacheProjectFilesMap", undefined);
        await teApi.testsApi.storage.update2("fileCacheProjectFileToFileCountMap", undefined);
        utils.suiteFinished(this);
    });


    test("Build Tree (View Collapsed)", async function()
    {
        if (utils.exitRollingCount(0, successCount)) return;
        await utils.treeUtils.refresh(this);
        ++successCount;
    });


    test("Check Task Counts", async function()
    {
        if (utils.exitRollingCount(1, successCount)) return;
        await checkTaskCounts(this);
        ++successCount;
    });


    test("Enable Persistent Cache", async function()
    {
        if (utils.exitRollingCount(2, successCount)) return;
        this.slow(utils.testControl.slowTime.configEvent + utils.testControl.slowTime.fileCachePersist);
        await utils.executeSettingsUpdate("enablePersistentFileCaching", true); // enabling setting willpersist *now*
        ++successCount;
    });


    test("Rebuild File Cache (Mimic Startup)", async function()
    {
        if (utils.exitRollingCount(3, successCount)) return;
        this.slow(utils.testControl.slowTime.rebuildFileCache + utils.testControl.waitTime.min);
        // await treeUtils.refresh(this);
        await teApi.testsApi.fileCache.rebuildCache("", true);
        await utils.sleep(utils.testControl.waitTime.min);
        ++successCount;
    });


    test("Check Task Counts", async function()
    {
        if (utils.exitRollingCount(4, successCount)) return;
        await checkTaskCounts(this);
        ++successCount;
    });


    test("Rebuild File Cache w Empty Persisted Cache (Mimic Startup)", async function()
    {
        if (utils.exitRollingCount(5, successCount)) return;
        this.slow(utils.testControl.slowTime.rebuildFileCache + (utils.testControl.slowTime.configEventFast * 3) + utils.testControl.waitTime.min);
        await teApi.testsApi.storage.update2("fileCacheTaskFilesMap", undefined);
        await teApi.testsApi.storage.update2("fileCacheProjectFilesMap", undefined);
        await teApi.testsApi.storage.update2("fileCacheProjectFileToFileCountMap", undefined);
        await teApi.testsApi.fileCache.rebuildCache("", true);
        await utils.sleep(utils.testControl.waitTime.min);
        await checkTaskCounts(this);
        ++successCount;
    });


    test("Disable Persistent Cache", async function()
    {
        if (utils.exitRollingCount(6, successCount)) return;
        this.slow(utils.testControl.slowTime.configEvent);
        await utils.executeSettingsUpdate("enablePersistentFileCaching", false);
        ++successCount;
    });


    // test("Rebuild Cache and Invaldate Providers after Cancel", async function()
    // {
    //     this.slow(utils.testControl.slowTime.refreshCommand + 100);
    //     await utils.executeTeCommand("refresh", utils.testControl.waitTime.refreshCommand);
    //     await utils.sleep(100);
    //     ++successCount;
    // });


    test("Rebuild File Cache (Mimic Startup)", async function()
    {
        if (utils.exitRollingCount(7, successCount)) return;
        this.slow(utils.testControl.slowTime.rebuildFileCache + utils.testControl.waitTime.min);
        // await treeUtils.refresh(this);
        await teApi.testsApi.fileCache.rebuildCache("", true);
        await teApi.waitForIdle(utils.testControl.waitTime.commandFast);
        ++successCount;
    });


    test("Check Task Counts", async function()
    {
        if (utils.exitRollingCount(8, successCount)) return;
        await checkTaskCounts(this);
        ++successCount;
    });


    test("Cancel Rebuild Cache (Not Busy)", async function()
    {
        if (utils.exitRollingCount(9, successCount)) return;
        await teApi.testsApi.fileCache.cancelBuildCache();
        await utils.sleep(utils.testControl.waitTime.min);
        ++successCount;
    });


    test("Cancel Rebuild Cache (Busy No Delay)", async function()
    {
        if (utils.exitRollingCount(10, successCount)) return;
        this.slow(utils.testControl.slowTime.rebuildFileCacheCancel + utils.testControl.waitTime.min);
        teApi.testsApi.fileCache.rebuildCache(""); // Don't 'await'
        await teApi.testsApi.fileCache.cancelBuildCache();
        await utils.sleep(utils.testControl.waitTime.min);
        ++successCount;
    });


    test("Cancel Rebuild Cache (Busy 40ms Delay)", async function()
    {
        if (utils.exitRollingCount(11, successCount)) return;
        this.slow(utils.testControl.slowTime.rebuildFileCacheCancel + 40 + utils.testControl.waitTime.min);
        teApi.testsApi.fileCache.rebuildCache(""); // Don't 'await'
        await utils.sleep(40);
        await teApi.testsApi.fileCache.cancelBuildCache();
        await utils.sleep(utils.testControl.waitTime.min);
        ++successCount;
    });


    test("Cancel Rebuild Cache (Busy 75ms Delay)", async function()
    {
        if (utils.exitRollingCount(12, successCount)) return;
        this.slow(utils.testControl.slowTime.rebuildFileCacheCancel + 75 + utils.testControl.waitTime.min);
        teApi.testsApi.fileCache.rebuildCache(""); // Don't 'await'
        await utils.sleep(75);
        await teApi.testsApi.fileCache.cancelBuildCache();
        await utils.sleep(utils.testControl.waitTime.min);
        ++successCount;
    });


    test("Cancel Rebuild Cache (Busy 100ms Delay)", async function()
    {
        if (utils.exitRollingCount(13, successCount)) return;
        this.slow(utils.testControl.slowTime.rebuildFileCacheCancel + 100 + utils.testControl.waitTime.min);
        teApi.testsApi.fileCache.rebuildCache(""); // Don't 'await'
        await utils.sleep(100);
        await teApi.testsApi.fileCache.cancelBuildCache();
        await utils.sleep(utils.testControl.waitTime.min);
        ++successCount;
    });


    test("Cancel Rebuild Cache (Busy 250ms Delay)", async function()
    {
        if (utils.exitRollingCount(14, successCount)) return;
        this.slow(utils.testControl.slowTime.rebuildFileCacheCancel + 250 + utils.testControl.waitTime.min);
        teApi.testsApi.fileCache.rebuildCache(""); // Don't 'await'
        await utils.sleep(250);
        await teApi.testsApi.fileCache.cancelBuildCache();
        await utils.sleep(utils.testControl.waitTime.min);
        ++successCount;
    });


    test("Cancel Rebuild Cache (Busy 500ms Delay)", async function()
    {
        if (utils.exitRollingCount(15, successCount)) return;
        this.slow(utils.testControl.slowTime.rebuildFileCacheCancel + 500 + utils.testControl.waitTime.min);
        teApi.testsApi.fileCache.rebuildCache(""); // Don't 'await'
        await utils.sleep(500);
        await teApi.testsApi.fileCache.cancelBuildCache();
        await utils.sleep(utils.testControl.waitTime.min);
        ++successCount;
    });


    test("Cancel Rebuild Cache (Busy 750ms Delay)", async function()
    {
        if (utils.exitRollingCount(16, successCount)) return;
        this.slow(utils.testControl.slowTime.rebuildFileCacheCancel + 750 + utils.testControl.waitTime.min);
        teApi.testsApi.fileCache.rebuildCache(""); // Don't 'await'
        await utils.sleep(750);
        await teApi.testsApi.fileCache.cancelBuildCache();
        await utils.sleep(utils.testControl.waitTime.min);
        ++successCount;
    });


    test("Cancel Rebuild Cache (Busy 1s Delay)", async function()
    {
        if (utils.exitRollingCount(17, successCount)) return;
        this.slow(utils.testControl.slowTime.rebuildFileCacheCancel + 1000 + utils.testControl.waitTime.min);
        teApi.testsApi.fileCache.rebuildCache(""); // Don't 'await'
        await utils.sleep(1000);
        await teApi.testsApi.fileCache.cancelBuildCache();
        await utils.sleep(utils.testControl.waitTime.min);
        ++successCount;
    });


    test("Cancel Build Cache (FileWatcher Build) (No Delay)", async function()
    {
        if (utils.exitRollingCount(18, successCount)) return;
        this.slow(utils.testControl.slowTime.buildFileCacheCancel + utils.testControl.waitTime.min);
        teApi.testsApi.fileCache.buildTaskTypeCache("gulp", undefined, true, ""); // Don't 'await'
        await teApi.testsApi.fileCache.cancelBuildCache();
        await utils.sleep(utils.testControl.waitTime.min);
        ++successCount;
    });


    test("Cancel Build Cache (FileWatcher Build) (Busy 40ms Delay)", async function()
    {
        if (utils.exitRollingCount(19, successCount)) return;
        this.slow(utils.testControl.slowTime.buildFileCacheCancel + (utils.testControl.waitTime.min * 2));
        teApi.testsApi.fileCache.buildTaskTypeCache("gulp", undefined, true, ""); // Don't 'await'
        await utils.sleep(utils.testControl.waitTime.min);
        await teApi.testsApi.fileCache.cancelBuildCache();
        await utils.sleep(utils.testControl.waitTime.min);
        ++successCount;
    });


    test("Cancel Build Cache (FileWatcher Build) (Busy 75ms Delay)", async function()
    {
        if (utils.exitRollingCount(20, successCount)) return;
        this.slow(utils.testControl.slowTime.buildFileCacheCancel + 75 + utils.testControl.waitTime.min);
        teApi.testsApi.fileCache.buildTaskTypeCache("python", undefined, true, ""); // Don't 'await'
        await utils.sleep(75);
        await teApi.testsApi.fileCache.cancelBuildCache();
        await utils.sleep(utils.testControl.waitTime.min);
        ++successCount;
    });


    test("Cancel Build Cache (FileWatcher Build) (Busy 100ms Delay)", async function()
    {
        if (utils.exitRollingCount(21, successCount)) return;
        this.slow(utils.testControl.slowTime.buildFileCacheCancel + 100 + utils.testControl.waitTime.min);
        teApi.testsApi.fileCache.buildTaskTypeCache("batch", undefined, true, ""); // Don't 'await'
        await utils.sleep(100);
        await teApi.testsApi.fileCache.cancelBuildCache();
        await utils.sleep(utils.testControl.waitTime.min);
        ++successCount;
    });


    test("Cancel Build Cache (FileWatcher Build) (Busy 250ms Delay)", async function()
    {
        if (utils.exitRollingCount(22, successCount)) return;
        this.slow(utils.testControl.slowTime.buildFileCacheCancel + 250 + utils.testControl.waitTime.min);
        teApi.testsApi.fileCache.buildTaskTypeCache("bash", undefined, true, ""); // Don't 'await'
        await utils.sleep(250);
        await teApi.testsApi.fileCache.cancelBuildCache();
        await utils.sleep(utils.testControl.waitTime.min);
        ++successCount;
    });


    test("Cancel Build Cache (FileWatcher Build) (Busy 500ms Delay)", async function()
    {
        if (utils.exitRollingCount(23, successCount)) return;
        this.slow(utils.testControl.slowTime.buildFileCacheCancel + 500 + utils.testControl.waitTime.min);
        teApi.testsApi.fileCache.buildTaskTypeCache("ant", undefined, true, ""); // Don't 'await'
        await utils.sleep(500);
        await teApi.testsApi.fileCache.cancelBuildCache();
        await utils.sleep(utils.testControl.waitTime.min);
        ++successCount;
    });


    test("Cancel Build Cache (FileWatcher Build) (Busy 750ms Delay)", async function()
    {
        if (utils.exitRollingCount(24, successCount)) return;
        this.slow(utils.testControl.slowTime.buildFileCacheCancel + 750 + 25);
        teApi.testsApi.fileCache.buildTaskTypeCache("npm", undefined, true, ""); // Don't 'await'
        await utils.sleep(750);
        await teApi.testsApi.fileCache.cancelBuildCache();
        await utils.sleep(utils.testControl.waitTime.min);
        ++successCount;
    });


    test("Cancel Build Cache (FileWatcher Build) (Busy 1s Delay)", async function()
    {
        if (utils.exitRollingCount(25, successCount)) return;
        this.slow(utils.testControl.slowTime.buildFileCacheCancel + 1000 + utils.testControl.waitTime.min);
        teApi.testsApi.fileCache.buildTaskTypeCache("grunt", undefined, true, ""); // Don't 'await'
        await utils.sleep(1000);
        await teApi.testsApi.fileCache.cancelBuildCache();
        await utils.sleep(utils.testControl.waitTime.min);
        ++successCount;
    });


    test("Rebuild Cache and Invaldate Providers after Cancel", async function()
    {
        if (utils.exitRollingCount(26, successCount)) return;
        this.slow(utils.testControl.slowTime.refreshCommand + 100);
        await utils.executeTeCommand("refresh", utils.testControl.waitTime.refreshCommand);
        await utils.sleep(100);
        ++successCount;
    });


    test("Check Task Counts", async function()
    {
        if (utils.exitRollingCount(27, successCount)) return;
        await checkTaskCounts(this);
        ++successCount;
    });

});


const checkTaskCounts = async (instance: Mocha.Context) =>
{
    instance.slow((4 * utils.testControl.slowTime.verifyTaskCount) + utils.testControl.slowTime.verifyTaskCountNpm + utils.testControl.slowTime.verifyTaskCountWorkspace);
    await utils.verifyTaskCount("bash", 1);
    await utils.verifyTaskCount("batch", 2);
    await utils.verifyTaskCount("npm", 2);
    await utils.verifyTaskCount("grunt", 7);
    await utils.verifyTaskCount("gulp", 17);
    await utils.verifyTaskCount("Workspace", 10);
};
