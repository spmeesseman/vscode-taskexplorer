/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* tslint:disable */

import * as afs from "../../lib/utils/fs";
import * as util from "../../lib/utils/utils";
import * as pathUtils from "../../lib/utils/pathUtils";
import log, { logControl } from "../../lib/log/log";
import { join } from "path";
import { expect } from "chai";
import { InitScripts } from "../../lib/noScripts";
import { Uri, workspace, WorkspaceFolder } from "vscode";
import { ITaskExplorerApi } from "@spmeesseman/vscode-taskexplorer-types";
import { executeSettingsUpdate, executeTeCommand2 } from "../utils/commandUtils";
import {
	activate, testControl, logErrorsAreFine, suiteFinished, exitRollingCount,
	getWsPath, endRollingCount, sleep
} from "../utils/utils";
import { env } from "process";

const creator = "spmeesseman",
	  extension = "vscode-taskexplorer";

let rootUri: Uri;
let teApi: ITaskExplorerApi;


suite("Util Tests", () =>
{

	suiteSetup(async function()
    {
        if (exitRollingCount(this, true)) return;
        ({ teApi } = await activate(this));
		rootUri = (workspace.workspaceFolders as WorkspaceFolder[])[0].uri;
        await executeSettingsUpdate("logging.enable", true);
        await executeSettingsUpdate("logging.enableOutputWindow", true);
		await executeSettingsUpdate("logging.level", 3);
        endRollingCount(this, true);
	});


	suiteTeardown(async function()
	{
        if (exitRollingCount(this, false, true)) return;
		log.setWriteToConsole(testControl.log.console, testControl.log.consoleLevel);
		await executeSettingsUpdate("logging.enable", testControl.log.enabled);
		await executeSettingsUpdate("logging.enableFile", testControl.log.file);
		await executeSettingsUpdate("logging.enableOutputWindow", testControl.log.output);
		await executeSettingsUpdate("logging.enableFileSymbols", testControl.log.fileSymbols);
		await executeSettingsUpdate("logging.level", testControl.log.level);
        suiteFinished(this);
	});


    test("Hide / Show Output Window", async function()
    {
        if (exitRollingCount(this)) return;
		this.slow((testControl.slowTime.commandShowOutput * 2) + 50);
        await executeTeCommand2("showOutput", [ false ]);
		await sleep(25);
        await executeTeCommand2("showOutput", [ true ]);
        endRollingCount(this);
    });


    test("Logging (Error)", async function()
    {
        if (exitRollingCount(this)) return;
		this.slow((testControl.slowTime.config.event * 2) + 175);

        log.error(`        ${creator}.${extension}`);
        log.error([ `        ${creator}.${extension}`,
                    `        ${creator}.${extension}`,
                    `        ${creator}.${extension}` ]);

		log.error("Test5 error");
		log.error(new Error("Test error object"));
		log.error([ "Test error 1", "Test error 2" ]);
		log.error([ "Test error 3", null, "Test error 4", "" ]);
		log.error([ "Test error 3", "Test error 4" ]);
		log.error([ "Test error 3", "Test error 4" ]);
		log.error([ "", "Test error 5", undefined, "Test error 6", "" ]);
		log.error([ "Test error 7", "", "Test error 8", "" ]);
		log.error([ "Test error 9",  new Error("Test error object 10") ]);
		log.error([ "Test error 11", "Test error 12" ], [[ "Test param error 13", "Test param value 14" ]]);
		log.error("this is a test4", [[ "test6", true ],[ "test6", false ],[ "test7", "1111" ],[ "test8", [ 1, 2, 3 ]]]);
		logControl.useTags = true;
		const err = new Error("Test error object");
		err.stack = undefined;
		log.error(err);
		log.error(true);
		log.error(undefined);
		log.error({
			status: false,
			message: "Test error 15"
		});
		log.error({
			status: false,
			message: "Test error 16",
			messageX: "Test error 16 X"
		});
		log.error({
			status: false
		});
		log.error({
			status: false
		});
		const scaryOff = logControl.isTestsBlockScaryColors;
		logControl.isTestsBlockScaryColors = false;
		log.error("Scary error");
		log.error("error line1\nline2");
		log.error("error line1\r\nline2");
		log.error(new Error("Test error object"));
		logControl.useTags = false;
		logControl.isTestsBlockScaryColors = true;
		log.error("Scary error");
		logControl.isTestsBlockScaryColors = scaryOff;
		logErrorsAreFine(true);
		//
		// Disable logging
		//
		await executeSettingsUpdate("logging.enable", false);
		log.error("Test5 error");
		log.error("Test5 error");
		log.error(new Error("Test error object"));
		log.error([ "Test error 1", "Test error 2" ]);
		log.error([ "Test error 1", undefined, "Test error 2" ]);
		log.error([ "Test error 1",  new Error("Test error object") ]);
		log.error([ "Test error 1", "Test error 2" ], [[ "Test param error", "Test param value" ]]);
		log.error("this is a test4", [[ "test6", true ],[ "test6", false ],[ "test7", "1111" ],[ "test8", [ 1, 2, 3 ]]]);
		const err2 = new Error("Test error object");
		err2.stack = undefined;
		log.error(err2);
		//
		// Re-enable logging
		//
		await executeSettingsUpdate("logging.enable", true);
        endRollingCount(this);
    });


	test("Logging (File)", async function()
    {
        if (exitRollingCount(this)) return;
		this.slow((testControl.slowTime.config.event * 7) + 150);
		await executeSettingsUpdate("logging.enableFile", false);
		await executeSettingsUpdate("logging.enableFile", true);
		log.write("Test1", 1);
		log.value("Test2", "value", 1);
		log.error("Test3 error");
		log.error({});
		log.error("error line1\nline2");
		log.error("error line1\r\nline2");
		log.error(new Error("Test error object"));
		log.error([ "Test error 1", "Test error 2" ]);
		log.error("Test4 error", [[ "p1", "e1" ]]);
		await executeSettingsUpdate("logging.enableFileSymbols", true);
		log.write("Test1", 1);
		log.value("Test2", "value", 1);
		log.error("Test2 error");
		log.error(new Error("Test error object"));
		log.error([ "Test error 1", "Test error 2" ]);
		log.error("Test4 error", [[ "p1", "e1" ]]);
		await executeSettingsUpdate("logging.enableFileSymbols", false);
		log.write("Test1", 1);
		log.value("Test2", "value", 1);
		logErrorsAreFine(true);
		log.error("Error1");
		log.warn("Warning1");
		log.value("Test3", "value3", 1);
		await executeSettingsUpdate("logging.enableFile", false);
		log.getLogFileName();
		//
		// Disable logging
		//
		await executeSettingsUpdate("logging.enable", false);
		log.error("Error1");
		log.warn("Warning1");
		//
		// Re-enable logging
		//
		await executeSettingsUpdate("logging.enable", true);
        endRollingCount(this);
	});


    test("Logging (Method)", async function()
    {
        if (exitRollingCount(this)) return;
		this.slow((testControl.slowTime.config.event * 2) + 75);

		log.methodStart("methodName");
		log.methodDone("methodName");
		log.methodStart("methodName", 1);
		log.methodDone("methodName", 1);
		log.methodStart("methodName", 1, "");
		log.methodDone("methodName", 1, "");
		log.methodStart("methodName", 1, "", false);
		log.methodDone("methodName", 1, "");
		log.methodStart("methodName", 1, "", true);
		log.methodDone("methodName", 1, "");
		log.methodStart("methodName", 1, "", false, [[ "p1", "v1" ]]);
		log.methodDone("methodName", 1, "", [[ "p2", "v2" ]]);
		//
		// Disable logging
		//
		await executeSettingsUpdate("logging.enable", false);
		log.methodStart("methodName");
		log.methodDone("methodName");
		//
		// Re-enable logging
		//
		await executeSettingsUpdate("logging.enable", true);
        endRollingCount(this);
    });


	test("Logging (Output Window)", async function()
    {
        if (exitRollingCount(this)) return;
		this.slow((testControl.slowTime.config.event * 2) + 50);
		await executeSettingsUpdate("logging.enableOutputWindow", true);
		log.write("Test1", 1);
		log.value("Test2", "value", 1);
		log.error("Test5 error");
		log.error(new Error("Test5 error"));
		log.error({});
		log.error(new Error("Test error object"));
		log.error([ "Test error 1", "Test error 2" ]);
		log.error("Test4 error", [[ "p1", "e1" ]]);
		await executeSettingsUpdate("logging.enableOutputWindow", false);
		log.write("Test1", 1);
		log.value("Test2", "value", 1);
		log.error("Test5 error");
		log.error({});
		log.error(new Error("Test error object"));
		log.error([ "Test error 1", "Test error 2" ]);
		log.error("Test4 error", [[ "p1", "e1" ]]);
        endRollingCount(this);
	});


	test("Logging (Queue)", async function()
    {
		this.slow((testControl.slowTime.config.event * 2) + 50);

        if (exitRollingCount(this)) return;
		log.dequeue("queueTestId");
		log.write("test1", 1, "", "queueTestId");
		log.write("test2", 1, "", "queueTestId");
		log.write("test3", 1, "", "queueTestId");
		log.value("test3", "value1", 1, "", "queueTestId");
		log.error("test4", undefined, "queueTestId");
		log.error("test5", [[ "param1", 1 ]], "queueTestId");
		log.error("error line1\nline2", undefined, "queueTestId");
		log.error("error line1\r\nline2", undefined, "queueTestId");
		log.error("error line1\r\nline2", undefined, "queueTestId");
		log.write("line1\r\nline2", 1, "   ", "queueTestId");
		log.error(new Error("Test error object"));
		log.dequeue("queueTestId");

		await executeSettingsUpdate("logging.enableFile", true);
		log.write("test1", 1, "", "queueTest2Id", false, false);
		log.error("test4", undefined, "queueTest2Id");
		log.value("test3", "value1", 1, "", "queueTest2Id");
		log.error("test5", [[ "param1", 1 ]], "queueTest2Id");
		log.error("error line1\nline2", undefined, "queueTest2Id");
		log.write("line1\r\nline2", 1, "   ", "queueTest2Id");
		log.dequeue("queueTest2Id");
		await executeSettingsUpdate("logging.enableFile", false);

        endRollingCount(this);
	});


    test("Logging (Value)", async function()
    {
        if (exitRollingCount(this)) return;
		this.slow((testControl.slowTime.config.event * 4) + 75);
        log.value(`        ${creator}.${extension}`, null);
        log.value(`        ${creator}.${extension}`, undefined);
		log.value(null as unknown as string, 1);
		log.value(undefined as unknown as string, 1);
		log.value("null value", null);
		log.value("empty string value", "");
		log.value("line break lf value", "line1\nline2");
		log.value("line break crlf value", "line1\r\nline2");
		await executeSettingsUpdate("logging.enableOutputWindow", false);
		log.value("null value", null);
		log.value("Test3", "value3", 1);
		await executeSettingsUpdate("logging.enableOutputWindow", true);
		log.value("", "");
		log.value("", null);
		log.value("", undefined);
		log.value("undefined value 1", undefined);
		log.value("undefined value 2", undefined, 1);
		log.values(1, "   ", [[ "Test5", "5" ]]);
		log.value("object value", {
			p1: 1,
			p2: "test"
		});
		//
		// Console On
		//
		log.setWriteToConsole(true);
		log.value("test", "1");
		log.value("test", "1", 1);
		log.value("test", "1", 5);
		//
		// Console Off
		//
		log.setWriteToConsole(false);
		//
		// Disable logging
		//
		await executeSettingsUpdate("logging.enable", false);
		log.value("test", "1");
		log.value(null as unknown as string, 1);
		log.value(undefined as unknown as string, 1);
		log.write("test");
		log.write("Test1", 1);
		log.write("Test1", 1);
		log.value("Test2", "value", 1);
		log.value("Test3", null, 1);
		log.value("Test4", undefined, 1);
		log.values(1, "   ", [[ "Test5", "5" ]]);
		//
		// Re-enable logging
		//
		await executeSettingsUpdate("logging.enable", true);
        endRollingCount(this);
    });


    test("Logging (Warn)", async function()
    {
        if (exitRollingCount(this)) return;
		this.slow((testControl.slowTime.config.event * 2) + 50);
		log.warn("test1");
		log.warn("test2");
		const scaryOff = logControl.isTestsBlockScaryColors;
		logControl.isTestsBlockScaryColors = false;
		log.warn("test3");
		logControl.isTestsBlockScaryColors = true;
		log.warn("test3");
		logControl.isTestsBlockScaryColors = scaryOff;
		//
		// Disable logging
		//
		await executeSettingsUpdate("logging.enable", false);
		log.warn("test1");
		log.warn("test2");
		//
		// Re-enable logging
		//
		await executeSettingsUpdate("logging.enable", true);
        endRollingCount(this);
    });


    test("Logging (Write)", async function()
    {
        if (exitRollingCount(this)) return;
		this.slow((testControl.slowTime.config.event * 2) + 65);

        log.blank();
        log.blank(1);
		log.withColor("test", log.colors.cyan);
		log.write(null as unknown as string);
		log.write(undefined as unknown as string);
		log.write("");
		log.write("");
		//
		// Console On
		//
		log.setWriteToConsole(true);
		log.write("test");
		//
		// Console Off
		//
		log.setWriteToConsole(false);
		//
		// Tags
		//
		const useTags = logControl.useTags;
		logControl.useTags = false;
		log.blank(2);
		log.write("test1");
		logControl.useTags = true;
		log.blank(3);
		log.write("test1", 1);
		logControl.useTags = useTags;
		//
		// Disable logging
		//
		await executeSettingsUpdate("logging.enable", false);
		log.blank(1);
		log.dequeue("");
		log.withColor("test", log.colors.cyan);
		log.write("test");
		log.write("Test1", 1);
		log.write("Test1", 1);
		//
		// Re-enable logging
		//
		await executeSettingsUpdate("logging.enable", true);
        endRollingCount(this);
    });


    test("Miscellaneous", async function()
    {
        if (exitRollingCount(this)) return;
        const item = new InitScripts(teApi.testsApi.explorer); // it won't cover since no focus the view until after a bunch of test suites
		// item.dispose();
        teApi.testsApi.explorer.isVisible();
        await pathUtils.getInstallPath();
        endRollingCount(this);
    });


    test("Utilities", async function()
    {
        if (exitRollingCount(this)) return;
		this.slow((testControl.slowTime.config.event * 2) + 50);

        util.timeout(10);

        expect(util.camelCase("taskexplorer", 4)).to.be.equal("taskExplorer");
        expect(util.camelCase(undefined, 4)).to.be.equal(undefined);
        expect(util.camelCase("testgreaterindex", 19)).to.be.equal("testgreaterindex");
        expect(util.camelCase("test", -1)).to.be.equal("test");

        expect(util.properCase("taskexplorer")).to.be.equal("Taskexplorer");
        expect(util.properCase(undefined)).to.be.equal("");
		expect(util.properCase("dc is here", true)).to.be.equal("DcIsHere");
		expect(util.properCase("dc is here", false)).to.be.equal("Dc Is Here");
		expect(util.properCase("dc is here")).to.be.equal("Dc Is Here");
		expect(util.properCase("dc was here", true)).to.be.equal("DcWasHere");
		expect(util.properCase("dc was here", false)).to.be.equal("Dc Was Here");
		expect(util.properCase(undefined)).to.equal("");
		expect(util.properCase("")).to.equal("");

        expect(util.isScriptType("batch"));
        expect(util.getScriptTaskTypes().length > 0);

        const arr = [ 1, 2, 3, 4, 5 ];
        util.removeFromArray(arr, 3);
        util.removeFromArray(arr, 1);
        expect(arr.length).to.be.equal(3);

        expect(pathUtils.getCwd(rootUri)).to.not.be.equal(undefined);
        expect (util.getGroupSeparator()).to.be.equal("-");

		expect(util.lowerCaseFirstChar("s", true)).to.be.equal("s");
		expect(util.lowerCaseFirstChar("s", false)).to.be.equal("s");
		expect(util.lowerCaseFirstChar("S", true)).to.be.equal("s");
		expect(util.lowerCaseFirstChar("S", false)).to.be.equal("s");
		expect(util.lowerCaseFirstChar("scott meesseman", true)).to.be.equal("scottmeesseman");
		expect(util.lowerCaseFirstChar("Scott meesseman", false)).to.be.equal("scott meesseman");
		expect(util.lowerCaseFirstChar("TestApp", true)).to.be.equal("testApp");
		expect(util.lowerCaseFirstChar("testApp", false)).to.be.equal("testApp");
		expect(util.lowerCaseFirstChar("test App", true)).to.be.equal("testApp");

		util.getTaskTypeFriendlyName("Workspace");
		util.getTaskTypeFriendlyName("Workspace", true);
		util.getTaskTypeFriendlyName("apppublisher");
		util.getTaskTypeFriendlyName("apppublisher", true);
		util.getTaskTypeFriendlyName("tsc");
		util.getTaskTypeFriendlyName("tsc", true);
		util.getTaskTypeFriendlyName("ant");
		util.getTaskTypeFriendlyName("ant", true);

		expect(util.isNumber(10)).to.equal(true);
		expect(util.isNumber(0)).to.equal(true);
		expect(util.isNumber(undefined)).to.equal(false);
		expect(util.isNumber("not a number")).to.equal(false);
		expect(util.isNumber({ test: true })).to.equal(false);
		expect(util.isNumber([ 1, 2 ])).to.equal(false);

		expect(util.isObject("1")).to.equal(false);
		expect(util.isObject(1)).to.equal(false);
		expect(util.isObject([])).to.equal(false);
		expect(util.isObject([ "1" ])).to.equal(false);
		expect(util.isObject({ a: 1 })).to.equal(true);
		expect(util.isObjectEmpty({})).to.equal(true);
		expect(util.isObjectEmpty({ a: 1 })).to.equal(false);
		util.isObjectEmpty([]);
		util.isObjectEmpty([ 1, 2 ]);
		util.isObjectEmpty(this);
		util.isObjectEmpty(workspace);
		util.isObjectEmpty(Object.setPrototypeOf({}, { a: 1}));
		util.isObjectEmpty(Object.setPrototypeOf({ a: 1 }, { b: 1}));
		util.isObjectEmpty({ ...Object.setPrototypeOf({ a: 1 }, { b: 1}) });
		util.isObjectEmpty("aaa" as unknown as object);
		util.isObjectEmpty("" as unknown as object);
		util.isObjectEmpty(undefined as unknown as object);

        endRollingCount(this);
	});


	test("Data Paths", async function()
	{
        if (exitRollingCount(this)) return;
		//
		// The fs module on dev test will run through win32 path get.  Simulate
		// path get here for linux and mac for increased coverage since we're only
		// running the tests in a windows machine for release right now with ap.
		//
		let dataPath: string | undefined = pathUtils.getUserDataPath("darwin");
		dataPath = pathUtils.getUserDataPath("linux");

		pathUtils.getPortableDataPath();

		//
		// Simulate --user-data-dir vscode command line option
		//
		const oArgv = process.argv;
		process.argv = [ "--user-data-dir", dataPath ];
		dataPath = pathUtils.getUserDataPath("linux");
		dataPath = pathUtils.getUserDataPath("win32");
		dataPath = pathUtils.getUserDataPath("darwin");

		//
		// 0 args, which would probably never happen but the pathUtils.getUserDataPath() call
		// handles it an ;et's cover it
		//
		process.argv = [];
		dataPath = pathUtils.getUserDataPath("win32");

		//
		// Save current environment
		//
		dataPath = process.env.VSCODE_PORTABLE;
		const dataPath1 = dataPath;
		const dataPath2 = process.env.APPDATA;
		const dataPath3 = process.env.USERPROFILE;
		const dataPath4 = process.env.VSCODE_APPDATA;
		//
		// Set environment variables for specific test
		//
		process.env.VSCODE_PORTABLE = pathUtils.getUserDataPath("win32");
		process.env.APPDATA = "";
		process.env.USERPROFILE = "test";
		dataPath = pathUtils.getUserDataPath("win32");
		expect(dataPath).to.be.equal(`C:\\Projects\\${extension}\\.vscode-test\\vscode-win32-x64-archive-${env.vsCodeTestVersion}\\test\\AppData\\Roaming\\vscode`);
		//
		// Set environment variables for specific test
		//
		dataPath = "";
		process.env.VSCODE_PORTABLE = dataPath;
		process.env.APPDATA = dataPath2;
		process.env.USERPROFILE = dataPath3;
		dataPath = pathUtils.getUserDataPath("nothing");
		expect(dataPath).to.be.oneOf([ `C:\\Projects\\${extension}\\.vscode-test\\vscode-win32-x64-archive-${env.vsCodeTestVersion}`, "C:\\Code\\data\\user-data\\User\\user-data\\User" ]);
		//
		// Set environment variables for specific test
		//
		process.env.VSCODE_PORTABLE = undefined;
		process.env.APPDATA = dataPath2;
		process.env.USERPROFILE = dataPath3;
		dataPath = pathUtils.getUserDataPath("win32");
		expect(dataPath).to.be.equal("C:\\Users\\smeesseman.PERRYJOHNSON01\\AppData\\Roaming\\vscode");
		//
		// Set environment variables for specific test
		//
		process.env.VSCODE_PORTABLE = "c:\\some\\invalid\\path";
		process.env.APPDATA = dataPath2;
		process.env.USERPROFILE = dataPath3;
		dataPath = pathUtils.getUserDataPath("win32");
		expect(dataPath).to.be.equal("C:\\Users\\smeesseman.PERRYJOHNSON01\\AppData\\Roaming\\vscode");
		//
		// Set environment variables for specific test
		//
		process.env.VSCODE_PORTABLE = "C:\\Code\\data\\user-data\\User\\workspaceStorage";
		process.env.APPDATA = "";
		process.env.USERPROFILE = "";
		dataPath = pathUtils.getUserDataPath("win32");
		expect(dataPath).to.be.equal("C:\\Code\\data\\user-data\\User\\workspaceStorage\\user-data\\User");
		//
		// Set environment variables for specific test
		//
		process.env.VSCODE_PORTABLE = "";
		process.env.APPDATA = "";
		process.env.USERPROFILE = "";
		dataPath = pathUtils.getUserDataPath("win32");
		expect(dataPath).to.be.equal(`C:\\Projects\\${extension}\\.vscode-test\\vscode-win32-x64-archive-${env.vsCodeTestVersion}\\AppData\\Roaming\\vscode`);
		//
		// Set environment variables for specific test
		//
		process.env.VSCODE_PORTABLE = "";
		process.env.APPDATA = "";
		process.env.USERPROFILE = "";
		process.env.VSCODE_APPDATA = "";
		dataPath = pathUtils.getUserDataPath("linux");
		expect(dataPath).to.be.equal(`C:\\Projects\\${extension}\\.vscode-test\\vscode-win32-x64-archive-${env.vsCodeTestVersion}\\.config\\vscode`);
		dataPath = pathUtils.getUserDataPath("win32");
		expect(dataPath).to.be.equal(`C:\\Projects\\${extension}\\.vscode-test\\vscode-win32-x64-archive-${env.vsCodeTestVersion}\\AppData\\Roaming\\vscode`);
		dataPath = pathUtils.getUserDataPath("darwin");
		expect(dataPath).to.be.equal(`C:\\Projects\\${extension}\\.vscode-test\\vscode-win32-x64-archive-${env.vsCodeTestVersion}\\Library\\Application Support\\vscode`);
		dataPath = pathUtils.getUserDataPath("invalid_platform");
		expect(dataPath).to.be.equal(`C:\\Projects\\${extension}\\.vscode-test\\vscode-win32-x64-archive-${env.vsCodeTestVersion}`);
		//
		// Set environment variables for specific test
		//
		process.env.VSCODE_APPDATA = "C:\\Code\\data\\user-data\\User\\workspaceStorage";
		dataPath = pathUtils.getUserDataPath("linux");
		expect(dataPath).to.be.equal("C:\\Code\\data\\user-data\\User\\workspaceStorage\\vscode");
		dataPath = pathUtils.getUserDataPath("win32");
		expect(dataPath).to.be.equal("C:\\Code\\data\\user-data\\User\\workspaceStorage\\vscode");
		dataPath = pathUtils.getUserDataPath("darwin");
		expect(dataPath).to.be.equal("C:\\Code\\data\\user-data\\User\\workspaceStorage\\vscode");
		dataPath = pathUtils.getUserDataPath("invalid_platform");
		expect(dataPath).to.be.equal("C:\\Code\\data\\user-data\\User\\workspaceStorage\\vscode");
		//
		// Set portable / invalid platform
		//
		process.env.VSCODE_PORTABLE = "C:\\Code\\data\\user-data\\User\\workspaceStorage";
		dataPath = pathUtils.getUserDataPath("invalid_platform");
		expect(dataPath).to.be.equal("C:\\Code\\data\\user-data\\User\\workspaceStorage\\user-data\\User");
		//
		// Empty platform
		//
		dataPath = pathUtils.getUserDataPath("");
		process.env.VSCODE_PORTABLE = "";
		dataPath = pathUtils.getUserDataPath("");
		//
		//
		// Restore process argv
		//
		process.argv = oArgv;
		//
		// Restore environment
		//
		process.env.VSCODE_PORTABLE = dataPath1;
		process.env.APPDATA = dataPath2;
		process.env.USERPROFILE = dataPath3;
		process.env.VSCODE_APPDATA = dataPath4;

        endRollingCount(this);
	});


	test("File System", async function()
    {
        if (exitRollingCount(this)) return;
		await afs.deleteDir(join(__dirname, "folder1", "folder2", "folder3"));
		await afs.createDir(__dirname);
		try {
			await afs.copyDir(join(__dirname, "folder1"), join(__dirname, "folder2"));
		} catch {}
		try {
			await afs.copyFile(join(__dirname, "folder1", "noFile.txt"), join(__dirname, "folder2"));
		} catch {}
		try {
			await afs.copyDir(join(getWsPath("."), "hello.bat"), join(__dirname, "folder2"));
		} catch {}
		await afs.createDir(join(__dirname, "folder1", "folder2", "folder3", "folder4"));
		await afs.copyDir(join(__dirname, "folder1"), join(__dirname, "folder5"), undefined, true);
		await afs.copyDir(join(__dirname, "folder1"), join(__dirname, "folder6"));
		await afs.copyDir(join(__dirname, "folder1"), join(__dirname, "folder7"), /folder/, true);
		await afs.deleteDir(join(__dirname, "folder1", "folder2", "folder3"));
		await afs.deleteDir(join(__dirname, "folder1"));
		await afs.deleteDir(join(__dirname, "folder5"));
		await afs.deleteDir(join(__dirname, "folder6"));
		await afs.deleteDir(join(__dirname, "folder7"));
		await afs.createDir(join(__dirname, "folder1"));
		await afs.deleteFile(join(__dirname, "folder1", "file1.png"));
		await afs.writeFile(join(__dirname, "folder1", "file1.png"), "");
		try { await afs.readFileAsync(join(__dirname, "folder1", "file1.png")); } catch {}
		try { await afs.readJsonAsync(join(__dirname, "folder1", "file1.png")); } catch {}
		try { afs.readFileSync(join(__dirname, "folder1", "file1.png")); } catch {}
		try { afs.readJsonSync(join(__dirname, "folder1", "file1.png")); } catch {}
		await afs.copyFile(join(__dirname, "folder1", "file1.png"), join(__dirname, "folder1", "file2.png"));
		await afs.copyFile(join(__dirname, "folder1", "file1.png"), join(__dirname, "folder1", "file2.png"));
		await afs.deleteDir(join(__dirname, "folder1"));
		try { await afs.readFileAsync(join(__dirname, "folder1", "file1.png")); } catch {}
		try { afs.readFileSync(join(__dirname, "folder1", "file1.png")); } catch {}
		await afs.numFilesInDirectory(rootUri.fsPath);
		try {
			await afs.numFilesInDirectory(join(rootUri.fsPath, "tasks_test_"));
		}
		catch {}
		await afs.getDateModified(join(__dirname, "folder1", "folder2", "folder3"));
		await afs.getDateModified(join(__dirname, "hello.sh"));
		await afs.getDateModified(__dirname);
		await afs.getDateModified("");
		await afs.getDateModified(null as unknown as string);
		try { await afs.writeFile(getWsPath("."), "its a dir"); } catch {}
		try { afs.writeFileSync(getWsPath("."), "its a dir"); } catch {}
        endRollingCount(this);
	});


    test("Storage", async function()
    {
        if (exitRollingCount(this)) return;
        if (teApi.testsApi.storage)
        {
            await teApi.testsApi.storage.update("TEST_KEY", "This is a test");
            expect(teApi.testsApi.storage.get<string>("TEST_KEY")).to.be.equal("This is a test");
            expect(teApi.testsApi.storage.get<string>("TEST_KEY_DOESNT_EXIST", "defValue")).to.be.equal("defValue");
            await teApi.testsApi.storage.update("TEST_KEY", "");
            expect(teApi.testsApi.storage.get<string>("TEST_KEY_DOESNT_EXIST", "defValue")).to.be.equal("defValue");
            await teApi.testsApi.storage.update("TEST_KEY", undefined);
			expect(teApi.testsApi.storage.get<string>("TEST_KEY2_DOESNT_EXIST")).to.be.equal(undefined);
			expect(teApi.testsApi.storage.get<number>("TEST_KEY2_DOESNT_EXIST", 0)).to.be.equal(0);
			expect(teApi.testsApi.storage.get<string>("TEST_KEY2_DOESNT_EXIST", "")).to.be.equal("");

            await teApi.testsApi.storage.update2("TEST_KEY", "This is a test");
            expect(await teApi.testsApi.storage.get2<string>("TEST_KEY")).to.be.equal("This is a test");
            expect(await teApi.testsApi.storage.get2<string>("TEST_KEY", "some other value")).to.be.equal("This is a test");
            expect(await teApi.testsApi.storage.get2<string>("TEST_KEY_DOESNT_EXIST", "defValue")).to.be.equal("defValue");
            await teApi.testsApi.storage.update2("TEST_KEY", "");
            expect(await teApi.testsApi.storage.get2<string>("TEST_KEY_DOESNT_EXIST", "defValue")).to.be.equal("defValue");
            await teApi.testsApi.storage.update2("TEST_KEY", undefined);
			expect(await teApi.testsApi.storage.get2<string>("TEST_KEY2_DOESNT_EXIST")).to.be.equal(undefined);
			expect(await teApi.testsApi.storage.get2<number>("TEST_KEY2_DOESNT_EXIST", 0)).to.be.equal(0);
			expect(await teApi.testsApi.storage.get2<string>("TEST_KEY2_DOESNT_EXIST", "")).to.be.equal("");

			log.write("STORAGE KEYS: " + teApi.testsApi.storage.keys().join(", "));
        }
        endRollingCount(this);
    });

});
