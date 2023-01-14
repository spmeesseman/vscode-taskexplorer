/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */

import * as assert from "assert";
import { getInstallPath } from "../../lib/utils/utils";
import { refreshTree } from "../../lib/refreshTree";
import { ITaskExplorer, ITaskExplorerApi } from "@spmeesseman/vscode-taskexplorer-types";
import { activate, executeSettingsUpdate, executeTeCommand, exitRollingCount, setExplorer, sleep, suiteFinished, testControl, treeUtils, verifyTaskCount } from "../utils/utils";
import constants from "../../lib/constants";
import { expect } from "chai";

let teApi: ITaskExplorerApi;
let explorer: ITaskExplorer;
let successCount = -1;


suite("File Cache Tests", () =>
{
    suiteSetup(async function()
    {
        teApi = await activate(this);
        explorer = teApi.testsApi.explorer;
        ++successCount;
    });


    suiteTeardown(async function()
    {
        await executeSettingsUpdate("enablePersistentFileCaching", false);
        suiteFinished(this);
    });


    test("Build Tree (View Collapsed)", async function()
    {
        try { expect(successCount).to.be.equal(0); } catch { exitRollingCount(0); return; }
        await treeUtils.refresh(this);
        ++successCount;
    });


    test("Check Task Counts", async function()
    {
        try { expect(successCount).to.be.equal(1); } catch { exitRollingCount(1); return; }
        await checkCount(this);
        ++successCount;
    });


    test("Enable Persistent Cache", async function()
    {
        try { expect(successCount).to.be.equal(2); } catch { exitRollingCount(2); return; }
        this.slow(testControl.slowTime.configEvent);
        await executeSettingsUpdate("enablePersistentFileCaching", true);
        ++successCount;
    });


    test("Rebuild File Cache", async function()
    {
        try { expect(successCount).to.be.equal(3); } catch { exitRollingCount(3); return; }
        this.slow(testControl.slowTime.rebuildFileCache + 100 + testControl.waitTime.min);
        // await treeUtils.refresh(this);
        await teApi.testsApi.fileCache.rebuildCache("");
        ++successCount;
    });


    test("Check Task Counts", async function()
    {
        try { expect(successCount).to.be.equal(1); } catch { exitRollingCount(1); return; }
        await checkCount(this);
        ++successCount;
    });


    test("Disable Persistent Cache", async function()
    {
        try { expect(successCount).to.be.equal(4); } catch { exitRollingCount(4); return; }
        this.slow(testControl.slowTime.configEvent);
        await executeSettingsUpdate("enablePersistentFileCaching", false);
        ++successCount;
    });


    // test("Rebuild Cache and Invaldate Providers after Cancel", async function()
    // {
    //     this.slow(testControl.slowTime.refreshCommand + 100);
    //     await executeTeCommand("refresh", testControl.waitTime.refreshCommand);
    //     await sleep(100);
    //     ++successCount;
    // });


    test("Rebuild File Cache", async function()
    {
        try { expect(successCount).to.be.equal(5); } catch { exitRollingCount(5); return; }
        // await treeUtils.refresh(this);
        await teApi.testsApi.fileCache.rebuildCache("");
        ++successCount;
    });


    test("Check Task Counts", async function()
    {
        try { expect(successCount).to.be.equal(1); } catch { exitRollingCount(1); return; }
        await checkCount(this);
        ++successCount;
    });


    test("Cancel Rebuild Cache (Not Busy)", async function()
    {
        try { expect(successCount).to.be.equal(6); } catch { exitRollingCount(6); return; }
        await teApi.testsApi.fileCache.cancelBuildCache();
        await sleep(testControl.waitTime.min);
        ++successCount;
    });


    test("Cancel Rebuild Cache (Busy No Delay)", async function()
    {
        this.slow(testControl.slowTime.rebuildFileCacheCancel + testControl.waitTime.min);
        teApi.testsApi.fileCache.rebuildCache(""); // Don't 'await'
        await teApi.testsApi.fileCache.cancelBuildCache();
        await sleep(testControl.waitTime.min);
        ++successCount;
    });


    test("Cancel Rebuild Cache (Busy 40ms Delay)", async function()
    {
        this.slow(testControl.slowTime.rebuildFileCacheCancel + 40 + testControl.waitTime.min);
        teApi.testsApi.fileCache.rebuildCache(""); // Don't 'await'
        await sleep(40);
        await teApi.testsApi.fileCache.cancelBuildCache();
        await sleep(testControl.waitTime.min);
        ++successCount;
    });


    test("Cancel Rebuild Cache (Busy 75ms Delay)", async function()
    {
        this.slow(testControl.slowTime.rebuildFileCacheCancel + 75 + testControl.waitTime.min);
        teApi.testsApi.fileCache.rebuildCache(""); // Don't 'await'
        await sleep(75);
        await teApi.testsApi.fileCache.cancelBuildCache();
        await sleep(testControl.waitTime.min);
        ++successCount;
    });


    test("Cancel Rebuild Cache (Busy 100ms Delay)", async function()
    {
        this.slow(testControl.slowTime.rebuildFileCacheCancel + 100 + testControl.waitTime.min);
        teApi.testsApi.fileCache.rebuildCache(""); // Don't 'await'
        await sleep(100);
        await teApi.testsApi.fileCache.cancelBuildCache();
        await sleep(testControl.waitTime.min);
        ++successCount;
    });


    test("Cancel Rebuild Cache (Busy 250ms Delay)", async function()
    {
        this.slow(testControl.slowTime.rebuildFileCacheCancel + 250 + testControl.waitTime.min);
        teApi.testsApi.fileCache.rebuildCache(""); // Don't 'await'
        await sleep(250);
        await teApi.testsApi.fileCache.cancelBuildCache();
        await sleep(testControl.waitTime.min);
        ++successCount;
    });


    test("Cancel Rebuild Cache (Busy 500ms Delay)", async function()
    {
        this.slow(testControl.slowTime.rebuildFileCacheCancel + 500 + testControl.waitTime.min);
        teApi.testsApi.fileCache.rebuildCache(""); // Don't 'await'
        await sleep(500);
        await teApi.testsApi.fileCache.cancelBuildCache();
        await sleep(testControl.waitTime.min);
        ++successCount;
    });


    test("Cancel Rebuild Cache (Busy 750ms Delay)", async function()
    {
        this.slow(testControl.slowTime.rebuildFileCacheCancel + 750 + testControl.waitTime.min);
        teApi.testsApi.fileCache.rebuildCache(""); // Don't 'await'
        await sleep(750);
        await teApi.testsApi.fileCache.cancelBuildCache();
        await sleep(testControl.waitTime.min);
        ++successCount;
    });


    test("Cancel Rebuild Cache (Busy 1s Delay)", async function()
    {
        this.slow(testControl.slowTime.rebuildFileCacheCancel + 1000 + testControl.waitTime.min);
        teApi.testsApi.fileCache.rebuildCache(""); // Don't 'await'
        await sleep(1000);
        await teApi.testsApi.fileCache.cancelBuildCache();
        await sleep(testControl.waitTime.min);
        ++successCount;
    });


    test("Cancel Build Cache (FileWatcher Build) (No Delay)", async function()
    {
        this.slow(testControl.slowTime.buildFileCacheCancel + testControl.waitTime.min);
        teApi.testsApi.fileCache.buildTaskTypeCache("gulp", constants.GLOB_GULP, undefined, true, ""); // Don't 'await'
        await teApi.testsApi.fileCache.cancelBuildCache();
        await sleep(testControl.waitTime.min);
        ++successCount;
    });


    test("Cancel Build Cache (FileWatcher Build) (Busy 40ms Delay)", async function()
    {
        this.slow(testControl.slowTime.buildFileCacheCancel + (testControl.waitTime.min * 2));
        teApi.testsApi.fileCache.buildTaskTypeCache("gulp", constants.GLOB_GULP, undefined, true, ""); // Don't 'await'
        await sleep(testControl.waitTime.min);
        await teApi.testsApi.fileCache.cancelBuildCache();
        await sleep(testControl.waitTime.min);
        ++successCount;
    });


    test("Cancel Build Cache (FileWatcher Build) (Busy 75ms Delay)", async function()
    {
        this.slow(testControl.slowTime.buildFileCacheCancel + 75 + testControl.waitTime.min);
        teApi.testsApi.fileCache.buildTaskTypeCache("python", constants.GLOB_PYTHON, undefined, true, ""); // Don't 'await'
        await sleep(75);
        await teApi.testsApi.fileCache.cancelBuildCache();
        await sleep(testControl.waitTime.min);
        ++successCount;
    });


    test("Cancel Build Cache (FileWatcher Build) (Busy 100ms Delay)", async function()
    {
        this.slow(testControl.slowTime.buildFileCacheCancel + 100 + testControl.waitTime.min);
        teApi.testsApi.fileCache.buildTaskTypeCache("batch", constants.GLOB_BATCH, undefined, true, ""); // Don't 'await'
        await sleep(100);
        await teApi.testsApi.fileCache.cancelBuildCache();
        await sleep(testControl.waitTime.min);
        ++successCount;
    });


    test("Cancel Build Cache (FileWatcher Build) (Busy 250ms Delay)", async function()
    {
        this.slow(testControl.slowTime.buildFileCacheCancel + 250 + testControl.waitTime.min);
        teApi.testsApi.fileCache.buildTaskTypeCache("bash", constants.GLOB_BASH, undefined, true, ""); // Don't 'await'
        await sleep(250);
        await teApi.testsApi.fileCache.cancelBuildCache();
        await sleep(testControl.waitTime.min);
        ++successCount;
    });


    test("Cancel Build Cache (FileWatcher Build) (Busy 500ms Delay)", async function()
    {
        this.slow(testControl.slowTime.buildFileCacheCancel + 500 + testControl.waitTime.min);
        teApi.testsApi.fileCache.buildTaskTypeCache("ant", constants.GLOB_ANT, undefined, true, ""); // Don't 'await'
        await sleep(500);
        await teApi.testsApi.fileCache.cancelBuildCache();
        await sleep(testControl.waitTime.min);
        ++successCount;
    });


    test("Cancel Build Cache (FileWatcher Build) (Busy 750ms Delay)", async function()
    {
        this.slow(testControl.slowTime.buildFileCacheCancel + 750 + 25);
        teApi.testsApi.fileCache.buildTaskTypeCache("npm", constants.GLOB_NPM, undefined, true, ""); // Don't 'await'
        await sleep(750);
        await teApi.testsApi.fileCache.cancelBuildCache();
        await sleep(testControl.waitTime.min);
        ++successCount;
    });


    test("Cancel Build Cache (FileWatcher Build) (Busy 1s Delay)", async function()
    {
        this.slow(testControl.slowTime.buildFileCacheCancel + 1000 + testControl.waitTime.min);
        teApi.testsApi.fileCache.buildTaskTypeCache("grunt", constants.GLOB_GULP, undefined, true, ""); // Don't 'await'
        await sleep(1000);
        await teApi.testsApi.fileCache.cancelBuildCache();
        await sleep(testControl.waitTime.min);
        ++successCount;
    });


    test("Rebuild Cache and Invaldate Providers after Cancel", async function()
    {
        this.slow(testControl.slowTime.refreshCommand + 100);
        await executeTeCommand("refresh", testControl.waitTime.refreshCommand);
        await sleep(100);
        ++successCount;
    });


    test("Check Task Counts", async function()
    {
        try { expect(successCount).to.be.equal(1); } catch { exitRollingCount(1); return; }
        await checkCount(this);
        ++successCount;
    });

});


const checkCount = async (instance: Mocha.Context) =>
{
    instance.slow(4 * (testControl.slowTime.getTreeTasks + testControl.slowTime.verifyTaskCount + testControl.slowTime.verifyTaskCountByTree) +
                    (testControl.slowTime.getTreeTasks + testControl.slowTime.verifyTaskCountNpm + testControl.slowTime.verifyTaskCountByTree));

    await treeUtils.getTreeTasks("bash", 1);
    await verifyTaskCount("bash", 1);
    await treeUtils.verifyTaskCountByTree("bash", 1);

    await treeUtils.getTreeTasks("batch", 2);
    await verifyTaskCount("batch", 2);
    await treeUtils.verifyTaskCountByTree("batch", 2);

    try { expect(successCount).to.be.equal(3); } catch { exitRollingCount(3); return; }
    await treeUtils.getTreeTasks("npm", 2);
    await verifyTaskCount("npm", 2);
    await treeUtils.verifyTaskCountByTree("npm", 2);

    try { expect(successCount).to.be.equal(4); } catch { exitRollingCount(4); return; }
    await treeUtils.getTreeTasks("python", 2);
    await verifyTaskCount("python", 2);
    await treeUtils.verifyTaskCountByTree("python", 2);

    try { expect(successCount).to.be.equal(5); } catch { exitRollingCount(5); return; }
    await treeUtils.getTreeTasks("Workspace", 10);
    await verifyTaskCount("Workspace", 10);
    await treeUtils.verifyTaskCountByTree("Workspace", 10);
};