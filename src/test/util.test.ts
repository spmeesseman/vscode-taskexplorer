/* tslint:disable */

//
// Documentation on https://mochajs.org/ for help.
//

import * as assert from "assert";
import { workspace } from "vscode";
import * as testUtil from "./testUtil";
import * as util from "../util";


suite("Util tests", () => 
{
    suiteSetup(async () =>
    {
        await testUtil.activeExtension();
        //workspace.getConfiguration('taskExplorer').update('debug', true, ConfigurationTarget.Global);
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

    test("Test camelCase()", () =>
    {
        assert(util.camelCase("taskexplorer", 4) === 'taskExplorer');
        assert(util.camelCase(undefined, 4) === undefined);
        assert(util.camelCase("testgreaterindex", 19) === "testgreaterindex");
        assert(util.camelCase("test", -1) === "test");
    });

    test("Test properCase()", () =>
    {
        assert(util.properCase("taskexplorer") === 'Taskexplorer');
        assert(util.properCase(undefined) === undefined);
    });

    //test("Turn logging off", () => {
    //  assert.ok(workspace.getConfiguration('taskExplorer').update('debug', false));
    //});

    test("Timeout", () =>
    {
        assert(util.timeout(10));
    });

});
