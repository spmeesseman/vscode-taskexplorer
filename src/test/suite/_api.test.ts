/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* tslint:disable */

import * as assert from "assert";
import { TaskExplorerApi, ExplorerApi } from "@spmeesseman/vscode-taskexplorer-types";
import { activate, executeTeCommand, isReady } from "../helper";


let teApi: TaskExplorerApi;
let explorer: ExplorerApi;


suite("API Init and Tests", () =>
{
    suiteSetup(async function()
    {
        teApi = await activate(this);
        assert(isReady() === true, "    ✘ TeApi not ready");
        if (!teApi.explorer) {
            assert.fail("        ✘ Workspace folder does not exist");
        }
        explorer = teApi.explorer;
    });


    test("Show log", async function()
    {
        await executeTeCommand("showOutput", 50, false);
        await executeTeCommand("showOutput", 50, true);
    });


    test("Refresh After Settings Init (TeApi)", async function()
    {
        await explorer.refresh("tests");
        await explorer.waitForRefreshComplete();
        // await executeTeCommand("refresh", 100);
    });


    // test("Refresh After Settings Init (Command)", async function()
    // {
    //     // await teApi.explorer?.refresh("tests");
    //     await executeTeCommand("refresh", 100);
    // });

});
