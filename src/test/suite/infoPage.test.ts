/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */

import { Uri, WebviewPanel } from "vscode";
import { ITaskExplorerApi } from "@spmeesseman/vscode-taskexplorer-types";
import {
	activate, closeActiveDocument, executeTeCommand, focusExplorerView, executeSettingsUpdate,
	testControl, suiteFinished, sleep, getWsPath, exitRollingCount, executeTeCommand2, needsTreeBuild
} from "../utils/utils";

let teApi: ITaskExplorerApi;
let projectUri: Uri;
let userTasks: boolean;
let successCount = -1;


suite("Info Report Tests", () =>
{
	suiteSetup(async function()
    {
        ({ teApi } = await activate(this));
		projectUri = Uri.file(getWsPath("."));
		userTasks = teApi.config.get<boolean>("specialFolders.showUserTasks");
        ++successCount;
	});


	suiteTeardown(async function()
    {
		await closeActiveDocument();
		await executeSettingsUpdate("specialFolders.showUserTasks", userTasks);
        suiteFinished(this);
	});


	test("Activate Tree (Focus Explorer View)", async function()
	{
        if (exitRollingCount(0, successCount)) return;
		if (needsTreeBuild()) {
            await focusExplorerView(this);
		}
        ++successCount;
	});


	test("Report Page (Single Project No User Tasks)", async function()
	{
        if (exitRollingCount(1, successCount)) return;
		this.slow(testControl.slowTime.viewReport + testControl.slowTime.showHideSpecialFolder + testControl.waitTime.config.event + testControl.waitTime.viewReport + 100);
		await executeSettingsUpdate("specialFolders.showUserTasks", false);
		const panel = await executeTeCommand2("viewReport", [ projectUri ], testControl.waitTime.viewReport) as WebviewPanel;
		await sleep(100);
		panel.dispose();
		await closeActiveDocument();
        ++successCount;
	});


	test("Report Page (Single Project w/ User Tasks)", async function()
	{
        if (exitRollingCount(2, successCount)) return;
		this.slow(testControl.slowTime.viewReport + testControl.slowTime.showHideSpecialFolder + testControl.waitTime.config.event + testControl.waitTime.viewReport + 100);
		await executeSettingsUpdate("specialFolders.showUserTasks", true);
	    const panel = await executeTeCommand2("viewReport", [ projectUri, "", 5 ], testControl.waitTime.viewReport) as WebviewPanel;
		await sleep(100);
		panel.dispose();
		await closeActiveDocument();
        ++successCount;
	});


	test("Report Page (All Projects)", async function()
	{
        if (exitRollingCount(3, successCount)) return;
		this.slow(testControl.slowTime.viewReport + testControl.waitTime.viewReport + 100);
	    const panel = await executeTeCommand("viewReport", testControl.waitTime.viewReport) as WebviewPanel;
		await sleep(100);
		panel.dispose();
		await closeActiveDocument();
        ++successCount;
	});


	test("Report Page (View License Info from Webview)", async function()
	{
        if (exitRollingCount(4, successCount)) return;
		this.slow(testControl.slowTime.viewReport + testControl.slowTime.licenseMgrOpenPageWithDetail + 500);
	    const panel = await executeTeCommand("viewReport", testControl.waitTime.viewReport) as WebviewPanel;
		await panel.webview.postMessage({ command: "viewLicense" });
		await sleep(500);
		panel.dispose();
		await closeActiveDocument();
        ++successCount;
	});

});
