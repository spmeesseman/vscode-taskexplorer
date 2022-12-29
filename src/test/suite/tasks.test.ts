/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* tslint:disable */

//
// Documentation on https://mochajs.org/ for help.
//
import * as assert from "assert";
import TaskItem from "../../tree/item";
import { storage } from "../../common/storage";
import constants from "../../common/constants";
import { TaskExplorerApi } from "@spmeesseman/vscode-taskexplorer-types";
import {
    activate, executeSettingsUpdate, executeTeCommand, executeTeCommand2, getTreeTasks,
    isReady, overrideNextShowInfoBox, overrideNextShowInputBox, testsControl
} from "../helper";

const waitTimeMax = testsControl.waitTimeMax;
const waitTimeForConfigEvent = testsControl.waitTimeForConfigEvent;
const waitTimeForFsCreateEvent = testsControl.waitTimeForFsCreateEvent;
const slowTimeForCommand = testsControl.slowTimeForCommand;
const slowTimeForConfigEvent = testsControl.slowTimeForConfigEvent;
const waitTimeForRunCommand = testsControl.waitTimeForRunCommand;
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
        this.slow(testsControl.slowTimeForRefreshCommand);
        await executeTeCommand("refresh", 1000);
    });


    test("Check task counts", async function()
    {
        this.slow(1750);
        bash = await getTreeTasks("bash", 1);
        batch = await getTreeTasks("batch", 2);
        ant = await getTreeTasks("ant", 3);
    });


    test("Empty TaskItem Parameter - Run", async function()
    {
        this.slow(waitTimeForRunCommand + 1000);
        await executeTeCommand("run", waitTimeForRunCommand);
    });


    test("Empty TaskItem Parameter - Pause", async function()
    {
        this.slow(1000);
        await executeTeCommand("pause", 500);
    });


    test("Empty TaskItem Parameter - Restart", async function()
    {
        this.slow(1000);
        await executeTeCommand("restart", 500);
    });


    test("Run non-existent last task", async function()
    {
        this.slow(1200);
        const lastTasks = storage.get<string[]>(constants.LAST_TASKS_STORE, []),
              hasLastTasks = lastTasks && lastTasks.length > 0;
        if (hasLastTasks)
        {
            await storage.update(constants.LAST_TASKS_STORE, undefined);
        }
        await executeTeCommand("runLastTask", waitTimeForRunCommand);
        if (hasLastTasks)
        {
            await storage.update(constants.LAST_TASKS_STORE, lastTasks);
        }
    });


    test("Keep Terminal on Stop (OFF)", async function()
    {
        this.slow(1500 + waitTimeForRunCommand + waitTimeForConfigEvent);
        await executeSettingsUpdate("keepTermOnStop", false);
        await executeTeCommand("run", waitTimeForRunCommand, 5000, batch[0]);
        await executeTeCommand("stop", 1000, 1500, batch[0]);
    });


    test("Keep Terminal on Stop (ON)", async function()
    {
        this.slow(1500 + waitTimeForRunCommand + waitTimeForConfigEvent);
        await executeSettingsUpdate("keepTermOnStop", true);
        await executeTeCommand("run", waitTimeForRunCommand, 5000, batch[0]);
        await executeTeCommand("stop", 1000, 1500, batch[0]);
    });


    test("Trigger busy on run last task", async function()
    {
        this.slow(waitTimeForRunCommand + 1000 + waitTimeForFsCreateEvent);
        teApi.explorer?.invalidateTasksCache();// Don't await
        await executeTeCommand("runLastTask", waitTimeForRunCommand, 5000);
    });


    test("Resume task no terminal", async function()
    {
        this.slow(waitTimeForRunCommand + 1000);
        bash[0].paused = true;
        await executeTeCommand2("runLastTask", [ batch[0] ], waitTimeForRunCommand);
        bash[0].paused = false;
    });


    test("Pause", async function()
    {
        this.slow(waitTimeForRunCommand * 2);
        await executeTeCommand2("run", [ batch[0] ], waitTimeForRunCommand);
        await executeTeCommand2("pause", [ batch[0] ], 500);
        await executeTeCommand2("stop", [ batch[0] ], 400);
    });


    test("Pause (No Task)", async function()
    {
        overrideNextShowInfoBox(undefined);
        this.slow(testsControl.slowTimeForCommandFast);
        await executeTeCommand2("pause", [ batch[0] ], 50);
    });


    test("Resume (No Task)", async function()
    {
        overrideNextShowInfoBox(undefined);
        this.slow(testsControl.slowTimeForCommandFast);
        await executeTeCommand2("pause", [ batch[0] ], 50);
    });


    test("Ant", async function()
    {
        this.slow(waitTimeForRunCommand * 2);
        const antTask = ant.find(t => t.taskFile.fileName.includes("hello.xml")) as TaskItem;
        await executeTeCommand2("run", [ antTask ], waitTimeForRunCommand);
        lastTask = antTask;
    });


    test("Bash", async function()
    {   //
        // There is only 1 bash file "task" - it sleeps for 3 seconds, 1 second at a time
        //
        this.slow((waitTimeForRunCommand * 2) + (slowTimeForConfigEvent * 4) + (slowTimeForCommand * 4));
        await executeSettingsUpdate("disableAnimatedIcons", true);
        await startTask(bash[0]);
        await executeTeCommand2("run", [ bash[0] ], waitTimeForRunCommand);
        await endTask(bash[0]);
        await executeSettingsUpdate("disableAnimatedIcons", false);
        lastTask = bash[0];
    });


    test("Batch 1", async function()
    {
        this.slow(35000);
        this.timeout(45000);
        //
        // There are 2 batch file "tasks" - they both sleep for 7 seconds, 1 second at a time
        //
        const batchTask = batch[0];
        await startTask(batchTask);
        await executeSettingsUpdate("keepTermOnStop", false);
        await executeTeCommand2("open", [ batchTask, true ], 100); // clickaction=execute
        await executeTeCommand2("runWithArgs", [ batchTask, "--test --test2" ], waitTimeForRunCommand);
        await executeTeCommand2("stop", [ batchTask ], 0, 0);
        await executeTeCommand2("run", [ batchTask ], waitTimeForRunCommand);
        executeTeCommand("pause", 1000, waitTimeMax, batchTask); // ?? No await ?
        await executeTeCommand2("pause", [ batchTask ], 500);
        await executeTeCommand2("run", [ batchTask ], waitTimeForRunCommand);
        await executeSettingsUpdate("clickAction", "Open");
        await executeTeCommand2("run", [ batchTask ], waitTimeForRunCommand / 3);
        await executeSettingsUpdate("clickAction", "Execute");
        await executeTeCommand2("openTerminal", [ batchTask ], 50);
        await executeTeCommand2("pause", [ batchTask ], 500);
        await executeSettingsUpdate("keepTermOnStop", true);
        await executeTeCommand2("stop", [ batchTask ], 50);
        await executeSettingsUpdate("disableAnimatedIcons", true);
        await executeSettingsUpdate("showRunningTask", false);
        await executeTeCommand("runLastTask", 1500, waitTimeMax, batchTask);
        await executeSettingsUpdate("keepTermOnStop", false);
        await executeTeCommand2("restart", [ batchTask ], 1500);
        await executeTeCommand2("stop", [ batchTask ], 400);
        await executeTeCommand("runNoTerm", 1500, waitTimeMax, batchTask);
        await executeTeCommand2("stop", [ batchTask ], 200);
        await endTask(batchTask);
    });


    test("Batch 2", async function()
    {   //
        // There are 2 batch file "tasks" - they both sleep for 7 seconds, 1 second at a time
        //
        this.slow(25000);
        this.timeout(35000);
        const batchTask = batch[1];
        await startTask(batchTask);
        await executeSettingsUpdate("keepTermOnStop", false);
        await executeTeCommand2("open", [ batchTask, true ], 100); // clickaction=execute
        await executeTeCommand2("runWithArgs", [ batchTask, "--test --test2" ], waitTimeForRunCommand);
        await executeTeCommand2("stop", [ batchTask ], 200);
        await executeSettingsUpdate("disableAnimatedIcons", false);
        overrideNextShowInputBox("--test --test2");
        await executeTeCommand2("runWithArgs", [ batchTask ], waitTimeForRunCommand / 3);
        // await executeTeCommand("stop", 200, waitTimeMax, batchTask);
        await executeSettingsUpdate("showRunningTask", true);
        await teApi.waitForIdle(8000);
        await endTask(batchTask);
    });

});


async function startTask(taskItem: TaskItem)
{
    console.log(`    ℹ Run ${taskItem.taskSource} task: ${taskItem.label}`);
    console.log(`        Folder: ${taskItem.getFolder()?.name}`);
    await executeSettingsUpdate("clickAction", "Execute");
    await executeSettingsUpdate("showLastTasks", (++runCount % 2) === 1);
    let removed = await executeTeCommand2("addRemoveFromFavorites", [ taskItem ]);
    if (removed) {
        await executeTeCommand2("addRemoveFromFavorites", [ taskItem ]);
    }
    overrideNextShowInputBox("test label");
    removed = await executeTeCommand2("addRemoveCustomLabel", [ taskItem ]);
    if (removed) {
        await executeTeCommand2("addRemoveCustomLabel", [ taskItem ]);
    }
    if (lastTask) {
        await executeTeCommand2("openTerminal", [ lastTask ]);
    }
}


async function endTask(taskItem: TaskItem)
{
    await executeTeCommand2("openTerminal", [ taskItem ]);
    console.log(`    ✔ Done ${taskItem.taskSource} task: ${taskItem.label}`);
    lastTask = taskItem;
}
