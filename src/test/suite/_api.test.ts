/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */

import { refreshTree } from "../../lib/refreshTree";
import { ITaskExplorer, ITaskExplorerApi } from "@spmeesseman/vscode-taskexplorer-types";
import {
    activate, executeSettingsUpdate, executeTeCommand, setExplorer, suiteFinished, testControl as tc, waitForTeIdle
} from "../utils/utils";

let teApi: ITaskExplorerApi;


suite("API and Initialization", () =>
{
    suiteSetup(async function()
    {
        ({ teApi } = await activate(this));
    });


    suiteTeardown(async function()
    {
        suiteFinished(this);
    });


    test("Show Output Window", async function()
    {
        await executeTeCommand("showOutput", 10, 50, tc.log.enabled && tc.log.output);
    });


    test("Enable SideBar View", async function()
    {
        this.slow(tc.slowTime.explorerViewStartup + tc.slowTime.config.enableEvent);
        await executeSettingsUpdate("enableSideBar", true, tc.waitTime.config.enableEvent);
        await waitForTeIdle(tc.waitTime.explorerViewStartup);
    });


    test("Refresh Trees", async function()
    {   //
        // Twice for delayed init, 1st will be quick with 'Initializing...' message in treeview
        //
        this.slow(tc.slowTime.refreshCommand + tc.slowTime.config.enableEvent + tc.slowTime.command);
        await refreshTree(teApi, undefined, undefined, "");
        await waitForTeIdle(tc.waitTime.command);
        await refreshTree(teApi, undefined, undefined, "");
        await waitForTeIdle(tc.waitTime.refreshCommand);
    });


    test("Disable Explorer Views", async function()
    {
        this.slow(tc.slowTime.config.registerExplorerEvent + tc.slowTime.config.enableEvent);
        await executeSettingsUpdate("enableExplorerView", false, tc.waitTime.config.enableEvent);
        await waitForTeIdle(tc.waitTime.config.registerExplorerEvent);
    });


    test("Refresh SideBar Tree", async function()
    {
        this.slow(tc.slowTime.refreshCommand);
        await refreshTree(teApi, undefined, undefined, "");
        await waitForTeIdle(tc.waitTime.refreshCommand);
    });


    test("Disable SideBar View", async function()
    {
        this.slow(tc.slowTime.config.registerExplorerEvent + tc.slowTime.config.enableEvent);
        await executeSettingsUpdate("enableSideBar", false, tc.waitTime.config.enableEvent);
        await waitForTeIdle(tc.waitTime.config.registerExplorerEvent);
    });


    test("Re-enable Explorer View", async function()
    {
        this.slow(tc.slowTime.config.registerExplorerEvent + tc.slowTime.config.enableEvent);
        await executeSettingsUpdate("enableExplorerView", true, tc.waitTime.config.enableEvent);
        setExplorer(teApi.explorer as ITaskExplorer);
        await waitForTeIdle(tc.waitTime.config.registerExplorerEvent);
    });


    test("Refresh Explorer Tree", async function()
    {
        this.slow(tc.slowTime.refreshCommand + tc.slowTime.refreshCommand);
        await refreshTree(teApi, undefined, undefined, "");
    });

});
