
import * as assert from "assert";
import { commands, Uri } from "vscode";
import {  activate, closeActiveDocuments, sleep, isReady, testCommand } from "../helper";
// eslint-disable-next-line import/no-extraneous-dependencies
import { TaskExplorerApi } from "@spmeesseman/vscode-taskexplorer-types";
import { ILicenseManager } from "../../interface/licenseManager";


let teApi: TaskExplorerApi;
let licMgr: ILicenseManager;

suite("Report Tests", () =>
{

	let projectUri: Uri;

	suiteSetup(async function()
    {
		teApi = await activate(this);
        assert(isReady("make") === true, "    ✘ TeApi not ready");
		await testCommand("focus");
	});


	suiteTeardown(async () =>
    {
		await closeActiveDocuments();
	});


	test("Report page single project", async () =>
	{
		await sleep(1000);
	    await testCommand("viewReport", projectUri);
		await sleep(1000);
		await closeActiveDocuments();
		await sleep(100);
	    await testCommand("viewReport", projectUri, "");
		await sleep(1000);
		await closeActiveDocuments();
		await sleep(100);
	    await testCommand("viewReport", projectUri, "", 5);
		await sleep(1000);
		await closeActiveDocuments();
		await sleep(100);
	});


	test("Report page all projects", async () =>
	{
	    await testCommand("viewReport");
		await sleep(1000);
		await closeActiveDocuments();
		await sleep(100);
	});

});
