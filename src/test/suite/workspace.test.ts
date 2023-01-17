/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* tslint:disable */

import { ITaskExplorerApi } from "@spmeesseman/vscode-taskexplorer-types";
import { activate, executeSettingsUpdate, exitRollingCount, suiteFinished, testControl, treeUtils } from "../utils/utils";

const testsName = "Workspace";
const startTaskCount = 10;

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


    test("Show VSCode Tasks Marked Hidden", async function()
    {
        if (exitRollingCount(0, successCount)) return;
        this.slow(testControl.slowTime.config.event + testControl.slowTime.verifyTaskCount);
        await executeSettingsUpdate("showHiddenWsTasks", true);
        await treeUtils.verifyTaskCountByTree(testsName, startTaskCount);
        successCount++;
    });


    test("Hide VSCode Tasks Marked Hidden", async function()
    {
        if (exitRollingCount(1, successCount)) return;
        this.slow(testControl.slowTime.config.enableEvent + testControl.slowTime.verifyTaskCount);
        await executeSettingsUpdate("showHiddenWsTasks", false);
        await treeUtils.verifyTaskCountByTree(testsName, startTaskCount - 1);
        successCount++;
    });


    test("Disable Workspace Tasks", async function()
    {
        if (exitRollingCount(2, successCount)) return;
        this.slow(testControl.slowTime.config.enableEvent + testControl.slowTime.verifyTaskCount);
        await executeSettingsUpdate("enabledTasks.workspace", false);
        await treeUtils.verifyTaskCountByTree(testsName, 0);
        successCount++;
    });


    test("Re-enable Workspace Tasks", async function()
    {
        if (exitRollingCount(3, successCount)) return;
        this.slow(testControl.slowTime.config.enableEvent + testControl.slowTime.verifyTaskCount);
        await executeSettingsUpdate("enabledTasks.workspace", true);
        await treeUtils.verifyTaskCountByTree(testsName, startTaskCount - 1);
        successCount++;
    });


    test("Re-show VSCode Tasks Marked Hidden", async function()
    {
        if (exitRollingCount(4, successCount)) return;
        this.slow(testControl.slowTime.config.enableEvent + testControl.slowTime.verifyTaskCount);
        await executeSettingsUpdate("showHiddenWsTasks", true);
        await treeUtils.verifyTaskCountByTree(testsName, startTaskCount);
    });

});
