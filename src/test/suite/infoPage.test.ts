/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */

import { Uri, WebviewPanel } from "vscode";
import { ITaskExplorer, ITaskExplorerApi } from "@spmeesseman/vscode-taskexplorer-types";
import {
	activate, closeActiveDocument, executeTeCommand, focusExplorerView, executeSettingsUpdate,
	testControl, suiteFinished, sleep, getWsPath, exitRollingCount, executeTeCommand2, needsTreeBuild, waitForTeIdle
} from "../utils/utils";

let teApi: ITaskExplorerApi;
let projectUri: Uri;
let userTasks: boolean;
let successCount = -1;
let origExplorer: ITaskExplorer | undefined;
let origSidebar: ITaskExplorer | undefined;
let pkgMgr: string;


suite("Info Report Tests", () =>
{
	suiteSetup(async function()
    {
        ({ teApi } = await activate(this));
		projectUri = Uri.file(getWsPath("."));
		origExplorer = teApi.explorer;
		origSidebar = teApi.sidebar;
		pkgMgr = teApi.config.getVs<string>("npm.packageManager");
		userTasks = teApi.config.get<boolean>("specialFolders.showUserTasks");
        ++successCount;
	});


	suiteTeardown(async function()
    {
		teApi.explorer = origExplorer;
		teApi.sidebar = origSidebar;
		await closeActiveDocument();
		await teApi.config.updateVsWs("npm.packageManager", pkgMgr);
        await waitForTeIdle(testControl.waitTime.config.eventFast);
		await executeSettingsUpdate("specialFolders.showUserTasks", userTasks);
        suiteFinished(this);
	});


	test("Focus Tree View", async function()
	{
        if (exitRollingCount(this)) return;
		if (needsTreeBuild()) {
            await focusExplorerView(this);
		}
        ++successCount;
	});


	test("Open Report Page (Single Project No User Tasks)", async function()
	{
        if (exitRollingCount(this)) return;
		this.slow(testControl.slowTime.viewReport + testControl.slowTime.config.showHideUserTasks + 100);
		await executeSettingsUpdate("specialFolders.showUserTasks", false, testControl.waitTime.config.showHideUserTasks);
		const panel = await executeTeCommand2("viewReport", [ projectUri ], testControl.waitTime.viewReport) as WebviewPanel;
		await sleep(100);
		panel.dispose();
		await closeActiveDocument();
        ++successCount;
	});


	test("Open Report Page (Single Project w/ User Tasks)", async function()
	{
        if (exitRollingCount(this)) return;
		this.slow(testControl.slowTime.viewReport + testControl.slowTime.config.showHideUserTasks + 100);
		await executeSettingsUpdate("specialFolders.showUserTasks", true, testControl.waitTime.config.showHideUserTasks);
	    const panel = await executeTeCommand2("viewReport", [ projectUri, "", 5 ], testControl.waitTime.viewReport) as WebviewPanel;
		await sleep(100);
		panel.dispose();
		await closeActiveDocument();
        ++successCount;
	});


	test("Open Report Page (All Projects)", async function()
	{
        if (exitRollingCount(this)) return;
		this.slow(testControl.slowTime.viewReport + 100);
	    const panel = await executeTeCommand("viewReport", testControl.waitTime.viewReport) as WebviewPanel;
		await sleep(100);
		panel.dispose();
		await closeActiveDocument();
        ++successCount;
	});


	test("Open Report Page (All Projects, Yarn Enabled)", async function()
	{
        if (exitRollingCount(this)) return;
		this.slow(testControl.slowTime.viewReport + testControl.slowTime.config.readEvent  + (testControl.slowTime.config.eventFast * 2) + 100);
		const pkgMgr = teApi.config.getVs<string>("npm.packageManager");
        await teApi.config.updateVsWs("npm.packageManager", "yarn");
        await waitForTeIdle(testControl.waitTime.config.eventFast);
	    const panel = await executeTeCommand("viewReport", testControl.waitTime.viewReport) as WebviewPanel;
		await sleep(100);
		panel.dispose();
        await teApi.config.updateVsWs("npm.packageManager", pkgMgr);
        await waitForTeIdle(testControl.waitTime.config.eventFast);
		await closeActiveDocument();
        ++successCount;
	});


	test("View License Info from Webview", async function()
	{
        if (exitRollingCount(this)) return;
		this.slow(testControl.slowTime.viewReport + testControl.slowTime.licenseMgrOpenPageWithDetail + 500);
	    const panel = await executeTeCommand("viewReport", testControl.waitTime.viewReport) as WebviewPanel;
		await panel.webview.postMessage({ command: "viewLicense" });
		await sleep(500);
		panel.dispose();
		await closeActiveDocument();
        ++successCount;
	});


	test("Open Report Page (Views Both Disabled)", async function()
	{
        if (exitRollingCount(this)) return;
		this.slow(testControl.slowTime.viewReport + 100);
		const oExplorer = teApi.explorer;
		const oSidebar = teApi.sidebar;
		teApi.explorer = undefined;
		teApi.sidebar = undefined;
	    const panel = await executeTeCommand("viewReport", testControl.waitTime.viewReport) as WebviewPanel;
		await sleep(100);
		panel.dispose();
		teApi.explorer = oExplorer;
		teApi.sidebar = oSidebar;
		await closeActiveDocument();
        ++successCount;
	});


	test("Open Report Page (Sidebar Enabled, Explorer Disabled)", async function()
	{
        if (exitRollingCount(this)) return;
		this.slow(testControl.slowTime.viewReport + 100);
		const oExplorer = teApi.explorer;
		const oSidebar = teApi.sidebar;
		teApi.explorer = undefined;
		teApi.sidebar = oExplorer;
	    const panel = await executeTeCommand("viewReport", testControl.waitTime.viewReport) as WebviewPanel;
		await sleep(100);
		panel.dispose();
		teApi.explorer = oExplorer;
		teApi.sidebar = oSidebar;
		await closeActiveDocument();
        ++successCount;
	});


	test("View License Info from Webview (Views Both Disabled)", async function()
	{
        if (exitRollingCount(this)) return;
		this.slow(testControl.slowTime.viewReport + testControl.slowTime.licenseMgrOpenPageWithDetail + 500);
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
		await closeActiveDocument();
        ++successCount;
	});


	test("View License Info from Webview (Sidebar Enabled, Explorer Disabled)", async function()
	{
        if (exitRollingCount(this)) return;
		this.slow(testControl.slowTime.viewReport + testControl.slowTime.licenseMgrOpenPageWithDetail + 500);
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
		await closeActiveDocument();
        ++successCount;
	});

});
