/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */

import { Uri } from "vscode";
import { TeCommands } from "../../lib/constants";
import { TeContainer } from "../../lib/container";
import { startupFocus } from "../utils/suiteUtils";
import { TeWebviewPanel } from "../../webview/webviewPanel";
import { ParsingReportPage } from "../../webview/page/parsingReportPage";
import { ITaskTree, ITaskExplorerApi } from "@spmeesseman/vscode-taskexplorer-types";
import { executeSettingsUpdate, executeTeCommand, executeTeCommand2 } from "../utils/commandUtils";
import {
	activate, closeEditors, testControl, suiteFinished, sleep, getWsPath, exitRollingCount, waitForTeIdle, endRollingCount, createwebviewForRevive
} from "../utils/utils";

let teApi: ITaskExplorerApi;
let teContainer: TeContainer;
let projectUri: Uri;
let userTasks: boolean;
let origExplorer: ITaskTree | undefined;
let origSidebar: ITaskTree | undefined;
let pkgMgr: string;


suite("Info Report Tests", () =>
{
	suiteSetup(async function()
    {
        if (exitRollingCount(this, true)) return;
        ({ teContainer, teApi } = await activate(this));
		projectUri = Uri.file(getWsPath("."));
		origExplorer = teApi.explorer;
		origSidebar = teApi.sidebar;
		pkgMgr = teApi.testsApi.config.getVs<string>("npm.packageManager");
		userTasks = teApi.testsApi.config.get<boolean>("specialFolders.showUserTasks");
        endRollingCount(this, true);
	});


	suiteTeardown(async function()
    {
        if (exitRollingCount(this, false, true)) return;
		teApi.explorer = origExplorer;
		teApi.sidebar = origSidebar;
		await closeEditors();
		await teApi.testsApi.config.updateVsWs("npm.packageManager", pkgMgr);
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
		const panel = await executeTeCommand2<TeWebviewPanel<any>>(TeCommands.ShowParsingReportPage, [ projectUri ], testControl.waitTime.viewReport);
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
	    const panel = await executeTeCommand2<TeWebviewPanel<any>>(TeCommands.ShowParsingReportPage, [ projectUri, "", 5 ], testControl.waitTime.viewReport);
		await sleep(75);
		panel.hide();
		await closeEditors();
        endRollingCount(this);
	});


	test("Open Report Page (All Projects)", async function()
	{
        if (exitRollingCount(this)) return;
		this.slow(testControl.slowTime.viewReport + 150);
	    const panel = await executeTeCommand<TeWebviewPanel<any>>(TeCommands.ShowParsingReportPage, testControl.waitTime.viewReport);
		await sleep(75);
		panel.hide();
		await closeEditors();
        endRollingCount(this);
	});


	test("Open Report Page (All Projects, Yarn Enabled)", async function()
	{
        if (exitRollingCount(this)) return;
		this.slow(testControl.slowTime.viewReport + (testControl.slowTime.config.enableEvent * 2) + 150);
        await teApi.testsApi.config.updateVsWs("npm.packageManager", "yarn");
        await waitForTeIdle(testControl.waitTime.config.enableEvent);
	    const panel = await executeTeCommand<TeWebviewPanel<any>>(TeCommands.ShowParsingReportPage, testControl.waitTime.viewReport);
		await sleep(75);
		panel.hide();
        await teApi.testsApi.config.updateVsWs("npm.packageManager", pkgMgr);
        await waitForTeIdle(testControl.waitTime.config.enableEvent);
		await closeEditors();
        endRollingCount(this);
	});


	test("View License Info from Webview", async function()
	{
        if (exitRollingCount(this)) return;
		this.slow(testControl.slowTime.viewReport + testControl.slowTime.licenseMgr.pageWithDetail + 1000);
	    const panel = await executeTeCommand<TeWebviewPanel<any>>("showParsingReportPage", testControl.waitTime.viewReport);
		await panel.getWebviewPanel()?.webview.postMessage({ command: "showLicensePage" });
		await sleep(500);
		panel.hide();
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
	    const panel = await executeTeCommand<TeWebviewPanel<any>>(TeCommands.ShowParsingReportPage, testControl.waitTime.viewReport);
		await sleep(75);
		panel.hide();
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
	    const panel = await executeTeCommand<TeWebviewPanel<any>>(TeCommands.ShowParsingReportPage, testControl.waitTime.viewReport);
		await sleep(75);
		panel.hide();
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
	    const panel = await executeTeCommand<TeWebviewPanel<any>>(TeCommands.ShowParsingReportPage, testControl.waitTime.viewReport);
		await panel.getWebviewPanel()?.webview.postMessage({ command: "showLicensePage" });
		await sleep(500);
		panel.hide();
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
	    const panel = await executeTeCommand<TeWebviewPanel<any>>(TeCommands.ShowParsingReportPage, testControl.waitTime.viewReport);
		await panel.getWebviewPanel()?.webview.postMessage({ command: "showLicensePage" });
		await sleep(500);
		panel.hide();
		teApi.explorer = oExplorer;
		teApi.sidebar = oSidebar;
		await closeEditors();
        endRollingCount(this);
	});


	test("Deserialize Report Page (All Projects)", async function()
	{
        if (exitRollingCount(this)) return;
		this.slow(testControl.slowTime.viewReport + 200);
		const panel = createwebviewForRevive(ParsingReportPage.viewTitle, ParsingReportPage.viewId);
	    await teContainer.parsingReportPage.serializer.deserializeWebviewPanel(panel, null);
		await sleep(50);
		teApi.testsApi.isBusy = true;
		setTimeout(() => { teApi.testsApi.isBusy = false; }, 50);
	    await teContainer.parsingReportPage.serializer.deserializeWebviewPanel(panel, null);
		await sleep(50);
		await closeEditors();
        endRollingCount(this);
	});

});
