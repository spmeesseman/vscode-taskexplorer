/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* tslint:disable */

import * as assert from "assert";
import { TaskExplorerApi } from "@spmeesseman/vscode-taskexplorer-types";
import { configuration } from "../../common/configuration";
import TaskItem from "../../tree/item";
import { activate, findIdInTaskMap, isReady, sleep } from "../helper";
import { waitForCache } from "../../cache";

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
    });


    suiteTeardown(async function()
    {
        await configuration.updateWs("showHiddenWsTasks", wsEnable);
    });


    test("Show VSCode Tasks Marked Hidden", async function()
    {
        await configuration.updateWs("showHiddenWsTasks", true);
        await sleep(500);
        await waitForCache();
        taskMap = await teApi.explorer?.getTaskItems(undefined, "   ") as unknown as Map<string, TaskItem>;
        const taskCount = findIdInTaskMap(":Workspace:", taskMap);
        if (taskCount !== 10) {
            assert.fail(`Unexpected VSCode task count (Found ${taskCount} of 10)`);
        }
    });


    test("Hide VSCode Tasks Marked Hidden", async function()
    {
        await configuration.updateWs("showHiddenWsTasks", false);
        await sleep(500);
        await waitForCache();
        taskMap = await teApi.explorer?.getTaskItems(undefined, "   ") as unknown as Map<string, TaskItem>;
        const taskCount = findIdInTaskMap(":Workspace:", taskMap);
        if (taskCount !== 9) {
            assert.fail(`Unexpected VSCode task count (Found ${taskCount} of 9)`);
        }
    });


    test("Disable Workspace Tasks", async function()
    {
        await configuration.updateWs("enabledTasks.workspace", false);
        await sleep(2000);
        await waitForCache();
        taskMap = await teApi.explorer?.getTaskItems(undefined, "   ") as unknown as Map<string, TaskItem>;
        const taskCount = findIdInTaskMap(":Workspace:", taskMap);
        if (taskCount !== 0) {
            assert.fail(`Unexpected VSCode task count (Found ${taskCount} of 0)`);
        }
    });


    test("Re-enable Workspace Tasks", async function()
    {
        await configuration.updateWs("enabledTasks.workspace", true);
        await sleep(2000);
        await waitForCache();
        taskMap = await teApi.explorer?.getTaskItems(undefined, "   ") as unknown as Map<string, TaskItem>;
        const taskCount = findIdInTaskMap(":Workspace:", taskMap);
        if (taskCount !== 9) {
            assert.fail(`Unexpected VSCode task count (Found ${taskCount} of 9)`);
        }
    });


    test("Re-show VSCode Tasks Marked Hidden", async function()
    {
        await configuration.updateWs("showHiddenWsTasks", true);
        await sleep(500);
        await waitForCache();
        taskMap = await teApi.explorer?.getTaskItems(undefined, "   ") as unknown as Map<string, TaskItem>;
        const taskCount = findIdInTaskMap(":Workspace:", taskMap);
        if (taskCount !== 10) {
            assert.fail(`Unexpected VSCode task count (Found ${taskCount} of 10)`);
        }
    });

});
