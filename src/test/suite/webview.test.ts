/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */

import { expect } from "chai";
import { TeWrapper } from "../../lib/wrapper";
import { startupFocus } from "../utils/suiteUtils";
import { EchoCommandRequestType, IpcCommandType } from "../../webview/common/ipc";
import { Commands, executeCommand, VsCodeCommands } from "../../lib/command";
import { executeSettingsUpdate, focusExplorerView, focusSidebarView } from "../utils/commandUtils";
import {
    activate, closeEditors, endRollingCount, exitRollingCount, getWsPath, sleep, suiteFinished, testControl as tc, waitForTeIdle
} from "../utils/utils";
import { commands, Uri } from "vscode";
import { promiseFromEvent } from "../../lib/utils/promiseUtils";


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
        this.slow(tc.slowTime.commands.focusChangeViews + tc.slowTime.config.registerExplorerEvent);
        await executeSettingsUpdate("enableSideBar", true, tc.waitTime.config.enableEvent);
        await waitForTeIdle(tc.waitTime.config.registerExplorerEvent);
        await focusSidebarView();
        await waitForTeIdle(tc.waitTime.refreshCommand);
        endRollingCount(this);
    });


    test("Home View", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow((tc.slowTime.commands.focusChangeViews * 3) + tc.slowTime.commands.fast + (tc.slowTime.config.enableEvent * 2) + 2000);
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
        await sleep(5);
        await teWrapper.homeView.notify(EchoCommandRequestType, { command: Commands.ShowReleaseNotesPage }); // not visible, ignored
        await executeCommand(Commands.FocusHomeView);
        await promiseFromEvent(teWrapper.homeView.onReadyReceived).promise;
        await sleep(5);
        await teWrapper.homeView.notify(EchoCommandRequestType, { command: Commands.ShowParsingReportPage, args: [ Uri.file(getWsPath(".")) ] });
        await promiseFromEvent(teWrapper.parsingReportPage.onReadyReceived).promise;
        await sleep(5);
        await teWrapper.homeView.notify(EchoCommandRequestType, { command: Commands.ShowReleaseNotesPage });
        await promiseFromEvent(teWrapper.releaseNotesPage.onReadyReceived).promise;
        await sleep(5);
        await executeCommand(Commands.RefreshHomeView);
        await executeCommand(Commands.Donate);
        endRollingCount(this);
    });


    test("Task Usage View", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.commands.focusChangeViews);
        await executeCommand(Commands.FocusTaskUsageView);
        await focusExplorerView(teWrapper);
        await teWrapper.taskUsageView.show();
        await sleep(5);
        endRollingCount(this);
    });


    test("Task Count View", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.commands.focusChangeViews);
        await teWrapper.taskCountView.show();
        await sleep(5);
        await focusExplorerView(teWrapper);
        await executeCommand(Commands.FocusTaskCountView);
        await sleep(5);
        endRollingCount(this);
    });


    test("Tree View", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.commands.focusChangeViews);
        await focusExplorerView(teWrapper);
        endRollingCount(this);
    });


    test("Release Notes Page", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.commands.focusChangeViews);
        await teWrapper.releaseNotesPage.show();
        await sleep(5);
        endRollingCount(this);
    });


    test("Parsing Report Page", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.commands.focusChangeViews);
        await teWrapper.parsingReportPage.show();
        endRollingCount(this);
    });


    test("License Info Page", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.commands.focusChangeViews);
        await teWrapper.licensePage.show();
        endRollingCount(this);
    });


	test("Focus open Editors", async function()
	{
        if (exitRollingCount(this)) return;
		this.slow(tc.slowTime.commands.focusChangeViews * 3);
	    await teWrapper.parsingReportPage.show();
	    await teWrapper.licensePage.show();
	    await teWrapper.releaseNotesPage.show();
	    await teWrapper.licensePage.show();
	    await teWrapper.parsingReportPage.show();
        await commands.executeCommand(VsCodeCommands.NextEditor);
        await commands.executeCommand(VsCodeCommands.NextEditor);
		await closeEditors();
        await focusExplorerView(teWrapper);
        await sleep(5);
        endRollingCount(this);
	});


    // test("Post an Unknown Random Message", async function()
    // {
    //     if (exitRollingCount(this)) return;
    //     await teWrapper.homeView.notify(new IpcCommandType<void>("webview/unknown"), void undefined);
    //     endRollingCount(this);
    // });


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
