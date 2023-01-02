/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */

import * as assert from "assert";
import { Uri } from "vscode";
import { ExplorerApi, TaskExplorerApi } from "@spmeesseman/vscode-taskexplorer-types";
import {  activate, closeActiveDocument, isReady, executeTeCommand, testsControl } from "../helper";

let teApi: TaskExplorerApi;
let explorer: ExplorerApi;


suite("Report Tests", () =>
{
	let projectUri: Uri;

	suiteSetup(async function()
    {
		teApi = await activate(this);
        assert(isReady("make") === true, "    ✘ TeApi not ready");
        if (!teApi.explorer) {
            assert.fail("        ✘ Explorer instance does not exist");
        }
        explorer = teApi.explorer;
	});


	suiteTeardown(async function()
    {
		await closeActiveDocument();
	});


	test("Focus Task Explorer View for Tree Population", async function()
	{
		if (!explorer.isVisible()) {
            this.slow(1000);
		    await executeTeCommand("focus", testsControl.slowTimeForFocusCommand, 3000);
        }
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
