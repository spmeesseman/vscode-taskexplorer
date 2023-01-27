/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */

import * as utils from "../utils/utils";
import { expect } from "chai";
import { Task } from "vscode";
import { ChildProcess, fork } from "child_process";
import { getLicenseManager } from "../../extension";
import { testControl as tc } from "../control";
import { ILicenseManager } from "../../interface/ILicenseManager";
import { executeTeCommand, focusExplorerView } from "../utils/commandUtils";
import { IFilesystemApi, ITaskExplorer, ITaskExplorerApi } from "@spmeesseman/vscode-taskexplorer-types";
import { join } from "path";


const localServerToken = "HjkSgsR55WepsaWYtFoNmRMLiTJS4nKOhgXoPIuhd8zL3CVK694UXNw/n9e1GXiG9U5WiAmjGxAoETapHCjB67G0DkDZnXbbzYICr/tfpVc4NKNy1uM3GHuAVXLeKJQLtUMLfxgXYTJFNMU7H/vTaw==";
const remoteServerToken = "1Ac4qiBjXsNQP82FqmeJ5iH7IIw3Bou7eibskqg+Jg0U6rYJ0QhvoWZ+5RpH/Kq0EbIrZ9874fDG9u7bnrQP3zYf69DFkOSnOmz3lCMwEA85ZDn79P+fbRubTS+eDrbinnOdPe/BBQhVW7pYHxeK28tYuvcJuj0mOjIOz+3ZgTY=";
const licMgrMaxFreeTasks = 500;             // Should be set to what the constants are in lib/licenseManager
const licMgrMaxFreeTaskFiles = 100;         // Should be set to what the constants are in lib/licenseManager
const licMgrMaxFreeTasksForTaskType = 100;  // Should be set to what the constants are in lib/licenseManager
const licMgrMaxFreeTasksForScriptType = 50; // Should be set to what the constants are in lib/licenseManager

let teApi: ITaskExplorerApi;
let fsApi: IFilesystemApi;
let explorer: ITaskExplorer;
let licMgr: ILicenseManager;
let tasks: Task[] = [];
let setTasksCallCount = 0;
let lsProcess: ChildProcess | undefined;

suite("License Manager Tests", () =>
{
	let licenseKey: string | undefined;
	let oLicenseKey: string | undefined;
	let version: string;
	let oVersion: string | undefined;


	suiteSetup(async function()
	{
        if (utils.exitRollingCount(this, true)) return;
		//
		// The LetsEncrypt certificate is rejected by VSCode/Electron Test Suite (?).
		// See https://github.com/electron/electron/issues/31212.
		// TLS cert validation will be disabled in utils.activate()
		// Works fine when debugging, works fine when the extension is installed, just fails in the
		// tests with the "certificate is expired" error as explained in the link above.  For tests,
		// and until this is resolved in vscode/test-electron (I think that's wherethe problem is?),
		// we just disable TLS_REJECT_UNAUTHORIZED in the NodeJS environment.
		//
        ({ teApi, fsApi } = await utils.activate(this));
        explorer = teApi.testsApi.explorer;
		oLicenseKey = teApi.testsApi.storage.get<string>("license_key");
		oVersion = teApi.testsApi.storage.get<string>("version");
        utils.endRollingCount(this, true);
	});


	suiteTeardown(async function()
    {
        if (utils.exitRollingCount(this, false, true)) return;
		teApi.setTests(true);
		licMgr?.dispose();
		await utils.closeEditors();
		if (lsProcess) { // shut down local server
			lsProcess.send("close");
			await utils.sleep(500);
		}
		if (oLicenseKey) {
			await teApi.testsApi.storage.update("license_key", oLicenseKey);
		}
		if (oVersion) {
			await teApi.testsApi.storage.update("version", oLicenseKey);
		}
		licMgr?.setTestData({
			maxFreeTasks: licMgrMaxFreeTasks,
			maxFreeTaskFiles: licMgrMaxFreeTaskFiles,
			maxFreeTasksForTaskType: licMgrMaxFreeTasksForTaskType,
			maxFreeTasksForScriptType: licMgrMaxFreeTasksForScriptType,
			host: "license.spmeesseman.com",
			port: 443,
			token: remoteServerToken
		});
		utils.clearOverrideShowInfoBox();
		utils.clearOverrideShowInputBox();
        utils.suiteFinished(this);
	});


	test("Focus Tree View", async function()
	{
        if (utils.exitRollingCount(this)) return;
		if (utils.needsTreeBuild(true)) {
            await focusExplorerView(this);
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
		this.slow((tc.slowTime.storageRead * 2) + tc.slowTime.storageSecretUpdate);
		licenseKey = await licMgr.getLicenseKey();
		version = licMgr.getVersion(); // will be set on ext. startup
		await licMgr.setLicenseKey(undefined);
        utils.endRollingCount(this);
	});


	test("Get Maximum # of Tasks", async function()
	{
        if (utils.exitRollingCount(this)) return;
		this.slow(tc.slowTime.licenseMgr.getMaxTasks + (tc.slowTime.licenseMgr.setLicenseCmd * 2));
		await setLicensed(true, licMgr);
		expect(licMgr.getMaxNumberOfTasks()).to.be.a("number").that.is.equal(Infinity);
		await setLicensed(false, licMgr);
		expect(licMgr.getMaxNumberOfTasks()).to.be.a("number").that.is.equal(licMgrMaxFreeTasks);
        utils.endRollingCount(this);
	});


	test("Get Maximum # of NPM Tasks", async function()
	{
        if (utils.exitRollingCount(this)) return;
		this.slow(tc.slowTime.licenseMgr.getMaxTasks + (tc.slowTime.licenseMgr.setLicenseCmd * 2));
		await setLicensed(true, licMgr);
		expect(licMgr.getMaxNumberOfTasks("npm")).to.be.a("number").that.is.equal(Infinity);
		await setLicensed(false, licMgr);
		expect(licMgr.getMaxNumberOfTasks("npm")).to.be.a("number").that.is.equal(licMgrMaxFreeTasksForTaskType);
        utils.endRollingCount(this);
	});


	test("Get Maximum # of Ant Tasks", async function()
	{
        if (utils.exitRollingCount(this)) return;
		this.slow(tc.slowTime.licenseMgr.getMaxTasks + (tc.slowTime.licenseMgr.setLicenseCmd * 2));
		await setLicensed(true, licMgr);
		expect(licMgr.getMaxNumberOfTasks("ant")).to.be.a("number").that.is.equal(Infinity);
		await setLicensed(false, licMgr);
		expect(licMgr.getMaxNumberOfTasks("ant")).to.be.a("number").that.is.equal(licMgrMaxFreeTasksForTaskType);
        utils.endRollingCount(this);
	});


	test("Get Maximum # of Bash Tasks (Scripts)", async function()
	{
        if (utils.exitRollingCount(this)) return;
		this.slow(tc.slowTime.licenseMgr.getMaxTasks + (tc.slowTime.licenseMgr.setLicenseCmd * 2));
		await setLicensed(true, licMgr);
		expect(licMgr.getMaxNumberOfTasks("bash")).to.be.a("number").that.is.equal(Infinity);
		await setLicensed(false, licMgr);
		expect(licMgr.getMaxNumberOfTasks("bash")).to.be.a("number").that.is.equal(licMgrMaxFreeTasksForScriptType);
        utils.endRollingCount(this);
	});


	test("Get Maximum # of Python Tasks (Scripts)", async function()
	{
        if (utils.exitRollingCount(this)) return;
		this.slow(tc.slowTime.licenseMgr.getMaxTasks + (tc.slowTime.licenseMgr.setLicenseCmd * 2));
		await setLicensed(true, licMgr);
		expect(licMgr.getMaxNumberOfTasks("python")).to.be.a("number").that.is.equal(Infinity);
		await setLicensed(false, licMgr);
		expect(licMgr.getMaxNumberOfTasks("python")).to.be.a("number").that.is.equal(licMgrMaxFreeTasksForScriptType);
        utils.endRollingCount(this);
	});


	test("Get Maximum # of Task Files", async function()
	{
        if (utils.exitRollingCount(this)) return;
		this.slow(tc.slowTime.licenseMgr.getMaxTasks + (tc.slowTime.licenseMgr.setLicenseCmd * 2));
		await setLicensed(true, licMgr);
		expect(licMgr.getMaxNumberOfTaskFiles()).to.be.a("number").that.is.equal(Infinity);
		await setLicensed(false, licMgr);
		expect(licMgr.getMaxNumberOfTaskFiles()).to.be.a("number").that.is.equal(licMgrMaxFreeTaskFiles);
        utils.endRollingCount(this);
	});


	test("License Info Page - View Report (From Webview)", async function()
	{
        if (utils.exitRollingCount(this)) return;
		this.slow(tc.slowTime.licenseMgr.pageWithDetail + 1100 + (tc.slowTime.storageUpdate * 2) + tc.slowTime.storageSecretUpdate);
		await setLicensed(false, licMgr);
		await teApi.testsApi.storage.update("version", undefined);
		await teApi.testsApi.storage.update("lastLicenseNag", undefined);
		await setTasks();
		await utils.sleep(50);
		await licMgr.getWebviewPanel()?.webview.postMessage({ command: "viewReport" });
		await utils.sleep(500);
		licMgr.dispose();
		await utils.closeEditors();
        utils.endRollingCount(this);
	});


	test("License Info Page - Enter License Key (From Webview)", async function()
	{
        if (utils.exitRollingCount(this)) return;
		this.slow(tc.slowTime.licenseMgr.page + 1100 + tc.slowTime.storageUpdate);
		await teApi.testsApi.storage.update("version", undefined);
		await setTasks();
		await utils.sleep(50);
		utils.overrideNextShowInputBox("1234-5678-9098-0000000");
		await licMgr.getWebviewPanel()?.webview.postMessage({ command: "enterLicense" });
		await utils.sleep(500);
		licMgr.dispose();
		await utils.closeEditors();
        utils.endRollingCount(this);
	});


	test("Has License", async function()
	{
        if (utils.exitRollingCount(this)) return;
		this.slow(tc.slowTime.licenseMgr.checkLicense + tc.slowTime.licenseMgr.page + (tc.slowTime.storageSecretUpdate * 2) + 800);
		teApi.setTests(false);
		await licMgr.setLicenseKey("1234-5678-9098-7654321");
		await licMgr.checkLicense();
		teApi.setTests(true);
		await licMgr.setTasks(tasks);
		await utils.sleep(400);
		licMgr.dispose();
		await utils.closeEditors();
		await licMgr.setLicenseKey(licenseKey);
        utils.endRollingCount(this);
	});


	test("License Prompt (Enter Valid Key)", async function()
	{
        if (utils.exitRollingCount(this)) return;
		this.slow(tc.slowTime.licenseMgr.page + 800);
		await teApi.testsApi.storage.update("lastLicenseNag", undefined);
		utils.overrideNextShowInfoBox("Enter License Key");
		utils.overrideNextShowInputBox("1234-5678-9098-7654321");
		await setTasks();
		await utils.sleep(400);
		licMgr.dispose();
		await utils.closeEditors();
        utils.endRollingCount(this);
	});


	test("License Prompt (Enter Invalid Key)", async function()
	{
        if (utils.exitRollingCount(this)) return;
		this.slow(tc.slowTime.licenseMgr.page + tc.slowTime.storageUpdate + 800);
		await teApi.testsApi.storage.update("lastLicenseNag", undefined);
		utils.overrideNextShowInfoBox("Enter License Key");
		utils.overrideNextShowInputBox("1111-2222-3333-4444-5555");
		await setTasks();
		await utils.sleep(400);
		licMgr.dispose();
		await utils.closeEditors();
        utils.endRollingCount(this);
	});


	test("License Page w/ No License Key", async function()
	{
        if (utils.exitRollingCount(this)) return;
		this.slow(tc.slowTime.licenseMgr.page + tc.slowTime.storageUpdate + tc.slowTime.licenseMgr.checkLicense + 800);
		await teApi.testsApi.storage.update("version", undefined);
		await licMgr.checkLicense();
		await setTasks();
		await utils.sleep(400);
		licMgr.dispose();
		await utils.closeEditors();
        utils.endRollingCount(this);
	});


	test("License Page w/ Set License Key", async function()
	{
        if (utils.exitRollingCount(this)) return;
		this.slow(tc.slowTime.licenseMgr.page + tc.slowTime.storageSecretRead + tc.slowTime.storageSecretUpdate +
			      tc.slowTime.licenseMgr.checkLicense + 800);
		licenseKey = await licMgr.getLicenseKey();
		//
		// If license is set, diff info page
		//
		await licMgr.setLicenseKey(licenseKey);
		await licMgr.checkLicense();
		await setTasks();
		await utils.sleep(400);
		licMgr.dispose();
		await utils.closeEditors();
        utils.endRollingCount(this);
	});


	test("License Page w/ Set License Key", async function()
	{
        if (utils.exitRollingCount(this)) return;
		this.slow(tc.slowTime.licenseMgr.page + tc.slowTime.storageSecretRead + tc.slowTime.licenseMgr.checkLicense +
			      tc.slowTime.storageSecretUpdate + (tc.slowTime.storageUpdate * 2) + 800);
		const licenseKey = await licMgr.getLicenseKey(),
			  version = licMgr.getVersion(); // will be set on ext. startup
		//
		await teApi.testsApi.storage.update("version", version);
		await licMgr.checkLicense();
		await setTasks();
		await utils.sleep(400);
		licMgr.dispose();
		await utils.closeEditors();
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
		this.slow(tc.slowTime.licenseMgr.page + tc.slowTime.storageSecretRead + tc.slowTime.licenseMgr.checkLicense +
				  tc.slowTime.storageSecretUpdate + tc.slowTime.storageUpdate + 800);
		const licenseKey = await licMgr.getLicenseKey(),
			  version = licMgr.getVersion(); // will be set on ext. startup
		//
		await teApi.testsApi.storage.update("version", version);
		await licMgr.checkLicense();
		await setTasks();
		await utils.sleep(400);
		licMgr.dispose();
		await utils.closeEditors();
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
		this.slow(tc.slowTime.storageUpdate + tc.slowTime.storageSecretUpdate);
		await licMgr.setLicenseKey(licenseKey);
		await teApi.testsApi.storage.update("version", version);
        utils.endRollingCount(this);
	});



	test("License Info", async function()
	{
        if (utils.exitRollingCount(this)) return;
		this.slow(tc.slowTime.licenseMgr.page + tc.slowTime.storageSecretRead + tc.slowTime.storageUpdate + tc.slowTime.storageSecretUpdate + 800);
		await teApi.testsApi.storage.update("lastLicenseNag", undefined);
		const licenseKey = await licMgr.getLicenseKey(); // will be set on ext. startup
		await licMgr.setLicenseKey(undefined);
		utils.overrideNextShowInfoBox("Info");
		await setTasks();
		await utils.sleep(400);
		licMgr.dispose();
		await licMgr.setLicenseKey(licenseKey);
		await utils.closeEditors();
        utils.endRollingCount(this);
	});


	test("License Not Now", async function()
	{
        if (utils.exitRollingCount(this)) return;
		this.slow(tc.slowTime.licenseMgr.page + tc.slowTime.storageSecretRead + tc.slowTime.storageSecretUpdate + 800);
		const licenseKey = await licMgr.getLicenseKey(); // will be set on ext. startup
		await licMgr.setLicenseKey(undefined);
		utils.overrideNextShowInfoBox("Not Now");
		await setTasks();
		await utils.sleep(400);
		licMgr.dispose();
		await licMgr.setLicenseKey(licenseKey);
		await utils.closeEditors();
        utils.endRollingCount(this);
	});



	test("License Cancel", async function()
	{
        if (utils.exitRollingCount(this)) return;
		this.slow(tc.slowTime.licenseMgr.page + tc.slowTime.storageSecretRead + tc.slowTime.storageUpdate + tc.slowTime.storageSecretUpdate + 800);
		await teApi.testsApi.storage.update("lastLicenseNag", undefined);
		const licenseKey = await licMgr.getLicenseKey(); // will be set on ext. startup
		await licMgr.setLicenseKey(undefined);
		utils.overrideNextShowInfoBox(undefined);
		await setTasks();
		await utils.sleep(400);
		licMgr.dispose();
		await utils.closeEditors();
		await licMgr.setLicenseKey(licenseKey);
        utils.endRollingCount(this);
	});


	test("Enter License Key on Startup", async function()
	{
        if (utils.exitRollingCount(this)) return;
		this.slow((tc.slowTime.licenseMgr.enterKey * 2) + 1600);
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
		this.slow(tc.slowTime.licenseMgr.enterKey * 3);
		utils.overrideNextShowInfoBox("Enter License Key");
		utils.overrideNextShowInputBox("1234-5678-9098-7654321");
		await executeTeCommand("enterLicense", tc.waitTime.command * 2);
		utils.overrideNextShowInfoBox("Enter License Key");
		utils.overrideNextShowInputBox("");
		await executeTeCommand("enterLicense", tc.waitTime.command * 2, 1100, "   ");
		utils.overrideNextShowInfoBox("Enter License Key");
		utils.overrideNextShowInputBox("");
		await executeTeCommand("enterLicense", tc.waitTime.command * 2, 1100, "   ", 1);
        utils.endRollingCount(this);
	});


// 	test("Multi projects startup", async function()
// 	{
//         if (utils.exitRollingCount(this)) return;
// 		this.slow(tc.slowTime.licenseMgr.page + 400);
// 		// if (await pathExists(getProjectPath("extjs-pkg-server")))
// 		// {
// 			// const licenseKey = await licMgr.getLicenseKey(),
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
// 			// await utils.closeEditors();
// 			// licMgr.setLicenseKey(licenseKey);
// 			// await teApi.testsApi.storage.update("version", version);
// 			// tasks.pop();
// 		// }
//         utils.endRollingCount(this);
// 	});


	test("Enter License Key on Startup (1st Time, Remote Server)", async function()
	{
        if (utils.exitRollingCount(this)) return;
		this.slow(tc.slowTime.licenseMgr.page + tc.slowTime.licenseMgr.checkLicense +
			      tc.slowTime.storageUpdate + tc.slowTime.storageSecretUpdate);
		await teApi.testsApi.storage.update("version", undefined);
		const licenseKey = await licMgr.getLicenseKey();
		await licMgr.setLicenseKey("1234-5678-9098-7654321");
		await licMgr.checkLicense();
		await setTasks();
		await licMgr.setLicenseKey(licenseKey);
        utils.endRollingCount(this);
	});


	test("Enter License Key on Startup (> 1st Time, Remote Server)", async function()
	{
        if (utils.exitRollingCount(this)) return;
		this.slow(tc.slowTime.licenseMgr.checkLicense + tc.slowTime.storageUpdate + tc.slowTime.storageSecretUpdate);
		const licenseKey = await licMgr.getLicenseKey();
		await licMgr.setLicenseKey("1234-5678-9098-7654321");
		await licMgr.checkLicense();
		await setTasks();
		await licMgr.setLicenseKey(licenseKey);
        utils.endRollingCount(this);
	});


	test("Invalid License Key (Remote Server)", async function()
	{
        if (utils.exitRollingCount(this)) return;
		this.slow(tc.slowTime.licenseMgr.checkLicense + tc.slowTime.storageUpdate + tc.slowTime.storageSecretUpdate);
		const licenseKey = await licMgr.getLicenseKey();
		await licMgr.setLicenseKey("1234-5678-9098-1234567");
		await licMgr.checkLicense();
		await setTasks();
		await licMgr.setLicenseKey(licenseKey);
        utils.endRollingCount(this);
	});


	test("Start Local License Server", async function()
	{
		const localServerPath = utils.getWsPath("../../../spm-license-server/bin");
        if (utils.exitRollingCount(this)) return;
		if (await fsApi.pathExists(join(localServerPath, "/spm-license-server.js")))
		{
			this.slow(tc.slowTime.licenseMgr.localStartServer + 9000);
			lsProcess = fork("spm-license-server.js", {
				cwd: utils.getWsPath("../../../spm-license-server/bin"), detached: true,
			});
			await utils.sleep(4500);
		}
        utils.endRollingCount(this);
	});


	test("Enter License Key on Startup (1st Time, Local Server)", async function()
	{
        if (utils.exitRollingCount(this)) return;
		if (lsProcess)
		{
			this.slow(tc.slowTime.licenseMgr.page + tc.slowTime.licenseMgr.checkLicense + tc.slowTime.storageSecretRead +
					  tc.slowTime.storageUpdate + (tc.slowTime.storageSecretUpdate * 2));
			licMgr.setTestData({
				host: "localhost",
				port: 485,
				token: localServerToken
			});
			await teApi.testsApi.storage.update("version", undefined);
			const licenseKey = await licMgr.getLicenseKey();
			await licMgr.setLicenseKey("1234-5678-9098-7654321");
			await licMgr.checkLicense();
			await setTasks();
			await licMgr.setLicenseKey(licenseKey);
		}
        utils.endRollingCount(this);
	});


	test("Enter License Key on Startup (> 1st Time, Local Server)", async function()
	{
        if (utils.exitRollingCount(this)) return;
		if (lsProcess)
		{
			this.slow(tc.slowTime.licenseMgr.checkLicense + tc.slowTime.storageSecretRead + (tc.slowTime.storageSecretUpdate * 2));
			const licenseKey = await licMgr.getLicenseKey();
			await licMgr.setLicenseKey("1234-5678-9098-7654321");
			await licMgr.checkLicense();
			await setTasks();
			await licMgr.setLicenseKey(licenseKey);
		}
        utils.endRollingCount(this);
	});


	test("Invalid License Key (Local Server)", async function()
	{
        if (utils.exitRollingCount(this)) return;
		if (lsProcess)
		{
			this.slow(tc.slowTime.licenseMgr.checkLicense + tc.slowTime.storageSecretRead + tc.slowTime.storageUpdate  + tc.slowTime.storageSecretUpdate);
			const licenseKey = await licMgr.getLicenseKey();
			await licMgr.setLicenseKey("1234-5678-9098-1234567");
			await licMgr.checkLicense();
			await setTasks();
			await licMgr.setLicenseKey(licenseKey);
		}
        utils.endRollingCount(this);
	});


	test("Stop License Server", async function()
	{
        if (utils.exitRollingCount(this)) return;
		// Don't utils.exitRollingCount(this)
        if (lsProcess)
		{   // shut down local server
			this.slow(12000);
			lsProcess.send("close");
			await utils.sleep(5500);
			lsProcess = undefined;
		}
        utils.endRollingCount(this);
	});


	test("Check License Key (Server Down)", async function()
	{
        if (utils.exitRollingCount(this)) return;
		this.slow(tc.slowTime.licenseMgr.serverDownHostUp + tc.slowTime.licenseMgr.checkLicense +
			      tc.slowTime.storageUpdate  + tc.slowTime.storageSecretUpdate);
		const licenseKey = await licMgr.getLicenseKey();
		await licMgr.setLicenseKey("1234-5678-9098-1234567");
		await licMgr.checkLicense();
		await setTasks();
		await licMgr.setLicenseKey(licenseKey);
        utils.endRollingCount(this);
	});


	test("Task Limit Reached (Non-Licensed)", async function()
	{
        if (utils.exitRollingCount(this)) return;
		this.slow((Math.round(tc.slowTime.refreshCommand * 0.75)) + tc.slowTime.storageUpdate + tc.slowTime.storageSecretUpdate);
		licMgr.setTestData({
			host: "license.spmeesseman.com",
			port: 443,
			token: remoteServerToken
		});
		await setLicensed(false, licMgr);
		licMgr.setTestData({
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
		this.slow(Math.round(tc.slowTime.refreshCommand * 0.9));
		licMgr.setTestData({
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
		this.slow(Math.round(tc.slowTime.refreshCommand * 0.9));
		licMgr.setTestData({
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
		this.slow(Math.round(tc.slowTime.refreshCommand * 0.9) + tc.slowTime.fs.createFolderEvent);
		const outsideWsDir = utils.getProjectsPath("testA");
		await fsApi.createDir(outsideWsDir);
		await fsApi.writeFile(
            join(outsideWsDir, "Gruntfile.js"),
            "module.exports = function(grunt) {\n" +
            '    grunt.registerTask(\n"default13", ["jshint:myproject"]);\n' +
            '    grunt.registerTask("upload13", ["s3"]);\n' +
            "};\n"
        );
		licMgr.setTestData({
			maxFreeTasks: licMgrMaxFreeTasks,
			maxFreeTaskFiles: 5,
			maxFreeTasksForTaskType: licMgrMaxFreeTasksForTaskType,
			maxFreeTasksForScriptType: licMgrMaxFreeTasksForScriptType
		});
		utils.overrideNextShowInfoBox(undefined);
		await utils.treeUtils.refresh();
		await fsApi.copyDir(outsideWsDir, utils.getWsPath("."), undefined, true); // Cover fileCache.addFolder()
        await utils.waitForTeIdle(tc.waitTime.fs.createFolderEvent);
		await fsApi.deleteDir(join(utils.getWsPath("."), "testA"));
        await utils.waitForTeIdle(tc.waitTime.fs.deleteFolderEvent);
		await fsApi.deleteDir(outsideWsDir);
        utils.endRollingCount(this);
	});


	test("Enter Valid License Key After Max Task Count Reached", async function()
	{
        if (utils.exitRollingCount(this)) return;
        if (licMgr)
		{
			this.slow(tc.slowTime.refreshCommand);
			const licenseKey = await licMgr.getLicenseKey();
			await teApi.testsApi.storage.update("lastLicenseNag", undefined);
			utils.overrideNextShowInfoBox("Enter License Key");
			utils.overrideNextShowInputBox("1234-5678-9098-7654321");
			utils.overrideNextShowInfoBox(undefined);
			await licMgr.enterLicenseKey();
			await licMgr.setLicenseKey(licenseKey);
		}
        utils.endRollingCount(this);
	});


	test("Reset Max Limits (Non-Licensed)", async function()
	{
        if (utils.exitRollingCount(this)) return;
		if (licMgr)
		{
			this.slow(tc.slowTime.refreshCommand);
			await setLicensed(true, licMgr);
			licMgr.setTestData({
				maxFreeTasks: licMgrMaxFreeTasks,
				maxFreeTaskFiles: licMgrMaxFreeTaskFiles,
				maxFreeTasksForTaskType: licMgrMaxFreeTasksForTaskType,
				maxFreeTasksForScriptType: licMgrMaxFreeTasksForScriptType
			});
			await utils.treeUtils.refresh();
		}
        utils.endRollingCount(this);
	});


    test("Max Task Reached MessageBox", async function()
    {
        if (utils.exitRollingCount(this)) return;
		this.slow(tc.slowTime.licenseMgr.enterKey);
		utils.clearOverrideShowInfoBox();
		utils.clearOverrideShowInputBox();
		utils.overrideNextShowInfoBox("Enter License Key");
		utils.overrideNextShowInputBox(undefined);
		await teApi.utilities.showMaxTasksReachedMessage(licMgr, undefined, true);
		utils.overrideNextShowInfoBox("Info");
		await teApi.utilities.showMaxTasksReachedMessage(licMgr, "npm", true);
		utils.overrideNextShowInfoBox("Not Now");
		await teApi.utilities.showMaxTasksReachedMessage(licMgr, "ant", true);
		utils.overrideNextShowInfoBox(undefined);
		await teApi.utilities.showMaxTasksReachedMessage(licMgr, "gulp", true);
		utils.overrideNextShowInfoBox("Enter License Key");
		utils.overrideNextShowInputBox(undefined);
		await teApi.utilities.showMaxTasksReachedMessage(licMgr, "grunt", true);
		utils.overrideNextShowInfoBox("Info");
		await teApi.utilities.showMaxTasksReachedMessage(licMgr, "grunt", true);
		utils.overrideNextShowInfoBox("Info");
		await teApi.utilities.showMaxTasksReachedMessage(licMgr);
        utils.endRollingCount(this);
	});

});



const setLicensed = async (valid: boolean, licMgr: ILicenseManager) =>
{
    teApi.setTests(!valid);
    await licMgr.setLicenseKey(valid ? "1234-5678-9098-7654321" : undefined);
    await licMgr.checkLicense();
    teApi.setTests(true);
};


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
