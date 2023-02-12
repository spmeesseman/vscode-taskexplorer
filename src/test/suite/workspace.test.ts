/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* tslint:disable */

import { TeWrapper } from "../../lib/wrapper";
import { startupFocus } from "../utils/suiteUtils";
import { ITaskExplorerApi } from "@spmeesseman/vscode-taskexplorer-types";
import { executeSettingsUpdate, focusExplorerView } from "../utils/commandUtils";
import {
    activate, endRollingCount, exitRollingCount, needsTreeBuild, suiteFinished, testControl,
    treeUtils
} from "../utils/utils";

const testsName = "Workspace";
const startTaskCount = 10; // 10 + 3 'User' Tasks, but getTaskCountByTree() will not return the User tasks

let teApi: ITaskExplorerApi;
let teWrapper: TeWrapper;
let wsEnable: boolean;


suite("Workspace / VSCode Tests", () =>
{

    suiteSetup(async function()
    {
        if (exitRollingCount(this, true)) return;
        ({ teApi, teWrapper } = await activate(this));
        wsEnable = teWrapper.configuration.get<boolean>("showHiddenWsTasks");
        endRollingCount(this, true);
    });


    suiteTeardown(async function()
    {
        if (exitRollingCount(this, false, true)) return;
        await teWrapper.configuration.updateWs("showHiddenWsTasks", wsEnable);
        suiteFinished(this);
    });


    test("Focus Explorer View", async function()
	{
        await startupFocus(this);
	});



    test("Show VSCode Tasks Marked Hidden", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(testControl.slowTime.config.event + testControl.slowTime.taskCount.verifyByTree);
        await executeSettingsUpdate("showHiddenWsTasks", true);
        await treeUtils.verifyTaskCountByTree(teWrapper, testsName, startTaskCount);
        endRollingCount(this);
    });


    test("Hide VSCode Tasks Marked Hidden", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(testControl.slowTime.config.enableEvent + testControl.slowTime.taskCount.verifyByTree);
        await executeSettingsUpdate("showHiddenWsTasks", false);
        await treeUtils.verifyTaskCountByTree(teWrapper, testsName, startTaskCount - 1);
        endRollingCount(this);
    });


    test("Disable User Tasks", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(testControl.slowTime.config.showHideUserTasks); // + testControl.slowTime.taskCount.verifyByTree);
        await executeSettingsUpdate("specialFolders.showUserTasks", false, testControl.waitTime.config.showHideUserTasks);
        // TODO - I don't think verifyTaskCountByTree(teWrapper, ) returns User tasks.
        // await treeUtils.verifyTaskCountByTree(teWrapper, testsName, startTaskCount - 4);
        endRollingCount(this);
    });


    test("Disable Workspace Tasks", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(testControl.slowTime.config.enableEvent + testControl.slowTime.taskCount.verifyByTree);
        await executeSettingsUpdate("enabledTasks.workspace", false);
        await treeUtils.verifyTaskCountByTree(teWrapper, testsName, 0);
        endRollingCount(this);
    });


    test("Re-enable Workspace Tasks", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(testControl.slowTime.config.enableEventWorkspace + testControl.slowTime.taskCount.verifyByTree);
        await executeSettingsUpdate("enabledTasks.workspace", true);
        await treeUtils.verifyTaskCountByTree(teWrapper, testsName, startTaskCount - 1);
        endRollingCount(this);
    });


    test("Re-show VSCode Tasks Marked Hidden", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(testControl.slowTime.config.enableEvent + testControl.slowTime.taskCount.verifyByTree);
        await executeSettingsUpdate("showHiddenWsTasks", true);
        await treeUtils.verifyTaskCountByTree(teWrapper, testsName, startTaskCount);
        endRollingCount(this);
    });


    test("Re-enable User Tasks", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(testControl.slowTime.config.showHideUserTasks + testControl.slowTime.taskCount.verifyByTree);
        await executeSettingsUpdate("specialFolders.showUserTasks", true, testControl.waitTime.config.showHideUserTasks);
        await treeUtils.verifyTaskCountByTree(teWrapper, testsName, startTaskCount);
        endRollingCount(this);
    });

});
