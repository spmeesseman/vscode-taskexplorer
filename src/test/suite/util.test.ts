/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* tslint:disable */

import { join } from "path";
import { env } from "process";
import { expect } from "chai";
import { Uri, workspace, WorkspaceFolder } from "vscode";
import { ITeWrapper } from "@spmeesseman/vscode-taskexplorer-types";
import { executeSettingsUpdate, executeTeCommand2 } from "../utils/commandUtils";
import {
	activate, testControl, logErrorsAreFine, suiteFinished, exitRollingCount, getWsPath, endRollingCount, sleep
} from "../utils/utils";

const creator = "spmeesseman",
	  extension = "vscode-taskexplorer";

let rootUri: Uri;
let teWrapper: ITeWrapper;


suite("Util Tests", () =>
{

	suiteSetup(async function()
    {
        if (exitRollingCount(this, true)) return;
        ({ teWrapper } = await activate(this));
		rootUri = (workspace.workspaceFolders as WorkspaceFolder[])[0].uri;
        await executeSettingsUpdate("logging.enable", true);
        await executeSettingsUpdate("logging.enableOutputWindow", true);
		await executeSettingsUpdate("logging.level", 3);
        endRollingCount(this, true);
	});


	suiteTeardown(async function()
	{
        if (exitRollingCount(this, false, true)) return;
		teWrapper.log.setWriteToConsole(teWrapper.logControl.console, teWrapper.logControl.consoleLevel);
		await executeSettingsUpdate("logging.enable", teWrapper.logControl.enabled);
		await executeSettingsUpdate("logging.enableFile", teWrapper.logControl.file);
		await executeSettingsUpdate("logging.enableOutputWindow", teWrapper.logControl.output);
		await executeSettingsUpdate("logging.enableFileSymbols", teWrapper.logControl.fileSymbols);
		await executeSettingsUpdate("logging.level", teWrapper.logControl.level);
        suiteFinished(this);
	});


    test("Hide / Show Output Window", async function()
    {
        if (exitRollingCount(this)) return;
		this.slow((testControl.slowTime.commands.showOutput * 2) + 50);
        await executeTeCommand2("showOutput", [ false ]);
		await sleep(25);
        await executeTeCommand2("showOutput", [ true ]);
        endRollingCount(this);
    });


    test("Logging (Error)", async function()
    {
        if (exitRollingCount(this)) return;
		this.slow((testControl.slowTime.config.event * 2) + 175);

        teWrapper.log.error(`        ${creator}.${extension}`);
        teWrapper.log.error([ `        ${creator}.${extension}`,
                    `        ${creator}.${extension}`,
                    `        ${creator}.${extension}` ]);

		teWrapper.log.error("Test5 error");
		teWrapper.log.error(new Error("Test error object"));
		teWrapper.log.error([ "Test error 1", "Test error 2" ]);
		teWrapper.log.error([ "Test error 3", null, "Test error 4", "" ]);
		teWrapper.log.error([ "Test error 3", "Test error 4" ]);
		teWrapper.log.error([ "Test error 3", "Test error 4" ]);
		teWrapper.log.error([ "", "Test error 5", undefined, "Test error 6", "" ]);
		teWrapper.log.error([ "Test error 7", "", "Test error 8", "" ]);
		teWrapper.log.error([ "Test error 9",  new Error("Test error object 10") ]);
		teWrapper.log.error([ "Test error 11", "Test error 12" ], [[ "Test param error 13", "Test param value 14" ]]);
		teWrapper.log.error("this is a test4", [[ "test6", true ],[ "test6", false ],[ "test7", "1111" ],[ "test8", [ 1, 2, 3 ]]]);
		teWrapper.logControl.useTags = true;
		const err = new Error("Test error object");
		err.stack = undefined;
		teWrapper.log.error(err);
		teWrapper.log.error(true);
		teWrapper.log.error(undefined);
		teWrapper.log.error({
			status: false,
			message: "Test error 15"
		});
		teWrapper.log.error({
			status: false,
			message: "Test error 16",
			messageX: "Test error 16 X"
		});
		teWrapper.log.error({
			status: false
		});
		teWrapper.log.error({
			status: false
		});
		const scaryOff = teWrapper.logControl.isTestsBlockScaryColors;
		teWrapper.logControl.isTestsBlockScaryColors = false;
		teWrapper.log.error("Scary error");
		teWrapper.log.error("error line1\nline2");
		teWrapper.log.error("error line1\r\nline2");
		teWrapper.log.error(new Error("Test error object"));
		teWrapper.logControl.useTags = false;
		teWrapper.logControl.isTestsBlockScaryColors = true;
		teWrapper.log.error("Scary error");
		teWrapper.logControl.isTestsBlockScaryColors = scaryOff;
		logErrorsAreFine(true);
		//
		// Disable logging
		//
		await executeSettingsUpdate("logging.enable", false);
		teWrapper.log.error("Test5 error");
		teWrapper.log.error("Test5 error");
		teWrapper.log.error(new Error("Test error object"));
		teWrapper.log.error([ "Test error 1", "Test error 2" ]);
		teWrapper.log.error([ "Test error 1", undefined, "Test error 2" ]);
		teWrapper.log.error([ "Test error 1",  new Error("Test error object") ]);
		teWrapper.log.error([ "Test error 1", "Test error 2" ], [[ "Test param error", "Test param value" ]]);
		teWrapper.log.error("this is a test4", [[ "test6", true ],[ "test6", false ],[ "test7", "1111" ],[ "test8", [ 1, 2, 3 ]]]);
		const err2 = new Error("Test error object");
		err2.stack = undefined;
		teWrapper.log.error(err2);
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
		teWrapper.log.write("Test1", 1);
		teWrapper.log.value("Test2", "value", 1);
		teWrapper.log.error("Test3 error");
		teWrapper.log.error({});
		teWrapper.log.error("error line1\nline2");
		teWrapper.log.error("error line1\r\nline2");
		teWrapper.log.error(new Error("Test error object"));
		teWrapper.log.error([ "Test error 1", "Test error 2" ]);
		teWrapper.log.error("Test4 error", [[ "p1", "e1" ]]);
		await executeSettingsUpdate("logging.enableFileSymbols", true);
		teWrapper.log.write("Test1", 1);
		teWrapper.log.value("Test2", "value", 1);
		teWrapper.log.error("Test2 error");
		teWrapper.log.error(new Error("Test error object"));
		teWrapper.log.error([ "Test error 1", "Test error 2" ]);
		teWrapper.log.error("Test4 error", [[ "p1", "e1" ]]);
		await executeSettingsUpdate("logging.enableFileSymbols", false);
		teWrapper.log.write("Test1", 1);
		teWrapper.log.value("Test2", "value", 1);
		logErrorsAreFine(true);
		teWrapper.log.error("Error1");
		teWrapper.log.warn("Warning1");
		teWrapper.log.value("Test3", "value3", 1);
		await executeSettingsUpdate("logging.enableFile", false);
		teWrapper.log.getLogFileName();
		//
		// Disable logging
		//
		await executeSettingsUpdate("logging.enable", false);
		teWrapper.log.error("Error1");
		teWrapper.log.warn("Warning1");
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

		teWrapper.log.methodStart("methodName");
		teWrapper.log.methodDone("methodName");
		teWrapper.log.methodStart("methodName", 1);
		teWrapper.log.methodDone("methodName", 1);
		teWrapper.log.methodStart("methodName", 1, "");
		teWrapper.log.methodDone("methodName", 1, "");
		teWrapper.log.methodStart("methodName", 1, "", false);
		teWrapper.log.methodDone("methodName", 1, "");
		teWrapper.log.methodStart("methodName", 1, "", true);
		teWrapper.log.methodDone("methodName", 1, "");
		teWrapper.log.methodStart("methodName", 1, "", false, [[ "p1", "v1" ]]);
		teWrapper.log.methodDone("methodName", 1, "", [[ "p2", "v2" ]]);
		//
		// Disable logging
		//
		await executeSettingsUpdate("logging.enable", false);
		teWrapper.log.methodStart("methodName");
		teWrapper.log.methodDone("methodName");
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
		teWrapper.log.write("Test1", 1);
		teWrapper.log.value("Test2", "value", 1);
		teWrapper.log.error("Test5 error");
		teWrapper.log.error(new Error("Test5 error"));
		teWrapper.log.error({});
		teWrapper.log.error(new Error("Test error object"));
		teWrapper.log.error([ "Test error 1", "Test error 2" ]);
		teWrapper.log.error("Test4 error", [[ "p1", "e1" ]]);
		await executeSettingsUpdate("logging.enableOutputWindow", false);
		teWrapper.log.write("Test1", 1);
		teWrapper.log.value("Test2", "value", 1);
		teWrapper.log.error("Test5 error");
		teWrapper.log.error({});
		teWrapper.log.error(new Error("Test error object"));
		teWrapper.log.error([ "Test error 1", "Test error 2" ]);
		teWrapper.log.error("Test4 error", [[ "p1", "e1" ]]);
        endRollingCount(this);
	});


	test("Logging (Queue)", async function()
    {
		this.slow((testControl.slowTime.config.event * 2) + 50);

        if (exitRollingCount(this)) return;
		teWrapper.log.dequeue("queueTestId");
		teWrapper.log.write("test1", 1, "", "queueTestId");
		teWrapper.log.write("test2", 1, "", "queueTestId");
		teWrapper.log.write("test3", 1, "", "queueTestId");
		teWrapper.log.value("test3", "value1", 1, "", "queueTestId");
		teWrapper.log.error("test4", undefined, "queueTestId");
		teWrapper.log.error("test5", [[ "param1", 1 ]], "queueTestId");
		teWrapper.log.error("error line1\nline2", undefined, "queueTestId");
		teWrapper.log.error("error line1\r\nline2", undefined, "queueTestId");
		teWrapper.log.error("error line1\r\nline2", undefined, "queueTestId");
		teWrapper.log.write("line1\r\nline2", 1, "   ", "queueTestId");
		teWrapper.log.error(new Error("Test error object"));
		teWrapper.log.dequeue("queueTestId");

		await executeSettingsUpdate("logging.enableFile", true);
		teWrapper.log.write("test1", 1, "", "queueTest2Id", false, false);
		teWrapper.log.error("test4", undefined, "queueTest2Id");
		teWrapper.log.value("test3", "value1", 1, "", "queueTest2Id");
		teWrapper.log.error("test5", [[ "param1", 1 ]], "queueTest2Id");
		teWrapper.log.error("error line1\nline2", undefined, "queueTest2Id");
		teWrapper.log.write("line1\r\nline2", 1, "   ", "queueTest2Id");
		teWrapper.log.dequeue("queueTest2Id");
		await executeSettingsUpdate("logging.enableFile", false);

        endRollingCount(this);
	});


    test("Logging (Value)", async function()
    {
        if (exitRollingCount(this)) return;
		this.slow((testControl.slowTime.config.event * 4) + 75);
        teWrapper.log.value(`        ${creator}.${extension}`, null);
        teWrapper.log.value(`        ${creator}.${extension}`, undefined);
		teWrapper.log.value(null as unknown as string, 1);
		teWrapper.log.value(undefined as unknown as string, 1);
		teWrapper.log.value("null value", null);
		teWrapper.log.value("empty string value", "");
		teWrapper.log.value("line break lf value", "line1\nline2");
		teWrapper.log.value("line break crlf value", "line1\r\nline2");
		await executeSettingsUpdate("logging.enableOutputWindow", false);
		teWrapper.log.value("null value", null);
		teWrapper.log.value("Test3", "value3", 1);
		await executeSettingsUpdate("logging.enableOutputWindow", true);
		teWrapper.log.value("", "");
		teWrapper.log.value("", null);
		teWrapper.log.value("", undefined);
		teWrapper.log.value("undefined value 1", undefined);
		teWrapper.log.value("undefined value 2", undefined, 1);
		teWrapper.log.values(1, "   ", [[ "Test5", "5" ]]);
		teWrapper.log.value("object value", {
			p1: 1,
			p2: "test"
		});
		//
		// Console On
		//
		teWrapper.log.setWriteToConsole(true);
		teWrapper.log.value("test", "1");
		teWrapper.log.value("test", "1", 1);
		teWrapper.log.value("test", "1", 5);
		//
		// Console Off
		//
		teWrapper.log.setWriteToConsole(false);
		//
		// Disable logging
		//
		await executeSettingsUpdate("logging.enable", false);
		teWrapper.log.value("test", "1");
		teWrapper.log.value(null as unknown as string, 1);
		teWrapper.log.value(undefined as unknown as string, 1);
		teWrapper.log.write("test");
		teWrapper.log.write("Test1", 1);
		teWrapper.log.write("Test1", 1);
		teWrapper.log.value("Test2", "value", 1);
		teWrapper.log.value("Test3", null, 1);
		teWrapper.log.value("Test4", undefined, 1);
		teWrapper.log.values(1, "   ", [[ "Test5", "5" ]]);
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
		teWrapper.log.warn("test1");
		teWrapper.log.warn("test2");
		const scaryOff = teWrapper.logControl.isTestsBlockScaryColors;
		teWrapper.logControl.isTestsBlockScaryColors = false;
		teWrapper.log.warn("test3");
		teWrapper.logControl.isTestsBlockScaryColors = true;
		teWrapper.log.warn("test3");
		teWrapper.logControl.isTestsBlockScaryColors = scaryOff;
		//
		// Disable logging
		//
		await executeSettingsUpdate("logging.enable", false);
		teWrapper.log.warn("test1");
		teWrapper.log.warn("test2");
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

        teWrapper.log.blank();
        teWrapper.log.blank(1);
		teWrapper.log.write(null as unknown as string);
		teWrapper.log.write(undefined as unknown as string);
		teWrapper.log.write("");
		teWrapper.log.write("");
		//
		// Console On
		//
		teWrapper.log.setWriteToConsole(true);
		teWrapper.log.write("test");
		//
		// Console Off
		//
		teWrapper.log.setWriteToConsole(false);
		//
		// Tags
		//
		const useTags = teWrapper.logControl.useTags;
		teWrapper.logControl.useTags = false;
		teWrapper.log.blank(2);
		teWrapper.log.write("test1");
		teWrapper.logControl.useTags = true;
		teWrapper.log.blank(3);
		teWrapper.log.write("test1", 1);
		teWrapper.log.withColor("Test1", teWrapper.figures.colors.blue);
		teWrapper.logControl.useTags = useTags;
		//
		// Disable logging
		//
		await executeSettingsUpdate("logging.enable", false);
		teWrapper.log.blank(1);
		teWrapper.log.dequeue("");
		teWrapper.log.write("test");
		teWrapper.log.write("Test1", 1);
		teWrapper.log.write("Test1", 1);
		teWrapper.log.withColor("Test1", teWrapper.figures.colors.blue);
		//
		// Re-enable logging
		//
		await executeSettingsUpdate("logging.enable", true);
        endRollingCount(this);
    });


    test("Miscellaneous", async function()
    {
        if (exitRollingCount(this)) return;
		teWrapper.explorer?.isVisible();
        await teWrapper.pathUtils.getInstallPath();
        endRollingCount(this);
    });


    test("Utilities", async function()
    {
        if (exitRollingCount(this)) return;
		this.slow((testControl.slowTime.config.event * 2) + 50);

        teWrapper.utils.timeout(10);

        expect(teWrapper.commonUtils.properCase("taskexplorer")).to.be.equal("Taskexplorer");
        expect(teWrapper.commonUtils.properCase(undefined)).to.be.equal("");
		expect(teWrapper.commonUtils.properCase("dc is here", true)).to.be.equal("DcIsHere");
		expect(teWrapper.commonUtils.properCase("dc is here", false)).to.be.equal("Dc Is Here");
		expect(teWrapper.commonUtils.properCase("dc is here")).to.be.equal("Dc Is Here");
		expect(teWrapper.commonUtils.properCase("dc was here", true)).to.be.equal("DcWasHere");
		expect(teWrapper.commonUtils.properCase("dc was here", false)).to.be.equal("Dc Was Here");
		expect(teWrapper.commonUtils.properCase(undefined)).to.equal("");
		expect(teWrapper.commonUtils.properCase("")).to.equal("");

        expect(teWrapper.taskUtils.isScriptType("batch"));
        expect(teWrapper.taskUtils.getScriptTaskTypes().length > 0);

        const arr = [ 1, 2, 3, 4, 5 ];
        teWrapper.utils.removeFromArray(arr, 3);
        teWrapper.utils.removeFromArray(arr, 1);
        expect(arr.length).to.be.equal(3);

        expect(teWrapper.pathUtils.getCwd(rootUri)).to.not.be.equal(undefined);
        expect (teWrapper.utils.getGroupSeparator()).to.be.equal("-");

		expect(teWrapper.utils.lowerCaseFirstChar("s", true)).to.be.equal("s");
		expect(teWrapper.utils.lowerCaseFirstChar("s", false)).to.be.equal("s");
		expect(teWrapper.utils.lowerCaseFirstChar("S", true)).to.be.equal("s");
		expect(teWrapper.utils.lowerCaseFirstChar("S", false)).to.be.equal("s");
		expect(teWrapper.utils.lowerCaseFirstChar("scott meesseman", true)).to.be.equal("scottmeesseman");
		expect(teWrapper.utils.lowerCaseFirstChar("Scott meesseman", false)).to.be.equal("scott meesseman");
		expect(teWrapper.utils.lowerCaseFirstChar("TestApp", true)).to.be.equal("testApp");
		expect(teWrapper.utils.lowerCaseFirstChar("testApp", false)).to.be.equal("testApp");
		expect(teWrapper.utils.lowerCaseFirstChar("test App", true)).to.be.equal("testApp");

		teWrapper.taskUtils.teWrappergetTaskTypeFriendlyName("Workspace");
		teWrapper.taskUtils.getTaskTypeFriendlyName("Workspace", true);
		teWrapper.taskUtils.getTaskTypeFriendlyName("apppublisher");
		teWrapper.taskUtils.getTaskTypeFriendlyName("apppublisher", true);
		teWrapper.taskUtils.getTaskTypeFriendlyName("tsc");
		teWrapper.taskUtils.getTaskTypeFriendlyName("tsc", true);
		teWrapper.taskUtils.getTaskTypeFriendlyName("ant");
		teWrapper.taskUtils.getTaskTypeFriendlyName("ant", true);

		expect(teWrapper.utils.isNumber(10)).to.equal(true);
		expect(teWrapper.utils.isNumber(0)).to.equal(true);
		expect(teWrapper.utils.isNumber(undefined)).to.equal(false);
		expect(teWrapper.utils.isNumber("not a number")).to.equal(false);
		expect(teWrapper.utils.isNumber({ test: true })).to.equal(false);
		expect(teWrapper.utils.isNumber([ 1, 2 ])).to.equal(false);

		expect(teWrapper.utils.isObject("1")).to.equal(false);
		expect(teWrapper.utils.isObject(1)).to.equal(false);
		expect(teWrapper.utils.isObject([])).to.equal(false);
		expect(teWrapper.utils.isObject([ "1" ])).to.equal(false);
		expect(teWrapper.utils.isObject({ a: 1 })).to.equal(true);
		expect(teWrapper.utils.isObjectEmpty({})).to.equal(true);
		expect(teWrapper.utils.isObjectEmpty({ a: 1 })).to.equal(false);
		teWrapper.utils.isObjectEmpty([]);
		teWrapper.utils.isObjectEmpty([ 1, 2 ]);
		teWrapper.utils.isObjectEmpty(this);
		teWrapper.utils.isObjectEmpty(workspace);
		teWrapper.utils.isObjectEmpty(Object.setPrototypeOf({}, { a: 1}));
		teWrapper.utils.isObjectEmpty(Object.setPrototypeOf({ a: 1 }, { b: 1}));
		teWrapper.utils.isObjectEmpty({ ...Object.setPrototypeOf({ a: 1 }, { b: 1}) });
		teWrapper.utils.isObjectEmpty("aaa" as unknown as object);
		teWrapper.utils.isObjectEmpty("" as unknown as object);
		teWrapper.utils.isObjectEmpty(undefined as unknown as object);

		const d1 = Date.now() - 6400000;
		const d2 = Date.now();
		const dt1 = new Date();
		teWrapper.utils.getDateDifference(d1, d2, "d");
		teWrapper.utils.getDateDifference(d1, d2, "h");
		teWrapper.utils.getDateDifference(d1, d2, "m");
		teWrapper.utils.getDateDifference(d1, d2, "s");
		teWrapper.utils.getDateDifference(d1, d2);
		teWrapper.utils.getDateDifference(dt1, d2, "d");
		teWrapper.utils.getDateDifference(dt1, d2, "h");
		teWrapper.utils.getDateDifference(dt1, d2, "m");
		teWrapper.utils.getDateDifference(dt1, d2, "s");
		teWrapper.utils.getDateDifference(dt1, d2);
		teWrapper.utils.getDateDifference(d1, dt1, "d");
		teWrapper.utils.getDateDifference(d1, dt1, "h");
		teWrapper.utils.getDateDifference(d1, dt1, "m");
		teWrapper.utils.getDateDifference(d1, dt1, "s");
		teWrapper.utils.getDateDifference(d1, dt1);
		teWrapper.utils.getDateDifference(d2, dt1, "d");
		teWrapper.utils.getDateDifference(d2, dt1, "h");
		teWrapper.utils.getDateDifference(d2, dt1, "m");
		teWrapper.utils.getDateDifference(d2, dt1, "s");
		teWrapper.utils.getDateDifference(d2, dt1);

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
		let dataPath: string = teWrapper.pathUtils.getUserDataPath("darwin");
		dataPath = teWrapper.pathUtils.getUserDataPath("linux");

		teWrapper.pathUtils.getPortableDataPath();

		//
		// Simulate --user-data-dir vscode command line option
		//
		const oArgv = process.argv;
		process.argv = [ "--user-data-dir", dataPath ];
		expect(teWrapper.pathUtils.getUserDataPath("linux")).to.be.equal(dataPath);
		expect(teWrapper.pathUtils.getUserDataPath("win32")).to.be.equal(dataPath);
		expect(teWrapper.pathUtils.getUserDataPath("darwin")).to.be.equal(dataPath);

		//
		// 0 args, which would probably never happen but the teWrapper.pathUtils.getUserDataPath() call
		// handles it an ;et's cover it
		//
		process.argv = [];
		dataPath = teWrapper.pathUtils.getUserDataPath("win32");

		//
		// Save current environment
		//
		dataPath = process.env.VSCODE_PORTABLE as string;
		const dataPath1 = dataPath;
		const dataPath2 = process.env.APPDATA;
		const dataPath3 = process.env.USERPROFILE;
		const dataPath4 = process.env.VSCODE_APPDATA;
		//
		// Set environment variables for specific test
		//
		process.env.VSCODE_PORTABLE = teWrapper.pathUtils.getUserDataPath("win32");
		process.env.APPDATA = "";
		process.env.USERPROFILE = "test";
		dataPath = teWrapper.pathUtils.getUserDataPath("win32");
		expect(dataPath).to.be.equal(`C:\\Projects\\${extension}\\.vscode-test\\vscode-win32-x64-archive-${env.vsCodeTestVersion}\\test\\AppData\\Roaming\\vscode`);
		//
		// Set environment variables for specific test
		//
		dataPath = "";
		process.env.VSCODE_PORTABLE = dataPath;
		process.env.APPDATA = dataPath2;
		process.env.USERPROFILE = dataPath3;
		dataPath = teWrapper.pathUtils.getUserDataPath("nothing");
		expect(dataPath).to.be.oneOf([ `C:\\Projects\\${extension}\\.vscode-test\\vscode-win32-x64-archive-${env.vsCodeTestVersion}`, "C:\\Code\\data\\user-data\\User\\user-data\\User" ]);
		//
		// Set environment variables for specific test
		//
		process.env.VSCODE_PORTABLE = undefined;
		process.env.APPDATA = dataPath2;
		process.env.USERPROFILE = dataPath3;
		dataPath = teWrapper.pathUtils.getUserDataPath("win32");
		expect(dataPath).to.be.equal("C:\\Users\\smeesseman.PERRYJOHNSON01\\AppData\\Roaming\\vscode");
		//
		// Set environment variables for specific test
		//
		process.env.VSCODE_PORTABLE = "c:\\some\\invalid\\path";
		process.env.APPDATA = dataPath2;
		process.env.USERPROFILE = dataPath3;
		dataPath = teWrapper.pathUtils.getUserDataPath("win32");
		expect(dataPath).to.be.equal("C:\\Users\\smeesseman.PERRYJOHNSON01\\AppData\\Roaming\\vscode");
		//
		// Set environment variables for specific test
		//
		process.env.VSCODE_PORTABLE = "C:\\Code\\data\\user-data\\User\\workspaceStorage";
		process.env.APPDATA = "";
		process.env.USERPROFILE = "";
		dataPath = teWrapper.pathUtils.getUserDataPath("win32");
		expect(dataPath).to.be.equal("C:\\Code\\data\\user-data\\User\\workspaceStorage\\user-data\\User");
		//
		// Set environment variables for specific test
		//
		process.env.VSCODE_PORTABLE = "";
		process.env.APPDATA = "";
		process.env.USERPROFILE = "";
		dataPath = teWrapper.pathUtils.getUserDataPath("win32");
		expect(dataPath).to.be.equal(`C:\\Projects\\${extension}\\.vscode-test\\vscode-win32-x64-archive-${env.vsCodeTestVersion}\\AppData\\Roaming\\vscode`);
		//
		// Set environment variables for specific test
		//
		process.env.VSCODE_PORTABLE = "";
		process.env.APPDATA = "";
		process.env.USERPROFILE = "";
		process.env.VSCODE_APPDATA = "";
		dataPath = teWrapper.pathUtils.getUserDataPath("linux");
		expect(dataPath).to.be.equal(`C:\\Projects\\${extension}\\.vscode-test\\vscode-win32-x64-archive-${env.vsCodeTestVersion}\\.config\\vscode`);
		dataPath = teWrapper.pathUtils.getUserDataPath("win32");
		expect(dataPath).to.be.equal(`C:\\Projects\\${extension}\\.vscode-test\\vscode-win32-x64-archive-${env.vsCodeTestVersion}\\AppData\\Roaming\\vscode`);
		dataPath = teWrapper.pathUtils.getUserDataPath("darwin");
		expect(dataPath).to.be.equal(`C:\\Projects\\${extension}\\.vscode-test\\vscode-win32-x64-archive-${env.vsCodeTestVersion}\\Library\\Application Support\\vscode`);
		dataPath = teWrapper.pathUtils.getUserDataPath("invalid_platform");
		expect(dataPath).to.be.equal(`C:\\Projects\\${extension}\\.vscode-test\\vscode-win32-x64-archive-${env.vsCodeTestVersion}`);
		//
		// Set environment variables for specific test
		//
		process.env.VSCODE_APPDATA = "C:\\Code\\data\\user-data\\User\\workspaceStorage";
		dataPath = teWrapper.pathUtils.getUserDataPath("linux");
		expect(dataPath).to.be.equal("C:\\Code\\data\\user-data\\User\\workspaceStorage\\vscode");
		dataPath = teWrapper.pathUtils.getUserDataPath("win32");
		expect(dataPath).to.be.equal("C:\\Code\\data\\user-data\\User\\workspaceStorage\\vscode");
		dataPath = teWrapper.pathUtils.getUserDataPath("darwin");
		expect(dataPath).to.be.equal("C:\\Code\\data\\user-data\\User\\workspaceStorage\\vscode");
		dataPath = teWrapper.pathUtils.getUserDataPath("invalid_platform");
		expect(dataPath).to.be.equal("C:\\Code\\data\\user-data\\User\\workspaceStorage\\vscode");
		//
		// Set portable / invalid platform
		//
		process.env.VSCODE_PORTABLE = "C:\\Code\\data\\user-data\\User\\workspaceStorage";
		dataPath = teWrapper.pathUtils.getUserDataPath("invalid_platform");
		expect(dataPath).to.be.equal("C:\\Code\\data\\user-data\\User\\workspaceStorage\\user-data\\User");
		//
		// Empty platform
		//
		dataPath = teWrapper.pathUtils.getUserDataPath("");
		process.env.VSCODE_PORTABLE = "";
		dataPath = teWrapper.pathUtils.getUserDataPath("");
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
		await teWrapper.fs.deleteDir(join(__dirname, "folder1", "folder2", "folder3"));
		await teWrapper.fs.createDir(__dirname);
		try {
			await teWrapper.fs.copyDir(join(__dirname, "folder1"), join(__dirname, "folder2"));
		} catch {}
		try {
			await teWrapper.fs.copyFile(join(__dirname, "folder1", "noFile.txt"), join(__dirname, "folder2"));
		} catch {}
		try {
			await teWrapper.fs.copyDir(join(getWsPath("."), "hello.bat"), join(__dirname, "folder2"));
		} catch {}
		await teWrapper.fs.createDir(join(__dirname, "folder1", "folder2", "folder3", "folder4"));
		await teWrapper.fs.copyDir(join(__dirname, "folder1"), join(__dirname, "folder5"), undefined, true);
		await teWrapper.fs.copyDir(join(__dirname, "folder1"), join(__dirname, "folder6"));
		await teWrapper.fs.copyDir(join(__dirname, "folder1"), join(__dirname, "folder7"), /folder/, true);
		await teWrapper.fs.deleteDir(join(__dirname, "folder1", "folder2", "folder3"));
		await teWrapper.fs.deleteDir(join(__dirname, "folder1"));
		await teWrapper.fs.deleteDir(join(__dirname, "folder5"));
		await teWrapper.fs.deleteDir(join(__dirname, "folder6"));
		await teWrapper.fs.deleteDir(join(__dirname, "folder7"));
		await teWrapper.fs.createDir(join(__dirname, "folder1"));
		await teWrapper.fs.deleteFile(join(__dirname, "folder1", "file1.png"));
		await teWrapper.fs.writeFile(join(__dirname, "folder1", "file1.png"), "");
		try { await teWrapper.fs.readFileAsync(join(__dirname, "folder1", "file1.png")); } catch {}
		try { await teWrapper.fs.readJsonAsync(join(__dirname, "folder1", "file1.png")); } catch {}
		try { teWrapper.fs.readFileSync(join(__dirname, "folder1", "file1.png")); } catch {}
		try { teWrapper.fs.readJsonSync(join(__dirname, "folder1", "file1.png")); } catch {}
		await teWrapper.fs.copyFile(join(__dirname, "folder1", "file1.png"), join(__dirname, "folder1", "file2.png"));
		await teWrapper.fs.copyFile(join(__dirname, "folder1", "file1.png"), join(__dirname, "folder1", "file2.png"));
		await teWrapper.fs.deleteDir(join(__dirname, "folder1"));
		try { await teWrapper.fs.readFileAsync(join(__dirname, "folder1", "file1.png")); } catch {}
		try { teWrapper.fs.readFileSync(join(__dirname, "folder1", "file1.png")); } catch {}
		await teWrapper.fs.numFilesInDirectory(rootUri.fsPath);
		try {
			await teWrapper.fs.numFilesInDirectory(join(rootUri.fsPath, "tasks_test_"));
		}
		catch {}
		await teWrapper.fs.getDateModified(join(__dirname, "folder1", "folder2", "folder3"));
		await teWrapper.fs.getDateModified(join(__dirname, "hello.sh"));
		await teWrapper.fs.getDateModified(__dirname);
		await teWrapper.fs.getDateModified("");
		await teWrapper.fs.getDateModified(null as unknown as string);
		try { await teWrapper.fs.writeFile(getWsPath("."), "its a dir"); } catch {}
		try { teWrapper.fs.writeFileSync(getWsPath("."), "its a dir"); } catch {}
        endRollingCount(this);
	});


    test("Storage", async function()
    {
        if (exitRollingCount(this)) return;
        if (teWrapper.storage)
        {
            await teWrapper.storage.update("TEST_KEY", "This is a test");
            expect(teWrapper.storage.get<string>("TEST_KEY")).to.be.equal("This is a test");
            expect(teWrapper.storage.get<string>("TEST_KEY_DOESNT_EXIST", "defValue")).to.be.equal("defValue");
            await teWrapper.storage.update("TEST_KEY", "");
            expect(teWrapper.storage.get<string>("TEST_KEY_DOESNT_EXIST", "defValue")).to.be.equal("defValue");
            await teWrapper.storage.update("TEST_KEY", undefined);
			expect(teWrapper.storage.get<string>("TEST_KEY2_DOESNT_EXIST")).to.be.equal(undefined);
			expect(teWrapper.storage.get<number>("TEST_KEY2_DOESNT_EXIST", 0)).to.be.equal(0);
			expect(teWrapper.storage.get<string>("TEST_KEY2_DOESNT_EXIST", "")).to.be.equal("");

            await teWrapper.storage.update2("TEST_KEY", "This is a test");
            expect(await teWrapper.storage.get2<string>("TEST_KEY")).to.be.equal("This is a test");
            expect(await teWrapper.storage.get2<string>("TEST_KEY", "some other value")).to.be.equal("This is a test");
            expect(await teWrapper.storage.get2<string>("TEST_KEY_DOESNT_EXIST", "defValue")).to.be.equal("defValue");
            await teWrapper.storage.update2("TEST_KEY", "");
            expect(await teWrapper.storage.get2<string>("TEST_KEY_DOESNT_EXIST", "defValue")).to.be.equal("defValue");
            await teWrapper.storage.update2("TEST_KEY", undefined);
			expect(await teWrapper.storage.get2<string>("TEST_KEY2_DOESNT_EXIST")).to.be.equal(undefined);
			expect(await teWrapper.storage.get2<number>("TEST_KEY2_DOESNT_EXIST", 0)).to.be.equal(0);
			expect(await teWrapper.storage.get2<string>("TEST_KEY2_DOESNT_EXIST", "")).to.be.equal("");

			const disposable = teWrapper.storage.onDidChangeSecrets(() => {});
			await sleep(1);
			disposable.dispose();

			teWrapper.log.write("STORAGE KEYS: " + teWrapper.storage.keys().join(", "));
        }
        endRollingCount(this);
    });

});
