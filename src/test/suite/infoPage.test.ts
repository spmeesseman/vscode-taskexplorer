/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */

import * as assert from "assert";
import { Uri } from "vscode";
import {  activate, closeActiveDocuments, isReady, executeTeCommand, sleep } from "../helper";
// eslint-disable-next-line import/no-extraneous-dependencies
import { TaskExplorerApi } from "@spmeesseman/vscode-taskexplorer-types";
import { ILicenseManager } from "../../interface/licenseManager";
import { waitForCache } from "../../cache";


let teApi: TaskExplorerApi;
let licMgr: ILicenseManager;

suite("Report Tests", () =>
{

	let projectUri: Uri;

	suiteSetup(async function()
    {
		teApi = await activate(this);
        assert(isReady("make") === true, "    ✘ TeApi not ready");
		await executeTeCommand("focus", 2000);
	});


	suiteTeardown(async function()
    {
		await closeActiveDocuments();
	});


    test("Refresh", async function()
    {
		await sleep(2000);
        await executeTeCommand("refresh", 2000);
		await waitForCache();
    });


	test("Report page single project 1", async function()
	{
		try {
	    	await executeTeCommand("viewReport", 1000, projectUri);
		}
		catch {
			await sleep(2000);
			await executeTeCommand("refresh", 2000);
			await executeTeCommand("viewReport", 1000, projectUri);
		}
		await closeActiveDocuments();
	});


	test("Report page single project 2", async function()
	{
	    await executeTeCommand("viewReport", 1000, projectUri, "");
		await closeActiveDocuments();
	});


	test("Report page single project 3", async function()
	{
	    await executeTeCommand("viewReport", 1000, projectUri, "", 5);
		await closeActiveDocuments();
	});


	test("Report page all projects", async function()
	{
	    await executeTeCommand("viewReport", 1000);
		await closeActiveDocuments();
	});

});
