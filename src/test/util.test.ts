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
        assert.ok(workspace.getConfiguration('taskExplorer').update('debug', true));
    });

    test("Log to output window", () =>
    {
        assert.ok(util.log("spmeesseman.vscode-taskexplorer"));
    });

    test("Log value to output window", () =>
    {
        assert.ok(util.logValue("spmeesseman.vscode-taskexplorer", "true"));
    });

    test("Log a null value to output window", () =>
    {
        assert.ok(util.logValue("spmeesseman.vscode-taskexplorer", null));
    });

    test("Log undefined value to output window", () =>
    {
        assert.ok(util.logValue("spmeesseman.vscode-taskexplorer", undefined));
    });

    test("Camel case a value", () =>
    {
        assert(util.camelCase("taskexplorer", 4) == 'taskExplorer');
    });

    test("Proper case a value", () =>
    {
        assert(util.properCase("taskexplorer") == 'Taskexplorer');
    });

    //test("Turn logging off", () => {
    //  assert.ok(workspace.getConfiguration('taskExplorer').update('debug', false));
    //});

    test("Timeout", () =>
    {
        assert.ok(util.timeout(500));
    });

});
