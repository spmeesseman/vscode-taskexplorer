/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */

import { Uri, WebviewPanel } from "vscode";
import { ITaskExplorerApi } from "@spmeesseman/vscode-taskexplorer-types";
import {  activate, closeActiveDocument, executeTeCommand, focusExplorerView, executeSettingsUpdate, testControl, suiteFinished } from "../helper";

let teApi: ITaskExplorerApi;
let userTasks: boolean;

suite("Info Report Tests", () =>
{
	let projectUri: Uri;

	suiteSetup(async function()
    {
		teApi = await activate(this);
		userTasks = teApi.config.get<boolean>("specialFolders.showUserTasks");
	});


	suiteTeardown(async function()
    {
		await closeActiveDocument();
		await executeSettingsUpdate("specialFolders.showUserTasks", userTasks);
        suiteFinished(this);
	});


	test("Activate Tree (Focus Explorer View)", async function()
	{
		await focusExplorerView(this);
	});


	test("Report page single project 1", async function()
	{
		this.slow(testControl.slowTime.viewReport + testControl.slowTime.showHideSpecialFolder);
		await executeSettingsUpdate("specialFolders.showUserTasks", false);
		const panel = await executeTeCommand("viewReport", 100, 500, projectUri) as WebviewPanel;
		panel.dispose();
		await closeActiveDocument();
	});


	test("Report page single project 2", async function()
	{
		this.slow(testControl.slowTime.viewReport);
	    const panel = await executeTeCommand("viewReport", 50, 500, projectUri, "") as WebviewPanel;
		panel.dispose();
		await closeActiveDocument();
	});


	test("Report page single project 3", async function()
	{
		this.slow(testControl.slowTime.viewReport + testControl.slowTime.showHideSpecialFolder);
		await executeSettingsUpdate("specialFolders.showUserTasks", true);
	    const panel = await executeTeCommand("viewReport", 50, 500, projectUri, "", 5) as WebviewPanel;
		panel.dispose();
		await closeActiveDocument();
	});


	test("Report page all projects", async function()
	{
		this.slow(testControl.slowTime.viewReport);
	    const panel = await executeTeCommand("viewReport", 50, 500) as WebviewPanel;
		panel.dispose();
		await closeActiveDocument();
	});

});
