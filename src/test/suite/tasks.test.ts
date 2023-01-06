/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* tslint:disable */

//
// Documentation on https://mochajs.org/ for help.
//
import TaskItem from "../../tree/item";
import { storage } from "../../lib/utils/storage";
import constants from "../../lib/constants";
import { IExplorerApi, ITaskExplorerApi } from "@spmeesseman/vscode-taskexplorer-types";
import {
    activate, executeSettingsUpdate, executeTeCommand, executeTeCommand2, figures, focusExplorer,
    treeUtils, overrideNextShowInfoBox, overrideNextShowInputBox, testControl
} from "../helper";

let lastTask: TaskItem | null = null;
let teApi: ITaskExplorerApi;
let explorer: IExplorerApi;
let ant: TaskItem[];
let bash: TaskItem[];
let batch: TaskItem[];


suite("Task Tests", () =>
{

    suiteSetup(async function()
    {
        teApi = await activate(this);
        explorer = teApi.testsApi.explorer;
    });


	test("Focus Task Explorer View for Tree Population", async function()
	{
        await focusExplorer(this);
	});


    test("Check task counts", async function()
    {
        this.slow(testControl.slowTime.getTreeTasks * 3);
        bash = await treeUtils.getTreeTasks("bash", 1);
        batch = await treeUtils.getTreeTasks("batch", 2);
        ant = await treeUtils.getTreeTasks("ant", 3);
    });


    test("Empty TaskItem Parameter - Run", async function()
    {
        this.slow(testControl.slowTime.runCommand);
        await executeTeCommand("run", testControl.waitTime.runCommand);
    });


    test("Empty TaskItem Parameter - Pause", async function()
    {
        this.slow(testControl.slowTime.runPauseCommand);
        await executeTeCommand("pause", 500);
    });


    test("Empty TaskItem Parameter - Restart", async function()
    {
        this.slow(testControl.slowTime.runCommand);
        await executeTeCommand("restart", 500);
    });


    test("Run non-existent last task", async function()
    {
        this.slow(testControl.slowTime.runCommand + (testControl.slowTime.storageUpdate * 2));
        const lastTasks = storage.get<string[]>(constants.LAST_TASKS_STORE, []),
              hasLastTasks = lastTasks && lastTasks.length > 0;
        if (hasLastTasks)
        {
            await storage.update(constants.LAST_TASKS_STORE, undefined);
        }
        await executeTeCommand("runLastTask", testControl.waitTime.runCommand);
        if (hasLastTasks)
        {
            await storage.update(constants.LAST_TASKS_STORE, lastTasks);
        }
    });


    test("Keep Terminal on Stop (OFF)", async function()
    {
        this.slow(testControl.slowTime.runCommand + testControl.slowTime.runStopCommand + testControl.slowTime.configEvent);
        await executeSettingsUpdate("keepTermOnStop", false);
        await executeTeCommand("run", testControl.waitTime.runCommand, 5000, batch[0]);
        await executeTeCommand("stop", 1000, 1500, batch[0]);
    });


    test("Keep Terminal on Stop (ON)", async function()
    {
        this.slow(testControl.slowTime.runCommand + testControl.slowTime.runStopCommand + testControl.slowTime.configEvent);
        await executeSettingsUpdate("keepTermOnStop", true);
        await executeTeCommand("run", testControl.waitTime.runCommand, 5000, batch[0]);
        await executeTeCommand("stop", 1000, 1500, batch[0]);
    });


    test("Trigger busy on run last task", async function()
    {
        this.slow(testControl.slowTime.runCommand + testControl.waitTime.fsCreateEvent);
        explorer.invalidateTasksCache();// Don't await
        await executeTeCommand("runLastTask", testControl.waitTime.runCommand, testControl.slowTime.runCommand);
    });


    test("Resume task no terminal", async function()
    {
        this.slow(testControl.slowTime.runCommand);
        bash[0].paused = true;
        await executeTeCommand2("runLastTask", [ batch[0] ], testControl.waitTime.runCommand);
        bash[0].paused = false;
    });


    test("Pause", async function()
    {
        this.slow((testControl.waitTime.runCommand * 2) + testControl.slowTime.runCommand);
        await executeTeCommand2("run", [ batch[0] ], testControl.waitTime.runCommand);
        await executeTeCommand2("pause", [ batch[0] ], 500);
        await executeTeCommand2("stop", [ batch[0] ], 400);
    });


    test("Pause (No Task)", async function()
    {
        overrideNextShowInfoBox(undefined);
        this.slow(testControl.slowTime.commandFast);
        await executeTeCommand2("pause", [ batch[0] ], 50);
    });


    test("Resume (No Task)", async function()
    {
        overrideNextShowInfoBox(undefined);
        this.slow(testControl.slowTime.commandFast);
        await executeTeCommand2("pause", [ batch[0] ], 50);
    });


    test("Ant", async function()
    {
        this.slow(testControl.waitTime.runCommand * 2);
        const antTask = ant.find(t => t.taskFile.fileName.includes("hello.xml")) as TaskItem;
        await executeTeCommand2("run", [ antTask ], testControl.waitTime.runCommand);
        lastTask = antTask;
    });


    test("Bash", async function()
    {   //
        // There is only 1 bash file "task" - it sleeps for 3 seconds, 1 second at a time
        //
        this.slow(testControl.slowTime.runCommand + (testControl.slowTime.configEvent * 4) + (testControl.slowTime.command * 4));
        await executeSettingsUpdate("visual.disableAnimatedIcons", true);
        await startTask(bash[0]);
        await executeTeCommand2("run", [ bash[0] ], testControl.waitTime.runCommand);
        await endTask(bash[0]);
        lastTask = bash[0];
    });


    test("Batch 1", async function()
    {
        this.slow(testControl.slowTime.runCommand * 6);
        this.timeout(testControl.slowTime.runCommand * 8);
        //
        // There are 2 batch file "tasks" - they both sleep for 7 seconds, 1 second at a time
        //
        const batchTask = batch[0];
        await startTask(batchTask);
        await executeSettingsUpdate("keepTermOnStop", false);
        await executeTeCommand2("open", [ batchTask, true ], 100); // clickaction=execute
        await executeTeCommand2("runWithArgs", [ batchTask, "--test --test2" ], testControl.waitTime.runCommand);
        await executeTeCommand2("stop", [ batchTask ], 0, 0);
        await executeTeCommand2("run", [ batchTask ], testControl.waitTime.runCommand);
        executeTeCommand("pause", 1000, testControl.waitTime.max, batchTask); // ?? No await ?
        await executeTeCommand2("pause", [ batchTask ], 500);
        await executeTeCommand2("run", [ batchTask ], testControl.waitTime.runCommand);
        await executeSettingsUpdate("taskButtons.clickAction", "Open");
        await executeSettingsUpdate("visual.disableAnimatedIcons", false);
        await executeTeCommand2("run", [ batchTask ], testControl.waitTime.runCommand / 3);
        await executeSettingsUpdate("taskButtons.clickAction", "Execute");
        await executeTeCommand2("openTerminal", [ batchTask ], 50);
        await executeTeCommand2("pause", [ batchTask ], 500);
        await executeSettingsUpdate("keepTermOnStop", true);
        await executeTeCommand2("stop", [ batchTask ], 50);
        await executeSettingsUpdate("showRunningTask", false);
        await executeTeCommand("runLastTask", 1500, testControl.waitTime.max, batchTask);
        await executeSettingsUpdate("keepTermOnStop", false);
        await executeTeCommand2("restart", [ batchTask ], 1500);
        await executeTeCommand2("stop", [ batchTask ], 400);
        await executeTeCommand("runNoTerm", 1500, testControl.waitTime.max, batchTask);
        await executeTeCommand2("stop", [ batchTask ], 200);
        await endTask(batchTask);
    });


    test("Batch 2", async function()
    {   //
        // There are 2 batch file "tasks" - they both sleep for 7 seconds, 1 second at a time
        //
        this.slow(testControl.slowTime.runCommand * 5);
        this.timeout(testControl.slowTime.runCommand * 7);
        const batchTask = batch[1];
        await startTask(batchTask);
        await executeSettingsUpdate("keepTermOnStop", false);
        await executeTeCommand2("open", [ batchTask, true ], 100); // clickaction=execute
        await executeTeCommand2("runWithArgs", [ batchTask, "--test --test2" ], testControl.waitTime.runCommand);
        await executeTeCommand2("stop", [ batchTask ], 200);
        overrideNextShowInputBox("--test --test2");
        await executeTeCommand2("runWithArgs", [ batchTask ], testControl.waitTime.runCommand / 3);
        // await executeTeCommand("stop", 200, testControl.waitTime.max, batchTask);
        await executeSettingsUpdate("showRunningTask", true);
        await teApi.waitForIdle(8000);
        await endTask(batchTask);
    });

});


async function startTask(taskItem: TaskItem)
{
    console.log(`    ${figures.info} Run ${taskItem.taskSource} task: ${taskItem.label}`);
    console.log(`        Folder: ${taskItem.getFolder()?.name}`);
    await executeSettingsUpdate("taskButtons.clickAction", "Execute");
    // await executeSettingsUpdate("specialFolders.showLastTasks", (++runCount % 2) === 1);
    let removed = await executeTeCommand2("addRemoveFavorite", [ taskItem ]);
    if (removed) {
        await executeTeCommand2("addRemoveFavorite", [ taskItem ]);
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
