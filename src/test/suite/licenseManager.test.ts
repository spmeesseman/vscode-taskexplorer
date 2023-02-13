/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */

import { join } from "path";
import { expect } from "chai";
import { Task } from "vscode";
import * as utils from "../utils/utils";
import { TeWrapper } from "../../lib/wrapper";
import { startupFocus } from "../utils/suiteUtils";
import { executeTeCommand } from "../utils/commandUtils";
import { LicensePage } from "../../webview/page/licensePage";
import { LicenseManager } from "../../lib/auth/licenseManager";
import { ITaskExplorerApi } from "@spmeesseman/vscode-taskexplorer-types";
import { copyDir, createDir, deleteDir, writeFile } from "../../lib/utils/fs";

const tc = utils.testControl;
const licMgrMaxFreeTasks = 500;             // Should be set to what the constants are in lib/licenseManager
const licMgrMaxFreeTaskFiles = 100;         // Should be set to what the constants are in lib/licenseManager
const licMgrMaxFreeTasksForTaskType = 100;  // Should be set to what the constants are in lib/licenseManager
const licMgrMaxFreeTasksForScriptType = 50; // Should be set to what the constants are in lib/licenseManager

let licMgr: LicenseManager;
let teApi: ITaskExplorerApi;
let teWrapper: TeWrapper;
let tasks: Task[] = [];
let setTasksCallCount = 0;


suite("License Manager Tests", () =>
{
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
        ({ teApi, teWrapper } = await utils.activate(this));
		oLicenseKey = await teWrapper.storage.getSecret("license_key");
		await teWrapper.storage.updateSecret("license_key_30day", undefined);
		licMgr = teWrapper.licenseManager;
		licMgr.setTestData({
			logRequestSteps: tc.log.licServerReqSteps,
			maxFreeTasks: licMgrMaxFreeTasks,
			maxFreeTaskFiles: licMgrMaxFreeTaskFiles,
			maxFreeTasksForTaskType: licMgrMaxFreeTasksForTaskType,
			maxFreeTasksForScriptType: licMgrMaxFreeTasksForScriptType
		});
        utils.endRollingCount(this, true);
	});


	suiteTeardown(async function()
    {
        if (utils.exitRollingCount(this, false, true)) return;
		teWrapper.tests = true;
		await utils.closeEditors();
		await teWrapper.storage.updateSecret("license_key_30day", undefined);
		if (oLicenseKey) {
			await teWrapper.storage.updateSecret("license_key", oLicenseKey);
		}
		licMgr?.setTestData({
			maxFreeTasks: licMgrMaxFreeTasks,
			maxFreeTaskFiles: licMgrMaxFreeTaskFiles,
			maxFreeTasksForTaskType: licMgrMaxFreeTasksForTaskType,
			maxFreeTasksForScriptType: licMgrMaxFreeTasksForScriptType
		});
		utils.clearOverrideShowInfoBox();
		utils.clearOverrideShowInputBox();
        utils.suiteFinished(this);
	});


	test("Focus Explorer View", async function()
	{
        await startupFocus(this, async () => {
			tasks = teWrapper.treeManager.getTasks();
			await licMgr.setTasks(tasks, ""); // covers checking same # of tasks onsetTasks() calls
			await licMgr.setTasks(tasks);     // covers checking same # of tasks onsetTasks() calls
		});
	});



	test("Clear License Key", async function()
	{
        if (utils.exitRollingCount(this)) return;
		this.slow(tc.slowTime.storageRead + tc.slowTime.licenseMgr.setLicenseCmd);
		version = licMgr.getVersion(); // will be set on ext. startup
		await licMgr.setLicenseKey(undefined);
        utils.endRollingCount(this);
	});


	test("Get Maximum # of Tasks", async function()
	{
        if (utils.exitRollingCount(this)) return;
		this.slow(tc.slowTime.licenseMgr.getMaxTasks + (tc.slowTime.licenseMgr.setLicenseCmd * 2));
		await utils.setLicensed(true);
		expect(licMgr.getMaxNumberOfTasks()).to.be.a("number").that.is.equal(Infinity);
		await utils.setLicensed(false);
		expect(licMgr.getMaxNumberOfTasks()).to.be.a("number").that.is.equal(licMgrMaxFreeTasks);
        utils.endRollingCount(this);
	});


	test("Get Maximum # of NPM Tasks", async function()
	{
        if (utils.exitRollingCount(this)) return;
		this.slow(tc.slowTime.licenseMgr.getMaxTasks + (tc.slowTime.licenseMgr.setLicenseCmd * 2));
		await utils.setLicensed(true);
		expect(licMgr.getMaxNumberOfTasks("npm")).to.be.a("number").that.is.equal(Infinity);
		await utils.setLicensed(false);
		expect(licMgr.getMaxNumberOfTasks("npm")).to.be.a("number").that.is.equal(licMgrMaxFreeTasksForTaskType);
        utils.endRollingCount(this);
	});


	test("Get Maximum # of Ant Tasks", async function()
	{
        if (utils.exitRollingCount(this)) return;
		this.slow(tc.slowTime.licenseMgr.getMaxTasks + (tc.slowTime.licenseMgr.setLicenseCmd * 2));
		await utils.setLicensed(true);
		expect(licMgr.getMaxNumberOfTasks("ant")).to.be.a("number").that.is.equal(Infinity);
		await utils.setLicensed(false);
		expect(licMgr.getMaxNumberOfTasks("ant")).to.be.a("number").that.is.equal(licMgrMaxFreeTasksForTaskType);
        utils.endRollingCount(this);
	});


	test("Get Maximum # of Bash Tasks (Scripts)", async function()
	{
        if (utils.exitRollingCount(this)) return;
		this.slow(tc.slowTime.licenseMgr.getMaxTasks + (tc.slowTime.licenseMgr.setLicenseCmd * 2));
		await utils.setLicensed(true);
		expect(licMgr.getMaxNumberOfTasks("bash")).to.be.a("number").that.is.equal(Infinity);
		await utils.setLicensed(false);
		expect(licMgr.getMaxNumberOfTasks("bash")).to.be.a("number").that.is.equal(licMgrMaxFreeTasksForScriptType);
        utils.endRollingCount(this);
	});


	test("Get Maximum # of Python Tasks (Scripts)", async function()
	{
        if (utils.exitRollingCount(this)) return;
		this.slow(tc.slowTime.licenseMgr.getMaxTasks + (tc.slowTime.licenseMgr.setLicenseCmd * 2));
		await utils.setLicensed(true);
		expect(licMgr.getMaxNumberOfTasks("python")).to.be.a("number").that.is.equal(Infinity);
		await utils.setLicensed(false);
		expect(licMgr.getMaxNumberOfTasks("python")).to.be.a("number").that.is.equal(licMgrMaxFreeTasksForScriptType);
        utils.endRollingCount(this);
	});


	test("Get Maximum # of Task Files", async function()
	{
        if (utils.exitRollingCount(this)) return;
		this.slow(tc.slowTime.licenseMgr.getMaxTasks + (tc.slowTime.licenseMgr.setLicenseCmd * 2));
		await utils.setLicensed(true);
		expect(licMgr.getMaxNumberOfTaskFiles()).to.be.a("number").that.is.equal(Infinity);
		await utils.setLicensed(false);
		expect(licMgr.getMaxNumberOfTaskFiles()).to.be.a("number").that.is.equal(licMgrMaxFreeTaskFiles);
        utils.endRollingCount(this);
	});


	test("License Info Page - View Report (From Webview)", async function()
	{
        if (utils.exitRollingCount(this)) return;
		this.slow(tc.slowTime.licenseMgr.pageWithDetail + 1100 + (tc.slowTime.storageUpdate * 2) + tc.slowTime.licenseMgr.setLicenseCmd);
		await utils.setLicensed(false);
		await teWrapper.licensePage.show();
		await utils.sleep(50);
		await teWrapper.licensePage.view?.webview.postMessage({ command: "getLicense" });
		await setTasks();
		await utils.sleep(50);
		await teWrapper.licensePage.view?.webview.postMessage({ command: "showParsingReport" });
		await utils.sleep(500);
        utils.endRollingCount(this);
	});


	test("License Info Page - Enter License Key (From Webview)", async function()
	{
        if (utils.exitRollingCount(this)) return;
		this.slow(tc.slowTime.licenseMgr.page + 1100 + tc.slowTime.storageUpdate);
		utils.overrideNextShowInputBox("1234-5678-9098-0000000");
		await licMgr.getWebviewPanel()?.webview.postMessage({ command: "enterLicense" });
		await utils.sleep(500);
		await utils.closeEditors();
        utils.endRollingCount(this);
	});


	test("Has License", async function()
	{
        if (utils.exitRollingCount(this)) return;
		this.slow(tc.slowTime.licenseMgr.checkLicense + tc.slowTime.licenseMgr.page + (tc.slowTime.licenseMgr.setLicenseCmd * 2) + 800);
		teWrapper.tests = false;
		await licMgr.setLicenseKey("1234-5678-9098-7654321");
		await licMgr.checkLicense();
		teWrapper.tests = true;
		await licMgr.setTasks(tasks);
		await utils.sleep(400);
		await utils.closeEditors();
        utils.endRollingCount(this);
	});


	test("License Prompt (Enter Valid Key)", async function()
	{
        if (utils.exitRollingCount(this)) return;
		this.slow(tc.slowTime.licenseMgr.page + tc.slowTime.licenseMgr.enterKey + tc.slowTime.storageUpdate + 800);
		await teWrapper.storage.update("taskExplorer.lastLicenseNag", undefined);
		utils.clearOverrideShowInfoBox();
		utils.clearOverrideShowInputBox();
		utils.overrideNextShowInfoBox("Enter License Key");
		utils.overrideNextShowInputBox("1234-5678-9098-7654321");
		utils.overrideNextShowInfoBox(undefined);
		await setTasks();
		await utils.sleep(400);
		await utils.closeEditors();
        utils.endRollingCount(this);
	});


	test("License Prompt (Enter Invalid Key)", async function()
	{
        if (utils.exitRollingCount(this)) return;
		this.slow(tc.slowTime.licenseMgr.page + tc.slowTime.licenseMgr.enterKey + tc.slowTime.storageUpdate + 800);
		await teWrapper.storage.update("taskExplorer.lastLicenseNag", undefined);
		utils.clearOverrideShowInfoBox();
		utils.clearOverrideShowInputBox();
		utils.overrideNextShowInfoBox("Enter License Key");
		utils.overrideNextShowInputBox("1111-2222-3333-4444-5555");
		utils.overrideNextShowInfoBox(undefined);
		await setTasks();
		await utils.sleep(400);
		await utils.closeEditors();
        utils.endRollingCount(this);
	});


	test("License Prompt (Enter Invalid Key Length)", async function()
	{
        if (utils.exitRollingCount(this)) return;
		this.slow(tc.slowTime.licenseMgr.page + tc.slowTime.licenseMgr.enterKey + tc.slowTime.storageUpdate + 800);
		await teWrapper.storage.update("taskExplorer.lastLicenseNag", undefined);
		utils.clearOverrideShowInfoBox();
		utils.clearOverrideShowInputBox();
		utils.overrideNextShowInfoBox("Enter License Key");
		utils.overrideNextShowInputBox("1234");
		utils.overrideNextShowInfoBox(undefined);
		await setTasks();
		await utils.sleep(400);
		await utils.closeEditors();
        utils.endRollingCount(this);
	});


	test("License Page w/ No License Key", async function()
	{
        if (utils.exitRollingCount(this)) return;
		this.slow(tc.slowTime.licenseMgr.page + tc.slowTime.storageUpdate + tc.slowTime.licenseMgr.checkLicense + 800);
		await licMgr.checkLicense();
		await setTasks();
		await utils.sleep(400);
		await utils.closeEditors();
        utils.endRollingCount(this);
	});


	test("License Page w/ Set License Key", async function()
	{
        if (utils.exitRollingCount(this)) return;
		this.slow(tc.slowTime.licenseMgr.page + tc.slowTime.licenseMgr.setLicenseCmd + tc.slowTime.licenseMgr.checkLicense + 800);
		await licMgr.setLicenseKey("1234-5678-9098-7654321");
		await licMgr.checkLicense();
		await setTasks();
		await utils.sleep(400);
		await utils.closeEditors();
        utils.endRollingCount(this);
	});


	test("Deserialize License Page", async function()
	{
        if (utils.exitRollingCount(this)) return;
		this.slow(tc.slowTime.viewReport + 200);
		let panel = utils.createwebviewForRevive(LicensePage.viewTitle, LicensePage.viewId);
	    await teWrapper.parsingReportPage.serializer.deserializeWebviewPanel(panel, null);
		await utils.sleep(50);
		teWrapper.parsingReportPage.dispose();
		panel = utils.createwebviewForRevive(LicensePage.viewTitle, LicensePage.viewId);
		await utils.sleep(50);
		// teWrapper.busy = false;
		setTimeout(() => { /* teWrapper.isBusy = false; */ }, 50);
	    await teWrapper.parsingReportPage.serializer.deserializeWebviewPanel(panel, null);
		await utils.sleep(50);
		panel.dispose();
		await utils.closeEditors();
        utils.endRollingCount(this);
	});


	test("Reset License Manager", async function()
	{
        if (utils.exitRollingCount(this)) return;
		this.slow(tc.slowTime.storageUpdate + tc.slowTime.licenseMgr.setLicenseCmd);
		await licMgr.setLicenseKey(oLicenseKey);
        utils.endRollingCount(this);
	});



	test("License Info", async function()
	{
        if (utils.exitRollingCount(this)) return;
		this.slow(tc.slowTime.licenseMgr.page + tc.slowTime.storageUpdate + tc.slowTime.licenseMgr.setLicenseCmd + 800);
		await teWrapper.storage.update("taskExplorer.lastLicenseNag", undefined);
		await licMgr.setLicenseKey(undefined);
		utils.overrideNextShowInfoBox("Info");
		await setTasks();
		await utils.sleep(400);
		await utils.closeEditors();
        utils.endRollingCount(this);
	});


	test("License Not Now", async function()
	{
        if (utils.exitRollingCount(this)) return;
		this.slow(tc.slowTime.licenseMgr.page + tc.slowTime.licenseMgr.setLicenseCmd + 800);
		await licMgr.setLicenseKey(undefined);
		utils.overrideNextShowInfoBox("Not Now");
		await setTasks();
		await utils.sleep(400);
		await utils.closeEditors();
        utils.endRollingCount(this);
	});



	test("License Cancel", async function()
	{
        if (utils.exitRollingCount(this)) return;
		this.slow(tc.slowTime.licenseMgr.page + tc.slowTime.storageUpdate + tc.slowTime.licenseMgr.setLicenseCmd + 800);
		await teWrapper.storage.update("taskExplorer.lastLicenseNag", undefined);
		await licMgr.setLicenseKey(undefined);
		utils.overrideNextShowInfoBox(undefined);
		await setTasks();
		await utils.sleep(400);
		await utils.closeEditors();
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


	test("Enter License Key by Command Palette", async function()
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


	test("Enter License Key on Startup (1st Time)", async function()
	{
        if (utils.exitRollingCount(this)) return;
		this.slow(tc.slowTime.licenseMgr.page + tc.slowTime.licenseMgr.checkLicense + tc.slowTime.storageUpdate + tc.slowTime.licenseMgr.setLicenseCmd);
		await licMgr.setLicenseKey("1234-5678-9098-7654321");
		await licMgr.checkLicense();
		await setTasks();
        utils.endRollingCount(this);
	});


	test("Enter License Key on Startup (> 1st Time)", async function()
	{
        if (utils.exitRollingCount(this)) return;
		this.slow(tc.slowTime.licenseMgr.checkLicense + tc.slowTime.storageUpdate + tc.slowTime.licenseMgr.setLicenseCmd);
		await licMgr.setLicenseKey("1234-5678-9098-7654321");
		await licMgr.checkLicense();
		await setTasks();
        utils.endRollingCount(this);
	});


	test("Invalid License Key", async function()
	{
        if (utils.exitRollingCount(this)) return;
		this.slow(tc.slowTime.licenseMgr.checkLicense +  tc.slowTime.licenseMgr.setLicenseCmd);
		await licMgr.setLicenseKey("1234-5678-9098-1234567");
		await licMgr.checkLicense();
		await setTasks();
        utils.endRollingCount(this);
	});


	test("Request 30-Day License (From Webview)", async function()
	{
        if (utils.exitRollingCount(this)) return;
		this.slow(tc.slowTime.licenseMgr.page + tc.slowTime.storageUpdate + tc.slowTime.licenseMgr.get30DayLicense +
				  tc.slowTime.storageSecretRead + tc.slowTime.closeEditors + 1100);
		await teWrapper.licensePage.show();
		await utils.sleep(50);
		const result = await teWrapper.licensePage.view?.webview.postMessage({ command: "getLicense" });
		await utils.sleep(500);
		expect(result).to.be.equal(true);
		await utils.waitForTeIdle(tc.waitTime.licenseMgr.get30DayLicense);
		const newKey = await teWrapper.storage.getSecret("license_key_30day");
		await utils.closeEditors();
		expect(newKey).to.be.a("string").with.length.that.is.greaterThan(20);
        utils.endRollingCount(this);
	});


	test("Request 30-Day License (From Command Palette)", async function()
	{
        if (utils.exitRollingCount(this)) return;
		this.slow(tc.slowTime.closeEditors + tc.slowTime.licenseMgr.get30DayLicense + tc.slowTime.storageSecretUpdate);
		await teWrapper.storage.updateSecret("license_key_30day", undefined);
		const result = await executeTeCommand<{ panel: any; newKey: any }>("getLicense");
		await utils.waitForTeIdle(tc.waitTime.licenseMgr.get30DayLicense);
		await utils.closeEditors();
		expect(result).to.be.an("object");
		expect(result.panel).to.not.be.undefined;
		expect(result.newKey).to.be.a("string").with.length.that.is.greaterThan(20);
        utils.endRollingCount(this);
	});


	test("Re-request a 30-Day License", async function()
	{
        if (utils.exitRollingCount(this)) return;
		this.slow(tc.slowTime.commands.standard + tc.slowTime.closeEditors + tc.slowTime.storageSecretUpdate);
		const result = await executeTeCommand<{ panel: any; newKey: any }>("getLicense");
		await utils.closeEditors();
		await teWrapper.storage.updateSecret("license_key_30day", undefined);
		expect(result).to.be.an("object");
		expect(result.panel).to.not.be.undefined;
		expect(result.newKey).to.be.undefined;
        utils.endRollingCount(this);
	});


	test("Task Limit Reached (Non-Licensed)", async function()
	{
        if (utils.exitRollingCount(this)) return;
		this.slow((Math.round(tc.slowTime.commands.refresh * 0.75)) + tc.slowTime.storageUpdate + tc.slowTime.licenseMgr.setLicenseCmd);
		await utils.setLicensed(false);
		licMgr.setTestData({
			maxFreeTasks: 25,
			maxFreeTaskFiles: licMgrMaxFreeTaskFiles,
			maxFreeTasksForTaskType: licMgrMaxFreeTasksForTaskType,
			maxFreeTasksForScriptType: licMgrMaxFreeTasksForScriptType
		});
		utils.overrideNextShowInfoBox(undefined);
		await utils.treeUtils.refresh();
		expect(teWrapper.treeManager.getTasks().length).to.be.equal(25);
        utils.endRollingCount(this);
	});


	test("Task Type Limit Reached (Non-Licensed)", async function()
	{
        if (utils.exitRollingCount(this)) return;
		this.slow(Math.round(tc.slowTime.commands.refresh * 0.9));
		licMgr.setTestData({
			maxFreeTasks: licMgrMaxFreeTasks,
			maxFreeTaskFiles: licMgrMaxFreeTaskFiles,
			maxFreeTasksForTaskType: 10,
			maxFreeTasksForScriptType: licMgrMaxFreeTasksForScriptType
		});
		utils.overrideNextShowInfoBox(undefined);
		await utils.treeUtils.refresh();
		expect(teWrapper.treeManager.getTasks().filter(t => t.source === "gulp").length).to.be.equal(10);
        utils.endRollingCount(this);
	});


	test("Task Script Type Limit Reached (Non-Licensed)", async function()
	{
        if (utils.exitRollingCount(this)) return;
		this.slow(Math.round(tc.slowTime.commands.refresh * 0.9));
		licMgr.setTestData({
			maxFreeTasks: licMgrMaxFreeTasks,
			maxFreeTaskFiles: licMgrMaxFreeTaskFiles,
			maxFreeTasksForTaskType: licMgrMaxFreeTasksForTaskType,
			maxFreeTasksForScriptType: 1
		});
		utils.overrideNextShowInfoBox(undefined);
		await utils.treeUtils.refresh();
		expect(teWrapper.treeManager.getTasks().filter(t => t.source === "batch").length).to.be.equal(1);
        utils.endRollingCount(this);
	});


	test("Task File Limit Reached (Non-Licensed)", async function()
	{
        if (utils.exitRollingCount(this)) return;
		this.slow(Math.round(tc.slowTime.commands.refresh * 0.9) + tc.slowTime.fs.createFolderEvent);
		const outsideWsDir = utils.getProjectsPath("testA");
		await createDir(outsideWsDir);
		await writeFile(
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
		await copyDir(outsideWsDir, utils.getWsPath("."), undefined, true); // Cover fileCache.addFolder()
        await utils.waitForTeIdle(tc.waitTime.fs.createFolderEvent);
		await deleteDir(join(utils.getWsPath("."), "testA"));
        await utils.waitForTeIdle(tc.waitTime.fs.deleteFolderEvent);
		await deleteDir(outsideWsDir);
        utils.endRollingCount(this);
	});


	test("Enter Valid License Key After Max Task Count Reached", async function()
	{
        if (utils.exitRollingCount(this)) return;
        if (licMgr)
		{
			this.slow(tc.slowTime.commands.refresh);
			await teWrapper.storage.update("taskExplorer.lastLicenseNag", undefined);
			utils.overrideNextShowInfoBox("Enter License Key");
			utils.overrideNextShowInputBox("1234-5678-9098-7654321");
			utils.overrideNextShowInfoBox(undefined);
			await licMgr.enterLicenseKey();
		}
        utils.endRollingCount(this);
	});


	test("Reset Max Limits (Non-Licensed)", async function()
	{
        if (utils.exitRollingCount(this)) return;
		if (licMgr)
		{
			this.slow(tc.slowTime.commands.refresh);
			await utils.setLicensed(true);
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
		await teWrapper.utils.showMaxTasksReachedMessage(licMgr, undefined, true);
		utils.overrideNextShowInfoBox("Info");
		await teWrapper.utils.showMaxTasksReachedMessage(licMgr, "npm", true);
		utils.overrideNextShowInfoBox("Not Now");
		await teWrapper.utils.showMaxTasksReachedMessage(licMgr, "ant", true);
		utils.overrideNextShowInfoBox(undefined);
		await teWrapper.utils.showMaxTasksReachedMessage(licMgr, "gulp", true);
		utils.overrideNextShowInfoBox("Enter License Key");
		utils.overrideNextShowInputBox(undefined);
		await teWrapper.utils.showMaxTasksReachedMessage(licMgr, "grunt", true);
		utils.overrideNextShowInfoBox("Info");
		await teWrapper.utils.showMaxTasksReachedMessage(licMgr, "grunt", true);
		utils.overrideNextShowInfoBox("Info");
		await teWrapper.utils.showMaxTasksReachedMessage(licMgr);
        utils.endRollingCount(this);
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
