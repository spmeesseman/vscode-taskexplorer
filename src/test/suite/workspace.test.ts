/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* tslint:disable */

import { ITaskExplorerApi } from "@spmeesseman/vscode-taskexplorer-types";
import {
    activate, endRollingCount, executeSettingsUpdate, exitRollingCount, focusExplorerView,
    needsTreeBuild, suiteFinished, testControl, treeUtils} from "../utils/utils";

const testsName = "Workspace";
const startTaskCount = 10; // 10 + 3 'User' Tasks, but getTaskCountByTree() will not return the User tasks

let teApi: ITaskExplorerApi;
let wsEnable: boolean;


suite("Workspace / VSCode Tests", () =>
{

    suiteSetup(async function()
    {
        ({ teApi } = await activate(this));
        wsEnable = teApi.config.get<boolean>("showHiddenWsTasks");
        await executeSettingsUpdate("showHiddenWsTasks", true);
        endRollingCount(this);
    });


    suiteTeardown(async function()
    {
        await teApi.config.updateWs("showHiddenWsTasks", wsEnable);
        suiteFinished(this);
    });


	test("Focus Tree View", async function()
	{
        if (exitRollingCount(this)) return;
        if (needsTreeBuild(true)) {
            await focusExplorerView(this);
        }
        endRollingCount(this);
	});


    test("Show VSCode Tasks Marked Hidden", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(testControl.slowTime.config.event + testControl.slowTime.taskCount.verify);
        await executeSettingsUpdate("showHiddenWsTasks", true);
        await treeUtils.verifyTaskCountByTree(testsName, startTaskCount);
        endRollingCount(this);
    });


    test("Hide VSCode Tasks Marked Hidden", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(testControl.slowTime.config.enableEvent + testControl.slowTime.taskCount.verify);
        await executeSettingsUpdate("showHiddenWsTasks", false);
        await treeUtils.verifyTaskCountByTree(testsName, startTaskCount - 1);
        endRollingCount(this);
    });


    test("Disable User Tasks", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(testControl.slowTime.config.showHideUserTasks); // + testControl.slowTime.taskCount.verify);
        await executeSettingsUpdate("specialFolders.showUserTasks", false, testControl.waitTime.config.showHideUserTasks);
        // TODO - I don't think verifyTaskCountByTree() returns User tasks.
        // await treeUtils.verifyTaskCountByTree(testsName, startTaskCount - 4);
        endRollingCount(this);
    });


    test("Disable Workspace Tasks", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(testControl.slowTime.config.enableEvent + testControl.slowTime.taskCount.verify);
        await executeSettingsUpdate("enabledTasks.workspace", false);
        await treeUtils.verifyTaskCountByTree(testsName, 0);
        endRollingCount(this);
    });


    test("Re-enable Workspace Tasks", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(testControl.slowTime.config.enableEventWorkspace + testControl.slowTime.taskCount.verify);
        await executeSettingsUpdate("enabledTasks.workspace", true);
        await treeUtils.verifyTaskCountByTree(testsName, startTaskCount - 1);
        endRollingCount(this);
    });


    test("Re-show VSCode Tasks Marked Hidden", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(testControl.slowTime.config.enableEvent + testControl.slowTime.taskCount.verify);
        await executeSettingsUpdate("showHiddenWsTasks", true);
        await treeUtils.verifyTaskCountByTree(testsName, startTaskCount);
        endRollingCount(this);
    });


    test("Re-enable User Tasks", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(testControl.slowTime.config.showHideUserTasks + testControl.slowTime.taskCount.verify);
        await executeSettingsUpdate("specialFolders.showUserTasks", true, testControl.waitTime.config.showHideUserTasks);
        await treeUtils.verifyTaskCountByTree(testsName, startTaskCount);
        endRollingCount(this);
    });

});
