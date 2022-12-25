/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* tslint:disable */

//
// Documentation on https://mochajs.org/ for help.
//
import * as assert from "assert";
import { activate, executeTeCommand, isReady, sleep, verifyTaskCount } from "../helper";
import { TaskExplorerApi } from "@spmeesseman/vscode-taskexplorer-types";
import { Uri, workspace, WorkspaceFolder, tasks, Disposable } from "vscode";
import { ExternalTaskProvider } from "./externalTaskProvider";
import { ExternalTaskProviderBase } from "./externalTaskProviderBase";


let teApi: TaskExplorerApi;
let dispose: Disposable;
let dispose2: Disposable;
let taskProvider: ExternalTaskProvider;
let taskProvider2: ExternalTaskProviderBase;


suite("API Tests", () =>
{

    suiteSetup(async function()
    {
        teApi = await activate(this);
        assert(isReady("make") === true, "    ✘ TeApi not ready");
        taskProvider = new ExternalTaskProvider();
        taskProvider2 = new ExternalTaskProviderBase();
        dispose = tasks.registerTaskProvider("external", taskProvider);
        dispose2 = tasks.registerTaskProvider("external2", taskProvider2);
    });

    suiteTeardown(async function()
    {
        dispose.dispose();
        dispose2.dispose();
    });


    test("Get API Command", async function()
    {
        assert(await executeTeCommand("getApi", 200));
    });


    test("Register external task provider", async function()
    {
        taskProvider.getDocumentPosition("test_1_task_name", "test_1_task_name");
        await teApi.register("external", taskProvider);
        await sleep(50);
        await teApi.testsApi.fileCache.waitForCache();
        await verifyTaskCount("external", 2, true);
    });


    test("Access external task provider", async function()
    {
        const provider = teApi.providersExternal.get("external") as ExternalTaskProvider;
        assert(provider);
        const task = provider.createTask("test", "test", (workspace.workspaceFolders as WorkspaceFolder[])[0], Uri.file("dummy_path"));
        provider.getDocumentPosition("test_1_task_name", "test_1_task_name");
        provider.resolveTask(task);
    });


    test("Access base external task provider", async function()
    {
        const task = taskProvider2.createTask("test", "test", (workspace.workspaceFolders as WorkspaceFolder[])[0], Uri.file("dummy_path"));
        try {
            taskProvider2.resolveTask(task);
        } catch {}
        try {
            taskProvider2.provideTasks();
        } catch {}
    });


    test("Unregister external task provider", async function()
    {
        await teApi.unregister("external");
        await sleep(50);
        await teApi.testsApi.fileCache.waitForCache();
        await verifyTaskCount("external", 2, 0);
    });

});
