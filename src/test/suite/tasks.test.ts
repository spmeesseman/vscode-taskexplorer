/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* tslint:disable */

//
// Documentation on https://mochajs.org/ for help.
//
import * as assert from "assert";
import TaskItem from "../../tree/item";
import { expect } from "chai";
import { storage } from "../../lib/utils/storage";
import constants from "../../lib/constants";
import { IExplorerApi, ITaskExplorerApi, ITaskItemApi } from "@spmeesseman/vscode-taskexplorer-types";
import {
    activate, executeSettingsUpdate, executeTeCommand, executeTeCommand2, figures, focusExplorerView,
    treeUtils, overrideNextShowInfoBox, overrideNextShowInputBox, testControl, waitForTaskExecution, sleep
} from "../helper";
import SpecialTaskFolder from "../../tree/specialFolder";
import { TaskExecution } from "vscode";

let lastTask: ITaskItemApi | null = null;
let teApi: ITaskExplorerApi;
let explorer: IExplorerApi;
let ant: ITaskItemApi[];
let bash: ITaskItemApi[];
let batch: ITaskItemApi[];
let python: ITaskItemApi[];
let successCount = 0;
const endOfTestWaitTime = 750;


suite("Task Tests", () =>
{

    suiteSetup(async function()
    {
        teApi = await activate(this);
        explorer = teApi.testsApi.explorer;
        ++successCount;
    });


    suiteTeardown(async function()
    {
    });


	test("Activate Tree (Focus Explorer View)", async function()
	{
        await focusExplorerView(this);
	});


    test("Check task counts", async function()
    {
        expect(successCount).to.be.equal(1, "rolling success count failure");
        this.slow(testControl.slowTime.getTreeTasks * 4);
        bash = await treeUtils.getTreeTasks("bash", 1);
        await teApi.waitForIdle(testControl.waitTime.getTreeTasks);
        batch = await treeUtils.getTreeTasks("batch", 2);
        await teApi.waitForIdle(testControl.waitTime.getTreeTasks);
        ant = await treeUtils.getTreeTasks("ant", 3);
        await teApi.waitForIdle(testControl.waitTime.getTreeTasks);
        python = await treeUtils.getTreeTasks("python", 2);
        await teApi.waitForIdle(testControl.waitTime.getTreeTasks);
        ++successCount;
    });


    test("Empty TaskItem Parameter - Run", async function()
    {
        expect(successCount).to.be.equal(2, "rolling success count failure");
        this.slow(testControl.slowTime.runCommand + testControl.waitTime.runCommandMin + endOfTestWaitTime);
        expect(await executeTeCommand("run", testControl.waitTime.runCommandMin)).to.be.equal(undefined, "Return TaskExecution should be undefined");
        await teApi.waitForIdle(endOfTestWaitTime);
        ++successCount;
    });


    test("Empty TaskItem Parameter - Pause", async function()
    {
        expect(successCount).to.be.equal(3, "rolling success count failure");
        this.slow(testControl.slowTime.runPauseCommand + testControl.waitTime.runCommandMin + endOfTestWaitTime);
        expect(await executeTeCommand("pause", testControl.waitTime.runCommandMin)).to.be.equal(undefined, "Return TaskExecution should be undefined");
        await teApi.waitForIdle(endOfTestWaitTime);
        ++successCount;
    });


    test("Empty TaskItem Parameter - Restart", async function()
    {
        expect(successCount).to.be.equal(4, "rolling success count failure");
        this.slow(testControl.slowTime.runCommand + testControl.waitTime.runCommandMin + endOfTestWaitTime);
        expect(await executeTeCommand("restart", testControl.waitTime.runCommandMin)).to.be.equal(undefined, "Return TaskExecution should be undefined");
        await teApi.waitForIdle(endOfTestWaitTime);
        ++successCount;
    });


    test("Run non-existent last task", async function()
    {
        expect(successCount).to.be.equal(5, "rolling success count failure");
        this.slow(testControl.slowTime.runCommand + (testControl.slowTime.storageUpdate * 2) + testControl.waitTime.runCommandMax + endOfTestWaitTime);
        const lastTasks = storage.get<string[]>(constants.LAST_TASKS_STORE, []),
              hasLastTasks = lastTasks && lastTasks.length > 0;
        if (hasLastTasks)
        {
            await storage.update(constants.LAST_TASKS_STORE, undefined);
        }
        expect(await executeTeCommand("runLastTask", testControl.waitTime.runCommandMin)).to.be.equal(undefined, "Return TaskExecution should be undefined");
        if (hasLastTasks)
        {
            await storage.update(constants.LAST_TASKS_STORE, lastTasks);
        }
        await teApi.waitForIdle(endOfTestWaitTime);
        ++successCount;
    });


    test("Keep Terminal on Stop (OFF)", async function()
    {
        const taskTime = 2000;
        expect(successCount).to.be.equal(6, "rolling success count failure");
        this.slow(testControl.slowTime.runCommand + testControl.slowTime.runStopCommand +
                  testControl.slowTime.configEvent + (testControl.waitTime.runCommandMin * 2) + taskTime + endOfTestWaitTime);
        await executeSettingsUpdate("keepTermOnStop", false);
        const exec = await executeTeCommand2("run", [ batch[0] ], testControl.waitTime.runCommandMin, testControl.waitTime.runCommandMax) as TaskExecution | undefined;
        expect(exec).to.not.be.equal(undefined, "Starting the 'batch0' task did not return a valid TaskExecution");
        await waitForTaskExecution(exec, taskTime);
        await executeTeCommand2("stop", [ batch[0] ], testControl.waitTime.runCommandMin, testControl.waitTime.runCommandMin * 2);
        await teApi.waitForIdle(endOfTestWaitTime);
        ++successCount;
    });


    test("Keep Terminal on Stop (ON)", async function()
    {
        const taskTime = 2000;
        expect(successCount).to.be.equal(7, "rolling success count failure");
        this.slow(testControl.slowTime.runCommand + testControl.slowTime.runStopCommand +
                  testControl.slowTime.configEvent + (testControl.waitTime.runCommandMin * 2) + taskTime + endOfTestWaitTime);
        await executeSettingsUpdate("keepTermOnStop", true);
        const exec = await executeTeCommand2("run", [ batch[0] ], testControl.waitTime.runCommandMin, testControl.waitTime.runCommandMax) as TaskExecution | undefined;
        expect(exec).to.not.be.equal(undefined, "Starting the 'batch0' task did not return a valid TaskExecution");
        await waitForTaskExecution(exec, taskTime);
        await executeTeCommand2("stop", [ batch[0] ], testControl.waitTime.runCommandMin, testControl.waitTime.runCommandMin * 2);
        await teApi.waitForIdle(endOfTestWaitTime);
        ++successCount;
    });


    test("Trigger busy on run last task", async function()
    {
        expect(successCount).to.be.equal(8, "rolling success count failure");
        this.slow(testControl.slowTime.refreshCommand + testControl.slowTime.runCommand + testControl.waitTime.runCommandMin + 2000 + endOfTestWaitTime);
        await executeTeCommand("refresh", endOfTestWaitTime, 2000);
        await executeTeCommand("runLastTask", testControl.waitTime.runCommandMin, testControl.waitTime.runCommandMax);
        await teApi.waitForIdle(testControl.waitTime.refreshCommand);
        await teApi.waitForIdle(endOfTestWaitTime);
        ++successCount;
    });


    test("Resume task no terminal", async function()
    {
        expect(successCount).to.be.equal(9, "rolling success count failure");
        this.slow(testControl.slowTime.runCommand + testControl.waitTime.runCommandMax + endOfTestWaitTime);
        bash[0].paused = true;
        await executeTeCommand2("runLastTask", [ batch[0] ], testControl.waitTime.runCommandMax);
        bash[0].paused = false;
        await teApi.waitForIdle(endOfTestWaitTime);
        ++successCount;
    });


    test("Pause", async function()
    {
        this.slow(testControl.slowTime.runCommand + (testControl.waitTime.runCommandMin * 5) + testControl.waitTime.runCommandMax + endOfTestWaitTime);
        expect(successCount).to.be.equal(10, "rolling success count failure");
        await executeTeCommand2("run", [ batch[0] ], testControl.waitTime.runCommandMax);
        await teApi.waitForIdle(testControl.waitTime.runCommandMin);
        await executeTeCommand2("pause", [ batch[0] ], testControl.waitTime.runCommandMin);
        await teApi.waitForIdle(testControl.waitTime.runCommandMin);
        await executeTeCommand2("stop", [ batch[0] ], testControl.waitTime.runCommandMin);
        await teApi.waitForIdle(testControl.waitTime.runCommandMin);
        await teApi.waitForIdle(endOfTestWaitTime);
        ++successCount;
    });


    test("Pause (No Task)", async function()
    {
        expect(successCount).to.be.equal(11, "rolling success count failure");
        this.slow(testControl.slowTime.commandFast + endOfTestWaitTime);
        overrideNextShowInfoBox(undefined);
        await executeTeCommand2("pause", [ batch[0] ], 50);
        await teApi.waitForIdle(endOfTestWaitTime);
        ++successCount;
    });


    test("Resume (No Task)", async function()
    {
        expect(successCount).to.be.equal(12, "rolling success count failure");
        this.slow(testControl.slowTime.commandFast + endOfTestWaitTime);
        overrideNextShowInfoBox(undefined);
        await executeTeCommand2("pause", [ batch[0] ], 50);
        await teApi.waitForIdle(endOfTestWaitTime);
        ++successCount;
    });


    test("Ant", async function()
    {
        const taskTime = 3000; // sleeps for 3s
        expect(successCount).to.be.equal(13, "rolling success count failure");
        this.slow(testControl.slowTime.runCommand + taskTime + testControl.waitTime.runCommandMax + endOfTestWaitTime);
        const antTask = ant.find(t => t.taskFile.fileName.includes("hello.xml")) as TaskItem;
        expect(antTask).to.not.be.equal(undefined, "The 'hello' ant task was not found in the task tree");
        await startTask(antTask, false);
        const exec = await executeTeCommand2("run", [ antTask ], testControl.waitTime.runCommandMin, testControl.waitTime.runCommandMax) as TaskExecution | undefined;
        await waitForTaskExecution(exec);
        lastTask = antTask;
        await teApi.waitForIdle(endOfTestWaitTime);
        ++successCount;
    });


    test("Bash", async function()
    {   //
        // There is only 1 bash file "task" - it sleeps for 3 seconds, 1 second at a time
        //
        this.slow(testControl.slowTime.runCommand + (testControl.slowTime.configEvent * 4) + (testControl.slowTime.command * 4));
        expect(successCount).to.be.equal(14);
        await executeSettingsUpdate("visual.disableAnimatedIcons", true);
        await startTask(bash[0] as TaskItem, true);
        await executeTeCommand2("run", [ bash[0] ], testControl.waitTime.runCommandMax);
        await executeTeCommand2("openTerminal", [ bash[0] ]);
        lastTask = bash[0];
        ++successCount;
    });


    test("Batch 1", async function()
    {
        const slowTime = (testControl.slowTime.runCommand * 6) + (testControl.slowTime.runStopCommand * 3) +
                          testControl.slowTime.runPauseCommand + (testControl.waitTime.runCommandMax * 3) +
                          testControl.waitTime.runCommandMin + (testControl.slowTime.configEvent * 2) +
                          testControl.slowTime.command + endOfTestWaitTime + 4600;
        expect(successCount).to.be.equal(15, "rolling success count failure");
        this.slow(slowTime);
        this.timeout(slowTime + 15000);
        //
        // There are 2 batch file "tasks" - they both sleep for 7 seconds, 1 second at a time
        //
        const batchTask = batch[0];
        await startTask(batchTask as TaskItem, true);
        await executeSettingsUpdate("keepTermOnStop", false);
        await executeTeCommand2("open", [ batchTask, true ], 100); // clickaction=execute
        await executeTeCommand2("runWithArgs", [ batchTask, "--test --test2" ], testControl.waitTime.runCommandMax);
        await executeTeCommand2("stop", [ batchTask ], 0, 0);
        await executeTeCommand2("run", [ batchTask ], testControl.waitTime.runCommandMax);
        await executeTeCommand("pause", 1000, testControl.waitTime.max, batchTask);
        await executeTeCommand2("pause", [ batchTask ], 500);
        await executeTeCommand2("run", [ batchTask ], testControl.waitTime.runCommandMax);
        await executeSettingsUpdate("taskButtons.clickAction", "Open");
        await executeSettingsUpdate("visual.disableAnimatedIcons", false);
        await executeTeCommand2("run", [ batchTask ], testControl.waitTime.runCommandMin);
        await executeSettingsUpdate("taskButtons.clickAction", "Execute");
        await executeTeCommand2("openTerminal", [ python[0] ], 50);
        // await executeTeCommand2("pause", [ batchTask ], 500);
        await executeSettingsUpdate("keepTermOnStop", true);
        await executeTeCommand2("stop", [ batchTask ], 50);
        await executeSettingsUpdate("showRunningTask", false);
        await executeTeCommand("runLastTask", 1500, testControl.waitTime.max, batchTask);
        // await executeSettingsUpdate("keepTermOnStop", false);
        await executeTeCommand2("restart", [ batchTask ], 1500);
        await executeTeCommand2("stop", [ batchTask ], 400);
        // await executeTeCommand("runNoTerm", 1500, testControl.waitTime.max, batchTask);
        // await executeTeCommand2("stop", [ batchTask ], 200);
        // await executeTeCommand2("openTerminal", [ batchTask ]);
        await teApi.waitForIdle(endOfTestWaitTime);
        lastTask = batchTask;
        ++successCount;
    });


    test("Batch 2", async function()
    {   //
        // There are 2 batch file "tasks" - they both sleep for 7 seconds, 1 second at a time
        //
        const slowTime = (testControl.slowTime.runCommand * 3) + endOfTestWaitTime + 8300 + testControl.waitTime.runCommandMax +
                          testControl.waitTime.runCommandMin + testControl.slowTime.runStopCommand + testControl.slowTime.configEvent +
                          (testControl.slowTime.command * 2);
        expect(successCount).to.be.equal(16, "rolling success count failure");
        this.slow(slowTime);
        this.timeout(slowTime + 15000);
        const batchTask = batch[1];
        await startTask(batchTask as TaskItem, true);
        await executeSettingsUpdate("keepTermOnStop", false);
        await executeTeCommand2("open", [ batchTask, true ], 100); // clickaction=execute
        await executeTeCommand2("runWithArgs", [ batchTask, "--test --test2" ], testControl.waitTime.runCommandMax);
        await executeTeCommand2("stop", [ batchTask ], 200);
        overrideNextShowInputBox("--test --test2");
        await executeTeCommand2("runWithArgs", [ batchTask ], testControl.waitTime.runCommandMin);
        await executeSettingsUpdate("showRunningTask", true);
        await teApi.waitForIdle(8000);
        await executeTeCommand2("openTerminal", [ batchTask ]);
        await teApi.waitForIdle(endOfTestWaitTime);
        lastTask = batchTask;
        ++successCount;
    });

});


async function startTask(taskItem: TaskItem, addToSpecial: boolean)
{
    console.log(`    ${figures.color.info} Run ${taskItem.taskSource} task | ${taskItem.label} | ${taskItem.getFolder()?.name}`);
    if (addToSpecial)
    {
        await executeSettingsUpdate("taskButtons.clickAction", "Execute");
        // await executeSettingsUpdate("specialFolders.showLastTasks", (++runCount % 2) === 1);
        let removed = await executeTeCommand2("addRemoveFavorite", [ taskItem ]);
        if (removed) {
            await executeTeCommand2("addRemoveFavorite", [ taskItem ]);
        }
        const taskTree = explorer.getTaskTree();
        if(taskTree)
        {
            const sFolder= taskTree[0].label === constants.FAV_TASKS_LABEL ? taskTree[0] as SpecialTaskFolder :
                        (taskTree[1].label === constants.FAV_TASKS_LABEL ? taskTree[1] as SpecialTaskFolder : null);
            if (sFolder)
            {
                const sTaskItem = sFolder.taskFiles.find(t => sFolder.getTaskItemId(t) === taskItem.id);
                if (sTaskItem)
                {
                    overrideNextShowInputBox("test label");
                    removed = await executeTeCommand2("addRemoveCustomLabel", [ sTaskItem ]);
                    if (removed) {
                        await executeTeCommand2("addRemoveCustomLabel", [ sTaskItem ]);
                    }
                    if (lastTask) {
                        await executeTeCommand2("openTerminal", [ lastTask ]);
                    }
                }
            }
        }
    }
}
