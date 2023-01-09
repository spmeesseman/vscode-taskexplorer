/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* tslint:disable */

import * as assert from "assert";
import * as afs from "../../lib/utils/fs";
import * as util from "../../lib/utils/utils";
import log from "../../lib/utils/log";
import { join } from "path";
import { Uri, workspace, WorkspaceFolder } from "vscode";
import { storage } from "../../lib/utils/storage";
import { ITaskExplorerApi } from "@spmeesseman/vscode-taskexplorer-types";
import {
	activate, executeSettingsUpdate, overrideNextShowInputBox, testControl,
	logItsSupposedToHappenSoICanStopShittingMyselfOverRedErrorMsgs,
	executeTeCommand
} from "../helper";
import { expect } from "chai";

const creator = "spmeesseman",
	  extension = "vscode-taskexplorer";

let teApi: ITaskExplorerApi;
let rootUri: Uri;


suite("Util Tests", () =>
{

	suiteSetup(async function()
    {
        teApi = await activate(this);
		rootUri = (workspace.workspaceFolders as WorkspaceFolder[])[0].uri;
        if (!rootUri) {
            assert.fail("        ✘ Workspace folder does not exist");
        }
        await executeSettingsUpdate("logging.enable", true);
        await executeSettingsUpdate("logging.enableOutputWindow", true);
		await executeSettingsUpdate("logging.level", 3);
	});


	suiteTeardown(async function()
	{
		log.setWriteToConsole(testControl.logToConsole, testControl.logToConsoleLevel);
		await executeSettingsUpdate("logging.enable", testControl.logEnabled);
		await executeSettingsUpdate("logging.enableFile", testControl.logToFile);
		await executeSettingsUpdate("logging.enableOutputWindow", testControl.logToOutput);
		await executeSettingsUpdate("logging.enableFileSymbols", testControl.logToFileSymbols);
		await executeSettingsUpdate("logging.level", testControl.logLevel);
	});


    test("Hide / Show Output Window", async function()
    {
        await executeTeCommand("showOutput", 10, 50, false);
        await executeTeCommand("showOutput", 10, 50, true);
    });


    test("Logging", async function()
    {
        log.blank();
        log.write(`        ${creator}.${extension}`);
        log.value(`        ${creator}.${extension}`, "true");
        log.value(`        ${creator}.${extension}`, null);
        log.value(`        ${creator}.${extension}`, undefined);
        log.error(`        ${creator}.${extension}`);
        log.error([ `        ${creator}.${extension}`,
                    `        ${creator}.${extension}`,
                    `        ${creator}.${extension}` ]);
		log.methodStart("message");
		log.methodDone("message");

		log.setWriteToConsole(true);
		log.write("test");
		log.value("test", "1");
		log.value("test", "1", 1);
		log.value("test", "1", 5);
		log.setWriteToConsole(false);
		log.value(null as unknown as string, 1);
		log.value(undefined as unknown as string, 1);

		log.warn("test1");
		log.warn("test1");
		log.warn("test2");
		log.warn("test3");
		log.withColor("test", log.colors.cyan);

		log.write(null as unknown as string);
		log.write(undefined as unknown as string);
		log.blank();
		log.write("");
		log.write("");
		log.value("object value", {
			p1: 1,
			p2: "test"
		});
		log.value("null value", null);
		log.value("empty string value", "");
		log.value("line break value", "line1\nline2");
		log.value("undefined value 1", undefined);
		log.value("undefined value 2", undefined, 1);

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
		logItsSupposedToHappenSoICanStopShittingMyselfOverRedErrorMsgs(true);

		//
		// Disable logging
		//

		await executeSettingsUpdate("logging.enable", false);

		log.blank(1);
		log.dequeue("");
		log.warn("test1");
		log.warn("test2");
		log.withColor("test", log.colors.cyan);

		log.write("test");
		log.value("test", "1");
		log.value(null as unknown as string, 1);
		log.value(undefined as unknown as string, 1);

		log.write("Test1", 1);
		log.write("Test1", 1);
		log.value("Test2", "value", 1);
		log.value("Test3", null, 1);
		log.value("Test4", undefined, 1);

		log.values(1, "   ", [[ "Test5", "5" ]]);

		log.error("Test5 error");
		log.error("Test5 error");
		log.error(new Error("Test error object"));
		log.error([ "Test error 1", "Test error 2" ]);
		log.error([ "Test error 1", undefined, "Test error 2" ]);
		log.error([ "Test error 1",  new Error("Test error object") ]);
		log.error([ "Test error 1", "Test error 2" ], [[ "Test param error", "Test param value" ]]);
		log.error("this is a test4", [[ "test6", true ],[ "test6", false ],[ "test7", "1111" ],[ "test8", [ 1, 2, 3 ]]]);

		//
		// Re-enable logging
		//

		await executeSettingsUpdate("logging.enable", true);

        assert(util.camelCase("taskexplorer", 4) === "taskExplorer");
        assert(util.camelCase(undefined, 4) === undefined);
        assert(util.camelCase("testgreaterindex", 19) === "testgreaterindex");
        assert(util.camelCase("test", -1) === "test");

        assert(util.properCase("taskexplorer") === "Taskexplorer");
        assert(util.properCase(undefined) === "");

        assert(util.isScriptType("batch"));
        assert(util.getScriptTaskTypes().length > 0);

        const arr = [ 1, 2, 3, 4, 5 ];
        util.removeFromArray(arr, 3);
        util.removeFromArray(arr, 1);
        assert(arr.length === 3);

        assert(util.getCwd(rootUri) !== undefined);

        assert(util.timeout(10));

        assert (util.getGroupSeparator() === "-");

		util.lowerCaseFirstChar("s", true);
		util.lowerCaseFirstChar("s", false);
		expect(util.lowerCaseFirstChar("S", true)).to.be.equal("s");
		expect(util.lowerCaseFirstChar("S", false)).to.be.equal("s");
		expect(util.lowerCaseFirstChar("scott meesseman", true)).to.be.equal("scottmeesseman");
		expect(util.lowerCaseFirstChar("Scott meesseman", false)).to.be.equal("scott meesseman");
		expect(util.lowerCaseFirstChar("TestApp", true)).to.be.equal("testApp");
		expect(util.lowerCaseFirstChar("testApp", false)).to.be.equal("testApp");
		expect(util.lowerCaseFirstChar("test App", true)).to.be.equal("testApp");
    });


	test("Logging (Queue)", async function()
    {
		log.dequeue("queueTestId");
		log.write("test1", 1, "", "queueTestId");
		log.write("test2", 1, "", "queueTestId");
		log.write("test3", 1, "", "queueTestId");
		log.value("test3", "value1", 1, "", "queueTestId");
		log.error("test4", undefined, "queueTestId");
		log.error("test5", [[ "param1", 1 ]], "queueTestId");
		log.dequeue("queueTestId");
	});


	test("Logging (File)", async function()
    {
		await executeSettingsUpdate("logging.enableFile", true);
		log.write("Test1", 1);
		log.value("Test2", "value", 1);
		log.error("Test3 error");
		log.error({});
		log.error(new Error("Test error object"));
		log.error([ "Test error 1", "Test error 2" ]);
		log.error("Test4 error", [[ "p1", "e1" ]]);
		await executeSettingsUpdate("logging.enableFileSymbols", false);
		log.write("Test1", 1);
		log.value("Test2", "value", 1);
		log.error("Test2 error");
		log.error(new Error("Test error object"));
		log.error([ "Test error 1", "Test error 2" ]);
		log.error("Test4 error", [[ "p1", "e1" ]]);
		await executeSettingsUpdate("logging.enableFile", false);
		await executeSettingsUpdate("logging.enableFileSymbols", true);
		log.write("Test1", 1);
		log.value("Test2", "value", 1);
		await executeSettingsUpdate("logging.enableFile", true);
		log.value("Test3", "value3", 1);
		await executeSettingsUpdate("logging.enableFile", false);
		log.getLogFileName();
	});


	test("Logging (Output Window)", async function()
    {
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
		await executeSettingsUpdate("logging.enableOutputWindow", true);
		log.value("Test3", "value3", 1);
		await executeSettingsUpdate("logging.enableOutputWindow", false);
	});


    test("Miscellaneous", async function()
    {
		util.getTaskTypeFriendlyName("Workspace");
		util.getTaskTypeFriendlyName("Workspace", true);
		util.getTaskTypeFriendlyName("apppublisher");
		util.getTaskTypeFriendlyName("apppublisher", true);
		util.getTaskTypeFriendlyName("tsc");
		util.getTaskTypeFriendlyName("tsc", true);
		util.getTaskTypeFriendlyName("ant");
		util.getTaskTypeFriendlyName("ant", true);

		util.isObjectEmpty({});
		util.isObjectEmpty({ a: 1 });
		util.isObjectEmpty([]);
		util.isObjectEmpty([ 1, 2 ]);
		util.isObjectEmpty("aaa" as unknown as object);

		overrideNextShowInputBox("ok");
		util.showMaxTasksReachedMessage();
		overrideNextShowInputBox("ok");
		util.showMaxTasksReachedMessage("npm");
		overrideNextShowInputBox("ok");
		util.showMaxTasksReachedMessage("ant");
		overrideNextShowInputBox("ok");
		util.showMaxTasksReachedMessage("gulp");
		overrideNextShowInputBox("ok");
		util.showMaxTasksReachedMessage("grunt");
	});


	test("Data paths", async function()
	{   //
		// The fs module on dev test will run through win32 path get.  Simulate
		// path get here for linux and mac for increased coverage since we're only
		// running the tests in a windows machine for release right now with ap.
		//
		let dataPath: string | undefined = util.getUserDataPath("darwin");
		dataPath = util.getUserDataPath("linux");

		//
		// Simulate --user-data-dir vscode command line option
		//
		const oArgv = process.argv;
		process.argv = [ "--user-data-dir", dataPath ];
		dataPath = util.getUserDataPath("linux");
		dataPath = util.getUserDataPath("win32");
		dataPath = util.getUserDataPath("darwin");

		//
		// 0 args, which would probably never happen but the util.getUserDataPath() call
		// handles it an ;et's cover it
		//
		process.argv = [];
		dataPath = util.getUserDataPath("win32");

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
		process.env.VSCODE_PORTABLE = util.getUserDataPath("win32");
		process.env.APPDATA = "";
		process.env.USERPROFILE = "test";
		dataPath = util.getUserDataPath("win32");
		assert.strictEqual(dataPath, `C:\\Projects\\${extension}\\.vscode-test\\vscode-win32-archive-1.60.1\\test\\AppData\\Roaming\\vscode`);
		//
		// Set environment variables for specific test
		//
		dataPath = "";
		process.env.VSCODE_PORTABLE = dataPath;
		process.env.APPDATA = dataPath2;
		process.env.USERPROFILE = dataPath3;
		dataPath = util.getUserDataPath("nothing");
		assert.strictEqual(dataPath, `C:\\Projects\\${extension}\\.vscode-test\\vscode-win32-archive-1.60.1`);
		//
		// Set environment variables for specific test
		//
		process.env.VSCODE_PORTABLE = undefined;
		process.env.APPDATA = dataPath2;
		process.env.USERPROFILE = dataPath3;
		dataPath = util.getUserDataPath("win32");
		assert.strictEqual(dataPath, "C:\\Users\\smeesseman.PERRYJOHNSON01\\AppData\\Roaming\\vscode");
		//
		// Set environment variables for specific test
		//
		process.env.VSCODE_PORTABLE = "c:\\some\\invalid\\path";
		process.env.APPDATA = dataPath2;
		process.env.USERPROFILE = dataPath3;
		dataPath = util.getUserDataPath("win32");
		assert.strictEqual(dataPath, "C:\\Users\\smeesseman.PERRYJOHNSON01\\AppData\\Roaming\\vscode");
		//
		// Set environment variables for specific test
		//
		process.env.VSCODE_PORTABLE = "C:\\Code\\data\\user-data\\User\\workspaceStorage";
		process.env.APPDATA = "";
		process.env.USERPROFILE = "";
		dataPath = util.getUserDataPath("win32");
		assert.strictEqual(dataPath, "C:\\Code\\data\\user-data\\User\\workspaceStorage\\user-data\\User");
		//
		// Set environment variables for specific test
		//
		process.env.VSCODE_PORTABLE = "";
		process.env.APPDATA = "";
		process.env.USERPROFILE = "";
		dataPath = util.getUserDataPath("win32");
		assert.strictEqual(dataPath, `C:\\Projects\\${extension}\\.vscode-test\\vscode-win32-archive-1.60.1\\AppData\\Roaming\\vscode`);
		//
		// Set environment variables for specific test
		//
		process.env.VSCODE_PORTABLE = "";
		process.env.APPDATA = "";
		process.env.USERPROFILE = "";
		process.env.VSCODE_APPDATA = "";
		dataPath = util.getUserDataPath("linux");
		assert.strictEqual(dataPath, `C:\\Projects\\${extension}\\.vscode-test\\vscode-win32-archive-1.60.1\\.config\\vscode`);
		dataPath = util.getUserDataPath("win32");
		assert.strictEqual(dataPath, `C:\\Projects\\${extension}\\.vscode-test\\vscode-win32-archive-1.60.1\\AppData\\Roaming\\vscode`);
		dataPath = util.getUserDataPath("darwin");
		assert.strictEqual(dataPath, `C:\\Projects\\${extension}\\.vscode-test\\vscode-win32-archive-1.60.1\\Library\\Application Support\\vscode`);
		dataPath = util.getUserDataPath("invalid_platform");
		assert.strictEqual(dataPath, `C:\\Projects\\${extension}\\.vscode-test\\vscode-win32-archive-1.60.1`);
		//
		// Set environment variables for specific test
		//
		process.env.VSCODE_APPDATA = "C:\\Code\\data\\user-data\\User\\workspaceStorage";
		dataPath = util.getUserDataPath("linux");
		assert.strictEqual(dataPath, "C:\\Code\\data\\user-data\\User\\workspaceStorage\\vscode");
		dataPath = util.getUserDataPath("win32");
		assert.strictEqual(dataPath, "C:\\Code\\data\\user-data\\User\\workspaceStorage\\vscode");
		dataPath = util.getUserDataPath("darwin");
		assert.strictEqual(dataPath, "C:\\Code\\data\\user-data\\User\\workspaceStorage\\vscode");
		dataPath = util.getUserDataPath("invalid_platform");
		assert.strictEqual(dataPath, "C:\\Code\\data\\user-data\\User\\workspaceStorage\\vscode");
		//
		// Set portable / invalid platform
		//
		process.env.VSCODE_PORTABLE = "C:\\Code\\data\\user-data\\User\\workspaceStorage";
		dataPath = util.getUserDataPath("invalid_platform");
		assert.strictEqual(dataPath, "C:\\Code\\data\\user-data\\User\\workspaceStorage\\user-data\\User");
		//
		// Empty platform
		//
		dataPath = util.getUserDataPath("");
		process.env.VSCODE_PORTABLE = "";
		dataPath = util.getUserDataPath("");
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
	});


    test("Get user data paths", function()
    {
        util.getPortableDataPath();
        assert(util.getUserDataPath(), "✘ Could not find user data path");
    });


	test("Filesystem", async function()
    {
		await afs.deleteDir(join(__dirname, "folder1", "folder2", "folder3"));
		await afs.createDir(__dirname);
		await afs.createDir(join(__dirname, "folder1", "folder2", "folder3", "folder4"));
		await afs.deleteDir(join(__dirname, "folder1", "folder2", "folder3"));
		await afs.deleteDir(join(__dirname, "folder1"));
		await afs.deleteFile(join(__dirname, "folder1", "file1.png"));
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
	});


    test("Storage", async function()
    {
        if (storage)
        {
            await storage.update("TEST_KEY", "This is a test");
            assert(storage.get<string>("TEST_KEY") === "This is a test");
            assert(storage.get<string>("TEST_KEY_DOESNT_EXIST", "defValue") === "defValue");
            await storage.update("TEST_KEY", "");
            assert(storage.get<string>("TEST_KEY_DOESNT_EXIST", "defValue") === "defValue");
            await storage.update("TEST_KEY", undefined);
			assert(storage.get<string>("TEST_KEY2_DOESNT_EXIST") === undefined);
        }
    });

});
