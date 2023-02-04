/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* tslint:disable */

//
// Documentation on https://mochajs.org/ for help.
//
import { executeTeCommand } from "../utils/commandUtils";
import { ExternalTaskProvider } from "./externalTaskProvider";
import { ExternalTaskProviderBase } from "./externalTaskProviderBase";
import { Uri, workspace, WorkspaceFolder, tasks, Disposable } from "vscode";
import { ITaskExplorerApi } from "@spmeesseman/vscode-taskexplorer-types";
import {
    activate, endRollingCount, exitRollingCount, needsTreeBuild, suiteFinished,
    testControl, treeUtils, verifyTaskCount, waitForTeIdle
} from "../utils/utils";

let teApi: ITaskExplorerApi;
let dispose: Disposable;
let dispose2: Disposable;
let taskProvider: ExternalTaskProvider;
let taskProvider2: ExternalTaskProviderBase;


suite("External Provider Tests", () =>
{

    suiteSetup(async function()
    {
        if (exitRollingCount(this, true)) return;
        ({ teApi } = await activate(this));
        taskProvider = new ExternalTaskProvider();
        taskProvider2 = new ExternalTaskProviderBase();
        dispose = tasks.registerTaskProvider("external", taskProvider);
        dispose2 = tasks.registerTaskProvider("external2", taskProvider2);
        endRollingCount(this, true);
    });


    suiteTeardown(async function()
    {
        if (exitRollingCount(this, false, true)) return;
        dispose?.dispose();
        dispose2?.dispose();
        suiteFinished(this);
    });


    test("Build Tree", async function()
    {
        if (exitRollingCount(this)) return;
        if (needsTreeBuild()) {
            await treeUtils.refresh(this);
        }
        endRollingCount(this);
    });


    test("Get API", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(testControl.slowTime.commands.fast + 75);
        teApi = await executeTeCommand("getApi") as ITaskExplorerApi;
        endRollingCount(this);
    });


    test("Register External Task Provider", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(testControl.slowTime.config.enableEvent + testControl.waitTime.config.enableEvent + testControl.slowTime.taskCount.verify);
        taskProvider.getDocumentPosition("test_1_task_name", "test_1_task_name");
        await teApi.register("external", taskProvider, "");
        await waitForTeIdle(testControl.waitTime.config.enableEvent);
        await verifyTaskCount("external", 2);
        endRollingCount(this);
    });


    test("Access External Task Provider", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(testControl.slowTime.config.enableEvent);
        const provider = teApi.providers.external as ExternalTaskProvider;
        const task = provider.createTask("test", "test", (workspace.workspaceFolders as WorkspaceFolder[])[0], Uri.file("dummy_path"));
        provider.getDocumentPosition("test_1_task_name", "test_1_task_name");
        provider.resolveTask(task);
        endRollingCount(this);
    });


    test("Access Base External Task Provider", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(testControl.slowTime.config.enableEvent);
        const task = taskProvider2.createTask("test", "test", (workspace.workspaceFolders as WorkspaceFolder[])[0], Uri.file("dummy_path"));
        try {
            taskProvider2.resolveTask(task);
        } catch {}
        try {
            taskProvider2.provideTasks();
        } catch {}
        endRollingCount(this);
    });


    test("Refresh External Task Provider", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(testControl.slowTime.commands.refreshNoChanges + testControl.slowTime.taskCount.verify);
        await teApi.refreshExternalProvider("external", "");
        await waitForTeIdle(testControl.waitTime.config.enableEvent);
        await verifyTaskCount("external", 2);
        endRollingCount(this);
    });


    test("Unregister External Task Provider", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(testControl.slowTime.config.enableEvent + testControl.waitTime.config.event + testControl.slowTime.taskCount.verify);
        await teApi.unregister("external", "");
        await waitForTeIdle(testControl.waitTime.config.event);
        await verifyTaskCount("external", 0);
        endRollingCount(this);
    });


    test("Refresh Non-Existent External Task Provider", async function()
    {
        if (exitRollingCount(this)) return;
        await teApi.refreshExternalProvider("external_no_exist", ""); // cover
        endRollingCount(this);
    });

});
