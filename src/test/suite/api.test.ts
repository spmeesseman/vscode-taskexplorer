/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* tslint:disable */

//
// Documentation on https://mochajs.org/ for help.
//
import * as assert from "assert";
import { activate, isReady, sleep, verifyTaskCount } from "../helper";
import { TaskExplorerApi } from "../../interface/taskExplorerApi";
import { Uri, workspace, WorkspaceFolder, tasks, Disposable } from "vscode";
import { ExternalTaskProvider } from "../../providers/external";
import { waitForCache } from "../../cache";


let teApi: TaskExplorerApi;
let dispose: Disposable;
let taskProvider: ExternalTaskProvider;


suite("API Tests", () =>
{

    suiteSetup(async function()
    {
        teApi = await activate(this);
        assert(isReady("make") === true, "TeApi not ready");
        taskProvider = new ExternalTaskProvider();
        dispose = tasks.registerTaskProvider("external", taskProvider);
        // teApi.log.setWriteToConsole(true, 3);
    });

    suiteTeardown(async function()
    {
        dispose.dispose();
    });


    test("Register external task provider", async function()
    {
        taskProvider.getDocumentPosition("test_1_task_name", "test_1_task_name");
        await teApi.register("external", taskProvider);
        await sleep(3000);
        await waitForCache();
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


    test("Unregister external task provider", async function()
    {
        await teApi.unregister("external");
        await sleep(3000);
        await waitForCache();
        await verifyTaskCount("external", 2, 0);
    });

});
