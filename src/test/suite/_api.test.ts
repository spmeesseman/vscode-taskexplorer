/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */

import * as assert from "assert";
import { getInstallPath } from "../../lib/utils/utils";
import { refreshTree } from "../../lib/refreshTree";
import { ITaskExplorer, ITaskExplorerApi } from "@spmeesseman/vscode-taskexplorer-types";
import { activate, executeSettingsUpdate, executeTeCommand, setExplorer, suiteFinished, testControl } from "../utils/utils";

let teApi: ITaskExplorerApi;
let explorer: ITaskExplorer;


suite("API and Initialization", () =>
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


    test("Refresh Trees", async function()
    {   //
        // Twice for delayed init, 1st will be quick with 'Initializing...' message in treeview
        //
        this.slow(testControl.slowTime.refreshCommand + testControl.slowTime.configEnableEvent + testControl.waitTime.command + testControl.waitTime.refreshCommand);
        await refreshTree(teApi, undefined, undefined, "");
        await teApi.waitForIdle(testControl.waitTime.command);
        await refreshTree(teApi, undefined, undefined, "");
        await teApi.waitForIdle(testControl.waitTime.refreshCommand);
    });


    test("Disable Explorer Views", async function()
    {
        this.slow(testControl.slowTime.configRegisterExplorerEvent + testControl.waitTime.configRegisterExplorerEvent + testControl.waitTime.configEnableEvent);
        await executeSettingsUpdate("enableExplorerView", false, testControl.waitTime.configEnableEvent);
        await teApi.waitForIdle(testControl.waitTime.configRegisterExplorerEvent);
    });


    test("Refresh SideBar Tree", async function()
    {
        this.slow(testControl.slowTime.refreshCommand + testControl.waitTime.refreshCommand);
        await refreshTree(teApi, undefined, undefined, "");
        await teApi.waitForIdle(testControl.waitTime.refreshCommand);
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
        setExplorer(teApi.explorer as ITaskExplorer);
        await teApi.waitForIdle(testControl.waitTime.configRegisterExplorerEvent);
    });


    test("Refresh Explorer Tree", async function()
    {
        this.slow(testControl.slowTime.refreshCommand + testControl.slowTime.refreshCommand);
        await refreshTree(teApi, undefined, undefined, "");
    });

});
