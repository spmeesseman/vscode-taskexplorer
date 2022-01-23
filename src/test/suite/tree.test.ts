/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* tslint:disable */

import * as assert from "assert";
import { TaskExplorerApi } from "../../extension";
import { activate, initSettings, isReady } from "../helper";
import { configuration } from "../../common/configuration";


let teApi: TaskExplorerApi;
// let taskMap: Map<string, TaskItem> = new Map();


suite("Tree Tests", () =>
{
    suiteSetup(async () =>
    {
        teApi = await activate();
        assert(isReady() === true, "Setup failed");
    });


    test("Show/hide last tasks", async function()
    {
        if (!teApi.explorerProvider) {
            assert.fail("        ✘ Task Explorer tree instance does not exist");
        }
        await teApi.explorerProvider.showSpecialTasks(true);
        await teApi.explorerProvider.showSpecialTasks(false);
        await configuration.updateWs("showLastTasks", false);
        await teApi.explorerProvider.showSpecialTasks(true);
        await teApi.explorerProvider.showSpecialTasks(false);
    });


    test("Show/hide favorite tasks", async function()
    {
        await teApi.explorerProvider?.showSpecialTasks(true, true);
        await teApi.explorerProvider?.showSpecialTasks(false, true);
    });


    test("Get Element", async function()
    {
        // taskMap = await teApi.explorerProvider?.getTaskItems(undefined, "   ", true) as Map<string, TaskItem>;
        // const element = teApi.explorerProvider?.getTreeItem();
    });

});
