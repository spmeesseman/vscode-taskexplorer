/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */

import * as assert from "assert";
import { ILicenseManager } from "../../interface/licenseManager";
import { storage } from "../../lib/utils/storage";
import { IExplorerApi, ITaskExplorerApi } from "@spmeesseman/vscode-taskexplorer-types";
import { getLicenseManager } from "../../extension";
import { Task } from "vscode";
import {
	activate, closeActiveDocument, isReady, overrideNextShowInfoBox,
	overrideNextShowInputBox, sleep, executeTeCommand, testsControl, focusExplorer
} from "../helper";


let teApi: ITaskExplorerApi;
let licMgr: ILicenseManager;


suite("License Manager Tests", () =>
{
	let tasks: Task[] = [];
	let licenseKey: string | undefined;
	let version: string;

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


	test("Get License Manager", async function()
	{
		licMgr = getLicenseManager();
		tasks = teApi.explorer?.getTasks() || [];
		await licMgr.setTasks(tasks, "");
	});


	test("Clear License Key", async function()
	{
		licenseKey = licMgr.getLicenseKey();
		version = licMgr.getVersion(); // will be set on ext. startup
		licMgr.setLicenseKey(undefined);
	});


	test("Has License", async function()
	{   //
		// Has license
		// 1111-2222-3333-4444-5555 for now.  When lic server is done, it will fail
		//
		this.slow(500);
		await licMgr.checkLicense();
		await sleep(400);
		await closeActiveDocument();
	});


	test("License Prompt", async function()
	{   //
		// If version is set, the prompt will show
		//
		this.slow(500);
		overrideNextShowInfoBox("Enter License Key");
		overrideNextShowInputBox("1111-2222-3333-4444-5555");
		await storage.update("version", undefined);
		await licMgr.checkLicense();
		await sleep(400);
		await closeActiveDocument();
	});


	test("License Page w/ No License Key", async function()
	{   //
		// If version is 'not' set, the lic page will show
		//
		this.slow(500);
		await storage.update("version", undefined);
		await licMgr.checkLicense();
		await sleep(400);
		await closeActiveDocument();
	});


	test("License Page w/ Set License Key", async function()
	{
		this.slow(500);
		const licenseKey = licMgr.getLicenseKey();
		//
		// If license is set, diff info page
		//
		licMgr.setLicenseKey(licenseKey);
		await licMgr.checkLicense();
		await sleep(400);
		await closeActiveDocument();
	});


	test("License Page w/ Set License Key", async function()
	{
		this.slow(500);
		const licenseKey = licMgr.getLicenseKey(),
			  version = licMgr.getVersion(); // will be set on ext. startup
		//
		await storage.update("version", version);
		await licMgr.checkLicense();
		await sleep(400);
		await closeActiveDocument();
		//
		// Reset
		//
		licMgr.setLicenseKey(licenseKey);
		await storage.update("version", version);
	});


	test("License Page w/ Set License Key", async function()
	{
		this.slow(500);
		const licenseKey = licMgr.getLicenseKey(),
			  version = licMgr.getVersion(); // will be set on ext. startup
		//
		await storage.update("version", version);
		await licMgr.checkLicense();
		await sleep(400);
		await closeActiveDocument();
		//
		// Reset
		//
		licMgr.setLicenseKey(licenseKey);
		await storage.update("version", version);
	});


	test("Reset License Manager", async function()
	{
		//
		// Reset
		//
		licMgr.setLicenseKey(licenseKey);
		await storage.update("version", version);
	});



	test("License info", async function()
	{
		this.slow(500);
		const licenseKey = licMgr.getLicenseKey(); // will be set on ext. startup
		licMgr.setLicenseKey(undefined);
		overrideNextShowInfoBox("Info");
		overrideNextShowInfoBox("");
		await licMgr.checkLicense();
		await sleep(400);
		await closeActiveDocument();
		licMgr.setLicenseKey(licenseKey);
	});


	test("License not now", async function()
	{
		this.slow(500);
		const licenseKey = licMgr.getLicenseKey(); // will be set on ext. startup
		licMgr.setLicenseKey(undefined);
		overrideNextShowInfoBox("Not Now");
		await licMgr.checkLicense();
		await sleep(400);
		await closeActiveDocument();
		licMgr.setLicenseKey(licenseKey);
	});


	test("Enter License key on Startup", async function()
	{
		this.slow(1000);
		overrideNextShowInfoBox("Enter License Key");
		overrideNextShowInputBox("1111-2222-3333-4444-5555");
		await licMgr.enterLicenseKey();
		await sleep(400);
		overrideNextShowInfoBox("Enter License Key");
		overrideNextShowInputBox("");
		await licMgr.enterLicenseKey();
		await sleep(400);
	});


	test("Enter License Key by Command Pallette", async function()
	{
		this.slow(1500);
		overrideNextShowInfoBox("Enter License Key");
		overrideNextShowInputBox("1111-2222-3333-4444-5555");
		await executeTeCommand("enterLicense", 400, 1100);

		overrideNextShowInfoBox("Enter License Key");
		overrideNextShowInputBox("");
		await executeTeCommand("enterLicense", 400, 1100, "   ");

		overrideNextShowInfoBox("Enter License Key");
		overrideNextShowInputBox("");
		await executeTeCommand("enterLicense", 400, 1100, "   ", 1);
	});


	test("Multi projects startup", async function()
	{

		// if (await pathExists(getProjectPath("extjs-pkg-server")))
		// {
			// const licenseKey = licMgr.getLicenseKey(),
			// 	  version = licMgr.getVersion(),
			// 	  fsPath = getProjectPath("extjs-pkg-server/src/csi"),
			// 	  files = await utils.findFiles(fsPath, "{classic,modern,src}/**/*.js");

			// const firstCmp = (await parseFiles(files, "extjs-pkg-server", "extjs-pkg-server"))[0];
			// assert(firstCmp);
			// tasks.push(firstCmp);

			// licMgr.setLicenseKey(undefined);
			// await storage.update("version", undefined);
			// await licMgr.checkLicense();
			// await sleep(1000);
			// await closeActiveDocument();
			// licMgr.setLicenseKey(licenseKey);
			// await storage.update("version", version);
			// tasks.pop();
		// }
	});

});
