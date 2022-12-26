/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */

import * as assert from "assert";
import { configuration } from "../../common/configuration";
import { TaskExplorerApi } from "@spmeesseman/vscode-taskexplorer-types";
import { activate, executeSettingsUpdate, executeTeCommand, isReady, testsControl } from "../helper";

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


    test("Disable SideBar Explorer", async function()
    {
        await configuration.update("enableSideBar", false);
        await teApi.waitForIdle(waitTimeForFsNewEvent * 2);
    });

});
