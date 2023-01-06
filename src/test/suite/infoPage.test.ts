/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */

import { Uri } from "vscode";
import { ITaskExplorerApi } from "@spmeesseman/vscode-taskexplorer-types";
import {  activate, closeActiveDocument, executeTeCommand, focusExplorer, executeSettingsUpdate } from "../helper";

let teApi: ITaskExplorerApi;
let userTasks: boolean;

suite("Report Tests", () =>
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
	});


	test("Focus Task Explorer View for Tree Population", async function()
	{
		await focusExplorer(this);
	});


	test("Report page single project 1", async function()
	{
		await executeSettingsUpdate("specialFolders.showUserTasks", false);
		await executeTeCommand("viewReport", 100, 500, projectUri);
		await closeActiveDocument();
	});


	test("Report page single project 2", async function()
	{
	    await executeTeCommand("viewReport", 50, 500, projectUri, "");
		await closeActiveDocument();
	});


	test("Report page single project 3", async function()
	{
		await executeSettingsUpdate("specialFolders.showUserTasks", true);
	    await executeTeCommand("viewReport", 50, 500, projectUri, "", 5);
		await closeActiveDocument();
	});


	test("Report page all projects", async function()
	{
	    await executeTeCommand("viewReport", 50, 500);
		await closeActiveDocument();
	});

});
