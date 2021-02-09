/* tslint:disable */

import * as assert from "assert";
import { workspace } from "vscode";
import * as util from "../util";


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
        assert(util.logBlank());
    });

    test("Log to output window", () =>
    {
        assert(util.log("        spmeesseman.vscode-taskexplorer"));
    });

    test("Log value to output window", () =>
    {
        assert(util.logValue("        spmeesseman.vscode-taskexplorer", "true"));
    });

    test("Log a null value to output window", () =>
    {
        assert(util.logValue("        spmeesseman.vscode-taskexplorer", null));
    });

    test("Log undefined value to output window", () =>
    {
        assert(util.logValue("        spmeesseman.vscode-taskexplorer", undefined));
    });

    test("Log error value to output window", () =>
    {
        assert(util.logError("        spmeesseman.vscode-taskexplorer"));
    });

    test("Log error array to output window", () =>
    {
        assert(util.logError([ "        spmeesseman.vscode-taskexplorer",
                               "        spmeesseman.vscode-taskexplorer",
                               "        spmeesseman.vscode-taskexplorer" ]));
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

    test("Test array functions", async () =>
    {
        const arr = [ 1, 2, 3, 4, 5 ];
        util.removeFromArray(arr, 3);
        await util.removeFromArrayAsync(arr, 1);
        assert(arr.length === 3);
        assert(util.existsInArray(arr, 5));
        assert(util.existsInArray(arr, 2));
        assert(util.existsInArray(arr, 4));
        assert(!util.existsInArray(arr, 3));
        assert(!util.existsInArray(arr, 1));
    });

    test("Test get cwd", () =>
    {
        assert(util.getCwd(workspace.workspaceFolders[0].uri) !== undefined);
    });

    test("Timeout", () =>
    {
        assert(util.timeout(10));
    });

    test("Asynchronous forEach", async () =>
    {
        const arr = [ 1, 2, 3, 4, 5 ];
        let curNum = 1;

        const asyncFn = async (num: number) =>
        {
            setTimeout(() => {
                assert(num === curNum++);
            }, 100);
        };

        await util.forEachAsync(arr, async (n: number) =>
        {
            await asyncFn(n);
        });
    });

    test("Asynchronous mapForEach", async () =>
    {
        const arr: Map<number, number> = new Map();
        let curNum = 1;

        for (let i = 1; i <= 5; i++) {
            arr.set(i, i);
        }

        const asyncFn = async (num: number) =>
        {
            setTimeout(() => {
                assert(num === curNum++);
            }, 100);
        };

        await util.forEachMapAsync(arr, async (n: number, n2: number) =>
        {
            assert(n === n2);
            await asyncFn(n);
        });
    });

});
