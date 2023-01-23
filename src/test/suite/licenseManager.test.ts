/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */

import * as utils from "../utils/utils";
import { expect } from "chai";
// import { ChildProcess, fork } from "child_process";
import { ILicenseManager } from "../../interface/ILicenseManager";
import { getLicenseManager } from "../../extension";
import { Task } from "vscode";
import { testControl } from "../control";
import { ITaskExplorer, ITaskExplorerApi } from "@spmeesseman/vscode-taskexplorer-types";


const licMgrMaxFreeTasks = 500;             // Should be set to what the constants are in lib/licenseManager
const licMgrMaxFreeTaskFiles = 100;         // Should be set to what the constants are in lib/licenseManager
const licMgrMaxFreeTasksForTaskType = 100;  // Should be set to what the constants are in lib/licenseManager
const licMgrMaxFreeTasksForScriptType = 50; // Should be set to what the constants are in lib/licenseManager

let teApi: ITaskExplorerApi;
let explorer: ITaskExplorer;
let licMgr: ILicenseManager;
let tasks: Task[] = [];
let setTasksCallCount = 0;
// let lsProcess: ChildProcess | undefined;


suite("License Manager Tests", () =>
{
	let licenseKey: string | undefined;
	let oLicenseKey: string | undefined;
	let version: string;
	let oVersion: string | undefined;


	suiteSetup(async function()
	{   //
		// The LetsEncrypt certificate is rejected by VSCode/Electron Test Suite (?).
		// See https://github.com/electron/electron/issues/31212.
		// Works fine when debugging, works fine when the extension is installed, just fails in the
		// tests with the "certificate is expired" error as explained in the link above.  For tests,
		// and until this is resolved in vscode/test-electron (I think that's wherethe problem is?),
		// we just disable TLS_REJECT_UNAUTHORIZED in the NodeJS environment.
		//
		process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
        ({ teApi } = await utils.activate(this));
        explorer = teApi.testsApi.explorer;
		oLicenseKey = teApi.testsApi.storage.get<string>("license_key");
		oVersion = teApi.testsApi.storage.get<string>("version");
        utils.endRollingCount(this);
	});


	suiteTeardown(async function()
    {
		teApi.setTests(true);
		licMgr?.dispose();
		await utils.closeActiveDocument();
		process.env.NODE_TLS_REJECT_UNAUTHORIZED = undefined;
/*
		if (lsProcess) { // shut down local server
			lsProcess.send("close");
			await utils.sleep(500);
		}
*/
		if (oLicenseKey) {
			await teApi.testsApi.storage.update("license_key", oLicenseKey);
		}
		if (oVersion) {
			await teApi.testsApi.storage.update("version", oLicenseKey);
		}
		licMgr?.setUseGlobalLicense(true, {
			maxFreeTasks: licMgrMaxFreeTasks,
			maxFreeTaskFiles: licMgrMaxFreeTaskFiles,
			maxFreeTasksForTaskType: licMgrMaxFreeTasksForTaskType,
			maxFreeTasksForScriptType: licMgrMaxFreeTasksForScriptType
		});
		utils.clearOverrideShowInfoBox();
		utils.clearOverrideShowInputBox();
        utils.suiteFinished(this);
	});


	test("Focus Tree View", async function()
	{
        if (utils.exitRollingCount(this)) return;
		if (utils.needsTreeBuild(true)) {
            await utils.focusExplorerView(this);
		}
        utils.endRollingCount(this);
	});


	test("Get License Manager", async function()
	{
        if (utils.exitRollingCount(this)) return;
		licMgr = getLicenseManager();
		tasks = explorer.getTasks();
		await licMgr.setTasks(tasks, "");
		await licMgr.setTasks(tasks);
		licMgr.dispose();
        utils.endRollingCount(this);
	});


	test("Clear License Key", async function()
	{
        if (utils.exitRollingCount(this)) return;
		this.slow((testControl.slowTime.storageRead * 2) + testControl.slowTime.storageUpdate);
		licenseKey = licMgr.getLicenseKey();
		version = licMgr.getVersion(); // will be set on ext. startup
		await licMgr.setLicenseKey(undefined);
        utils.endRollingCount(this);
	});


	test("Get Maximum # of Tasks", async function()
	{
        if (utils.exitRollingCount(this)) return;
		await utils.setLicensed(true, licMgr);
		expect(licMgr.getMaxNumberOfTasks()).to.be.a("number").that.is.equal(Infinity);
		await utils.setLicensed(false, licMgr);
		expect(licMgr.getMaxNumberOfTasks()).to.be.a("number").that.is.equal(licMgrMaxFreeTasks);
        utils.endRollingCount(this);
	});


	test("Get Maximum # of NPM Tasks", async function()
	{
        if (utils.exitRollingCount(this)) return;
		await utils.setLicensed(true, licMgr);
		expect(licMgr.getMaxNumberOfTasks("npm")).to.be.a("number").that.is.equal(Infinity);
		await utils.setLicensed(false, licMgr);
		expect(licMgr.getMaxNumberOfTasks("npm")).to.be.a("number").that.is.equal(licMgrMaxFreeTasksForTaskType);
        utils.endRollingCount(this);
	});


	test("Get Maximum # of Ant Tasks", async function()
	{
        if (utils.exitRollingCount(this)) return;
		await utils.setLicensed(true, licMgr);
		expect(licMgr.getMaxNumberOfTasks("ant")).to.be.a("number").that.is.equal(Infinity);
		await utils.setLicensed(false, licMgr);
		expect(licMgr.getMaxNumberOfTasks("ant")).to.be.a("number").that.is.equal(licMgrMaxFreeTasksForTaskType);
        utils.endRollingCount(this);
	});


	test("Get Maximum # of Bash Tasks (Scripts)", async function()
	{
        if (utils.exitRollingCount(this)) return;
		await utils.setLicensed(true, licMgr);
		expect(licMgr.getMaxNumberOfTasks("bash")).to.be.a("number").that.is.equal(Infinity);
		await utils.setLicensed(false, licMgr);
		expect(licMgr.getMaxNumberOfTasks("bash")).to.be.a("number").that.is.equal(licMgrMaxFreeTasksForScriptType);
        utils.endRollingCount(this);
	});


	test("Get Maximum # of Python Tasks (Scripts)", async function()
	{
        if (utils.exitRollingCount(this)) return;
		await utils.setLicensed(true, licMgr);
		expect(licMgr.getMaxNumberOfTasks("python")).to.be.a("number").that.is.equal(Infinity);
		await utils.setLicensed(false, licMgr);
		expect(licMgr.getMaxNumberOfTasks("python")).to.be.a("number").that.is.equal(licMgrMaxFreeTasksForScriptType);
        utils.endRollingCount(this);
	});


	test("Get Maximum # of Task Files", async function()
	{
        if (utils.exitRollingCount(this)) return;
		await utils.setLicensed(true, licMgr);
		expect(licMgr.getMaxNumberOfTaskFiles()).to.be.a("number").that.is.equal(Infinity);
		await utils.setLicensed(false, licMgr);
		expect(licMgr.getMaxNumberOfTaskFiles()).to.be.a("number").that.is.equal(licMgrMaxFreeTaskFiles);
        utils.endRollingCount(this);
	});


	test("License Info Page - View Report (From Webview)", async function()
	{
        if (utils.exitRollingCount(this)) return;
		this.slow(testControl.slowTime.licenseMgrOpenPageWithDetail + 550 + (testControl.slowTime.storageUpdate * 2));
		await utils.setLicensed(false, licMgr);
		await teApi.testsApi.storage.update("version", undefined);
		await teApi.testsApi.storage.update("lastLicenseNag", undefined);
		await setTasks();
		await utils.sleep(50);
		await licMgr.getWebviewPanel()?.webview.postMessage({ command: "viewReport" });
		await utils.sleep(500);
		licMgr.dispose();
		await utils.closeActiveDocument();
        utils.endRollingCount(this);
	});


	test("License Info Page - Enter License Key (From Webview)", async function()
	{
        if (utils.exitRollingCount(this)) return;
		this.slow(testControl.slowTime.licenseMgrOpenPage + 550 + (testControl.slowTime.storageUpdate * 2));
		await teApi.testsApi.storage.update("version", undefined);
		await setTasks();
		await utils.sleep(50);
		utils.overrideNextShowInputBox("1234-5678-9098-0000000");
		await licMgr.getWebviewPanel()?.webview.postMessage({ command: "enterLicense" });
		await utils.sleep(500);
		licMgr.dispose();
		await utils.closeActiveDocument();
        utils.endRollingCount(this);
	});


	test("Has License", async function()
	{
        if (utils.exitRollingCount(this)) return;
		this.slow(testControl.slowTime.licenseMgrOpenPage + (testControl.slowTime.storageUpdate * 2) + 400);
		teApi.setTests(false);
		await licMgr.setLicenseKey("1234-5678-9098-7654321");
		await licMgr.checkLicense();
		teApi.setTests(true);
		await licMgr.setTasks(tasks);
		await utils.sleep(400);
		licMgr.dispose();
		await utils.closeActiveDocument();
		await licMgr.setLicenseKey(licenseKey);
        utils.endRollingCount(this);
	});


	test("License Prompt (Enter Valid Key)", async function()
	{
        if (utils.exitRollingCount(this)) return;
		//
		// If version is set, the prompt will show
		//
		this.slow(testControl.slowTime.licenseMgrOpenPage + 400);
		await teApi.testsApi.storage.update("lastLicenseNag", undefined);
		utils.overrideNextShowInfoBox("Enter License Key");
		utils.overrideNextShowInputBox("1234-5678-9098-7654321");
		await setTasks();
		await utils.sleep(400);
		licMgr.dispose();
		await utils.closeActiveDocument();
        utils.endRollingCount(this);
	});


	test("License Prompt (Enter Invalid Key)", async function()
	{
        if (utils.exitRollingCount(this)) return;
		//
		// If version is set, the prompt will show
		//
		this.slow(testControl.slowTime.licenseMgrOpenPage + 400);
		await teApi.testsApi.storage.update("lastLicenseNag", undefined);
		utils.overrideNextShowInfoBox("Enter License Key");
		utils.overrideNextShowInputBox("1111-2222-3333-4444-5555");
		await setTasks();
		await utils.sleep(400);
		licMgr.dispose();
		await utils.closeActiveDocument();
        utils.endRollingCount(this);
	});


	test("License Page w/ No License Key", async function()
	{
        if (utils.exitRollingCount(this)) return;
		//
		// If version is 'not' set, the lic page will show
		//
		this.slow(testControl.slowTime.licenseMgrOpenPage + 400);
		await teApi.testsApi.storage.update("version", undefined);
		await licMgr.checkLicense();
		await setTasks();
		await utils.sleep(400);
		licMgr.dispose();
		await utils.closeActiveDocument();
        utils.endRollingCount(this);
	});


	test("License Page w/ Set License Key", async function()
	{
        if (utils.exitRollingCount(this)) return;
		this.slow(testControl.slowTime.licenseMgrOpenPage + testControl.slowTime.storageUpdate + 400);
		licenseKey = licMgr.getLicenseKey();
		//
		// If license is set, diff info page
		//
		await licMgr.setLicenseKey(licenseKey);
		await licMgr.checkLicense();
		await setTasks();
		await utils.sleep(400);
		licMgr.dispose();
		await utils.closeActiveDocument();
        utils.endRollingCount(this);
	});


	test("License Page w/ Set License Key", async function()
	{
        if (utils.exitRollingCount(this)) return;
		this.slow(testControl.slowTime.licenseMgrOpenPage + testControl.slowTime.storageUpdate + 400);
		const licenseKey = licMgr.getLicenseKey(),
			  version = licMgr.getVersion(); // will be set on ext. startup
		//
		await teApi.testsApi.storage.update("version", version);
		await licMgr.checkLicense();
		await setTasks();
		await utils.sleep(400);
		licMgr.dispose();
		await utils.closeActiveDocument();
		//
		// Reset
		//
		await licMgr.setLicenseKey(licenseKey);
		await teApi.testsApi.storage.update("version", version);
        utils.endRollingCount(this);
	});


	test("License Page w/ Set License Key", async function()
	{
        if (utils.exitRollingCount(this)) return;
		this.slow(testControl.slowTime.licenseMgrOpenPage + testControl.slowTime.storageUpdate + 400);
		const licenseKey = licMgr.getLicenseKey(),
			  version = licMgr.getVersion(); // will be set on ext. startup
		//
		await teApi.testsApi.storage.update("version", version);
		await licMgr.checkLicense();
		await setTasks();
		await utils.sleep(400);
		licMgr.dispose();
		await utils.closeActiveDocument();
		//
		// Reset
		//
		await licMgr.setLicenseKey(licenseKey);
		await teApi.testsApi.storage.update("version", version);
        utils.endRollingCount(this);
	});


	test("Reset License Manager", async function()
	{
        if (utils.exitRollingCount(this)) return;
		this.slow(testControl.slowTime.storageUpdate * 2);
		await licMgr.setLicenseKey(licenseKey);
		await teApi.testsApi.storage.update("version", version);
        utils.endRollingCount(this);
	});



	test("License Info", async function()
	{
        if (utils.exitRollingCount(this)) return;
		this.slow(testControl.slowTime.licenseMgrOpenPage + testControl.slowTime.storageUpdate + 400);
		await teApi.testsApi.storage.update("lastLicenseNag", undefined);
		const licenseKey = licMgr.getLicenseKey(); // will be set on ext. startup
		await licMgr.setLicenseKey(undefined);
		utils.overrideNextShowInfoBox("Info");
		await setTasks();
		await utils.sleep(400);
		licMgr.dispose();
		await utils.closeActiveDocument();
		await licMgr.setLicenseKey(licenseKey);
        utils.endRollingCount(this);
	});


	test("License Not Now", async function()
	{
        if (utils.exitRollingCount(this)) return;
		this.slow(testControl.slowTime.licenseMgrOpenPage + testControl.slowTime.storageUpdate + 400);
		const licenseKey = licMgr.getLicenseKey(); // will be set on ext. startup
		await licMgr.setLicenseKey(undefined);
		utils.overrideNextShowInfoBox("Not Now");
		await setTasks();
		await utils.sleep(400);
		licMgr.dispose();
		await utils.closeActiveDocument();
		await licMgr.setLicenseKey(licenseKey);
        utils.endRollingCount(this);
	});



	test("License Cancel", async function()
	{
        if (utils.exitRollingCount(this)) return;
		this.slow(testControl.slowTime.licenseMgrOpenPage + testControl.slowTime.storageUpdate + 400);
		await teApi.testsApi.storage.update("lastLicenseNag", undefined);
		const licenseKey = licMgr.getLicenseKey(); // will be set on ext. startup
		await licMgr.setLicenseKey(undefined);
		utils.overrideNextShowInfoBox(undefined);
		await setTasks();
		await utils.sleep(400);
		licMgr.dispose();
		await utils.closeActiveDocument();
		await licMgr.setLicenseKey(licenseKey);
        utils.endRollingCount(this);
	});


	test("Enter License key on Startup", async function()
	{
        if (utils.exitRollingCount(this)) return;
		this.slow((testControl.slowTime.licenseMgrOpenPage * 2) + 800);
		utils.overrideNextShowInfoBox("Enter License Key");
		utils.overrideNextShowInputBox("1111-2222-3333-4444-5555");
		await licMgr.enterLicenseKey();
		await utils.sleep(400);
		utils.overrideNextShowInfoBox("Enter License Key");
		utils.overrideNextShowInputBox("");
		await setTasks();
		await utils.sleep(400);
        utils.endRollingCount(this);
	});


	test("Enter License Key by Command Pallette", async function()
	{
        if (utils.exitRollingCount(this)) return;
		this.slow((testControl.slowTime.licenseMgrOpenPage * 3) + (testControl.waitTime.command * 6));
		utils.overrideNextShowInfoBox("Enter License Key");
		utils.overrideNextShowInputBox("1234-5678-9098-7654321");
		await utils.executeTeCommand("enterLicense", testControl.waitTime.command * 2);
		utils.overrideNextShowInfoBox("Enter License Key");
		utils.overrideNextShowInputBox("");
		await utils.executeTeCommand("enterLicense", testControl.waitTime.command * 2, 1100, "   ");
		utils.overrideNextShowInfoBox("Enter License Key");
		utils.overrideNextShowInputBox("");
		await utils.executeTeCommand("enterLicense", testControl.waitTime.command * 2, 1100, "   ", 1);
        utils.endRollingCount(this);
	});


// 	test("Multi projects startup", async function()
// 	{
//         if (utils.exitRollingCount(this)) return;
// 		this.slow(testControl.slowTime.licenseMgrOpenPage + 400);
// 		// if (await pathExists(getProjectPath("extjs-pkg-server")))
// 		// {
// 			// const licenseKey = licMgr.getLicenseKey(),
// 			// 	  version = licMgr.getVersion(),
// 			// 	  fsPath = getProjectPath("extjs-pkg-server/src/csi"),
// 			// 	  files = await utils.findFiles(fsPath, "{classic,modern,src}/**/*.js");
//
// 			// const firstCmp = (await parseFiles(files, "extjs-pkg-server", "extjs-pkg-server"))[0];
// 			// assert(firstCmp);
// 			// tasks.push(firstCmp);
//
// 			// licMgr.setLicenseKey(undefined);
// 			// await teApi.testsApi.storage.update("version", undefined);
// 			// await licMgr.checkLicense();
// 			// await utils.sleep(1000);
// 			// await utils.closeActiveDocument();
// 			// licMgr.setLicenseKey(licenseKey);
// 			// await teApi.testsApi.storage.update("version", version);
// 			// tasks.pop();
// 		// }
//         utils.endRollingCount(this);
// 	});

/*
	test("Ping License Server", async function()
	{
        if (utils.exitRollingCount(this)) return;
		this.slow(testControl.slowTime.licenseManagerRemoteCheck);
		// TODO - Remote license server
        utils.endRollingCount(this);
	});


	test("Start Local License Server", async function()
	{
        if (utils.exitRollingCount(this)) return;
		this.slow(testControl.slowTime.licenseManagerLocalStartServer + (4000 * 2));
		lsProcess = fork("spm-license-server.js", {
			cwd: utils.getWsPath("../../spm-license-server/bin"), detached: true,
		});
		await utils.sleep(4000);
        utils.endRollingCount(this);
	});
*/

	test("Enter License key on Startup (1st Time, Server Live)", async function()
	{
        if (utils.exitRollingCount(this)) return;
		this.slow(testControl.slowTime.licenseManagerLocalCheck + testControl.slowTime.storageUpdate);
		await teApi.testsApi.storage.update("version", undefined);
		const licenseKey = licMgr.getLicenseKey();
		await licMgr.setLicenseKey("1234-5678-9098-7654321");
		await licMgr.checkLicense();
		await setTasks();
		await licMgr.setLicenseKey(licenseKey);
        utils.endRollingCount(this);
	});


	test("Enter License key on Startup (> 1st Time, Server Live)", async function()
	{
        if (utils.exitRollingCount(this)) return;
		this.slow(testControl.slowTime.licenseManagerLocalCheck + testControl.slowTime.storageUpdate);
		const licenseKey = licMgr.getLicenseKey();
		await licMgr.setLicenseKey("1234-5678-9098-7654321");
		await licMgr.checkLicense();
		await setTasks();
		await licMgr.setLicenseKey(licenseKey);
        utils.endRollingCount(this);
	});


	test("Invalid License key (Server Live)", async function()
	{
        if (utils.exitRollingCount(this)) return;
		this.slow(testControl.slowTime.licenseManagerLocalCheck + testControl.slowTime.storageUpdate);
		const licenseKey = licMgr.getLicenseKey();
		await licMgr.setLicenseKey("1234-5678-9098-1234567");
		await licMgr.checkLicense();
		await setTasks();
		await licMgr.setLicenseKey(licenseKey);
        utils.endRollingCount(this);
	});


	test("Task Limit Reached (Non-Licensed)", async function()
	{
        if (utils.exitRollingCount(this)) return;
		this.slow((Math.round(testControl.slowTime.refreshCommand * 0.75)) + testControl.slowTime.storageUpdate);
		await utils.setLicensed(false, licMgr);
		licMgr.setUseGlobalLicense(false, {
			maxFreeTasks: 25,
			maxFreeTaskFiles: licMgrMaxFreeTaskFiles,
			maxFreeTasksForTaskType: licMgrMaxFreeTasksForTaskType,
			maxFreeTasksForScriptType: licMgrMaxFreeTasksForScriptType
		});
		utils.overrideNextShowInfoBox(undefined);
		await utils.treeUtils.refresh();
		expect(explorer.getTasks().length).to.be.equal(25);
        utils.endRollingCount(this);
	});


	test("Task Type Limit Reached (Non-Licensed)", async function()
	{
        if (utils.exitRollingCount(this)) return;
		this.slow(Math.round(testControl.slowTime.refreshCommand * 0.9));
		licMgr.setUseGlobalLicense(false, {
			maxFreeTasks: licMgrMaxFreeTasks,
			maxFreeTaskFiles: licMgrMaxFreeTaskFiles,
			maxFreeTasksForTaskType: 10,
			maxFreeTasksForScriptType: licMgrMaxFreeTasksForScriptType
		});
		utils.overrideNextShowInfoBox(undefined);
		await utils.treeUtils.refresh();
		expect(explorer.getTasks().filter(t => t.source === "gulp").length).to.be.equal(10);
        utils.endRollingCount(this);
	});


	test("Task Script Type Limit Reached (Non-Licensed)", async function()
	{
        if (utils.exitRollingCount(this)) return;
		this.slow(Math.round(testControl.slowTime.refreshCommand * 0.9));
		licMgr.setUseGlobalLicense(false, {
			maxFreeTasks: licMgrMaxFreeTasks,
			maxFreeTaskFiles: licMgrMaxFreeTaskFiles,
			maxFreeTasksForTaskType: licMgrMaxFreeTasksForTaskType,
			maxFreeTasksForScriptType: 1
		});
		utils.overrideNextShowInfoBox(undefined);
		await utils.treeUtils.refresh();
		expect(explorer.getTasks().filter(t => t.source === "batch").length).to.be.equal(1);
        utils.endRollingCount(this);
	});


	test("Task File Limit Reached (Non-Licensed)", async function()
	{
        if (utils.exitRollingCount(this)) return;
		this.slow(Math.round(testControl.slowTime.refreshCommand * 0.9));
		licMgr.setUseGlobalLicense(false, {
			maxFreeTasks: licMgrMaxFreeTasks,
			maxFreeTaskFiles: 5,
			maxFreeTasksForTaskType: licMgrMaxFreeTasksForTaskType,
			maxFreeTasksForScriptType: licMgrMaxFreeTasksForScriptType
		});
		utils.overrideNextShowInfoBox(undefined);
		await utils.treeUtils.refresh();
		expect(teApi.testsApi.fileCache.getTaskFileCount()).to.be.equal(5);
        utils.endRollingCount(this);
	});


	test("Reset Max Limits (Non-Licensed)", async function()
	{
        // Don't utils.exitRollingCount(this)
		if (licMgr)
		{
			this.slow(testControl.slowTime.refreshCommand);
			await utils.setLicensed(true, licMgr);
			licMgr.setUseGlobalLicense(true, {
				maxFreeTasks: licMgrMaxFreeTasks,
				maxFreeTaskFiles: licMgrMaxFreeTaskFiles,
				maxFreeTasksForTaskType: licMgrMaxFreeTasksForTaskType,
				maxFreeTasksForScriptType: licMgrMaxFreeTasksForScriptType
			});
			await utils.treeUtils.refresh();
		}
        utils.endRollingCount(this);
	});

/*
	test("Stop License Server", async function()
	{
		// Don't utils.exitRollingCount(this)
        if (lsProcess)
		{   // shut down local server
			this.slow(1100);
			lsProcess.send("close");
			await utils.sleep(500);
			lsProcess = undefined;
		}
	});
*/
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
