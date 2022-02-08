
import * as assert from "assert";
import { activate, closeActiveDocuments, isReady, overrideNextShowInfoBox, overrideNextShowInputBox, sleep } from "../helper";
import { ILicenseManager } from "../../interface/licenseManager";
import { storage } from "../../common/storage";
// eslint-disable-next-line import/no-extraneous-dependencies
import { TaskExplorerApi } from "@spmeesseman/vscode-taskexplorer-types";
import { getLicenseManager } from "../../extension";
import { Task } from "vscode";


let teApi: TaskExplorerApi;
let licMgr: ILicenseManager;


suite("License Manager Tests", () =>
{
	let tasks: Task[] = [];


	suiteSetup(async function()
	{
		teApi = await activate(this);
        assert(isReady("make") === true, "    ✘ TeApi not ready");
		licMgr = getLicenseManager();
		tasks = teApi.explorer.getTasks();
	});


	suiteTeardown(async () =>
    {
		await closeActiveDocuments();
	});


	test("Open welcome page", async () =>
	{
		const licenseKey = licMgr.getLicenseKey(),
			  version = licMgr.getVersion(); // will be set on ext. startup
		//
		// Remove ex. key
		//
		licMgr.setLicenseKey(undefined);
		//
		// Has license
		// 1111-2222-3333-4444-5555 for now.  When lic server is done, it will fail
		//
		await licMgr.initialize(tasks);
		await sleep(1000);
		await closeActiveDocuments();
		//
		// If version is set, the prompt will show
		//
		overrideNextShowInfoBox("Enter License Key");
		overrideNextShowInputBox("1111-2222-3333-4444-5555");
		await storage.update("version", undefined);
		await licMgr.initialize(tasks);
		await sleep(1000);
		await closeActiveDocuments();
		//
		// If version is 'not' set, the lic page will show
		//
		await storage.update("version", undefined);
		await licMgr.initialize(tasks);
		await sleep(1000);
		await closeActiveDocuments();
		//
		// If  license is set, diff info page
		//
		licMgr.setLicenseKey(licenseKey);
		await licMgr.initialize(tasks);
		await sleep(1000);
		await closeActiveDocuments();
		//
		await storage.update("version", version);
		await licMgr.initialize(tasks);
		await sleep(1000);
		await closeActiveDocuments();
		//
		// Reset
		//
		licMgr.setLicenseKey(licenseKey);
		await storage.update("version", version);
	});


	test("License info", async () =>
	{
		const licenseKey = licMgr.getLicenseKey(); // will be set on ext. startup
		licMgr.setLicenseKey(undefined);
		overrideNextShowInfoBox("Info");
		await licMgr.initialize(tasks);
		await sleep(1000);
		await closeActiveDocuments();
		licMgr.setLicenseKey(licenseKey);
	});


	test("License not now", async () =>
	{
		const licenseKey = licMgr.getLicenseKey(); // will be set on ext. startup
		licMgr.setLicenseKey(undefined);
		overrideNextShowInfoBox("Not Now");
		await licMgr.initialize(tasks);
		await sleep(1000);
		await closeActiveDocuments();
		licMgr.setLicenseKey(licenseKey);
	});


	test("Enter license key on startup", async () =>
	{
		overrideNextShowInfoBox("Enter License Key");
		overrideNextShowInputBox("1111-2222-3333-4444-5555");
		await licMgr.enterLicenseKey();
		await sleep(1000);

		overrideNextShowInfoBox("Enter License Key");
		overrideNextShowInputBox("");
		await licMgr.enterLicenseKey();
		await sleep(1000);
	});


	test("Multi projects startup", async () =>
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
			// await licMgr.initialize(tasks);
			// await sleep(1000);
			// await closeActiveDocuments();
			// licMgr.setLicenseKey(licenseKey);
			// await storage.update("version", version);
			// tasks.pop();
		// }
	});

});
