/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* tslint:disable */

//
// Documentation on https://mochajs.org/ for help.
//
import * as assert from "assert";
import { ExternalTaskProvider } from "./externalTaskProvider";
import { ExternalTaskProviderBase } from "./externalTaskProviderBase";
import { Uri, workspace, WorkspaceFolder, tasks, Disposable } from "vscode";
import { ITaskExplorerApi } from "@spmeesseman/vscode-taskexplorer-types";
import { activate, executeTeCommand, suiteFinished, verifyTaskCount } from "../utils/utils";


let teApi: ITaskExplorerApi;
let dispose: Disposable;
let dispose2: Disposable;
let taskProvider: ExternalTaskProvider;
let taskProvider2: ExternalTaskProviderBase;


suite("External Provider Tests", () =>
{

    suiteSetup(async function()
    {
        teApi = await activate(this);
        taskProvider = new ExternalTaskProvider();
        taskProvider2 = new ExternalTaskProviderBase();
        dispose = tasks.registerTaskProvider("external", taskProvider);
        dispose2 = tasks.registerTaskProvider("external2", taskProvider2);
    });


    suiteTeardown(async function()
    {
        dispose.dispose();
        dispose2.dispose();
        suiteFinished(this);
    });


    test("Get API Command", async function()
    {
        assert(await executeTeCommand("getApi", 10, 200));
    });


    test("Register external task provider", async function()
    {
        taskProvider.getDocumentPosition("test_1_task_name", "test_1_task_name");
        await teApi.register("external", taskProvider, "");
        await teApi.waitForIdle(50);
        await verifyTaskCount("external", 2);
    });


    test("Access external task provider", async function()
    {
        const provider = teApi.providersExternal.external as ExternalTaskProvider;
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
        await teApi.unregister("external", "");
        await teApi.waitForIdle(50);
        await verifyTaskCount("external", 2);
    });

});
