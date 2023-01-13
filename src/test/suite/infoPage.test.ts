/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */

import { expect } from "chai";
import { Uri, WebviewPanel } from "vscode";
import { ITaskExplorerApi } from "@spmeesseman/vscode-taskexplorer-types";
import {
	activate, closeActiveDocument, executeTeCommand, focusExplorerView, executeSettingsUpdate,
	testControl, suiteFinished, sleep, getWsPath
} from "../utils/utils";

let teApi: ITaskExplorerApi;
let projectUri: Uri;
let userTasks: boolean;
let successCount = -1;


suite("Info Report Tests", () =>
{
	suiteSetup(async function()
    {
		teApi = await activate(this);
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
        expect(successCount).to.be.equal(0, "rolling success count failure");
		await focusExplorerView(this);
        ++successCount;
	});


	test("Report Page Single Project (No UserTasks0", async function()
	{
        expect(successCount).to.be.equal(1, "rolling success count failure");
		this.slow(testControl.slowTime.viewReport + testControl.slowTime.showHideSpecialFolder + testControl.waitTime.configEvent + testControl.waitTime.viewReport + 100);
		await executeSettingsUpdate("specialFolders.showUserTasks", false);
		const panel = await executeTeCommand("viewReport", testControl.waitTime.viewReport, 500, projectUri) as WebviewPanel;
		await sleep(100);
		panel.dispose();
		await closeActiveDocument();
        ++successCount;
	});


	test("Report Page Single Project (w/ User Tasks)", async function()
	{
        expect(successCount).to.be.equal(2, "rolling success count failure");
		this.slow(testControl.slowTime.viewReport + testControl.slowTime.showHideSpecialFolder + testControl.waitTime.configEvent + testControl.waitTime.viewReport + 100);
		await executeSettingsUpdate("specialFolders.showUserTasks", true);
	    const panel = await executeTeCommand("viewReport", testControl.waitTime.viewReport, 500, projectUri, "", 5) as WebviewPanel;
		await sleep(100);
		panel.dispose();
		await closeActiveDocument();
        ++successCount;
	});


	test("Report Page All Projects", async function()
	{
        expect(successCount).to.be.equal(3, "rolling success count failure");
		this.slow(testControl.slowTime.viewReport + testControl.waitTime.viewReport + 100);
	    const panel = await executeTeCommand("viewReport", testControl.waitTime.viewReport, 500) as WebviewPanel;
		await sleep(100);
		panel.dispose();
		await closeActiveDocument();
        ++successCount;
	});

});
