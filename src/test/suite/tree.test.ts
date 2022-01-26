/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* tslint:disable */

import * as assert from "assert";
import { TaskExplorerApi } from "../../interface/taskExplorerApi";
import { activate, isReady } from "../helper";
import { configuration } from "../../common/configuration";


let teApi: TaskExplorerApi;
// let taskMap: Map<string, TaskItem> = new Map();


suite("Tree Tests", () =>
{
    suiteSetup(async function()
    {
        teApi = await activate(this);
        assert(isReady() === true, "TeApi not ready");
    });


    test("Show/hide last tasks", async function()
    {
        if (!teApi.explorer) {
            assert.fail("        ✘ Task Explorer tree instance does not exist");
        }
        await teApi.explorer.showSpecialTasks(true);
        await teApi.explorer.showSpecialTasks(false);
        await configuration.updateWs("showLastTasks", false);
        await teApi.explorer.showSpecialTasks(true);
        await teApi.explorer.showSpecialTasks(false);
    });


    test("Show/hide favorite tasks", async function()
    {
        await teApi.explorer?.showSpecialTasks(true, true);
        await teApi.explorer?.showSpecialTasks(false, true);
    });


    test("Get Element", async function()
    {
        // taskMap = await teApi.explorer?.getTaskItems(undefined, "   ", true) as Map<string, TaskItem>;
        // const element = teApi.explorer?.getTreeItem();
    });

});
