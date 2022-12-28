/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */

import * as assert from "assert";
import { configuration } from "../../common/configuration";
import { TaskExplorerApi } from "@spmeesseman/vscode-taskexplorer-types";
import { activate, executeSettingsUpdate, executeTeCommand, isReady, testsControl } from "../helper";
import { refreshTree } from "../../lib/refreshTree";

let teApi: TaskExplorerApi;
const waitTimeForFsNewEvent = testsControl.waitTimeForFsCreateEvent;


suite("API Init and Tests", () =>
{
    suiteSetup(async function()
    {
        teApi = await activate(this);
        assert(isReady() === true, "    ✘ TeApi not ready");
        await executeSettingsUpdate("debug", true);
    });

    suiteTeardown(async function()
    {
        await executeSettingsUpdate("debug", testsControl.writeToOutput || testsControl.writeToConsole);
    });


    test("Show log", async function()
    {
        await executeTeCommand("showOutput", 10, 50, false);
        await executeTeCommand("showOutput", 10, 50, true);
        await executeTeCommand("showOutput", 10, 50, testsControl.writeToOutput);
    });


    test("Enabled SideBar View", async function()
    {
        await executeSettingsUpdate("enableSideBar", true);
    });


    test("Refresh for SideBar Coverage", async function()
    {
        await refreshTree();
    });


    test("Disable Explorer Views", async function()
    {
        await executeSettingsUpdate("enableExplorerView", false);
    });


    test("Disable SideBar View", async function()
    {
        await executeSettingsUpdate("enableSideBar", false);
    });


    test("Re-enable Explorer View", async function()
    {
        await executeSettingsUpdate("enableExplorerView", true);
    });


    test("Refresh", async function()
    {
        await executeTeCommand("refresh");
    });

});
