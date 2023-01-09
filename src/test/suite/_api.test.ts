/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */

import * as assert from "assert";
import { IExplorerApi, ITaskExplorerApi } from "@spmeesseman/vscode-taskexplorer-types";
import { activate, executeSettingsUpdate, executeTeCommand, setExplorer, testControl } from "../helper";
import { getInstallPath } from "../../lib/utils/utils";
import { enableConfigWatcher } from "../../lib/configWatcher";
import { refreshTree } from "../../lib/refreshTree";

let teApi: ITaskExplorerApi;
let explorer: IExplorerApi;


suite("API Init and Tests", () =>
{
    suiteSetup(async function()
    {
        teApi = await activate(this);
        explorer = teApi.testsApi.explorer;
    });


    suiteTeardown(async function()
    {
    });


    test("Show Output Window", async function()
    {
        await executeTeCommand("showOutput", 10, 50, testControl.logEnabled && testControl.logToOutput);
    });


    test("Misc Coverage", async function()
    {
        assert(!explorer.isVisible());
        assert(await getInstallPath());
    });


    test("Enable SideBar View", async function()
    {
        this.slow(testControl.slowTime.configRegisterExplorerEvent);
        await executeSettingsUpdate("enableSideBar", true);
    });


    test("Refresh for SideBar Coverage", async function()
    {   //
        // Twice for delayed init, 1st will be quick with 'Initializing...' message in treeview
        //
        this.slow(testControl.slowTime.refreshCommand + testControl.slowTime.configEvent);
        await refreshTree(teApi);
        await teApi.waitForIdle(testControl.waitTime.command);
        await refreshTree(teApi);
        await teApi.waitForIdle(testControl.waitTime.refreshCommand);
    });


    test("Disable Explorer Views", async function()
    {
        this.slow(testControl.slowTime.configRegisterExplorerEvent);
        await executeSettingsUpdate("enableExplorerView", false, testControl.waitTime.configEnableEvent);
    });


    test("Disable SideBar View", async function()
    {
        this.slow(testControl.slowTime.configRegisterExplorerEvent);
        await executeSettingsUpdate("enableSideBar", false, testControl.waitTime.configEnableEvent);
    });


    test("Re-enable Explorer View", async function()
    {
        this.slow(testControl.slowTime.configRegisterExplorerEvent);
        await executeSettingsUpdate("enableExplorerView", true, testControl.waitTime.configEnableEvent);
        setExplorer(teApi.explorer as IExplorerApi);
    });


    test("Refresh", async function()
    {
        this.slow(testControl.slowTime.refreshCommand);
        await executeTeCommand("refresh", testControl.waitTime.refreshCommand);
    });

});
