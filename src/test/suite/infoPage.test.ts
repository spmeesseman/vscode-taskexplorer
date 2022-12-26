/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */

import * as assert from "assert";
import { Uri } from "vscode";
import {  activate, closeActiveDocuments, isReady, executeTeCommand } from "../helper";


suite("Report Tests", () =>
{

	let projectUri: Uri;

	suiteSetup(async function()
    {
		await activate(this);
        assert(isReady("make") === true, "    ✘ TeApi not ready");
	});


	suiteTeardown(async function()
    {
		await closeActiveDocuments();
	});


	test("Focus Task Explorer View for Tree Population", async function()
	{
		await executeTeCommand("focus");
	});


	test("Report page single project 1", async function()
	{
		await executeTeCommand("viewReport", 20, 500, projectUri);
		await closeActiveDocuments();
	});


	test("Report page single project 2", async function()
	{
	    await executeTeCommand("viewReport", 20, 500, projectUri, "");
		await closeActiveDocuments();
	});


	test("Report page single project 3", async function()
	{
	    await executeTeCommand("viewReport", 20, 500, projectUri, "", 5);
		await closeActiveDocuments();
	});


	test("Report page all projects", async function()
	{
	    await executeTeCommand("viewReport", 20, 500);
		await closeActiveDocuments();
	});

});
