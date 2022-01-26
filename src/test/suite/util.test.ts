/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* tslint:disable */

import * as assert from "assert";
import { workspace } from "vscode";
import * as util from "../../common/utils";
import * as log from "../../common/log";
import { storage } from "../../common/storage";
import { getUserDataPath } from "../../common/utils";
import { configuration } from "../../common/configuration";


const creator = "spmeesseman",
	  extension = "vscode-taskexplorer";


suite("Util Tests", () =>
{

    test("General Utility methods", async function()
    {
        const uri = workspace.workspaceFolders ? workspace.workspaceFolders[0].uri : undefined;
        if (!uri) {
            assert.fail("         ✘ Workspace folder does not exist");
        }

        await configuration.updateWs("debug", true);

        log.blank();
        log.write(`        ${creator}.${extension}`);
        log.value(`        ${creator}.${extension}`, "true");
        log.value(`        ${creator}.${extension}`, null);
        log.value(`        ${creator}.${extension}`, undefined);
        log.error(`        ${creator}.${extension}`);
        log.error([ `        ${creator}.${extension}`,
                    `        ${creator}.${extension}`,
                    `        ${creator}.${extension}` ]);
		// 1 param
		log.methodStart("message");
		log.methodDone("message");

		log.setWriteToConsole(true);
		log.write("test");
		log.value("test", "1");
		log.setWriteToConsole(false);

		log.setWriteToFile(true);
		log.write("test");
		log.value("test", "1");
		log.setWriteToFile(false);

		// nullvalue
		log.value("null value", null);
		log.value("empty string value", "");

		// Disabled logging
		await configuration.updateWs("debug", false);
		log.write("test");
		log.value("test", "1");

		log.write("Test1", 1);
		log.value("Test2", "value", 1);
		log.value("Test3", null, 1);
		log.value("Test4", undefined, 1);

		log.values(1, "   ", [["Test5", "5"]]);
		log.values(1, "   ", [["Test6", "6"]], true);

		log.error("Test5 error");
		log.error(new Error("Test error object"));
		log.error([ "Test error 1", "Test error 2" ]);
		log.error([ "Test error 1",  new Error("Test error object") ]);
		log.error([ "Test error 1", "Test error 2" ], [["Test param error", "Test param value"]]);

        assert(util.camelCase("taskexplorer", 4) === "taskExplorer");
        assert(util.camelCase(undefined, 4) === undefined);
        assert(util.camelCase("testgreaterindex", 19) === "testgreaterindex");
        assert(util.camelCase("test", -1) === "test");

        assert(util.properCase("taskexplorer") === "Taskexplorer");
        assert(util.properCase(undefined) === undefined);

        assert(util.isScriptType("batch"));
        assert(util.getScriptTaskTypes().length > 0);

        const arr = [ 1, 2, 3, 4, 5 ];
        util.removeFromArray(arr, 3);
        await util.removeFromArrayAsync(arr, 1);
        assert(arr.length === 3);
        assert(util.existsInArray(arr, 5) !== false);
        assert(util.existsInArray(arr, 2) !== false);
        assert(util.existsInArray(arr, 4) !== false);
        assert(util.existsInArray(arr, 3) === false);
        assert(util.existsInArray(arr, 1) === false);

        assert(util.getCwd(uri) !== undefined);

        assert(util.timeout(10));

        assert (util.getGroupSeparator() === "-");
    });


    test("Asynchronous forEach", async function()
    {
        const arr = [ 1, 2, 3, 4, 5 ];
        let curNum = 1;

        const asyncFn = async function(num: number)
        {
            setTimeout(() => {
                assert(num === curNum++);
            }, 100);
        };

        for (const n of arr)
        {
            await asyncFn(n);
        }
    });


    test("Asynchronous mapForEach", async function()
    {
        const arr: Map<number, number> = new Map();
        let curNum = 1;

        for (let i = 1; i <= 5; i++) {
            arr.set(i, i);
        }

        const asyncFn = async function(num: number)
        {
            setTimeout(() => {
                assert(num === curNum++);
            }, 100);
        };

        for (const a of arr)
        {
            const n = a[1], n2 = a[0];
            assert(n === n2);
            await asyncFn(n);
        }
    });


	test("Data paths", async () =>
	{   //
		// The fs module on dev test will run through win32 path get.  Simulate
		// path get here for linux and mac for increased coverage since we're only
		// running the tests in a windows machine for release right now with ap.
		//
		let dataPath: string | undefined = getUserDataPath("darwin");
		dataPath = getUserDataPath("linux");

		//
		// Simulate --user-data-dir vscode command line option
		//
		const oArgv = process.argv;
		process.argv = [ "--user-data-dir", dataPath ];
		dataPath = getUserDataPath("linux");
		dataPath = getUserDataPath("win32");
		dataPath = getUserDataPath("darwin");

		//
		// 0 args, which would probably never happen but the getUserDataPath() call
		// handles it an ;et's cover it
		//
		process.argv = [];
		dataPath = getUserDataPath("win32");

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
		process.env.VSCODE_PORTABLE = getUserDataPath("win32");
		process.env.APPDATA = "";
		process.env.USERPROFILE = "test";
		dataPath = getUserDataPath("win32");
		assert.strictEqual(dataPath, `C:\\Projects\\${extension}\\.vscode-test\\vscode-win32-archive-1.60.1\\test\\AppData\\Roaming\\vscode`);
		//
		// Set environment variables for specific test
		//
		dataPath = "";
		process.env.VSCODE_PORTABLE = dataPath;
		process.env.APPDATA = dataPath2;
		process.env.USERPROFILE = dataPath3;
		dataPath = getUserDataPath("nothing");
		assert.strictEqual(dataPath, `C:\\Projects\\${extension}\\.vscode-test\\vscode-win32-archive-1.60.1`);
		//
		// Set environment variables for specific test
		//
		process.env.VSCODE_PORTABLE = undefined;
		process.env.APPDATA = dataPath2;
		process.env.USERPROFILE = dataPath3;
		dataPath = getUserDataPath("win32");
		assert.strictEqual(dataPath, "C:\\Users\\smeesseman.PERRYJOHNSON01\\AppData\\Roaming\\vscode");
		//
		// Set environment variables for specific test
		//
		process.env.VSCODE_PORTABLE = "c:\\some\\invalid\\path";
		process.env.APPDATA = dataPath2;
		process.env.USERPROFILE = dataPath3;
		dataPath = getUserDataPath("win32");
		assert.strictEqual(dataPath, "C:\\Users\\smeesseman.PERRYJOHNSON01\\AppData\\Roaming\\vscode");
		//
		// Set environment variables for specific test
		//
		process.env.VSCODE_PORTABLE = "C:\\Code\\data\\user-data\\User\\workspaceStorage";
		process.env.APPDATA = "";
		process.env.USERPROFILE = "";
		dataPath = getUserDataPath("win32");
		assert.strictEqual(dataPath, "C:\\Code\\data\\user-data\\User\\workspaceStorage\\user-data\\User");
		//
		// Set environment variables for specific test
		//
		process.env.VSCODE_PORTABLE = "";
		process.env.APPDATA = "";
		process.env.USERPROFILE = "";
		dataPath = getUserDataPath("win32");
		assert.strictEqual(dataPath, `C:\\Projects\\${extension}\\.vscode-test\\vscode-win32-archive-1.60.1\\AppData\\Roaming\\vscode`);
		//
		// Set environment variables for specific test
		//
		process.env.VSCODE_PORTABLE = "";
		process.env.APPDATA = "";
		process.env.USERPROFILE = "";
		process.env.VSCODE_APPDATA = "";
		dataPath = getUserDataPath("linux");
		assert.strictEqual(dataPath, `C:\\Projects\\${extension}\\.vscode-test\\vscode-win32-archive-1.60.1\\.config\\vscode`);
		dataPath = getUserDataPath("win32");
		assert.strictEqual(dataPath, `C:\\Projects\\${extension}\\.vscode-test\\vscode-win32-archive-1.60.1\\AppData\\Roaming\\vscode`);
		dataPath = getUserDataPath("darwin");
		assert.strictEqual(dataPath, `C:\\Projects\\${extension}\\.vscode-test\\vscode-win32-archive-1.60.1\\Library\\Application Support\\vscode`);
		dataPath = getUserDataPath("invalid_platform");
		assert.strictEqual(dataPath, `C:\\Projects\\${extension}\\.vscode-test\\vscode-win32-archive-1.60.1`);
		//
		// Set environment variables for specific test
		//
		process.env.VSCODE_APPDATA = "C:\\Code\\data\\user-data\\User\\workspaceStorage";
		dataPath = getUserDataPath("linux");
		assert.strictEqual(dataPath, "C:\\Code\\data\\user-data\\User\\workspaceStorage\\vscode");
		dataPath = getUserDataPath("win32");
		assert.strictEqual(dataPath, "C:\\Code\\data\\user-data\\User\\workspaceStorage\\vscode");
		dataPath = getUserDataPath("darwin");
		assert.strictEqual(dataPath, "C:\\Code\\data\\user-data\\User\\workspaceStorage\\vscode");
		dataPath = getUserDataPath("invalid_platform");
		assert.strictEqual(dataPath, "C:\\Code\\data\\user-data\\User\\workspaceStorage\\vscode");
		//
		// Set portable / invalid platform
		//
		process.env.VSCODE_PORTABLE = "C:\\Code\\data\\user-data\\User\\workspaceStorage";
		dataPath = getUserDataPath("invalid_platform");
		assert.strictEqual(dataPath, "C:\\Code\\data\\user-data\\User\\workspaceStorage\\user-data\\User");
		//
		// Empty platform
		//
		dataPath = getUserDataPath("");
		process.env.VSCODE_PORTABLE = "";
		dataPath = getUserDataPath("");
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


    test("Get storage", async function()
    {
        if (storage)
        {
			storage.keys(); // internal keys
            await storage.update("TEST_KEY", "This is a test");
            assert(storage.get<string>("TEST_KEY") === "This is a test");
            assert(storage.get<string>("TEST_KEY_DONT_EXIST", "defValue") === "defValue");
            console.log("         ✔ Successfully updated/read storage");
            //
            // tasks.tests will cover storage.update(key, defaultVal) w/ Last Tasks and Favs folders
        }   //
        else {
            console.log("         ℹ Storage not initialized");
        }
    });

});
