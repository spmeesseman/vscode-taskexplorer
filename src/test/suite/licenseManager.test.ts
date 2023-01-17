/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */

import { expect } from "chai";
import { ChildProcess, fork } from "child_process";
import { ILicenseManager } from "../../interface/ILicenseManager";
import { getLicenseManager } from "../../extension";
import { Task } from "vscode";
import { testControl } from "../control";
import { ITaskExplorer, ITaskExplorerApi } from "@spmeesseman/vscode-taskexplorer-types";
import {
	activate, closeActiveDocument, overrideNextShowInfoBox, overrideNextShowInputBox,
	sleep, executeTeCommand, focusExplorerView, getWsPath, setLicensed, suiteFinished, exitRollingCount
} from "../utils/utils";


const licMgrMaxFreeTasks = 500;             // Should be set to what the constants are in lib/licenseManager
const licMgrMaxFreeTaskFiles = 100;         // Should be set to what the constants are in lib/licenseManager
const licMgrMaxFreeTasksForTaskType = 100;  // Should be set to what the constants are in lib/licenseManager
const licMgrMaxFreeTasksForScriptType = 50; // Should be set to what the constants are in lib/licenseManager

let teApi: ITaskExplorerApi;
let explorer: ITaskExplorer;
let licMgr: ILicenseManager;
let tasks: Task[] = [];
let setTasksCallCount = 0;
let lsProcess: ChildProcess;
let successCount = -1;


suite("License Manager Tests", () =>
{
	let licenseKey: string | undefined;
	let oLicenseKey: string | undefined;
	let version: string;
	let oVersion: string | undefined;


	suiteSetup(async function()
	{
        ({ teApi } = await activate(this));
        explorer = teApi.testsApi.explorer;
		oLicenseKey = teApi.testsApi.storage.get<string>("license_key");
		oVersion = teApi.testsApi.storage.get<string>("version");
        ++successCount;
	});


	suiteTeardown(async function()
    {
		teApi.setTests(true);
		licMgr?.dispose();
		await closeActiveDocument();
		if (lsProcess) {
			lsProcess.send("close");
			await sleep(500);
		}
		if (oLicenseKey) {
			await teApi.testsApi.storage.update("license_key", oLicenseKey);
		}
		if (oVersion) {
			await teApi.testsApi.storage.update("version", oLicenseKey);
		}
        suiteFinished(this);
	});


	test("Activate Tree (Focus Explorer View)", async function()
	{
        if (exitRollingCount(0, successCount)) return;
		await focusExplorerView(this);
        ++successCount;
	});


	test("Get License Manager", async function()
	{
        if (exitRollingCount(1, successCount)) return;
		licMgr = getLicenseManager();
		tasks = explorer.getTasks();
		await licMgr.setTasks(tasks, "");
		await licMgr.setTasks(tasks);
		licMgr.dispose();
        ++successCount;
	});


	test("Clear License Key", async function()
	{
        if (exitRollingCount(2, successCount)) return;
		this.slow((testControl.slowTime.storageRead * 2) + testControl.slowTime.storageUpdate);
		licenseKey = licMgr.getLicenseKey();
		version = licMgr.getVersion(); // will be set on ext. startup
		await licMgr.setLicenseKey(undefined);
        ++successCount;
	});


	test("Get Maximum # of Tasks", async function()
	{
        if (exitRollingCount(3, successCount)) return;
		await setLicensed(true, licMgr);
		expect(licMgr.getMaxNumberOfTasks()).to.be.a("number").that.is.equal(Infinity);
		await setLicensed(false, licMgr);
		expect(licMgr.getMaxNumberOfTasks()).to.be.a("number").that.is.equal(licMgrMaxFreeTasks);
        ++successCount;
	});


	test("Get Maximum # of NPM Tasks", async function()
	{
        if (exitRollingCount(4, successCount)) return;
		await setLicensed(true, licMgr);
		expect(licMgr.getMaxNumberOfTasks("npm")).to.be.a("number").that.is.equal(Infinity);
		await setLicensed(false, licMgr);
		expect(licMgr.getMaxNumberOfTasks("npm")).to.be.a("number").that.is.equal(licMgrMaxFreeTasksForTaskType);
        ++successCount;
	});


	test("Get Maximum # of Ant Tasks", async function()
	{
        if (exitRollingCount(5, successCount)) return;
		await setLicensed(true, licMgr);
		expect(licMgr.getMaxNumberOfTasks("ant")).to.be.a("number").that.is.equal(Infinity);
		await setLicensed(false, licMgr);
		expect(licMgr.getMaxNumberOfTasks("ant")).to.be.a("number").that.is.equal(licMgrMaxFreeTasksForTaskType);
        ++successCount;
	});


	test("Get Maximum # of Bash Tasks (Scripts)", async function()
	{
        if (exitRollingCount(6, successCount)) return;
		await setLicensed(true, licMgr);
		expect(licMgr.getMaxNumberOfTasks("bash")).to.be.a("number").that.is.equal(Infinity);
		await setLicensed(false, licMgr);
		expect(licMgr.getMaxNumberOfTasks("bash")).to.be.a("number").that.is.equal(licMgrMaxFreeTasksForScriptType);
        ++successCount;
	});


	test("Get Maximum # of Python Tasks (Scripts)", async function()
	{
        if (exitRollingCount(7, successCount)) return;
		await setLicensed(true, licMgr);
		expect(licMgr.getMaxNumberOfTasks("python")).to.be.a("number").that.is.equal(Infinity);
		await setLicensed(false, licMgr);
		expect(licMgr.getMaxNumberOfTasks("python")).to.be.a("number").that.is.equal(licMgrMaxFreeTasksForScriptType);
        ++successCount;
	});


	test("Get Maximum # of Task Files", async function()
	{
        if (exitRollingCount(8, successCount)) return;
		await setLicensed(true, licMgr);
		expect(licMgr.getMaxNumberOfTaskFiles()).to.be.a("number").that.is.equal(Infinity);
		await setLicensed(false, licMgr);
		expect(licMgr.getMaxNumberOfTaskFiles()).to.be.a("number").that.is.equal(licMgrMaxFreeTaskFiles);
        ++successCount;
	});


	test("License Info Page - View Report (From Webview)", async function()
	{
        if (exitRollingCount(9, successCount)) return;
		this.slow(testControl.slowTime.licenseMgrOpenPageWithDetail + 1050 + (testControl.slowTime.storageUpdate * 2));
		await setLicensed(false, licMgr);
		await teApi.testsApi.storage.update("version", undefined);
		await teApi.testsApi.storage.update("lastLicenseNag", undefined);
		await setTasks();
		await sleep(500);
		await licMgr.getWebviewPanel()?.webview.postMessage({ command: "viewReport" });
		await sleep(500);
		licMgr.dispose();
		await closeActiveDocument();
        ++successCount;
	});


	test("License Info Page - Enter License Key (From Webview)", async function()
	{
        if (exitRollingCount(10, successCount)) return;
		this.slow(testControl.slowTime.licenseMgrOpenPage + 550 + (testControl.slowTime.storageUpdate * 2));
		await teApi.testsApi.storage.update("version", undefined);
		await setTasks();
		await sleep(50);
		overrideNextShowInputBox("1234-5678-9098-0000000");
		await licMgr.getWebviewPanel()?.webview.postMessage({ command: "enterLicense" });
		await sleep(500);
		licMgr.dispose();
		await closeActiveDocument();
        ++successCount;
	});


	test("Has License", async function()
	{
        if (exitRollingCount(11, successCount)) return;
		//
		// Has license
		// 1111-2222-3333-4444-5555 for now.  When lic server is done, it will fail
		//
		this.slow(testControl.slowTime.licenseMgrOpenPage + 400);
		teApi.setTests(false);
		await licMgr.setLicenseKey("1234-5678-9098-7654321");
		await licMgr.checkLicense();
		teApi.setTests(true);
		await licMgr.setTasks(tasks);
		await sleep(400);
		licMgr.dispose();
		await closeActiveDocument();
		await licMgr.setLicenseKey(licenseKey);
        ++successCount;
	});


	test("License Prompt (Enter Valid Key)", async function()
	{
        if (exitRollingCount(12, successCount)) return;
		//
		// If version is set, the prompt will show
		//
		this.slow(testControl.slowTime.licenseMgrOpenPage + 400);
		await teApi.testsApi.storage.update("lastLicenseNag", undefined);
		overrideNextShowInfoBox("Enter License Key");
		overrideNextShowInputBox("1234-5678-9098-7654321");
		await setTasks();
		await sleep(400);
		licMgr.dispose();
		await closeActiveDocument();
        ++successCount;
	});


	test("License Prompt (Enter Invalid Key)", async function()
	{
        if (exitRollingCount(13, successCount)) return;
		//
		// If version is set, the prompt will show
		//
		this.slow(testControl.slowTime.licenseMgrOpenPage + 400);
		await teApi.testsApi.storage.update("lastLicenseNag", undefined);
		overrideNextShowInfoBox("Enter License Key");
		overrideNextShowInputBox("1111-2222-3333-4444-5555");
		await setTasks();
		await sleep(400);
		licMgr.dispose();
		await closeActiveDocument();
        ++successCount;
	});


	test("License Page w/ No License Key", async function()
	{
        if (exitRollingCount(14, successCount)) return;
		//
		// If version is 'not' set, the lic page will show
		//
		this.slow(testControl.slowTime.licenseMgrOpenPage + 400);
		await teApi.testsApi.storage.update("version", undefined);
		await licMgr.checkLicense();
		await setTasks();
		await sleep(400);
		licMgr.dispose();
		await closeActiveDocument();
        ++successCount;
	});


	test("License Page w/ Set License Key", async function()
	{
        if (exitRollingCount(15, successCount)) return;
		this.slow(testControl.slowTime.licenseMgrOpenPage + 400);
		licenseKey = licMgr.getLicenseKey();
		//
		// If license is set, diff info page
		//
		await licMgr.setLicenseKey(licenseKey);
		await licMgr.checkLicense();
		await setTasks();
		await sleep(400);
		licMgr.dispose();
		await closeActiveDocument();
        ++successCount;
	});


	test("License Page w/ Set License Key", async function()
	{
        if (exitRollingCount(16, successCount)) return;
		this.slow(testControl.slowTime.licenseMgrOpenPage + 400);
		const licenseKey = licMgr.getLicenseKey(),
			  version = licMgr.getVersion(); // will be set on ext. startup
		//
		await teApi.testsApi.storage.update("version", version);
		await licMgr.checkLicense();
		await setTasks();
		await sleep(400);
		licMgr.dispose();
		await closeActiveDocument();
		//
		// Reset
		//
		await licMgr.setLicenseKey(licenseKey);
		await teApi.testsApi.storage.update("version", version);
        ++successCount;
	});


	test("License Page w/ Set License Key", async function()
	{
        if (exitRollingCount(17, successCount)) return;
		this.slow(testControl.slowTime.licenseMgrOpenPage + 400);
		const licenseKey = licMgr.getLicenseKey(),
			  version = licMgr.getVersion(); // will be set on ext. startup
		//
		await teApi.testsApi.storage.update("version", version);
		await licMgr.checkLicense();
		await setTasks();
		await sleep(400);
		licMgr.dispose();
		await closeActiveDocument();
		//
		// Reset
		//
		await licMgr.setLicenseKey(licenseKey);
		await teApi.testsApi.storage.update("version", version);
        ++successCount;
	});


	test("Reset License Manager", async function()
	{
        if (exitRollingCount(18, successCount)) return;
		this.slow(testControl.slowTime.storageUpdate * 2);
		await licMgr.setLicenseKey(licenseKey);
		await teApi.testsApi.storage.update("version", version);
        ++successCount;
	});



	test("License info", async function()
	{
        if (exitRollingCount(19, successCount)) return;
		this.slow(testControl.slowTime.licenseMgrOpenPage + 400);
		await teApi.testsApi.storage.update("lastLicenseNag", undefined);
		const licenseKey = licMgr.getLicenseKey(); // will be set on ext. startup
		await licMgr.setLicenseKey(undefined);
		overrideNextShowInfoBox("Info");
		await setTasks();
		await sleep(400);
		licMgr.dispose();
		await closeActiveDocument();
		await licMgr.setLicenseKey(licenseKey);
        ++successCount;
	});


	test("License Not Now", async function()
	{
        if (exitRollingCount(20, successCount)) return;
		this.slow(testControl.slowTime.licenseMgrOpenPage + 400);
		const licenseKey = licMgr.getLicenseKey(); // will be set on ext. startup
		await licMgr.setLicenseKey(undefined);
		overrideNextShowInfoBox("Not Now");
		await setTasks();
		await sleep(400);
		licMgr.dispose();
		await closeActiveDocument();
		await licMgr.setLicenseKey(licenseKey);
        ++successCount;
	});



	test("License Cancel", async function()
	{
        if (exitRollingCount(21, successCount)) return;
		this.slow(testControl.slowTime.licenseMgrOpenPage + 400);
		await teApi.testsApi.storage.update("lastLicenseNag", undefined);
		const licenseKey = licMgr.getLicenseKey(); // will be set on ext. startup
		await licMgr.setLicenseKey(undefined);
		overrideNextShowInfoBox(undefined);
		await setTasks();
		await sleep(400);
		licMgr.dispose();
		await closeActiveDocument();
		await licMgr.setLicenseKey(licenseKey);
        ++successCount;
	});


	test("Enter License key on Startup", async function()
	{
        if (exitRollingCount(22, successCount)) return;
		this.slow((testControl.slowTime.licenseMgrOpenPage * 2) + 800);
		overrideNextShowInfoBox("Enter License Key");
		overrideNextShowInputBox("1111-2222-3333-4444-5555");
		await licMgr.enterLicenseKey();
		await sleep(400);
		overrideNextShowInfoBox("Enter License Key");
		overrideNextShowInputBox("");
		await setTasks();
		await sleep(400);
        ++successCount;
	});


	test("Enter License Key by Command Pallette", async function()
	{
        if (exitRollingCount(23, successCount)) return;
		this.slow((testControl.slowTime.licenseMgrOpenPage * 3) + (testControl.waitTime.command * 6));
		overrideNextShowInfoBox("Enter License Key");
		overrideNextShowInputBox("1234-5678-9098-7654321");
		await executeTeCommand("enterLicense", testControl.waitTime.command * 2);
		overrideNextShowInfoBox("Enter License Key");
		overrideNextShowInputBox("");
		await executeTeCommand("enterLicense", testControl.waitTime.command * 2, 1100, "   ");
		overrideNextShowInfoBox("Enter License Key");
		overrideNextShowInputBox("");
		await executeTeCommand("enterLicense", testControl.waitTime.command * 2, 1100, "   ", 1);
        ++successCount;
	});


	test("Multi projects startup", async function()
	{
        if (exitRollingCount(24, successCount)) return;
		this.slow(testControl.slowTime.licenseMgrOpenPage + 400);
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
			// await teApi.testsApi.storage.update("version", undefined);
			// await licMgr.checkLicense();
			// await sleep(1000);
			// await closeActiveDocument();
			// licMgr.setLicenseKey(licenseKey);
			// await teApi.testsApi.storage.update("version", version);
			// tasks.pop();
		// }
        ++successCount;
	});


	test("Start License Server", async function()
	{
        if (exitRollingCount(25, successCount)) return;
		this.slow(testControl.slowTime.licenseManagerLocalStartServer + (4000 * 2));
		lsProcess = fork("spm-license-server.js", {
			cwd: getWsPath("../../spm-license-server/bin"), detached: true,
		});
		await sleep(4000);
        ++successCount;
	});


	test("Enter License key on Startup (1st Time, Server Live)", async function()
	{
        if (exitRollingCount(26, successCount)) return;
		this.slow(testControl.slowTime.licenseManagerLocalCheck);
		await teApi.testsApi.storage.update("version", undefined);
		const licenseKey = licMgr.getLicenseKey();
		await licMgr.setLicenseKey("1234-5678-9098-7654321");
		await licMgr.checkLicense();
		await setTasks();
		await licMgr.setLicenseKey(licenseKey);
        ++successCount;
	});


	test("Enter License key on Startup (> 1st Time, Server Live)", async function()
	{
        if (exitRollingCount(27, successCount)) return;
		this.slow(testControl.slowTime.licenseManagerLocalCheck);
		const licenseKey = licMgr.getLicenseKey();
		await licMgr.setLicenseKey("1234-5678-9098-7654321");
		await licMgr.checkLicense();
		await setTasks();
		await licMgr.setLicenseKey(licenseKey);
        ++successCount;
	});


	test("Invalid License key (Server Live)", async function()
	{
        if (exitRollingCount(28, successCount)) return;
		this.slow(testControl.slowTime.licenseManagerLocalCheck);
		const licenseKey = licMgr.getLicenseKey();
		await licMgr.setLicenseKey("1234-5678-9098-1234567");
		await licMgr.checkLicense();
		await setTasks();
		await licMgr.setLicenseKey(licenseKey);
        ++successCount;
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
