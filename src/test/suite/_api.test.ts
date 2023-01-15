/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */

import * as assert from "assert";
import { getInstallPath } from "../../lib/utils/utils";
import { refreshTree } from "../../lib/refreshTree";
import { ITaskExplorer, ITaskExplorerApi } from "@spmeesseman/vscode-taskexplorer-types";
import {
    activate, executeSettingsUpdate, executeTeCommand, setExplorer, suiteFinished, testControl as tc, waitForTeIdle
} from "../utils/utils";

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
        await executeTeCommand("showOutput", 10, 50, tc.log.enabled && tc.log.output);
    });


    test("Misc Coverage", async function()
    {
        explorer.isVisible();
        assert(await getInstallPath());
    });


    test("Enable SideBar View", async function()
    {
        this.slow(tc.slowTime.explorerViewStartup + tc.waitTime.explorerViewStartup);
        await executeSettingsUpdate("enableSideBar", true);
        await waitForTeIdle(tc.waitTime.explorerViewStartup);
    });


    test("Refresh Trees", async function()
    {   //
        // Twice for delayed init, 1st will be quick with 'Initializing...' message in treeview
        //
        this.slow(tc.slowTime.refreshCommand + tc.slowTime.configEnableEvent + tc.waitTime.command + tc.waitTime.refreshCommand);
        await refreshTree(teApi, undefined, undefined, "");
        await waitForTeIdle(tc.waitTime.command);
        await refreshTree(teApi, undefined, undefined, "");
        await waitForTeIdle(tc.waitTime.refreshCommand);
    });


    test("Disable Explorer Views", async function()
    {
        this.slow(tc.slowTime.configRegisterExplorerEvent + tc.waitTime.configRegisterExplorerEvent + tc.waitTime.configEnableEvent);
        await executeSettingsUpdate("enableExplorerView", false, tc.waitTime.configEnableEvent);
        await waitForTeIdle(tc.waitTime.configRegisterExplorerEvent);
    });


    test("Refresh SideBar Tree", async function()
    {
        this.slow(tc.slowTime.refreshCommand + tc.waitTime.refreshCommand);
        await refreshTree(teApi, undefined, undefined, "");
        await waitForTeIdle(tc.waitTime.refreshCommand);
    });


    test("Disable SideBar View", async function()
    {
        this.slow(tc.slowTime.configRegisterExplorerEvent + tc.waitTime.configRegisterExplorerEvent);
        await executeSettingsUpdate("enableSideBar", false, tc.waitTime.configEnableEvent);
        await waitForTeIdle(tc.waitTime.configRegisterExplorerEvent);
    });


    test("Re-enable Explorer View", async function()
    {
        this.slow(tc.slowTime.configRegisterExplorerEvent + tc.waitTime.configRegisterExplorerEvent);
        await executeSettingsUpdate("enableExplorerView", true, tc.waitTime.configEnableEvent);
        setExplorer(teApi.explorer as ITaskExplorer);
        await waitForTeIdle(tc.waitTime.configRegisterExplorerEvent);
    });


    test("Refresh Explorer Tree", async function()
    {
        this.slow(tc.slowTime.refreshCommand + tc.slowTime.refreshCommand);
        await refreshTree(teApi, undefined, undefined, "");
    });

});
