/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* tslint:disable */

import * as assert from "assert";
import { workspace } from "vscode";
import * as util from "../common/utils";
import * as log from "../common/log";
import { storage } from "../common/storage";


suite("Util tests", () =>
{
    suiteSetup(async () =>
    {

    });

    suiteTeardown(() =>
    {

    });

    test("Turn logging on", () =>
    {
        assert(workspace.getConfiguration("taskExplorer").update("debug", true));
    });

    test("Log a blank to output window", () =>
    {
        log.blank();
    });

    test("Log to output window", () =>
    {
        log.write("        spmeesseman.vscode-taskexplorer");
    });

    test("Log value to output window", () =>
    {
        log.value("        spmeesseman.vscode-taskexplorer", "true");
    });

    test("Log a null value to output window", () =>
    {
        log.value("        spmeesseman.vscode-taskexplorer", null);
    });

    test("Log undefined value to output window", () =>
    {
        log.value("        spmeesseman.vscode-taskexplorer", undefined);
    });

    test("Log error value to output window", () =>
    {
        log.error("        spmeesseman.vscode-taskexplorer");
    });

    test("Log error array to output window", () =>
    {
        log.error([ "        spmeesseman.vscode-taskexplorer",
                        "        spmeesseman.vscode-taskexplorer",
                        "        spmeesseman.vscode-taskexplorer" ]);
    });

    test("Test camel casing", () =>
    {
        assert(util.camelCase("taskexplorer", 4) === "taskExplorer");
        assert(util.camelCase(undefined, 4) === undefined);
        assert(util.camelCase("testgreaterindex", 19) === "testgreaterindex");
        assert(util.camelCase("test", -1) === "test");
    });

    test("Test proper casing", () =>
    {
        assert(util.properCase("taskexplorer") === "Taskexplorer");
        assert(util.properCase(undefined) === undefined);
    });

    test("Test script type", () =>
    {
        assert(util.isScriptType("batch"));
    });

    test("Test array functions", async function()
    {
        const arr = [ 1, 2, 3, 4, 5 ];
        util.removeFromArray(arr, 3);
        await util.removeFromArrayAsync(arr, 1);
        assert(arr.length === 3);
        assert(util.existsInArray(arr, 5) !== false);
        assert(util.existsInArray(arr, 2) !== false);
        assert(util.existsInArray(arr, 4) !== false);
        assert(util.existsInArray(arr, 3) === false);
        assert(util.existsInArray(arr, 1) === false);
    });

    test("Test get cwd", function()
    {
        const uri = workspace.workspaceFolders ? workspace.workspaceFolders[0].uri : undefined;
        if (!uri) {
            assert.fail("         ✘ Worksapce folder does not exist");
        }
        assert(util.getCwd(uri) !== undefined);
    });

    test("Timeout", function()
    {
        assert(util.timeout(10));
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

        await util.forEachMapAsync(arr, async function(n: number, n2: number)
        {
            assert(n === n2);
            await asyncFn(n);
        });
    });


    test("Get user data paths", function()
    {
        const dataPath = util.getUserDataPath();
        const portablePath = util.getPortableDataPath();
        if (portablePath) {
            console.log("         ℹ Portable data path = " + portablePath);
        }
        if (dataPath) {
            console.log("         ℹ Data path = " + dataPath);
            console.log("         ✔ Successfully located user data directory");
        }
        else {
            assert.fail("         ✘ Could not find user data path");
        }
    });

    test("Get storage", async function()
    {
        if (storage)
        {
            await storage?.update("TEST_KEY", "This is a test");
            assert(storage?.get<string>("TEST_KEY") === "This is a test");
            console.log("         ✔ Successfully updated/read storage");
            //
            // tasks.tests will cover storage.update(key, defaultVal) w/ Last Tasks and Favs folders
        }   //
        else {
            console.log("         ℹ Storage not initialized");
        }
    });

    test("Get package manager", function()
    {
        const pkgMgr = util.getPackageManager();
        if (pkgMgr) {
            console.log("         ℹ Portable data path = " + pkgMgr);
            console.log("         ✔ Successfully read package manager setting");
        }
        else {
            assert.fail("         ✘ Task Explorer tree instance does not exist");
        }
    });

});
