/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* tslint:disable */

//
// Documentation on https://mochajs.org/ for help.
//
import * as assert from "assert";
import * as path from "path";
import { activate, getWsPath, isReady, sleep, verifyTaskCount } from "../helper";
import { TaskExplorerApi } from "../../interface/taskExplorerApi";
import { MakeTaskProvider } from "../../providers/make";
import { readFileSync } from "../../common/utils";
import { Uri, workspace, WorkspaceFolder, TaskProvider, tasks } from "vscode";
import { configuration } from "../../common/configuration";
import { TaskExplorerProvider } from "../../providers/provider";
import { ExternalTaskProvider } from "../../providers/external";
import { waitForCache } from "../../cache";


let teApi: TaskExplorerApi;


suite("API Tests", () =>
{

    suiteSetup(async function()
    {
        teApi = await activate(this);
        assert(isReady("make") === true, "TeApi not ready");
    });


    test("Log", async () =>
    {
        teApi.log.write("Test 1", 1);
        teApi.log.value("Test 1", "test value", 1);
    });


    test("External Task providers", async () =>
    {
        const taskProvider = new ExternalTaskProvider();
        const disposable = tasks.registerTaskProvider("external", taskProvider);
        taskProvider.getDocumentPosition("test_1_task_name", "test_1_task_name");
        await teApi.registerProvider("external", taskProvider);
        await sleep(3000);
        await waitForCache();
        await verifyTaskCount("external", 2);
        const provider = teApi.providersExternal.get("external") as ExternalTaskProvider;
        assert(provider);
        await teApi.unregisterProvider("external");
        disposable.dispose();
        await sleep(3000);
        await waitForCache();
        await verifyTaskCount("external", 0);
    });

});
