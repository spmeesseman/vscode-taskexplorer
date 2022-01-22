/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* tslint:disable */

import * as assert from "assert";
import { workspace } from "vscode";
import * as util from "../../common/utils";
import * as log from "../../common/log";
import { storage } from "../../common/storage";


suite("Util Tests", () =>
{

    test("Test utility methids general", async function()
    {
        const uri = workspace.workspaceFolders ? workspace.workspaceFolders[0].uri : undefined;
        if (!uri) {
            assert.fail("         ✘ Workspace folder does not exist");
        }

        console.log("      Logging");
        assert(workspace.getConfiguration("taskExplorer").update("debug", true));
        log.blank();
        log.write("        spmeesseman.vscode-taskexplorer");
        log.value("        spmeesseman.vscode-taskexplorer", "true");
        log.value("        spmeesseman.vscode-taskexplorer", null);
        log.value("        spmeesseman.vscode-taskexplorer", undefined);
        log.error("        spmeesseman.vscode-taskexplorer");
        log.error([ "        spmeesseman.vscode-taskexplorer",
                        "        spmeesseman.vscode-taskexplorer",
                        "        spmeesseman.vscode-taskexplorer" ]);

        console.log("      Camel casing");
        assert(util.camelCase("taskexplorer", 4) === "taskExplorer");
        assert(util.camelCase(undefined, 4) === undefined);
        assert(util.camelCase("testgreaterindex", 19) === "testgreaterindex");
        assert(util.camelCase("test", -1) === "test");

        console.log("      Proper casing");
        assert(util.properCase("taskexplorer") === "Taskexplorer");
        assert(util.properCase(undefined) === undefined);

        console.log("      Script type");
        assert(util.isScriptType("batch"));
        assert(util.getScriptTaskTypes().length > 0);

        console.log("      Array functions");
        const arr = [ 1, 2, 3, 4, 5 ];
        util.removeFromArray(arr, 3);
        await util.removeFromArrayAsync(arr, 1);
        assert(arr.length === 3);
        assert(util.existsInArray(arr, 5) !== false);
        assert(util.existsInArray(arr, 2) !== false);
        assert(util.existsInArray(arr, 4) !== false);
        assert(util.existsInArray(arr, 3) === false);
        assert(util.existsInArray(arr, 1) === false);

        console.log("      Get CWD");
        assert(util.getCwd(uri) !== undefined);

        console.log("      Set a timeout");
        assert(util.timeout(10));

        console.log("      Get group separator");
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
