/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */

import * as assert from "assert";
import { getInstallPath } from "../../lib/utils/utils";
import { refreshTree } from "../../lib/refreshTree";
import { IExplorerApi, ITaskExplorerApi } from "@spmeesseman/vscode-taskexplorer-types";
import { activate, executeSettingsUpdate, executeTeCommand, setExplorer, suiteFinished, testControl } from "../helper";

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
        suiteFinished(this);
    });


    test("Show Output Window", async function()
    {
        await executeTeCommand("showOutput", 10, 50, testControl.log.enabled && testControl.log.output);
    });


    test("Misc Coverage", async function()
    {
        explorer.isVisible();
        assert(await getInstallPath());
    });


    test("Enable SideBar View", async function()
    {
        this.slow(testControl.slowTime.explorerViewStartup + testControl.waitTime.explorerViewStartup);
        await executeSettingsUpdate("enableSideBar", true);
        await teApi.waitForIdle(testControl.waitTime.explorerViewStartup);
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
        this.slow(testControl.slowTime.configRegisterExplorerEvent + testControl.waitTime.configRegisterExplorerEvent);
        await executeSettingsUpdate("enableExplorerView", false, testControl.waitTime.configEnableEvent);
        await teApi.waitForIdle(testControl.waitTime.configRegisterExplorerEvent);
    });


    test("Disable SideBar View", async function()
    {
        this.slow(testControl.slowTime.configRegisterExplorerEvent + testControl.waitTime.configRegisterExplorerEvent);
        await executeSettingsUpdate("enableSideBar", false, testControl.waitTime.configEnableEvent);
        await teApi.waitForIdle(testControl.waitTime.configRegisterExplorerEvent);
    });


    test("Re-enable Explorer View", async function()
    {
        this.slow(testControl.slowTime.configRegisterExplorerEvent + testControl.waitTime.configRegisterExplorerEvent);
        await executeSettingsUpdate("enableExplorerView", true, testControl.waitTime.configEnableEvent);
        setExplorer(teApi.explorer as IExplorerApi);
        await teApi.waitForIdle(testControl.waitTime.configRegisterExplorerEvent);
    });


    test("Refresh", async function()
    {
        this.slow(testControl.slowTime.refreshCommand);
        await executeTeCommand("refresh", testControl.waitTime.refreshCommand);
    });

});
