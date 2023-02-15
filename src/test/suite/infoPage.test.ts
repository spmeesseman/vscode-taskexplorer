/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */

import { Uri } from "vscode";
import { TaskTree } from "../../tree/tree";
import { Commands } from "../../lib/command";
import { TeWrapper } from "../../lib/wrapper";
import { startupFocus } from "../utils/suiteUtils";
import { TeWebviewPanel } from "../../webview/webviewPanel";
import { ParsingReportPage } from "../../webview/page/parsingReportPage";
import { ITaskExplorerApi, ITaskTreeView } from "@spmeesseman/vscode-taskexplorer-types";
import { executeSettingsUpdate, executeTeCommand, executeTeCommand2 } from "../utils/commandUtils";
import {
	activate, closeEditors, testControl, suiteFinished, sleep, getWsPath, exitRollingCount, waitForTeIdle, endRollingCount, createwebviewForRevive
} from "../utils/utils";

let teWrapper: TeWrapper;
let projectUri: Uri;
let userTasks: boolean;
let origExplorer: TaskTree | undefined;
let origSidebar: TaskTree | undefined;
let pkgMgr: string;


suite("Info Report Tests", () =>
{
	suiteSetup(async function()
    {
        if (exitRollingCount(this, true)) return;
        ({ teWrapper } = await activate(this));
		projectUri = Uri.file(getWsPath("."));
		origExplorer = teWrapper.explorer;
		origSidebar = teWrapper.sidebar;
		pkgMgr = teWrapper.config.getVs<string>("npm.packageManager");
		userTasks = teWrapper.config.get<boolean>("specialFolders.showUserTasks");
        endRollingCount(this, true);
	});


	suiteTeardown(async function()
    {
        if (exitRollingCount(this, false, true)) return;
		// teWrapper.explorer = origExplorer;
		// teWrapper.sidebar = origSidebar;
		await closeEditors();
		await teWrapper.config.updateVsWs("npm.packageManager", pkgMgr);
        await waitForTeIdle(testControl.waitTime.config.eventFast);
		await executeSettingsUpdate("specialFolders.showUserTasks", userTasks);
        suiteFinished(this);
	});


	test("Focus Explorer View", async function()
	{
        await startupFocus(this);
	});


	test("Open Report Page (Single Project No User Tasks)", async function()
	{
        if (exitRollingCount(this)) return;
		this.slow(testControl.slowTime.viewReport + testControl.slowTime.config.showHideUserTasks + 150);
		await executeSettingsUpdate("specialFolders.showUserTasks", false, testControl.waitTime.config.showHideUserTasks);
		const panel = await executeTeCommand2<TeWebviewPanel<any>>(Commands.ShowParsingReportPage, [ projectUri ], testControl.waitTime.viewReport);
		await sleep(75);
		panel.hide();
		await closeEditors();
        endRollingCount(this);
	});


	test("Open Report Page (Single Project w/ User Tasks)", async function()
	{
        if (exitRollingCount(this)) return;
		this.slow(testControl.slowTime.viewReport + testControl.slowTime.config.showHideUserTasks + 150);
		await executeSettingsUpdate("specialFolders.showUserTasks", true, testControl.waitTime.config.showHideUserTasks);
	    const panel = await executeTeCommand2<TeWebviewPanel<any>>(Commands.ShowParsingReportPage, [ projectUri, "", 5 ], testControl.waitTime.viewReport);
		await sleep(75);
		panel.hide();
		await closeEditors();
        endRollingCount(this);
	});


	test("Open Report Page (All Projects)", async function()
	{
        if (exitRollingCount(this)) return;
		this.slow(testControl.slowTime.viewReport + 150);
	    const panel = await executeTeCommand<TeWebviewPanel<any>>(Commands.ShowParsingReportPage, testControl.waitTime.viewReport);
		await sleep(75);
		panel.hide();
		await closeEditors();
        endRollingCount(this);
	});


	test("Open Report Page (All Projects, Yarn Enabled)", async function()
	{
        if (exitRollingCount(this)) return;
		this.slow(testControl.slowTime.viewReport + (testControl.slowTime.config.enableEvent * 2) + 150);
        await teWrapper.config.updateVsWs("npm.packageManager", "yarn");
        await waitForTeIdle(testControl.waitTime.config.enableEvent);
	    const panel = await executeTeCommand<TeWebviewPanel<any>>(Commands.ShowParsingReportPage, testControl.waitTime.viewReport);
		await sleep(75);
		panel.hide();
        await teWrapper.config.updateVsWs("npm.packageManager", pkgMgr);
        await waitForTeIdle(testControl.waitTime.config.enableEvent);
		await closeEditors();
        endRollingCount(this);
	});


	test("View License Info from Webview", async function()
	{
        if (exitRollingCount(this)) return;
		this.slow(testControl.slowTime.viewReport + testControl.slowTime.licenseMgr.pageWithDetail + 1000);
	    const panel = await executeTeCommand<TeWebviewPanel<any>>(Commands.ShowLicensePage, testControl.waitTime.viewReport);
		await panel.view?.webview.postMessage({ command: "showLicensePage" });
		await sleep(500);
		panel.hide();
		await closeEditors();
        endRollingCount(this);
	});


	test("Open Report Page (Views Both Disabled)", async function()
	{
        if (exitRollingCount(this)) return;
		this.slow(testControl.slowTime.viewReport + 150);
		const oExplorer = teWrapper.explorer;
		const oSidebar = teWrapper.sidebar;
		// teWrapper.explorer = undefined;
		// teWrapper.sidebar = undefined;
	    const panel = await executeTeCommand<TeWebviewPanel<any>>(Commands.ShowParsingReportPage, testControl.waitTime.viewReport);
		await sleep(75);
		panel.hide();
		// teWrapper.explorer = oExplorer;
		// teWrapper.sidebar = oSidebar;
		await closeEditors();
        endRollingCount(this);
	});


	test("Open Report Page (Sidebar Enabled, Explorer Disabled)", async function()
	{
        if (exitRollingCount(this)) return;
		this.slow(testControl.slowTime.viewReport + 150);
		const oExplorer = teWrapper.explorer;
		const oSidebar = teWrapper.sidebar;
		// teWrapper.explorer = undefined;
		// teWrapper.sidebar = oExplorer;
	    const panel = await executeTeCommand<TeWebviewPanel<any>>(Commands.ShowParsingReportPage, testControl.waitTime.viewReport);
		await sleep(75);
		panel.hide();
		// teWrapper.explorer = oExplorer;
		// teWrapper.sidebar = oSidebar;
		await closeEditors();
        endRollingCount(this);
	});


	test("View License Info from Webview (Views Both Disabled)", async function()
	{
        if (exitRollingCount(this)) return;
		this.slow(testControl.slowTime.viewReport + testControl.slowTime.licenseMgr.pageWithDetail + 1000);
		const oExplorer = teWrapper.explorer;
		const oSidebar = teWrapper.sidebar;
		// teWrapper.explorer = undefined;
		// teWrapper.sidebar = undefined;
	    const panel = await executeTeCommand<TeWebviewPanel<any>>(Commands.ShowParsingReportPage, testControl.waitTime.viewReport);
		await panel.view?.webview.postMessage({ command: "showLicensePage" });
		await sleep(500);
		panel.hide();
		// teWrapper.explorer = oExplorer;
		// teWrapper.sidebar = oSidebar;
		await closeEditors();
        endRollingCount(this);
	});


	test("View License Info from Webview (Sidebar Enabled, Explorer Disabled)", async function()
	{
        if (exitRollingCount(this)) return;
		this.slow(testControl.slowTime.viewReport + testControl.slowTime.licenseMgr.pageWithDetail + 1000);
		const oExplorer = teWrapper.explorer;
		const oSidebar = teWrapper.sidebar;
		// teWrapper.explorer = undefined;
		// teWrapper.sidebar = oExplorer;
	    const panel = await executeTeCommand<TeWebviewPanel<any>>(Commands.ShowParsingReportPage, testControl.waitTime.viewReport);
		await panel.view?.webview.postMessage({ command: "showLicensePage" });
		await sleep(500);
		panel.hide();
		// teWrapper.explorer = oExplorer;
		// teWrapper.sidebar = oSidebar;
		await closeEditors();
        endRollingCount(this);
	});


	test("Deserialize Report Page (All Projects)", async function()
	{
        if (exitRollingCount(this)) return;
		this.slow(testControl.slowTime.viewReport + 200);
		let panel = createwebviewForRevive(ParsingReportPage.viewTitle, ParsingReportPage.viewId);
	    await teWrapper.parsingReportPage.serializer.deserializeWebviewPanel(panel, null);
		await sleep(50);
		teWrapper.parsingReportPage.dispose();
		panel = createwebviewForRevive(ParsingReportPage.viewTitle, ParsingReportPage.viewId);
		await sleep(50);
		// teWrapper.busy = true;
		setTimeout(() => { /* teWrapper.busy = false; */ }, 50);
	    await teWrapper.parsingReportPage.serializer.deserializeWebviewPanel(panel, null);
		await sleep(50);
		await closeEditors();
        endRollingCount(this);
	});

});
