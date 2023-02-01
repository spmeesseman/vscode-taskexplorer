/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */

import { refreshTree } from "../../lib/refreshTree";
import { ITaskExplorer, ITaskExplorerApi } from "@spmeesseman/vscode-taskexplorer-types";
import {
    activate, endRollingCount, exitRollingCount, setExplorer, sleep, suiteFinished, testControl as tc, treeUtils, waitForTeIdle
} from "../utils/utils";
import { executeSettingsUpdate, executeTeCommand2, focusFileExplorer, focusSidebarView } from "../utils/commandUtils";

let teApi: ITaskExplorerApi;


suite("Initialization", () =>
{
    suiteSetup(async function()
    {
        if (exitRollingCount(this, true)) return;
        ({ teApi } = await activate(this));
        endRollingCount(this, true);
    });


    suiteTeardown(async function()
    {
        if (exitRollingCount(this, false, true)) return;
        suiteFinished(this);
    });


    test("Show/Hide Output Window", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow((tc.slowTime.commandShowOutput * 3) + 300);
        await executeTeCommand2("showOutput", [ true ]);
        await sleep(75);
        await executeTeCommand2("showOutput", [ false ]);
        await sleep(75);
        await executeTeCommand2("showOutput", [ tc.log.enabled && tc.log.output ]);
        endRollingCount(this);
    });

/*
    test("Enable SideBar View", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.explorerViewStartup + tc.slowTime.config.enableEvent);
        await executeSettingsUpdate("enableSideBar", true, tc.waitTime.config.enableEvent);
        await waitForTeIdle(tc.waitTime.explorerViewStartup);
        endRollingCount(this);
    });
*/

    test("Focus SideBar Tree", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.refreshCommand);
        await focusSidebarView();
        await waitForTeIdle(tc.waitTime.refreshCommand);
        endRollingCount(this);
    });


    test("Disable Explorer Views", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.config.registerExplorerEvent + tc.slowTime.config.enableEvent);
        await executeSettingsUpdate("enableExplorerView", false, tc.waitTime.config.enableEvent);
        await waitForTeIdle(tc.waitTime.config.registerExplorerEvent);
        endRollingCount(this);
    });


    test("Refresh SideBar Tree", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.refreshCommand);
        await refreshTree(teApi, undefined, undefined, "");
        await waitForTeIdle(tc.waitTime.refreshCommand);
        endRollingCount(this);
    });


    test("Re-enable Explorer View", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.config.registerExplorerEvent + tc.slowTime.config.enableEvent);
        await executeSettingsUpdate("enableExplorerView", true, tc.waitTime.config.enableEvent);
        setExplorer(teApi.explorer as ITaskExplorer);
        await waitForTeIdle(tc.waitTime.config.registerExplorerEvent);
        endRollingCount(this);
    });


    test("Refresh Trees (Both Views Enabled)", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.refreshCommandNoChanges);
        await refreshTree(teApi, undefined, undefined, "");
        endRollingCount(this);
    });


    test("Disable SideBar View", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.config.registerExplorerEvent);
        await executeSettingsUpdate("enableSideBar", false, tc.waitTime.config.registerExplorerEvent);
        endRollingCount(this);
    });


    test("Focus File Explorer View", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.focusCommandChangeViews);
        await focusFileExplorer();
        endRollingCount(this);
    });


    test("Refresh Explorer Tree", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.refreshCommandNoChanges);
        await refreshTree(teApi, undefined, undefined, "");
        endRollingCount(this);
    });

});
