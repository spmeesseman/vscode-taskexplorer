/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* tslint:disable */

import * as assert from "assert";
import { TaskExplorerApi } from "@spmeesseman/vscode-taskexplorer-types";
import { configuration } from "../../common/configuration";
import TaskItem from "../../tree/item";
import { activate, executeSettingsUpdate, findIdInTaskMap, isReady, verifyTaskCountByTree } from "../helper";

const testsName = "Workspace";
// const waitTimeForFsModEvent = testsControl.waitTimeForFsModifyEvent;
// const waitTimeForFsDelEvent = testsControl.waitTimeForFsDeleteEvent;
// const waitTimeForFsNewEvent = testsControl.waitTimeForFsCreateEvent;
// const waitTimeForConfigEvent = testsControl.waitTimeForConfigEvent;

let teApi: TaskExplorerApi;
let wsEnable: boolean;
let taskMap: Map<string, TaskItem>;


suite("Workspace / VSCode Tests", () =>
{

    suiteSetup(async function()
    {
        teApi = await activate(this);
        assert(isReady() === true, "    ✘ TeApi not ready");
        wsEnable = configuration.get<boolean>("showHiddenWsTasks");
        await executeSettingsUpdate("showHiddenWsTasks", true);
    });


    suiteTeardown(async function()
    {
        await configuration.updateWs("showHiddenWsTasks", wsEnable);
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
