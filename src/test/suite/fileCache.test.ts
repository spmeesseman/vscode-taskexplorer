/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */

import * as utils from "../utils/utils";
import { ITeWrapper } from "@spmeesseman/vscode-taskexplorer-types";
import { executeSettingsUpdate, executeTeCommand } from "../utils/commandUtils";

let teWrapper: ITeWrapper;
const tc = utils.testControl;


suite("File Cache Tests", () =>
{
    suiteSetup(async function()
    {
        if (utils.exitRollingCount(this, true)) return;
        ({ teWrapper } = await utils.activate(this));
        await teWrapper.storage.update2("fileCacheTaskFilesMap", undefined);
        await teWrapper.storage.update2("fileCacheProjectFilesMap", undefined);
        await teWrapper.storage.update2("fileCacheProjectFileToFileCountMap", undefined);
        utils.endRollingCount(this, true);
    });


    suiteTeardown(async function()
    {
        if (utils.exitRollingCount(this, false, true)) return;
        await executeSettingsUpdate("enablePersistentFileCaching", false);
        await teWrapper.storage.update2("fileCacheTaskFilesMap", undefined);
        await teWrapper.storage.update2("fileCacheProjectFilesMap", undefined);
        await teWrapper.storage.update2("fileCacheProjectFileToFileCountMap", undefined);
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
        this.slow(tc.slowTime.config.event + tc.slowTime.cache.persist);
        await executeSettingsUpdate("enablePersistentFileCaching", true); // enabling setting will persist *now*
        utils.endRollingCount(this);
    });


    test("Rebuild File Cache (Mimic Startup)", async function()
    {
        if (utils.exitRollingCount(this)) return;
        this.slow(tc.slowTime.cache.rebuild + tc.slowTime.min);
        await teWrapper.filecache.rebuildCache("", true);
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
        this.slow(tc.slowTime.cache.rebuild + (tc.slowTime.config.event * 3) + (tc.slowTime.taskCount.verify * 6));
        await teWrapper.storage.update2("fileCacheTaskFilesMap", undefined);
        await teWrapper.storage.update2("fileCacheProjectFilesMap", undefined);
        await teWrapper.storage.update2("fileCacheProjectFileToFileCountMap", undefined);
        await teWrapper.filecache.rebuildCache("", true);
        await utils.sleep(tc.waitTime.min);
        await checkTaskCounts();
        utils.endRollingCount(this);
    });


    test("Disable Persistent Cache", async function()
    {
        if (utils.exitRollingCount(this)) return;
        this.slow(tc.slowTime.config.event + tc.slowTime.config.event);
        await executeSettingsUpdate("enablePersistentFileCaching", false);
        utils.endRollingCount(this);
    });


    test("Rebuild File Cache (Mimic Startup)", async function()
    {
        if (utils.exitRollingCount(this)) return;
        this.slow(tc.slowTime.cache.rebuild + tc.slowTime.commands.fast);
        // await treeUtils.refresh(this);
        await teWrapper.filecache.rebuildCache("", true);
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
        this.slow(tc.slowTime.cache.rebuildCancel + tc.waitTime.min);
        await teWrapper.filecache.cancelBuildCache();
        await utils.sleep(tc.waitTime.min);
        utils.endRollingCount(this);
    });


    test("Cancel Rebuild Cache (Busy No Delay)", async function()
    {
        if (utils.exitRollingCount(this)) return;
        this.slow(tc.slowTime.cache.rebuildCancel + tc.waitTime.min);
        teWrapper.filecache.rebuildCache(""); // Don't 'await'
        await teWrapper.filecache.cancelBuildCache();
        await utils.sleep(tc.waitTime.min);
        utils.endRollingCount(this);
    });


    test("Cancel Rebuild Cache (Busy 40ms Delay)", async function()
    {
        if (utils.exitRollingCount(this)) return;
        this.slow(tc.slowTime.cache.rebuildCancel + 80);
        teWrapper.filecache.rebuildCache(""); // Don't 'await'
        await utils.sleep(40);
        await teWrapper.filecache.cancelBuildCache();
        await utils.sleep(tc.waitTime.min);
        utils.endRollingCount(this);
    });


    test("Cancel Rebuild Cache (Busy 75ms Delay)", async function()
    {
        if (utils.exitRollingCount(this)) return;
        this.slow(tc.slowTime.cache.rebuildCancel + 150);
        teWrapper.filecache.rebuildCache(""); // Don't 'await'
        await utils.sleep(75);
        await teWrapper.filecache.cancelBuildCache();
        await utils.sleep(tc.waitTime.min);
        utils.endRollingCount(this);
    });


    test("Cancel Rebuild Cache (Busy 100ms Delay)", async function()
    {
        if (utils.exitRollingCount(this)) return;
        this.slow(tc.slowTime.cache.rebuildCancel + 200);
        teWrapper.filecache.rebuildCache(""); // Don't 'await'
        await utils.sleep(100);
        await teWrapper.filecache.cancelBuildCache();
        await utils.sleep(tc.waitTime.min);
        utils.endRollingCount(this);
    });


    test("Cancel Rebuild Cache (Busy 250ms Delay)", async function()
    {
        if (utils.exitRollingCount(this)) return;
        this.slow(tc.slowTime.cache.rebuildCancel + 500);
        teWrapper.filecache.rebuildCache(""); // Don't 'await'
        await utils.sleep(250);
        await teWrapper.filecache.cancelBuildCache();
        await utils.sleep(tc.waitTime.min);
        utils.endRollingCount(this);
    });


    test("Cancel Rebuild Cache (Busy 500ms Delay)", async function()
    {
        if (utils.exitRollingCount(this)) return;
        this.slow(tc.slowTime.cache.rebuildCancel + 1000);
        teWrapper.filecache.rebuildCache(""); // Don't 'await'
        await utils.sleep(500);
        await teWrapper.filecache.cancelBuildCache();
        await utils.sleep(tc.waitTime.min);
        utils.endRollingCount(this);
    });


    test("Cancel Rebuild Cache (Busy 750ms Delay)", async function()
    {
        if (utils.exitRollingCount(this)) return;
        this.slow(tc.slowTime.cache.rebuildCancel + 1500);
        teWrapper.filecache.rebuildCache(""); // Don't 'await'
        await utils.sleep(750);
        await teWrapper.filecache.cancelBuildCache();
        await utils.sleep(tc.waitTime.min);
        utils.endRollingCount(this);
    });


    test("Cancel Rebuild Cache (Busy 1s Delay)", async function()
    {
        if (utils.exitRollingCount(this)) return;
        this.slow(tc.slowTime.cache.rebuildCancel + 2000);
        teWrapper.filecache.rebuildCache(""); // Don't 'await'
        await utils.sleep(1000);
        await teWrapper.filecache.cancelBuildCache();
        await utils.sleep(tc.waitTime.min);
        utils.endRollingCount(this);
    });


    test("Cancel Build Cache (FileWatcher Build) (No Delay)", async function()
    {
        if (utils.exitRollingCount(this)) return;
        this.slow(tc.slowTime.cache.buildCancel);
        teWrapper.filecache.buildTaskTypeCache("gulp", undefined, true, ""); // Don't 'await'
        await teWrapper.filecache.cancelBuildCache();
        await utils.sleep(tc.waitTime.min);
        utils.endRollingCount(this);
    });


    test("Cancel Build Cache (FileWatcher Build) (Busy 10ms Delay)", async function()
    {
        if (utils.exitRollingCount(this)) return;
        this.slow(tc.slowTime.cache.buildCancel + 20);
        teWrapper.filecache.buildTaskTypeCache("gulp", undefined, true, ""); // Don't 'await'
        await utils.sleep(10);
        await teWrapper.filecache.cancelBuildCache();
        await utils.sleep(tc.waitTime.min);
        utils.endRollingCount(this);
    });


    test("Cancel Build Cache (FileWatcher Build) (Busy 20ms Delay)", async function()
    {
        if (utils.exitRollingCount(this)) return;
        this.slow(tc.slowTime.cache.buildCancel + 40);
        teWrapper.filecache.buildTaskTypeCache("python", undefined, true, ""); // Don't 'await'
        await utils.sleep(20);
        await teWrapper.filecache.cancelBuildCache();
        await utils.sleep(tc.waitTime.min);
        utils.endRollingCount(this);
    });


    test("Cancel Build Cache (FileWatcher Build) (Busy 50ms Delay)", async function()
    {
        if (utils.exitRollingCount(this)) return;
        this.slow(tc.slowTime.cache.buildCancel + 100);
        teWrapper.filecache.buildTaskTypeCache("batch", undefined, true, ""); // Don't 'await'
        await utils.sleep(50);
        await teWrapper.filecache.cancelBuildCache();
        await utils.sleep(tc.waitTime.min);
        utils.endRollingCount(this);
    });


    test("Cancel Build Cache (FileWatcher Build) (Busy 75ms Delay)", async function()
    {
        if (utils.exitRollingCount(this)) return;
        this.slow(tc.slowTime.cache.buildCancel + 150);
        teWrapper.filecache.buildTaskTypeCache("bash", undefined, true, ""); // Don't 'await'
        await utils.sleep(75);
        await teWrapper.filecache.cancelBuildCache();
        await utils.sleep(tc.waitTime.min);
        utils.endRollingCount(this);
    });


    test("Cancel Build Cache (FileWatcher Build) (Busy 150ms Delay)", async function()
    {
        if (utils.exitRollingCount(this)) return;
        this.slow(tc.slowTime.cache.buildCancel + 300);
        teWrapper.filecache.buildTaskTypeCache("ant", undefined, true, ""); // Don't 'await'
        await utils.sleep(150);
        await teWrapper.filecache.cancelBuildCache();
        await utils.sleep(tc.waitTime.min);
        utils.endRollingCount(this);
    });


    test("Cancel Build Cache (FileWatcher Build) (Busy 250ms Delay)", async function()
    {
        if (utils.exitRollingCount(this)) return;
        this.slow(tc.slowTime.cache.buildCancel + 500);
        teWrapper.filecache.buildTaskTypeCache("npm", undefined, true, ""); // Don't 'await'
        await utils.sleep(250);
        await teWrapper.filecache.cancelBuildCache();
        await utils.sleep(tc.waitTime.min);
        utils.endRollingCount(this);
    });


    test("Cancel Build Cache (FileWatcher Build) (Busy 500ms Delay)", async function()
    {
        if (utils.exitRollingCount(this)) return;
        this.slow(tc.slowTime.cache.buildCancel + 1000);
        teWrapper.filecache.buildTaskTypeCache("grunt", undefined, true, ""); // Don't 'await'
        await utils.sleep(500);
        await teWrapper.filecache.cancelBuildCache();
        await utils.sleep(tc.waitTime.min);
        utils.endRollingCount(this);
    });


    test("Rebuild Cache and Invaldate Providers after Cancel", async function()
    {
        if (utils.exitRollingCount(this)) return;
        this.slow(tc.slowTime.commands.refresh + 200);
        await executeTeCommand("refresh", tc.waitTime.refreshCommand);
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
        instance.slow(tc.slowTime.taskCount.verify * 6);
    }
    await utils.verifyTaskCount("bash", 1);
    await utils.verifyTaskCount("batch", 2);
    await utils.verifyTaskCount("npm", tc.isMultiRootWorkspace ? 17 : 2);
    await utils.verifyTaskCount("grunt", 7);
    await utils.verifyTaskCount("gulp", 17);
    await utils.verifyTaskCount("Workspace", 13); // 10 + 3 User Tasks
};
