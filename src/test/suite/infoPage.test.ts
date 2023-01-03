/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */

import * as assert from "assert";
import { Uri } from "vscode";
import { IExplorerApi, ITaskExplorerApi } from "@spmeesseman/vscode-taskexplorer-types";
import {  activate, closeActiveDocument, isReady, executeTeCommand, testsControl, focusExplorer } from "../helper";

let teApi: ITaskExplorerApi;


suite("Report Tests", () =>
{
	let projectUri: Uri;

	suiteSetup(async function()
    {
		teApi = await activate(this);
        assert(isReady("make") === true, "    ✘ TeApi not ready");
	});


	suiteTeardown(async function()
    {
		await closeActiveDocument();
	});


	test("Focus Task Explorer View for Tree Population", async function()
	{
		await focusExplorer(this);
	});


	test("Report page single project 1", async function()
	{
		await executeTeCommand("viewReport", 20, 500, projectUri);
		await closeActiveDocument();
	});


	test("Report page single project 2", async function()
	{
	    await executeTeCommand("viewReport", 20, 500, projectUri, "");
		await closeActiveDocument();
	});


	test("Report page single project 3", async function()
	{
	    await executeTeCommand("viewReport", 20, 500, projectUri, "", 5);
		await closeActiveDocument();
	});


	test("Report page all projects", async function()
	{
	    await executeTeCommand("viewReport", 20, 500);
		await closeActiveDocument();
	});

});
