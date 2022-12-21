/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* tslint:disable */

import * as assert from "assert";
import { TaskExplorerApi } from "@spmeesseman/vscode-taskexplorer-types";
import { activate, executeTeCommand, initSettings, isReady, sleep, testCommand } from "../helper";


let teApi: TaskExplorerApi;


suite("API Init and Tests", () =>
{
    suiteSetup(async function()
    {
        teApi = await activate(this);
        assert(isReady() === true, "    ✘ TeApi not ready");
    });


    test("Show view", async function()
    {
		await testCommand("focus");
    });


    test("Show log", async function()
    {
        await testCommand("showOutput", false);
        await testCommand("showOutput", true);
    });


    test("Cover pre-init cases", async function()
    {
        await initSettings();
        await teApi.explorer?.refresh("tests");
        await executeTeCommand("refresh", 100);
    });

});
