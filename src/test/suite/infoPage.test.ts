/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */

import { Extension, Uri, ViewColumn, WebviewPanel, window } from "vscode";
import { startupFocus } from "../utils/suiteUtils";
import { ITaskExplorer, ITaskExplorerApi } from "@spmeesseman/vscode-taskexplorer-types";
import { executeSettingsUpdate, executeTeCommand, executeTeCommand2 } from "../utils/commandUtils";
import {
	activate, closeEditors, testControl, suiteFinished, sleep, getWsPath, exitRollingCount, waitForTeIdle, endRollingCount, createwebviewForRevive
} from "../utils/utils";
import { getViewTitle, getViewType, reviveParsingReport } from "../../lib/page/infoPage";
import { getParsingReportSerializer } from "../../commands/viewReport";

let teApi: ITaskExplorerApi;
let projectUri: Uri;
let userTasks: boolean;
let origExplorer: ITaskExplorer | undefined;
let origSidebar: ITaskExplorer | undefined;
let pkgMgr: string;


suite("Info Report Tests", () =>
{
	suiteSetup(async function()
    {
        if (exitRollingCount(this, true)) return;
        ({ teApi } = await activate(this));
		projectUri = Uri.file(getWsPath("."));
		origExplorer = teApi.explorer;
		origSidebar = teApi.sidebar;
		pkgMgr = teApi.config.getVs<string>("npm.packageManager");
		userTasks = teApi.config.get<boolean>("specialFolders.showUserTasks");
        endRollingCount(this, true);
	});


	suiteTeardown(async function()
    {
        if (exitRollingCount(this, false, true)) return;
		teApi.explorer = origExplorer;
		teApi.sidebar = origSidebar;
		await closeEditors();
		await teApi.config.updateVsWs("npm.packageManager", pkgMgr);
        await waitForTeIdle(testControl.waitTime.config.eventFast);
		await executeSettingsUpdate("specialFolders.showUserTasks", userTasks);
        suiteFinished(this);
	});


	test("Focus Tree View", async function()
	{
        await startupFocus(this);
	});


	test("Open Report Page (Single Project No User Tasks)", async function()
	{
        if (exitRollingCount(this)) return;
		this.slow(testControl.slowTime.viewReport + testControl.slowTime.config.showHideUserTasks + 150);
		await executeSettingsUpdate("specialFolders.showUserTasks", false, testControl.waitTime.config.showHideUserTasks);
		const panel = await executeTeCommand2("viewReport", [ projectUri ], testControl.waitTime.viewReport) as WebviewPanel;
		await sleep(75);
		panel.dispose();
		await closeEditors();
        endRollingCount(this);
	});


	test("Open Report Page (Single Project w/ User Tasks)", async function()
	{
        if (exitRollingCount(this)) return;
		this.slow(testControl.slowTime.viewReport + testControl.slowTime.config.showHideUserTasks + 150);
		await executeSettingsUpdate("specialFolders.showUserTasks", true, testControl.waitTime.config.showHideUserTasks);
	    const panel = await executeTeCommand2("viewReport", [ projectUri, "", 5 ], testControl.waitTime.viewReport) as WebviewPanel;
		await sleep(75);
		panel.dispose();
		await closeEditors();
        endRollingCount(this);
	});


	test("Open Report Page (All Projects)", async function()
	{
        if (exitRollingCount(this)) return;
		this.slow(testControl.slowTime.viewReport + 150);
	    const panel = await executeTeCommand("viewReport", testControl.waitTime.viewReport) as WebviewPanel;
		await sleep(75);
		panel.dispose();
		await closeEditors();
        endRollingCount(this);
	});


	test("Open Report Page (All Projects, Yarn Enabled)", async function()
	{
        if (exitRollingCount(this)) return;
		this.slow(testControl.slowTime.viewReport + (testControl.slowTime.config.enableEvent * 2) + 150);
        await teApi.config.updateVsWs("npm.packageManager", "yarn");
        await waitForTeIdle(testControl.waitTime.config.enableEvent);
	    const panel = await executeTeCommand("viewReport", testControl.waitTime.viewReport) as WebviewPanel;
		await sleep(75);
		panel.dispose();
        await teApi.config.updateVsWs("npm.packageManager", pkgMgr);
        await waitForTeIdle(testControl.waitTime.config.enableEvent);
		await closeEditors();
        endRollingCount(this);
	});


	test("View License Info from Webview", async function()
	{
        if (exitRollingCount(this)) return;
		this.slow(testControl.slowTime.viewReport + testControl.slowTime.licenseMgr.pageWithDetail + 1000);
	    const panel = await executeTeCommand("viewReport", testControl.waitTime.viewReport) as WebviewPanel;
		await panel.webview.postMessage({ command: "viewLicense" });
		await sleep(500);
		panel.dispose();
		await closeEditors();
        endRollingCount(this);
	});


	test("Open Report Page (Views Both Disabled)", async function()
	{
        if (exitRollingCount(this)) return;
		this.slow(testControl.slowTime.viewReport + 150);
		const oExplorer = teApi.explorer;
		const oSidebar = teApi.sidebar;
		teApi.explorer = undefined;
		teApi.sidebar = undefined;
	    const panel = await executeTeCommand("viewReport", testControl.waitTime.viewReport) as WebviewPanel;
		await sleep(75);
		panel.dispose();
		teApi.explorer = oExplorer;
		teApi.sidebar = oSidebar;
		await closeEditors();
        endRollingCount(this);
	});


	test("Open Report Page (Sidebar Enabled, Explorer Disabled)", async function()
	{
        if (exitRollingCount(this)) return;
		this.slow(testControl.slowTime.viewReport + 150);
		const oExplorer = teApi.explorer;
		const oSidebar = teApi.sidebar;
		teApi.explorer = undefined;
		teApi.sidebar = oExplorer;
	    const panel = await executeTeCommand("viewReport", testControl.waitTime.viewReport) as WebviewPanel;
		await sleep(75);
		panel.dispose();
		teApi.explorer = oExplorer;
		teApi.sidebar = oSidebar;
		await closeEditors();
        endRollingCount(this);
	});


	test("View License Info from Webview (Views Both Disabled)", async function()
	{
        if (exitRollingCount(this)) return;
		this.slow(testControl.slowTime.viewReport + testControl.slowTime.licenseMgr.pageWithDetail + 1000);
		const oExplorer = teApi.explorer;
		const oSidebar = teApi.sidebar;
		teApi.explorer = undefined;
		teApi.sidebar = undefined;
	    const panel = await executeTeCommand("viewReport", testControl.waitTime.viewReport) as WebviewPanel;
		await panel.webview.postMessage({ command: "viewLicense" });
		await sleep(500);
		panel.dispose();
		teApi.explorer = oExplorer;
		teApi.sidebar = oSidebar;
		await closeEditors();
        endRollingCount(this);
	});


	test("View License Info from Webview (Sidebar Enabled, Explorer Disabled)", async function()
	{
        if (exitRollingCount(this)) return;
		this.slow(testControl.slowTime.viewReport + testControl.slowTime.licenseMgr.pageWithDetail + 1000);
		const oExplorer = teApi.explorer;
		const oSidebar = teApi.sidebar;
		teApi.explorer = undefined;
		teApi.sidebar = oExplorer;
	    const panel = await executeTeCommand("viewReport", testControl.waitTime.viewReport) as WebviewPanel;
		await panel.webview.postMessage({ command: "viewLicense" });
		await sleep(500);
		panel.dispose();
		teApi.explorer = oExplorer;
		teApi.sidebar = oSidebar;
		await closeEditors();
        endRollingCount(this);
	});


	test("Deserialize Report Page (All Projects)", async function()
	{
        if (exitRollingCount(this)) return;
		this.slow(testControl.slowTime.viewReport + 200);
		const panel = createwebviewForRevive(getViewTitle(), getViewType());
	    await getParsingReportSerializer().deserializeWebviewPanel(panel, null);
		await sleep(50);
		teApi.testsApi.isBusy = true;
		setTimeout(() => { teApi.testsApi.isBusy = false; }, 50);
	    await getParsingReportSerializer().deserializeWebviewPanel(panel, null);
		await sleep(50);
		panel.dispose();
		await closeEditors();
        endRollingCount(this);
	});

});
