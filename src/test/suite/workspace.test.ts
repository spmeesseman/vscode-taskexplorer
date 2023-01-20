/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* tslint:disable */

import { ITaskExplorerApi } from "@spmeesseman/vscode-taskexplorer-types";
import { activate, executeSettingsUpdate, exitRollingCount, focusExplorerView, needsTreeBuild, suiteFinished, testControl, treeUtils } from "../utils/utils";

const testsName = "Workspace";
const startTaskCount = 10; // 10 + 3 'User' Tasks, but getTaskCountByTree() will not return the User tasks

let teApi: ITaskExplorerApi;
let wsEnable: boolean;
let successCount = -1;


suite("Workspace / VSCode Tests", () =>
{

    suiteSetup(async function()
    {
        ({ teApi } = await activate(this));
        wsEnable = teApi.config.get<boolean>("showHiddenWsTasks");
        await executeSettingsUpdate("showHiddenWsTasks", true);
        successCount++;
    });


    suiteTeardown(async function()
    {
        await teApi.config.updateWs("showHiddenWsTasks", wsEnable);
        suiteFinished(this);
    });


	test("Focus Tree View", async function()
	{
        if (exitRollingCount(this)) return;
        if (needsTreeBuild()) {
            await focusExplorerView(this);
        }
        successCount++;
	});


    test("Show VSCode Tasks Marked Hidden", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(testControl.slowTime.config.event + testControl.slowTime.taskCount.verify);
        await executeSettingsUpdate("showHiddenWsTasks", true);
        await treeUtils.verifyTaskCountByTree(testsName, startTaskCount);
        successCount++;
    });


    test("Hide VSCode Tasks Marked Hidden", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(testControl.slowTime.config.enableEvent + testControl.slowTime.taskCount.verify);
        await executeSettingsUpdate("showHiddenWsTasks", false);
        await treeUtils.verifyTaskCountByTree(testsName, startTaskCount - 1);
        successCount++;
    });


    test("Disable User Tasks", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(testControl.slowTime.config.showHideUserTasks); // + testControl.slowTime.taskCount.verify);
        await executeSettingsUpdate("specialFolders.showUserTasks", false, testControl.waitTime.config.showHideUserTasks);
        // TODO - I don't think verifyTaskCountByTree() returns User tasks.
        // await treeUtils.verifyTaskCountByTree(testsName, startTaskCount - 4);
        successCount++;
    });


    test("Disable Workspace Tasks", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(testControl.slowTime.config.enableEvent + testControl.slowTime.taskCount.verify);
        await executeSettingsUpdate("enabledTasks.workspace", false);
        await treeUtils.verifyTaskCountByTree(testsName, 0);
        successCount++;
    });


    test("Re-enable Workspace Tasks", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(testControl.slowTime.config.enableEventWorkspace + testControl.slowTime.taskCount.verify);
        await executeSettingsUpdate("enabledTasks.workspace", true);
        await treeUtils.verifyTaskCountByTree(testsName, startTaskCount - 1);
        successCount++;
    });


    test("Re-show VSCode Tasks Marked Hidden", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(testControl.slowTime.config.enableEvent + testControl.slowTime.taskCount.verify);
        await executeSettingsUpdate("showHiddenWsTasks", true);
        await treeUtils.verifyTaskCountByTree(testsName, startTaskCount);
        successCount++;
    });


    test("Re-enable User Tasks", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(testControl.slowTime.config.showHideUserTasks + testControl.slowTime.taskCount.verify);
        await executeSettingsUpdate("specialFolders.showUserTasks", true, testControl.waitTime.config.showHideUserTasks);
        await treeUtils.verifyTaskCountByTree(testsName, startTaskCount);
        successCount++;
    });

});
