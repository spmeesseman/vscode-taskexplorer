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
        assert(workspace.getConfiguration('taskExplorer').update('debug', true));
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

    test("Test camel casing", () =>
    {
        assert(util.camelCase("taskexplorer", 4) === 'taskExplorer');
        assert(util.camelCase(undefined, 4) === undefined);
        assert(util.camelCase("testgreaterindex", 19) === "testgreaterindex");
        assert(util.camelCase("test", -1) === "test");
    });

    test("Test proper casing", () =>
    {
        assert(util.properCase("taskexplorer") === 'Taskexplorer');
        assert(util.properCase(undefined) === undefined);
    });

    test("Test array functions", () =>
    {
        let arr: number[] = [ 1, 2, 3, 4, 5 ];
        util.removeFromArray(arr, 3);
        assert(arr.length === 4);
        assert(util.existsInArray(arr, 5));
        assert(!util.existsInArray(arr, 3));
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
        let arr: number[] = [ 1, 2, 3, 4, 5 ];
        let curNum = 1;

        async function asyncFn(num: number)
        {
            setTimeout(() => {
                assert(num === curNum++);
            }, 100);
        }

        await util.asyncForEach(arr, async (n: number) =>
        {
            await asyncFn(n);
        });
    });

    test("Asynchronous mapForEach", async () =>
    {
        let arr: Map<number, number> = new Map();
        let curNum = 1;
        
        for (let i = 1; i <= 5; i++) {
            arr.set(i, i);
        }
        async function asyncFn(num: number)
        {
            setTimeout(() => {
                assert(num === curNum++);
            }, 100);
        }

        await util.asyncMapForEach(arr, async (n: number, n2: number) =>
        {
            assert(n === n2);
            await asyncFn(n);
        });
    });

});
