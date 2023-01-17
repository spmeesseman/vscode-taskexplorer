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
import { activate, executeTeCommand, exitRollingCount, suiteFinished, testControl, verifyTaskCount, waitForTeIdle } from "../utils/utils";


let teApi: ITaskExplorerApi;
let dispose: Disposable;
let dispose2: Disposable;
let taskProvider: ExternalTaskProvider;
let taskProvider2: ExternalTaskProviderBase;
let successCount = -1;


suite("External Provider Tests", () =>
{

    suiteSetup(async function()
    {
        ({ teApi } = await activate(this));
        taskProvider = new ExternalTaskProvider();
        taskProvider2 = new ExternalTaskProviderBase();
        dispose = tasks.registerTaskProvider("external", taskProvider);
        dispose2 = tasks.registerTaskProvider("external2", taskProvider2);
        ++successCount;
    });


    suiteTeardown(async function()
    {
        dispose.dispose();
        dispose2.dispose();
        suiteFinished(this);
    });


    test("Get API Command", async function()
    {
        if (exitRollingCount(0, successCount)) return;
        assert(await executeTeCommand("getApi", 0, 200));
        ++successCount;
    });


    test("Register external task provider", async function()
    {
        if (exitRollingCount(1, successCount)) return;
        this.slow(testControl.slowTime.configEnableEvent + testControl.waitTime.configEnableEvent + testControl.slowTime.verifyTaskCount);
        taskProvider.getDocumentPosition("test_1_task_name", "test_1_task_name");
        await teApi.register("external", taskProvider, "");
        await waitForTeIdle(testControl.waitTime.configEnableEvent);
        await verifyTaskCount("external", 2);
        ++successCount;
    });


    test("Access external task provider", async function()
    {
        if (exitRollingCount(2, successCount)) return;
        this.slow(testControl.slowTime.configEnableEvent);
        const provider = teApi.providersExternal.external as ExternalTaskProvider;
        assert(provider);
        const task = provider.createTask("test", "test", (workspace.workspaceFolders as WorkspaceFolder[])[0], Uri.file("dummy_path"));
        provider.getDocumentPosition("test_1_task_name", "test_1_task_name");
        provider.resolveTask(task);
        ++successCount;
    });


    test("Access base external task provider", async function()
    {
        if (exitRollingCount(3, successCount)) return;
        this.slow(testControl.slowTime.configEnableEvent);
        const task = taskProvider2.createTask("test", "test", (workspace.workspaceFolders as WorkspaceFolder[])[0], Uri.file("dummy_path"));
        try {
            taskProvider2.resolveTask(task);
        } catch {}
        try {
            taskProvider2.provideTasks();
        } catch {}
        ++successCount;
    });


    test("Unregister external task provider", async function()
    {
        if (exitRollingCount(4, successCount)) return;
        this.slow(testControl.slowTime.configEnableEvent + testControl.waitTime.configEvent + testControl.slowTime.verifyTaskCount);
        await teApi.unregister("external", "");
        await waitForTeIdle(testControl.waitTime.configEvent);
        await verifyTaskCount("external", 2);
    });

});
