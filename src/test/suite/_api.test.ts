/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* tslint:disable */

import * as assert from "assert";
import { TaskExplorerApi } from "@spmeesseman/vscode-taskexplorer-types";
import { activate, executeTeCommand, isReady } from "../helper";


let teApi: TaskExplorerApi;


suite("API Init and Tests", () =>
{
    suiteSetup(async function()
    {
        teApi = await activate(this);
        assert(isReady() === true, "    ✘ TeApi not ready");
    });


    test("Show log", async function()
    {
        await executeTeCommand("showOutput", 50, false);
        await executeTeCommand("showOutput", 50, true);
    });


    test("Cover pre-init cases", async function()
    {
        await teApi.explorer?.refresh("tests");
        await executeTeCommand("refresh", 100);
    });

});
