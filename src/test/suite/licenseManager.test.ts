/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */

import { expect } from "chai";
import { ChildProcess, fork } from "child_process";
import { ILicenseManager } from "../../interface/ILicenseManager";
import { getLicenseManager } from "../../extension";
import { Task } from "vscode";
import { testControl } from "../control";
import { IExplorerApi, ITaskExplorerApi } from "@spmeesseman/vscode-taskexplorer-types";
import {
	activate, closeActiveDocument, overrideNextShowInfoBox, overrideNextShowInputBox,
	sleep, executeTeCommand, focusExplorerView, getWsPath, setLicensed, suiteFinished
} from "../utils/utils";


const licMgrMaxFreeTasks = 500;             // Should be set to what the constants are in lib/licenseManager
const licMgrMaxFreeTaskFiles = 100;         // Should be set to what the constants are in lib/licenseManager
const licMgrMaxFreeTasksForTaskType = 100;  // Should be set to what the constants are in lib/licenseManager
const licMgrMaxFreeTasksForScriptType = 50; // Should be set to what the constants are in lib/licenseManager

let teApi: ITaskExplorerApi;
let explorer: IExplorerApi;
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
        teApi = await activate(this);
        explorer = teApi.testsApi.explorer;
		oLicenseKey = teApi.testsApi.storage.get<string>("license_key");
		oVersion = teApi.testsApi.storage.get<string>("version");
        ++successCount;
	});


	suiteTeardown(async function()
    {
		teApi.setTests(true);
		licMgr.dispose();
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
        expect(successCount).to.be.equal(0, "rolling success count failure");
		await focusExplorerView(this);
        ++successCount;
	});


	test("Get License Manager", async function()
	{
        expect(successCount).to.be.equal(1, "rolling success count failure");
		licMgr = getLicenseManager();
		tasks = explorer.getTasks();
		await licMgr.setTasks(tasks, "");
		await licMgr.setTasks(tasks);
		licMgr.dispose();
        ++successCount;
	});


	test("Clear License Key", async function()
	{
        expect(successCount).to.be.equal(2, "rolling success count failure");
		this.slow((testControl.slowTime.storageRead * 2) + testControl.slowTime.storageUpdate);
		licenseKey = licMgr.getLicenseKey();
		version = licMgr.getVersion(); // will be set on ext. startup
		await licMgr.setLicenseKey(undefined);
        ++successCount;
	});


	test("Get Maximum # of Tasks", async function()
	{
        expect(successCount).to.be.equal(3, "rolling success count failure");
		await setLicensed(true, licMgr);
		expect(licMgr.getMaxNumberOfTasks()).to.be.a("number").that.is.equal(Infinity);
		await setLicensed(false, licMgr);
		expect(licMgr.getMaxNumberOfTasks()).to.be.a("number").that.is.equal(licMgrMaxFreeTasks);
        ++successCount;
	});


	test("Get Maximum # of NPM Tasks", async function()
	{
        expect(successCount).to.be.equal(4, "rolling success count failure");
		await setLicensed(true, licMgr);
		expect(licMgr.getMaxNumberOfTasks("npm")).to.be.a("number").that.is.equal(Infinity);
		await setLicensed(false, licMgr);
		expect(licMgr.getMaxNumberOfTasks("npm")).to.be.a("number").that.is.equal(licMgrMaxFreeTasksForTaskType);
        ++successCount;
	});


	test("Get Maximum # of Ant Tasks", async function()
	{
        expect(successCount).to.be.equal(5, "rolling success count failure");
		await setLicensed(true, licMgr);
		expect(licMgr.getMaxNumberOfTasks("ant")).to.be.a("number").that.is.equal(Infinity);
		await setLicensed(false, licMgr);
		expect(licMgr.getMaxNumberOfTasks("ant")).to.be.a("number").that.is.equal(licMgrMaxFreeTasksForTaskType);
        ++successCount;
	});


	test("Get Maximum # of Bash Tasks (Scripts)", async function()
	{
        expect(successCount).to.be.equal(6, "rolling success count failure");
		await setLicensed(true, licMgr);
		expect(licMgr.getMaxNumberOfTasks("bash")).to.be.a("number").that.is.equal(Infinity);
		await setLicensed(false, licMgr);
		expect(licMgr.getMaxNumberOfTasks("bash")).to.be.a("number").that.is.equal(licMgrMaxFreeTasksForScriptType);
        ++successCount;
	});


	test("Get Maximum # of Python Tasks (Scripts)", async function()
	{
        expect(successCount).to.be.equal(7, "rolling success count failure");
		await setLicensed(true, licMgr);
		expect(licMgr.getMaxNumberOfTasks("python")).to.be.a("number").that.is.equal(Infinity);
		await setLicensed(false, licMgr);
		expect(licMgr.getMaxNumberOfTasks("python")).to.be.a("number").that.is.equal(licMgrMaxFreeTasksForScriptType);
        ++successCount;
	});


	test("Get Maximum # of Task Files", async function()
	{
        expect(successCount).to.be.equal(8, "rolling success count failure");
		await setLicensed(true, licMgr);
		expect(licMgr.getMaxNumberOfTaskFiles()).to.be.a("number").that.is.equal(Infinity);
		await setLicensed(false, licMgr);
		expect(licMgr.getMaxNumberOfTaskFiles()).to.be.a("number").that.is.equal(licMgrMaxFreeTaskFiles);
        ++successCount;
	});


	test("License Info Page - View Report (From Webview)", async function()
	{
        expect(successCount).to.be.equal(9, "rolling success count failure");
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
        expect(successCount).to.be.equal(10, "rolling success count failure");
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
        expect(successCount).to.be.equal(11, "rolling success count failure");
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
        expect(successCount).to.be.equal(12, "rolling success count failure");
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
        expect(successCount).to.be.equal(13, "rolling success count failure");
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
        expect(successCount).to.be.equal(14, "rolling success count failure");
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
        expect(successCount).to.be.equal(15, "rolling success count failure");
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
        expect(successCount).to.be.equal(16, "rolling success count failure");
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
        expect(successCount).to.be.equal(17, "rolling success count failure");
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
        expect(successCount).to.be.equal(18, "rolling success count failure");
		this.slow(testControl.slowTime.storageUpdate * 2);
		await licMgr.setLicenseKey(licenseKey);
		await teApi.testsApi.storage.update("version", version);
        ++successCount;
	});



	test("License info", async function()
	{
        expect(successCount).to.be.equal(19, "rolling success count failure");
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
        expect(successCount).to.be.equal(20, "rolling success count failure");
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
        expect(successCount).to.be.equal(21, "rolling success count failure");
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
        expect(successCount).to.be.equal(22, "rolling success count failure");
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
        expect(successCount).to.be.equal(23, "rolling success count failure");
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
        ++successCount;
	});


	test("Multi projects startup", async function()
	{
        expect(successCount).to.be.equal(24, "rolling success count failure");
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
        expect(successCount).to.be.equal(25, "rolling success count failure");
		this.slow(testControl.slowTime.licenseManagerLocalStartServer + 4000);
		lsProcess = fork("spm-license-server.js", {
			cwd: getWsPath("../../spm-license-server/bin"), detached: true,
		});
		await sleep(4000);
        ++successCount;
	});


	test("Enter License key on Startup (1st Time, Server Live)", async function()
	{
        expect(successCount).to.be.equal(26, "rolling success count failure");
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
        expect(successCount).to.be.equal(27, "rolling success count failure");
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
        expect(successCount).to.be.equal(28, "rolling success count failure");
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
