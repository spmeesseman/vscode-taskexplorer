/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* tslint:disable */

import * as assert from "assert";
import { TaskExplorerApi } from "@spmeesseman/vscode-taskexplorer-types";
import { configuration } from "../../common/configuration";
import TaskItem from "../../tree/item";
import { activate, executeSettingsUpdate, findIdInTaskMap, isReady, testsControl, verifyTaskCount } from "../helper";

let teApi: TaskExplorerApi;
let wsEnable: boolean;
let taskMap: Map<string, TaskItem>;
const waitTimeForFsEvent = testsControl.waitTimeForFsEvent;
const waitTimeForSettingsEvent = testsControl.waitTimeForSettingsEvent;


suite("Workspace / VSCode Tests", () =>
{
    const testsName = "Workspace";

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
        // await verifyTaskCount(testsName, 10); // a direct fetchTasks() will still retrieve the hidden task
        taskMap = await teApi.explorer?.getTaskItems(undefined, "   ") as unknown as Map<string, TaskItem>;
        const taskCount = findIdInTaskMap(":Workspace:", taskMap);
        if (taskCount !== 10) {
            assert.fail(`Unexpected VSCode task count (Found ${taskCount} of 10)`);
        }
    });


    test("Hide VSCode Tasks Marked Hidden", async function()
    {
        await executeSettingsUpdate("showHiddenWsTasks", false);
        // await verifyTaskCount(testsName, 9); // a direct fetchTasks() will still retrieve the hidden task
        taskMap = await teApi.explorer?.getTaskItems(undefined, "   ") as unknown as Map<string, TaskItem>;
        const taskCount = findIdInTaskMap(":Workspace:", taskMap);
        if (taskCount !== 9) {
            assert.fail(`Unexpected VSCode task count (Found ${taskCount} of 9)`);
        }
    });


    test("Disable Workspace Tasks", async function()
    {
        await executeSettingsUpdate("enabledTasks.workspace", false);
        // await verifyTaskCount(testsName, 0); // a direct fetchTasks() will still retrieve the hidden task
        taskMap = await teApi.explorer?.getTaskItems(undefined, "   ") as unknown as Map<string, TaskItem>;
        const taskCount = findIdInTaskMap(":Workspace:", taskMap);
        if (taskCount !== 0) {
            assert.fail(`Unexpected VSCode task count (Found ${taskCount} of 0)`);
        }
    });


    test("Re-enable Workspace Tasks", async function()
    {
        await executeSettingsUpdate("enabledTasks.workspace", true);
        // await verifyTaskCount(testsName, 9); // a direct fetchTasks() will still retrieve the hidden task
        taskMap = await teApi.explorer?.getTaskItems(undefined, "   ") as unknown as Map<string, TaskItem>;
        const taskCount = findIdInTaskMap(":Workspace:", taskMap);
        if (taskCount !== 9) {
            assert.fail(`Unexpected VSCode task count (Found ${taskCount} of 9)`);
        }
    });


    test("Re-show VSCode Tasks Marked Hidden", async function()
    {
        await executeSettingsUpdate("showHiddenWsTasks", true);
        // await verifyTaskCount(testsName, 10); // a direct fetchTasks() will still retrieve the hidden task
        taskMap = await teApi.explorer?.getTaskItems(undefined, "   ") as unknown as Map<string, TaskItem>;
        const taskCount = findIdInTaskMap(":Workspace:", taskMap);
        if (taskCount !== 10) {
            assert.fail(`Unexpected VSCode task count (Found ${taskCount} of 10)`);
        }
    });

});
