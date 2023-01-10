/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */

import { ChildProcess, fork } from "child_process";
import { ILicenseManager } from "../../interface/licenseManager";
import { storage } from "../../lib/utils/storage";
import { IExplorerApi, ITaskExplorerApi } from "@spmeesseman/vscode-taskexplorer-types";
import { getLicenseManager } from "../../extension";
import { Task } from "vscode";
import {
	activate, closeActiveDocument, overrideNextShowInfoBox,
	overrideNextShowInputBox, sleep, executeTeCommand, focusExplorerView, getWsPath
} from "../helper";
import { testControl } from "../control";


let teApi: ITaskExplorerApi;
let explorer: IExplorerApi;
let licMgr: ILicenseManager;
let tasks: Task[] = [];
let setTasksCallCount = 0;
let lsProcess: ChildProcess;


suite("License Manager Tests", () =>
{
	let licenseKey: string | undefined;
	let oLicenseKey: string | undefined;
	let version: string;
	let oVersion: string | undefined;


	suiteSetup(async function()
	{
        teApi = await activate(this);
        explorer = teApi.testsApi.explorer;
		oLicenseKey = storage.get<string>("license_key");
		oVersion = storage.get<string>("version");
	});


	suiteTeardown(async function()
    {
		await closeActiveDocument();
		if (lsProcess) {
			lsProcess.send("close");
			await sleep(500);
		}
		if (oLicenseKey) {
			await storage.update("license_key", oLicenseKey);
		}
		if (oVersion) {
			await storage.update("version", oLicenseKey);
		}
	});


	test("Activate Tree (Focus Explorer View)", async function()
	{
		await focusExplorerView(this);
	});


	test("Get License Manager", async function()
	{
		licMgr = getLicenseManager();
		tasks = explorer.getTasks() || [];
		await licMgr.setTasks(tasks, "");
		await licMgr.setTasks(tasks);
	});


	test("Clear License Key", async function()
	{
		this.slow((testControl.slowTime.storageRead * 2) + testControl.slowTime.storageUpdate);
		licenseKey = licMgr.getLicenseKey();
		version = licMgr.getVersion(); // will be set on ext. startup
		await licMgr.setLicenseKey(undefined);
	});


	test("License Info Page - View Report (From Webview)", async function()
	{
		this.slow(testControl.slowTime.licenseMgrOpenPage);
		await storage.update("version", undefined);
		await setTasks();
		await licMgr.getWebviewPanel()?.webview.postMessage({ command: "viewReport" });
		await sleep(400);
		await closeActiveDocument();
	});


	test("License Info Page - Enter License Key (From Webview)", async function()
	{
		this.slow(testControl.slowTime.licenseMgrOpenPage);
		await storage.update("version", undefined);
		await setTasks();
		overrideNextShowInputBox("1234-5678-9098-0000000");
		await licMgr.getWebviewPanel()?.webview.postMessage({ command: "enterLicense" });
		await sleep(400);
		await closeActiveDocument();
	});


	test("Has License", async function()
	{   //
		// Has license
		// 1111-2222-3333-4444-5555 for now.  When lic server is done, it will fail
		//
		this.slow(testControl.slowTime.licenseMgrOpenPage);
		licMgr.setLicenseKey("1234-5678-9098-7654321");
		await licMgr.checkLicense();
		await licMgr.setTasks(tasks);
		await sleep(400);
		await closeActiveDocument();
		await licMgr.setLicenseKey(licenseKey);
	});


	test("License Prompt (Enter Valid Key)", async function()
	{   //
		// If version is set, the prompt will show
		//
		this.slow(testControl.slowTime.licenseMgrOpenPage);
		await storage.update("version", undefined);
		overrideNextShowInfoBox("Enter License Key");
		overrideNextShowInputBox("1234-5678-9098-7654321");
		await setTasks();
		await sleep(400);
		await closeActiveDocument();
	});


	test("License Prompt (Enter Invalid Key)", async function()
	{   //
		// If version is set, the prompt will show
		//
		this.slow(testControl.slowTime.licenseMgrOpenPage);
		overrideNextShowInfoBox("Enter License Key");
		overrideNextShowInputBox("1111-2222-3333-4444-5555");
		await storage.update("version", undefined);
		await setTasks();
		await sleep(400);
		await closeActiveDocument();
	});


	test("License Page w/ No License Key", async function()
	{   //
		// If version is 'not' set, the lic page will show
		//
		this.slow(testControl.slowTime.licenseMgrOpenPage);
		await storage.update("version", undefined);
		await licMgr.checkLicense();
		await setTasks();
		await sleep(400);
		await closeActiveDocument();
	});


	test("License Page w/ Set License Key", async function()
	{
		this.slow(testControl.slowTime.licenseMgrOpenPage);
		licenseKey = licMgr.getLicenseKey();
		//
		// If license is set, diff info page
		//
		await licMgr.setLicenseKey(licenseKey);
		await licMgr.checkLicense();
		await setTasks();
		await sleep(400);
		await closeActiveDocument();
	});


	test("License Page w/ Set License Key", async function()
	{
		this.slow(testControl.slowTime.licenseMgrOpenPage);
		const licenseKey = licMgr.getLicenseKey(),
			  version = licMgr.getVersion(); // will be set on ext. startup
		//
		await storage.update("version", version);
		await licMgr.checkLicense();
		await setTasks();
		await sleep(400);
		await closeActiveDocument();
		//
		// Reset
		//
		await licMgr.setLicenseKey(licenseKey);
		await storage.update("version", version);
	});


	test("License Page w/ Set License Key", async function()
	{
		this.slow(testControl.slowTime.licenseMgrOpenPage);
		const licenseKey = licMgr.getLicenseKey(),
			  version = licMgr.getVersion(); // will be set on ext. startup
		//
		await storage.update("version", version);
		await licMgr.checkLicense();
		await setTasks();
		await sleep(400);
		await closeActiveDocument();
		//
		// Reset
		//
		await licMgr.setLicenseKey(licenseKey);
		await storage.update("version", version);
	});


	test("Reset License Manager", async function()
	{
		this.slow(testControl.slowTime.storageUpdate * 2);
		await licMgr.setLicenseKey(licenseKey);
		await storage.update("version", version);
	});



	test("License info", async function()
	{
		this.slow(testControl.slowTime.licenseMgrOpenPage);
		const licenseKey = licMgr.getLicenseKey(); // will be set on ext. startup
		await licMgr.setLicenseKey(undefined);
		overrideNextShowInfoBox("Info");
		overrideNextShowInfoBox("");
		await setTasks();
		await sleep(400);
		await closeActiveDocument();
		await licMgr.setLicenseKey(licenseKey);
	});


	test("License not now", async function()
	{
		this.slow(testControl.slowTime.licenseMgrOpenPage);
		const licenseKey = licMgr.getLicenseKey(); // will be set on ext. startup
		await licMgr.setLicenseKey(undefined);
		overrideNextShowInfoBox("Not Now");
		await setTasks();
		await sleep(400);
		await closeActiveDocument();
		await licMgr.setLicenseKey(licenseKey);
	});


	test("Enter License key on Startup", async function()
	{
		this.slow((testControl.slowTime.licenseMgrOpenPage * 2) + 800);
		overrideNextShowInfoBox("Enter License Key");
		overrideNextShowInputBox("1111-2222-3333-4444-5555");
		await licMgr.enterLicenseKey();
		await sleep(400);
		overrideNextShowInfoBox("Enter License Key");
		overrideNextShowInputBox("");
		await setTasks();
		await sleep(400);
	});


	test("Enter License Key by Command Pallette", async function()
	{
		this.slow(testControl.slowTime.licenseMgrOpenPage * 3);
		overrideNextShowInfoBox("Enter License Key");
		overrideNextShowInputBox("1234-5678-9098-7654321");
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
		this.slow(testControl.slowTime.licenseMgrOpenPage);
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


	test("Start License Server", async function()
	{
		this.slow(testControl.slowTime.licenseManagerLocalStartServer);
		lsProcess = fork("spm-license-server.js", {
			cwd: getWsPath("../../spm-license-server/bin"), detached: true,
		});
		await sleep(3500);
	});


	test("Enter License key on Startup (1st time, Server Live)", async function()
	{
		this.slow(testControl.slowTime.licenseManagerLocalCheck);
		await storage.update("version", undefined);
		const licenseKey = licMgr.getLicenseKey();
		await licMgr.setLicenseKey("1234-5678-9098-7654321");
		await licMgr.checkLicense();
		await setTasks();
		await licMgr.setLicenseKey(licenseKey);
	});


	test("Enter License key on Startup (> 1st time, Server Live)", async function()
	{
		this.slow(testControl.slowTime.licenseManagerLocalCheck);
		const licenseKey = licMgr.getLicenseKey();
		await licMgr.setLicenseKey("1234-5678-9098-7654321");
		await licMgr.checkLicense();
		await setTasks();
		await licMgr.setLicenseKey(licenseKey);
	});


	test("Invalid License key (Server Live)", async function()
	{
		this.slow(testControl.slowTime.licenseManagerLocalCheck);
		const licenseKey = licMgr.getLicenseKey();
		await licMgr.setLicenseKey("1234-5678-9098-1234567");
		await licMgr.checkLicense();
		await setTasks();
		await licMgr.setLicenseKey(licenseKey);
	});

});


async function setTasks()
{
	let removed: Task | undefined;
	if (++setTasksCallCount % 2 === 1) {
		removed = tasks.pop();
	}
	await licMgr.setTasks(tasks);
	if (removed) {
		tasks.push(removed);
	}
}
