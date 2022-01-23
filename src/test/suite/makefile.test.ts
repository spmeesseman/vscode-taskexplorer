/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* tslint:disable */

//
// Documentation on https://mochajs.org/ for help.
//
import * as assert from "assert";
import * as path from "path";
import { activate, getWsPath, isReady } from "../helper";
import { TaskExplorerApi } from "../../extension";
import { MakeTaskProvider } from "../../providers/make";
import { readFileSync } from "../../common/utils";


let teApi: TaskExplorerApi;
let provider: MakeTaskProvider;


suite("Makefile Tests", () =>
{

    suiteSetup(async function()
    {
        teApi = await activate(this);
        assert(isReady("make") === true, "Setup failed");
        provider = teApi.taskProviders.get("make") as MakeTaskProvider;
    });


    test("Makefile Utility", async () =>
    {
        // provider.readTasks();
        provider.getDocumentPosition(undefined, undefined);
        provider.getDocumentPosition("test", undefined);
        provider.getDocumentPosition(undefined, "test");
        const makefileContent = readFileSync(getWsPath("make\\makefile"));
        provider.getDocumentPosition("rule1", makefileContent);
        provider.getDocumentPosition("rule2", makefileContent);
        provider.getDocumentPosition("rule_does_not_exist", makefileContent);
    });

});
