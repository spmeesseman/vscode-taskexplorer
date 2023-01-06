/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* tslint:disable */

import { ITaskExplorerApi } from "@spmeesseman/vscode-taskexplorer-types";
import { activate, executeSettingsUpdate, verifyTaskCountByTree } from "../helper";

const testsName = "Workspace";

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
        await executeSettingsUpdate("showHiddenWsTasks", true);
        await verifyTaskCountByTree(testsName, 10);
    });


    test("Hide VSCode Tasks Marked Hidden", async function()
    {
        await executeSettingsUpdate("showHiddenWsTasks", false);
        await verifyTaskCountByTree(testsName, 9);
    });


    test("Disable Workspace Tasks", async function()
    {
        await executeSettingsUpdate("enabledTasks.workspace", false);
        await verifyTaskCountByTree(testsName, 0);
    });


    test("Re-enable Workspace Tasks", async function()
    {
        await executeSettingsUpdate("enabledTasks.workspace", true);
        await verifyTaskCountByTree(testsName, 9);
    });


    test("Re-show VSCode Tasks Marked Hidden", async function()
    {
        await executeSettingsUpdate("showHiddenWsTasks", true);
        await verifyTaskCountByTree(testsName, 10);
    });

});
