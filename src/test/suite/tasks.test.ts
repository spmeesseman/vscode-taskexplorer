/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* tslint:disable */

//
// Documentation on https://mochajs.org/ for help.
//
import * as assert from "assert";
import TaskItem from "../../tree/item";
import { configuration } from "../../common/configuration";
import { storage } from "../../common/storage";
import constants from "../../common/constants";
import { TaskExplorerApi } from "@spmeesseman/vscode-taskexplorer-types";
import { activate, executeTeCommand, getTreeTasks, isReady, overrideNextShowInputBox, sleep } from "../helper";


let runCount = 0;
let lastTask: TaskItem | null = null;
let teApi: TaskExplorerApi;
let ant: TaskItem[];
let bash: TaskItem[];
let batch: TaskItem[];


suite("Task Tests", () =>
{

    suiteSetup(async function()
    {
        teApi = await activate(this);
        assert(isReady() === true, "    ✘ TeApi not ready");
    });


    test("Refresh", async function()
    {
        await executeTeCommand("refresh", 1000);
		await teApi.testsApi.fileCache.waitForCache();
    });


    test("Check task counts", async function()
    {
        bash = await getTreeTasks("bash", 1);
        batch = await getTreeTasks("batch", 2);
        ant = await getTreeTasks("ant", 3);
    });


    test("Empty taskitem parameter", async function()
    {
        await executeTeCommand("run", 500);
        await executeTeCommand("pause", 500);
        await executeTeCommand("restart", 500);
    });


    test("Run non-existent last task", async function()
    {
        const lastTasks = storage.get<string[]>(constants.LAST_TASKS_STORE, []),
              hasLastTasks = lastTasks && lastTasks.length > 0;
        if (hasLastTasks)
        {
            await storage.update(constants.LAST_TASKS_STORE, undefined);
        }
        await executeTeCommand("runLastTask", 500);
        if (hasLastTasks)
        {
            await storage.update(constants.LAST_TASKS_STORE, lastTasks);
        }
    });


    test("Keep terminal on stop", async function()
    {
        await configuration.updateWs("keepTermOnStop", true);
        await executeTeCommand("run", 2500, batch[0]);
        await executeTeCommand("stop", 500, batch[0]);
        await configuration.updateWs("keepTermOnStop", false);
        await executeTeCommand("run", 2500, batch[0]);
        await executeTeCommand("stop", 500, batch[0]);
    });


    test("Trigger busy on run last task", async function()
    {
        teApi.explorer?.invalidateTasksCache();// Don't await
        await executeTeCommand("runLastTask", 5000);
    });


    test("Resume task no terminal", async function()
    {
        bash[0].paused = true;
        await executeTeCommand("runLastTask", 5000, batch[0]);
        bash[0].paused = false;
    });


    test("Pause", async function()
    {
        await executeTeCommand("run", 2500, batch[0]);
        await executeTeCommand("pause", 1000, batch[0]);
        await executeTeCommand("stop", 500, batch[0]);
    });


    test("Ant", async function()
    {
        const antTask = ant.find(t => t.taskFile.fileName.includes("hello.xml")) as TaskItem;
        await executeTeCommand("run", 3000, antTask);
        lastTask = antTask;
    });


    test("Bash", async function()
    {   //
        // There is only 1 bash file "task" - it sleeps for 3 seconds, 1 second at a time
        //
        await configuration.updateWs("disableAnimatedIcons", true);
        await startTask(bash[0]);
        await executeTeCommand("run", 7000, bash[0]);
        await endTask(bash[0]);
        await configuration.updateWs("disableAnimatedIcons", false);
        lastTask = bash[0];
    });


    test("Batch", async function()
    {
        this.timeout(45000);
        //
        // There are 2 batch file "tasks" - they both sleep for 7 seconds, 1 second at a time
        //
        for (const batchTask of batch)
        {
            await startTask(batchTask);
            await configuration.updateWs("keepTermOnStop", false);
            await executeTeCommand("open", 50, batchTask, true); // clickaction=execute
            await executeTeCommand("runWithArgs", 2500, batchTask, "--test --test2");
            if (runCount % 2 === 0)
            {
                await executeTeCommand("stop", 0, batchTask);
                await executeTeCommand("run", 2500, batchTask);
                executeTeCommand("pause", 1000, batchTask); // ?? No await ?
                await executeTeCommand("pause", 1000, batchTask);
                await executeTeCommand("run", 500, batchTask);
                await configuration.updateWs("clickAction", "Open");
                await executeTeCommand("run", 500, batchTask);
                await configuration.updateWs("clickAction", "Execute");
                await executeTeCommand("openTerminal", 0, batchTask);
                await executeTeCommand("pause", 1000, batchTask);
                await configuration.updateWs("keepTermOnStop", true);
                await executeTeCommand("stop", 0, batchTask);
                await configuration.updateWs("disableAnimatedIcons", true);
                await configuration.updateWs("showRunningTask", false);
                await executeTeCommand("runLastTask", 1500, batchTask);
                await configuration.updateWs("keepTermOnStop", false);
                await executeTeCommand("restart", 2500, batchTask);
                await executeTeCommand("stop", 500, batchTask);
                await executeTeCommand("runNoTerm", 2500, batchTask);
                await executeTeCommand("stop", 200, batchTask);
            }
            else {
                await executeTeCommand("stop", 200, batchTask);
                await configuration.updateWs("disableAnimatedIcons", false);
                overrideNextShowInputBox("--test --test2");
                await executeTeCommand("runWithArgs", 2500, batchTask);
                await executeTeCommand("stop", 200, batchTask);
                await configuration.updateWs("showRunningTask", true);
                await sleep(8000);
            }
            await endTask(batchTask);
        }
    });

});


async function startTask(taskItem: TaskItem)
{
    console.log(`    ℹ Run ${taskItem.taskSource} task: ${taskItem.label}`);
    console.log(`        Folder: ${taskItem.getFolder()?.name}`);
    await configuration.updateWs("clickAction", "Execute");
    await configuration.updateWs("showLastTasks", (++runCount % 2) === 1);
    let removed = await executeTeCommand("addRemoveFromFavorites", 0, taskItem);
    if (removed) {
        await executeTeCommand("addRemoveFromFavorites", 0, taskItem);
    }
    overrideNextShowInputBox("test label");
    removed = await executeTeCommand("addRemoveCustomLabel", 0, taskItem);
    if (removed) {
        await executeTeCommand("addRemoveFromFavorites", 0, taskItem);
    }
    if (lastTask) {
        await executeTeCommand("openTerminal", 0, lastTask);
    }
}


async function endTask(taskItem: TaskItem)
{
    await executeTeCommand("openTerminal", 0, taskItem);
    console.log(`    ✔ Done ${taskItem.taskSource} task: ${taskItem.label}`);
    lastTask = taskItem;
}
