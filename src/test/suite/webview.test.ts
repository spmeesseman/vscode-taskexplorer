/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */

import { TeWrapper } from "../../lib/wrapper";
import { Commands, executeCommand } from "../../lib/command";
import { executeSettingsUpdate, focusExplorerView, focusSidebarView } from "../utils/commandUtils";
import {
    activate, closeEditors, endRollingCount, exitRollingCount, sleep, suiteFinished, testControl as tc, waitForTeIdle
} from "../utils/utils";


let teWrapper: TeWrapper;


suite("Webview Tests", () =>
{
    suiteSetup(async function()
    {
        if (exitRollingCount(this, true)) return;
        ({ teWrapper } = await activate(this));
        endRollingCount(this, true);
    });


    suiteTeardown(async function()
    {
        if (exitRollingCount(this, false, true)) return;
        await closeEditors();
        suiteFinished(this);
    });


    test("Enable and Focus SideBar", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.commands.refresh);
        teWrapper.treeManager.enableTaskTree("taskExplorerSideBar", true, "");
        await focusSidebarView();
        await waitForTeIdle(tc.waitTime.refreshCommand);
        endRollingCount(this);
    });


    test("Home View", async function()
    {
        if (exitRollingCount(this)) return;
        let loaded = false,
            loadTime = 0;
        const d = teWrapper.homeView.onContentLoaded(() => { loaded = true; });
        await teWrapper.homeView.show();
        while (!loaded && loadTime < 51) { sleep(50); loadTime += 25; }
        d.dispose();
        await executeCommand(Commands.FocusHomeView);
        await executeCommand(Commands.DisableTaskType, "bash", tc.waitTime.config.enableEvent);
        await sleep(10);
        await executeCommand(Commands.EnableTaskType, "bash", tc.waitTime.config.enableEvent);
        endRollingCount(this);
    });


    test("Task Usage View", async function()
    {
        if (exitRollingCount(this)) return;
        await teWrapper.taskUsageView.show();
        endRollingCount(this);
    });


    test("Task Count View", async function()
    {
        if (exitRollingCount(this)) return;
        await teWrapper.taskCountView.show();
        endRollingCount(this);
    });


    test("Tree View", async function()
    {
        await focusExplorerView();
    });


    test("Disable SideBar", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.config.registerExplorerEvent + tc.slowTime.config.enableEvent);
        await executeSettingsUpdate("enableSideBar", false, tc.waitTime.config.enableEvent);
        await waitForTeIdle(tc.waitTime.config.registerExplorerEvent);
        endRollingCount(this);
    });


    test("Focus Explorer View", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.commands.focusChangeViews);
        await focusExplorerView();
        endRollingCount(this);
    });

});
