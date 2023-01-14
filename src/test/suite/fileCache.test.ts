/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */

import * as utils from "../utils/utils";
import constants from "../../lib/constants";
import { expect } from "chai";
import { ITaskExplorerApi } from "@spmeesseman/vscode-taskexplorer-types";

let teApi: ITaskExplorerApi;
let successCount = -1;


suite("File Cache Tests", () =>
{
    suiteSetup(async function()
    {
        teApi = await utils.activate(this);
        ++successCount;
    });


    suiteTeardown(async function()
    {
        await utils.executeSettingsUpdate("enablePersistentFileCaching", false);
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
        this.slow(utils.testControl.slowTime.configEvent);
        await utils.executeSettingsUpdate("enablePersistentFileCaching", true);
        ++successCount;
    });


    test("Rebuild File Cache", async function()
    {
        if (utils.exitRollingCount(3, successCount)) return;
        this.slow(utils.testControl.slowTime.rebuildFileCache + 100 + utils.testControl.waitTime.min);
        // await treeUtils.refresh(this);
        await teApi.testsApi.fileCache.rebuildCache("");
        ++successCount;
    });


    test("Check Task Counts", async function()
    {
        if (utils.exitRollingCount(4, successCount)) return;
        await checkTaskCounts(this);
        ++successCount;
    });


    test("Disable Persistent Cache", async function()
    {
        if (utils.exitRollingCount(5, successCount)) return;
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


    test("Rebuild File Cache", async function()
    {
        if (utils.exitRollingCount(6, successCount)) return;
        // await treeUtils.refresh(this);
        await teApi.testsApi.fileCache.rebuildCache("");
        ++successCount;
    });


    test("Check Task Counts", async function()
    {
        if (utils.exitRollingCount(7, successCount)) return;
        await checkTaskCounts(this);
        ++successCount;
    });


    test("Cancel Rebuild Cache (Not Busy)", async function()
    {
        if (utils.exitRollingCount(8, successCount)) return;
        await teApi.testsApi.fileCache.cancelBuildCache();
        await utils.sleep(utils.testControl.waitTime.min);
        ++successCount;
    });


    test("Cancel Rebuild Cache (Busy No Delay)", async function()
    {
        if (utils.exitRollingCount(9, successCount)) return;
        this.slow(utils.testControl.slowTime.rebuildFileCacheCancel + utils.testControl.waitTime.min);
        teApi.testsApi.fileCache.rebuildCache(""); // Don't 'await'
        await teApi.testsApi.fileCache.cancelBuildCache();
        await utils.sleep(utils.testControl.waitTime.min);
        ++successCount;
    });


    test("Cancel Rebuild Cache (Busy 40ms Delay)", async function()
    {
        this.slow(utils.testControl.slowTime.rebuildFileCacheCancel + 40 + utils.testControl.waitTime.min);
        teApi.testsApi.fileCache.rebuildCache(""); // Don't 'await'
        await utils.sleep(40);
        await teApi.testsApi.fileCache.cancelBuildCache();
        await utils.sleep(utils.testControl.waitTime.min);
        ++successCount;
    });


    test("Cancel Rebuild Cache (Busy 75ms Delay)", async function()
    {
        this.slow(utils.testControl.slowTime.rebuildFileCacheCancel + 75 + utils.testControl.waitTime.min);
        teApi.testsApi.fileCache.rebuildCache(""); // Don't 'await'
        await utils.sleep(75);
        await teApi.testsApi.fileCache.cancelBuildCache();
        await utils.sleep(utils.testControl.waitTime.min);
        ++successCount;
    });


    test("Cancel Rebuild Cache (Busy 100ms Delay)", async function()
    {
        this.slow(utils.testControl.slowTime.rebuildFileCacheCancel + 100 + utils.testControl.waitTime.min);
        teApi.testsApi.fileCache.rebuildCache(""); // Don't 'await'
        await utils.sleep(100);
        await teApi.testsApi.fileCache.cancelBuildCache();
        await utils.sleep(utils.testControl.waitTime.min);
        ++successCount;
    });


    test("Cancel Rebuild Cache (Busy 250ms Delay)", async function()
    {
        this.slow(utils.testControl.slowTime.rebuildFileCacheCancel + 250 + utils.testControl.waitTime.min);
        teApi.testsApi.fileCache.rebuildCache(""); // Don't 'await'
        await utils.sleep(250);
        await teApi.testsApi.fileCache.cancelBuildCache();
        await utils.sleep(utils.testControl.waitTime.min);
        ++successCount;
    });


    test("Cancel Rebuild Cache (Busy 500ms Delay)", async function()
    {
        this.slow(utils.testControl.slowTime.rebuildFileCacheCancel + 500 + utils.testControl.waitTime.min);
        teApi.testsApi.fileCache.rebuildCache(""); // Don't 'await'
        await utils.sleep(500);
        await teApi.testsApi.fileCache.cancelBuildCache();
        await utils.sleep(utils.testControl.waitTime.min);
        ++successCount;
    });


    test("Cancel Rebuild Cache (Busy 750ms Delay)", async function()
    {
        this.slow(utils.testControl.slowTime.rebuildFileCacheCancel + 750 + utils.testControl.waitTime.min);
        teApi.testsApi.fileCache.rebuildCache(""); // Don't 'await'
        await utils.sleep(750);
        await teApi.testsApi.fileCache.cancelBuildCache();
        await utils.sleep(utils.testControl.waitTime.min);
        ++successCount;
    });


    test("Cancel Rebuild Cache (Busy 1s Delay)", async function()
    {
        this.slow(utils.testControl.slowTime.rebuildFileCacheCancel + 1000 + utils.testControl.waitTime.min);
        teApi.testsApi.fileCache.rebuildCache(""); // Don't 'await'
        await utils.sleep(1000);
        await teApi.testsApi.fileCache.cancelBuildCache();
        await utils.sleep(utils.testControl.waitTime.min);
        ++successCount;
    });


    test("Cancel Build Cache (FileWatcher Build) (No Delay)", async function()
    {
        this.slow(utils.testControl.slowTime.buildFileCacheCancel + utils.testControl.waitTime.min);
        teApi.testsApi.fileCache.buildTaskTypeCache("gulp", constants.GLOB_GULP, undefined, true, ""); // Don't 'await'
        await teApi.testsApi.fileCache.cancelBuildCache();
        await utils.sleep(utils.testControl.waitTime.min);
        ++successCount;
    });


    test("Cancel Build Cache (FileWatcher Build) (Busy 40ms Delay)", async function()
    {
        this.slow(utils.testControl.slowTime.buildFileCacheCancel + (utils.testControl.waitTime.min * 2));
        teApi.testsApi.fileCache.buildTaskTypeCache("gulp", constants.GLOB_GULP, undefined, true, ""); // Don't 'await'
        await utils.sleep(utils.testControl.waitTime.min);
        await teApi.testsApi.fileCache.cancelBuildCache();
        await utils.sleep(utils.testControl.waitTime.min);
        ++successCount;
    });


    test("Cancel Build Cache (FileWatcher Build) (Busy 75ms Delay)", async function()
    {
        this.slow(utils.testControl.slowTime.buildFileCacheCancel + 75 + utils.testControl.waitTime.min);
        teApi.testsApi.fileCache.buildTaskTypeCache("python", constants.GLOB_PYTHON, undefined, true, ""); // Don't 'await'
        await utils.sleep(75);
        await teApi.testsApi.fileCache.cancelBuildCache();
        await utils.sleep(utils.testControl.waitTime.min);
        ++successCount;
    });


    test("Cancel Build Cache (FileWatcher Build) (Busy 100ms Delay)", async function()
    {
        this.slow(utils.testControl.slowTime.buildFileCacheCancel + 100 + utils.testControl.waitTime.min);
        teApi.testsApi.fileCache.buildTaskTypeCache("batch", constants.GLOB_BATCH, undefined, true, ""); // Don't 'await'
        await utils.sleep(100);
        await teApi.testsApi.fileCache.cancelBuildCache();
        await utils.sleep(utils.testControl.waitTime.min);
        ++successCount;
    });


    test("Cancel Build Cache (FileWatcher Build) (Busy 250ms Delay)", async function()
    {
        this.slow(utils.testControl.slowTime.buildFileCacheCancel + 250 + utils.testControl.waitTime.min);
        teApi.testsApi.fileCache.buildTaskTypeCache("bash", constants.GLOB_BASH, undefined, true, ""); // Don't 'await'
        await utils.sleep(250);
        await teApi.testsApi.fileCache.cancelBuildCache();
        await utils.sleep(utils.testControl.waitTime.min);
        ++successCount;
    });


    test("Cancel Build Cache (FileWatcher Build) (Busy 500ms Delay)", async function()
    {
        this.slow(utils.testControl.slowTime.buildFileCacheCancel + 500 + utils.testControl.waitTime.min);
        teApi.testsApi.fileCache.buildTaskTypeCache("ant", constants.GLOB_ANT, undefined, true, ""); // Don't 'await'
        await utils.sleep(500);
        await teApi.testsApi.fileCache.cancelBuildCache();
        await utils.sleep(utils.testControl.waitTime.min);
        ++successCount;
    });


    test("Cancel Build Cache (FileWatcher Build) (Busy 750ms Delay)", async function()
    {
        this.slow(utils.testControl.slowTime.buildFileCacheCancel + 750 + 25);
        teApi.testsApi.fileCache.buildTaskTypeCache("npm", constants.GLOB_NPM, undefined, true, ""); // Don't 'await'
        await utils.sleep(750);
        await teApi.testsApi.fileCache.cancelBuildCache();
        await utils.sleep(utils.testControl.waitTime.min);
        ++successCount;
    });


    test("Cancel Build Cache (FileWatcher Build) (Busy 1s Delay)", async function()
    {
        this.slow(utils.testControl.slowTime.buildFileCacheCancel + 1000 + utils.testControl.waitTime.min);
        teApi.testsApi.fileCache.buildTaskTypeCache("grunt", constants.GLOB_GULP, undefined, true, ""); // Don't 'await'
        await utils.sleep(1000);
        await teApi.testsApi.fileCache.cancelBuildCache();
        await utils.sleep(utils.testControl.waitTime.min);
        ++successCount;
    });


    test("Rebuild Cache and Invaldate Providers after Cancel", async function()
    {
        this.slow(utils.testControl.slowTime.refreshCommand + 100);
        await utils.executeTeCommand("refresh", utils.testControl.waitTime.refreshCommand);
        await utils.sleep(100);
        ++successCount;
    });


    test("Check Task Counts", async function()
    {
        try { expect(successCount).to.be.equal(1); } catch { utils.exitRollingCount(1, successCount); return; }
        await checkTaskCounts(this);
        ++successCount;
    });

});


const checkTaskCounts = async (instance: Mocha.Context) =>
{
    instance.slow((4 * utils.testControl.slowTime.verifyTaskCount) + utils.testControl.slowTime.verifyTaskCountNpm);
    await utils.verifyTaskCount("bash", 1);
    await utils.verifyTaskCount("batch", 2);
    await utils.verifyTaskCount("npm", 2);
    await utils.verifyTaskCount("python", 2);
    await utils.verifyTaskCount("Workspace", 10);
};