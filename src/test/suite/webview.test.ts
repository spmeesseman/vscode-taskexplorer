/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */

import { expect } from "chai";
import { TeWrapper } from "../../lib/wrapper";
import { startupFocus } from "../utils/suiteUtils";
import { EchoCommandRequestType } from "../../webview/common/ipc";
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


	test("Focus Explorer View", async function()
	{
        await startupFocus(this);
	});


    test("Enable and Focus SideBar", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.commands.refreshNoChanges);
        await executeSettingsUpdate("enableSideBar", true, tc.waitTime.config.enableEvent);
        await waitForTeIdle(tc.waitTime.config.registerExplorerEvent);
        await focusSidebarView();
        await waitForTeIdle(tc.waitTime.refreshCommand);
        endRollingCount(this);
    });


    test("Home View", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.commands.focusChangeViews + 1000);
        let loaded = false,
            loadTime = 0;
        const d = teWrapper.homeView.onContentLoaded(() => { loaded = true; }); // cover onContentLoaded
        await teWrapper.homeView.show();
        while (!loaded && loadTime < 21) { await sleep(10); loadTime += 10; }
        d.dispose();
        await executeCommand(Commands.FocusHomeView);
        await executeSettingsUpdate("enabledTasks.bash", false, tc.waitTime.config.enableEvent);
        await sleep(5);
        await executeSettingsUpdate("enabledTasks.bash", true, tc.waitTime.config.enableEvent);
        expect(teWrapper.homeView.description).to.not.be.undefined;
        await focusExplorerView(teWrapper);
        await executeCommand(Commands.FocusHomeView);
        await teWrapper.homeView.notify(EchoCommandRequestType, { command: Commands.ShowParsingReportPage });
        await closeEditors();
        await teWrapper.homeView.notify(EchoCommandRequestType, { command: Commands.ShowReleaseNotesPage });
        await sleep(500);
        await executeCommand(Commands.RefreshHomeView);
        await executeCommand(Commands.Donate);
        await closeEditors();
        endRollingCount(this);
    });


    test("Task Usage View", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.commands.focusChangeViews);
        await executeCommand(Commands.FocusTaskUsageView);
        await focusExplorerView(teWrapper);
        await teWrapper.taskUsageView.show();
        endRollingCount(this);
    });


    test("Task Count View", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.commands.focusChangeViews);
        await teWrapper.taskCountView.show();
        await focusExplorerView(teWrapper);
        await executeCommand(Commands.FocusTaskCountView);
        endRollingCount(this);
    });


    test("Tree View", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.commands.focusChangeViews);
        await focusExplorerView(teWrapper);
        endRollingCount(this);
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
        await focusExplorerView(teWrapper);
        endRollingCount(this);
    });

});
