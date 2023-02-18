/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */

import { Uri, WebviewPanel } from "vscode";
import { startupFocus } from "../utils/suiteUtils";
import { ITeWrapper } from "@spmeesseman/vscode-taskexplorer-types";
import { executeSettingsUpdate, executeTeCommand, executeTeCommand2 } from "../utils/commandUtils";
import {
	activate, closeEditors, testControl, suiteFinished, sleep, getWsPath, exitRollingCount, waitForTeIdle, endRollingCount, createwebviewForRevive
} from "../utils/utils";

let teWrapper: ITeWrapper;
let projectUri: Uri;
let userTasks: boolean;
let pkgMgr: string;


suite("Info Report Tests", () =>
{
	suiteSetup(async function()
    {
        if (exitRollingCount(this, true)) return;
        ({ teWrapper } = await activate(this));
		projectUri = Uri.file(getWsPath("."));
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
		await executeTeCommand2("taskexplorer.view.parsingReport.show", [ projectUri ], testControl.waitTime.viewReport);
		await sleep(75);
		await closeEditors();
        endRollingCount(this);
	});


	test("Open Report Page (Single Project w/ User Tasks)", async function()
	{
        if (exitRollingCount(this)) return;
		this.slow(testControl.slowTime.viewReport + testControl.slowTime.config.showHideUserTasks + 150);
		await executeSettingsUpdate("specialFolders.showUserTasks", true, testControl.waitTime.config.showHideUserTasks);
	    await executeTeCommand2("taskexplorer.view.parsingReport.show", [ projectUri, "", 5 ], testControl.waitTime.viewReport);
		await sleep(75);
		await closeEditors();
        endRollingCount(this);
	});


	test("Open Report Page (All Projects)", async function()
	{
        if (exitRollingCount(this)) return;
		this.slow(testControl.slowTime.viewReport + 150);
	    await executeTeCommand("taskexplorer.view.parsingReport.show", testControl.waitTime.viewReport);
		await sleep(75);
		await closeEditors();
        endRollingCount(this);
	});


	test("Open Report Page (All Projects, Yarn Enabled)", async function()
	{
        if (exitRollingCount(this)) return;
		this.slow(testControl.slowTime.viewReport + (testControl.slowTime.config.enableEvent * 2) + 150);
        await teWrapper.config.updateVsWs("npm.packageManager", "yarn");
        await waitForTeIdle(testControl.waitTime.config.enableEvent);
	    await executeTeCommand("taskexplorer.view.parsingReport.show", testControl.waitTime.viewReport);
		await sleep(75);
        await teWrapper.config.updateVsWs("npm.packageManager", pkgMgr);
        await waitForTeIdle(testControl.waitTime.config.enableEvent);
		await closeEditors();
        endRollingCount(this);
	});


	test("View License Info from Webview", async function()
	{
        if (exitRollingCount(this)) return;
		this.slow(testControl.slowTime.viewReport + testControl.slowTime.licenseMgr.pageWithDetail + 1000);
	    const panel = await executeTeCommand("taskexplorer.view.licensePage.show", testControl.waitTime.viewReport);
		await teWrapper.licensePage.view.webview.postMessage({ command: "showLicensePage" });
		await sleep(500);
		await closeEditors();
        endRollingCount(this);
	});


	test("Deserialize Report Page (All Projects)", async function()
	{
        if (exitRollingCount(this)) return;
		this.slow(testControl.slowTime.viewReport + 30);
		let panel = createwebviewForRevive("Task Explorer Parsing Report", "parsingReport");
	    await teWrapper.parsingReportPage.serializer.deserializeWebviewPanel(panel, null);
		await sleep(5);
		(teWrapper.parsingReportPage.view as WebviewPanel)?.dispose();
		panel = createwebviewForRevive("Task Explorer Parsing Report", "parsingReport");
		await sleep(5);
	    await teWrapper.parsingReportPage.serializer.deserializeWebviewPanel(panel, null);
		await sleep(5);
		await closeEditors();
        endRollingCount(this);
	});

});
