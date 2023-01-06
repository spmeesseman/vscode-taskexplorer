/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* tslint:disable */

import { ITaskExplorerApi } from "@spmeesseman/vscode-taskexplorer-types";
import { activate, executeSettingsUpdate, testControl, treeUtils } from "../helper";

const testsName = "Workspace";
const startTaskCount = 10;

let teApi: ITaskExplorerApi;
let wsEnable: boolean;


suite("Workspace / VSCode Tests", () =>
{

    suiteSetup(async function()
    {
        teApi = await activate(this);
        wsEnable = teApi.config.get<boolean>("showHiddenWsTasks");
        await executeSettingsUpdate("showHiddenWsTasks", true);
    });


    suiteTeardown(async function()
    {
        await teApi.config.updateWs("showHiddenWsTasks", wsEnable);
    });


    test("Show VSCode Tasks Marked Hidden", async function()
    {
        this.slow(testControl.slowTime.configEvent + testControl.slowTime.verifyTaskCount);
        await executeSettingsUpdate("showHiddenWsTasks", true);
        await treeUtils.verifyTaskCountByTree(testsName, startTaskCount);
    });


    test("Hide VSCode Tasks Marked Hidden", async function()
    {
        this.slow(testControl.slowTime.configEnableEvent + testControl.slowTime.verifyTaskCount);
        await executeSettingsUpdate("showHiddenWsTasks", false);
        await treeUtils.verifyTaskCountByTree(testsName, startTaskCount - 1);
    });


    test("Disable Workspace Tasks", async function()
    {
        this.slow(testControl.slowTime.configEnableEvent + testControl.slowTime.verifyTaskCount);
        await executeSettingsUpdate("enabledTasks.workspace", false);
        await treeUtils.verifyTaskCountByTree(testsName, 0);
    });


    test("Re-enable Workspace Tasks", async function()
    {
        this.slow(testControl.slowTime.configEnableEvent + testControl.slowTime.verifyTaskCount);
        await executeSettingsUpdate("enabledTasks.workspace", true);
        await treeUtils.verifyTaskCountByTree(testsName, startTaskCount - 1);
    });


    test("Re-show VSCode Tasks Marked Hidden", async function()
    {
        this.slow(testControl.slowTime.configEvent + testControl.slowTime.verifyTaskCount);
        await executeSettingsUpdate("showHiddenWsTasks", true);
        await treeUtils.verifyTaskCountByTree(testsName, startTaskCount);
    });

});
