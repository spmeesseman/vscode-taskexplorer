/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */

import * as assert from "assert";
import { IExplorerApi, ITaskExplorerApi } from "@spmeesseman/vscode-taskexplorer-types";
import { activate, executeSettingsUpdate, executeTeCommand, setExplorer, testControl } from "../helper";
import { getInstallPath } from "../../lib/utils/utils";
import { enableConfigWatcher } from "../../lib/configWatcher";

let teApi: ITaskExplorerApi;
let explorer: IExplorerApi;


suite("API Init and Tests", () =>
{
    suiteSetup(async function()
    {
        teApi = await activate(this);
        explorer = teApi.testsApi.explorer;
        await executeSettingsUpdate("logging.enable", true);
    });


    suiteTeardown(async function()
    {
        await executeSettingsUpdate("logging.enable", testControl.logEnabled);
        enableConfigWatcher(true); // in case misc test fails after setting to `false`.
    });


    test("Hide / Show Log", async function()
    {
        await executeTeCommand("showOutput", 10, 50, false);
        await executeTeCommand("showOutput", 10, 50, true);
        await executeTeCommand("showOutput", 10, 50, testControl.logEnabled && testControl.logToOutput);
    });


    test("Misc Coverage", async function()
    {
        assert(!explorer.isVisible());
        assert(getInstallPath());
    });


    test("Enable SideBar View", async function()
    {
        await executeSettingsUpdate("enableSideBar", true);
    });


    test("Refresh for SideBar Coverage", async function()
    {
        await teApi.sidebar?.refresh();
        await teApi.waitForIdle(testControl.waitTimeForConfigEnableEvent);
    });


    test("Disable Explorer Views", async function()
    {
        await executeSettingsUpdate("enableExplorerView", false, testControl.waitTimeForConfigEnableEvent);
    });


    test("Disable SideBar View", async function()
    {
        await executeSettingsUpdate("enableSideBar", false, testControl.waitTimeForConfigEnableEvent);
    });


    test("Re-enable Explorer View", async function()
    {
        await executeSettingsUpdate("enableExplorerView", true, testControl.waitTimeForConfigEnableEvent);
        setExplorer(teApi.explorer as IExplorerApi);
    });


    test("Refresh", async function()
    {
        await executeTeCommand("refresh", testControl.waitTimeForRefreshCommand);
    });

});
