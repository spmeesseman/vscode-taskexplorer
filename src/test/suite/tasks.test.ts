/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* tslint:disable */

import * as utils from "../utils/utils";
import constants from "../../lib/constants";
import TaskItem from "../../tree/item";
import SpecialTaskFolder from "../../tree/specialFolder";
import { expect } from "chai";
import { TaskExecution } from "vscode";
import { ITaskExplorer, ITaskExplorerApi, ITaskItem } from "@spmeesseman/vscode-taskexplorer-types";

const tc = utils.testControl;
const endOfTestWaitTime = 750;
let lastTask: ITaskItem | null = null;
let teApi: ITaskExplorerApi;
let explorer: ITaskExplorer;
let ant: ITaskItem[];
let bash: ITaskItem[];
let batch: ITaskItem[];
let python: ITaskItem[];
let successCount = 0;
let clickAction: string;


suite("Task Tests", () =>
{

    suiteSetup(async function()
    {
        teApi = await utils.activate(this);
        explorer = teApi.testsApi.explorer;
        clickAction = teApi.config.get<string>("taskButtons.clickAction");
        ++successCount;
    });


    suiteTeardown(async function()
    {
        await utils.executeSettingsUpdate("taskButtons.clickAction", clickAction);
        utils.suiteFinished(this);
    });


	test("Activate Tree (Focus Explorer View)", async function()
	{
        await utils.focusExplorerView(this);
	});


    test("Check task counts", async function()
    {
        if (utils.exitRollingCount(1, successCount)) return;
        this.slow(tc.slowTime.getTreeTasks * 4);
        bash = await utils.treeUtils.getTreeTasks("bash", 1);
        await utils.waitForTeIdle(tc.waitTime.getTreeTasks);
        batch = await utils.treeUtils.getTreeTasks("batch", 2);
        await utils.waitForTeIdle(tc.waitTime.getTreeTasks);
        ant = await utils.treeUtils.getTreeTasks("ant", 3);
        await utils.waitForTeIdle(tc.waitTime.getTreeTasks);
        python = await utils.treeUtils.getTreeTasks("python", 2);
        await utils.waitForTeIdle(tc.waitTime.getTreeTasks);
        ++successCount;
    });


    test("Empty TaskItem Parameter - Run", async function()
    {
        if (utils.exitRollingCount(2, successCount)) return;
        this.slow(tc.slowTime.runCommand + tc.waitTime.runCommandMin + endOfTestWaitTime);
        expect(await utils.executeTeCommand("run", tc.waitTime.runCommandMin)).to.be.equal(undefined, "Return TaskExecution should be undefined");
        await utils.waitForTeIdle(endOfTestWaitTime);
        ++successCount;
    });


    test("Empty TaskItem Parameter - Pause", async function()
    {
        if (utils.exitRollingCount(3, successCount)) return;
        this.slow(tc.slowTime.runPauseCommand + tc.waitTime.runCommandMin + endOfTestWaitTime);
        expect(await utils.executeTeCommand("pause", tc.waitTime.runCommandMin)).to.be.equal(undefined, "Return TaskExecution should be undefined");
        await utils.waitForTeIdle(endOfTestWaitTime);
        ++successCount;
    });


    test("Empty TaskItem Parameter - Restart", async function()
    {
        if (utils.exitRollingCount(4, successCount)) return;
        this.slow(tc.slowTime.runCommand + tc.waitTime.runCommandMin + endOfTestWaitTime);
        expect(await utils.executeTeCommand("restart", tc.waitTime.runCommandMin)).to.be.equal(undefined, "Return TaskExecution should be undefined");
        await utils.waitForTeIdle(endOfTestWaitTime);
        ++successCount;
    });


    test("Run non-existent last task", async function()
    {
        if (utils.exitRollingCount(5, successCount)) return;
        this.slow(tc.slowTime.runCommand + (tc.slowTime.storageUpdate * 2) + tc.waitTime.runCommandMax + endOfTestWaitTime);
        const lastTasks = teApi.testsApi.storage.get<string[]>(constants.LAST_TASKS_STORE, []),
              hasLastTasks = lastTasks && lastTasks.length > 0;
        if (hasLastTasks)
        {
            await teApi.testsApi.storage.update(constants.LAST_TASKS_STORE, undefined);
        }
        expect(await utils.executeTeCommand("runLastTask", tc.waitTime.runCommandMin)).to.be.equal(undefined, "Return TaskExecution should be undefined");
        if (hasLastTasks)
        {
            await teApi.testsApi.storage.update(constants.LAST_TASKS_STORE, lastTasks);
        }
        await utils.waitForTeIdle(endOfTestWaitTime);
        ++successCount;
    });


    test("Keep Terminal on Stop (OFF)", async function()
    {
        const taskTime = 2000;
        if (utils.exitRollingCount(6, successCount)) return;
        this.slow(tc.slowTime.runCommand + tc.slowTime.runStopCommand +
                  tc.slowTime.configEvent + (tc.waitTime.runCommandMin * 2) + taskTime + endOfTestWaitTime);
        await utils.executeSettingsUpdate("keepTermOnStop", false);
        const exec = await utils.executeTeCommand2("run", [ batch[0] ], tc.waitTime.runCommandMin, tc.waitTime.runCommandMax) as TaskExecution | undefined;
        expect(exec).to.not.be.equal(undefined, "Starting the 'batch0' task did not return a valid TaskExecution");
        await utils.waitForTaskExecution(exec, taskTime);
        await utils.executeTeCommand2("stop", [ batch[0] ], tc.waitTime.runCommandMin, tc.waitTime.runCommandMin * 2);
        await utils.waitForTeIdle(endOfTestWaitTime);
        ++successCount;
    });


    test("Keep Terminal on Stop (ON)", async function()
    {
        const taskTime = 2000;
        if (utils.exitRollingCount(7, successCount)) return;
        this.slow(tc.slowTime.runCommand + tc.slowTime.runStopCommand +
                  tc.slowTime.configEvent + (tc.waitTime.runCommandMin * 2) + taskTime + endOfTestWaitTime);
        await utils.executeSettingsUpdate("keepTermOnStop", true);
        const exec = await utils.executeTeCommand2("run", [ batch[0] ], tc.waitTime.runCommandMin, tc.waitTime.runCommandMax) as TaskExecution | undefined;
        expect(exec).to.not.be.equal(undefined, "Starting the 'batch0' task did not return a valid TaskExecution");
        await utils.waitForTaskExecution(exec, taskTime);
        await utils.executeTeCommand2("stop", [ batch[0] ], tc.waitTime.runCommandMin, tc.waitTime.runCommandMin * 2);
        await utils.waitForTeIdle(endOfTestWaitTime);
        ++successCount;
    });


    test("Trigger busy on run last task", async function()
    {
        if (utils.exitRollingCount(8, successCount)) return;
        this.slow(tc.slowTime.refreshCommand + tc.slowTime.runCommand + tc.waitTime.runCommandMin + 2000 + endOfTestWaitTime);
        await utils.executeTeCommand("refresh", endOfTestWaitTime, 2000);
        await utils.executeTeCommand("runLastTask", tc.waitTime.runCommandMin, tc.waitTime.runCommandMax);
        await utils.waitForTeIdle(tc.waitTime.refreshCommand);
        await utils.waitForTeIdle(endOfTestWaitTime);
        ++successCount;
    });


    test("Resume task no terminal", async function()
    {
        if (utils.exitRollingCount(9, successCount)) return;
        this.slow(tc.slowTime.runCommand + tc.waitTime.runCommandMax + endOfTestWaitTime);
        bash[0].paused = true;
        await utils.executeTeCommand2("runLastTask", [ batch[0] ], tc.waitTime.runCommandMax);
        bash[0].paused = false;
        await utils.waitForTeIdle(endOfTestWaitTime);
        ++successCount;
    });


    test("Pause", async function()
    {
        this.slow(tc.slowTime.runCommand + (tc.waitTime.runCommandMin * 5) + tc.waitTime.runCommandMax + endOfTestWaitTime);
        if (utils.exitRollingCount(10, successCount)) return;
        await utils.executeTeCommand2("run", [ batch[0] ], tc.waitTime.runCommandMax);
        await utils.waitForTeIdle(tc.waitTime.runCommandMin);
        await utils.executeTeCommand2("pause", [ batch[0] ], tc.waitTime.runCommandMin);
        await utils.waitForTeIdle(tc.waitTime.runCommandMin);
        await utils.executeTeCommand2("stop", [ batch[0] ], tc.waitTime.runCommandMin);
        await utils.waitForTeIdle(tc.waitTime.runCommandMin);
        await utils.waitForTeIdle(endOfTestWaitTime);
        ++successCount;
    });


    test("Pause (No Task)", async function()
    {
        if (utils.exitRollingCount(11, successCount)) return;
        this.slow(tc.slowTime.commandFast + endOfTestWaitTime);
        utils.overrideNextShowInfoBox(undefined);
        await utils.executeTeCommand2("pause", [ batch[0] ], 50);
        await utils.waitForTeIdle(endOfTestWaitTime);
        ++successCount;
    });


    test("Resume (No Task)", async function()
    {
        if (utils.exitRollingCount(12, successCount)) return;
        this.slow(tc.slowTime.commandFast + endOfTestWaitTime);
        utils.overrideNextShowInfoBox(undefined);
        await utils.executeTeCommand2("pause", [ batch[0] ], 50);
        await utils.waitForTeIdle(endOfTestWaitTime);
        ++successCount;
    });


    test("Run Ant Task", async function()
    {
        const taskTime = 3000; // utils.sleeps for 3s
        if (utils.exitRollingCount(13, successCount)) return;
        this.slow(tc.slowTime.runCommand + taskTime + tc.waitTime.runCommandMax + endOfTestWaitTime);
        const antTask = ant.find(t => t.taskFile.fileName.includes("hello.xml")) as TaskItem;
        expect(antTask).to.not.be.equal(undefined, "The 'hello' ant task was not found in the task tree");
        await startTask(antTask, false);
        const exec = await utils.executeTeCommand2("run", [ antTask ], tc.waitTime.runCommandMin, tc.waitTime.runCommandMax) as TaskExecution | undefined;
        await utils.waitForTaskExecution(exec);
        lastTask = antTask;
        await utils.waitForTeIdle(endOfTestWaitTime);
        ++successCount;
    });


    test("Run Bash Task", async function()
    {   //
        // There is only 1 bash file "task" - it utils.sleeps for 3 seconds, 1 second at a time
        //
        if (utils.exitRollingCount(14, successCount)) return;
        this.slow(tc.slowTime.runCommand + (tc.slowTime.configEvent * 4) + (tc.slowTime.command * 4));
        await utils.executeSettingsUpdate("visual.disableAnimatedIcons", true);
        await startTask(bash[0] as TaskItem, true);
        const exec = await utils.executeTeCommand2("run", [ bash[0] ], tc.waitTime.runCommandMin, tc.waitTime.runCommandMax) as TaskExecution | undefined;
        await utils.executeTeCommand2("openTerminal", [ bash[0] ]);
        await utils.waitForTaskExecution(exec);
        lastTask = bash[0];
        await utils.waitForTeIdle(endOfTestWaitTime);
        ++successCount;
    });


    test("Run Batch Task", async function()
    {
        if (utils.exitRollingCount(15, successCount)) return;
        const slowTime = (tc.slowTime.runCommand * 6) + (tc.slowTime.runStopCommand * 3) +
                          tc.slowTime.runPauseCommand + (tc.waitTime.runCommandMax * 3) +
                          tc.waitTime.runCommandMin + (tc.slowTime.configEvent * 2) +
                          tc.slowTime.command + tc.slowTime.closeActiveDocument + endOfTestWaitTime + 4600 + 7000;
        this.slow(slowTime);
        this.timeout(slowTime + 15000);
        //
        // There are 2 batch file "tasks" - they both utils.sleep for 7 seconds, 1 second at a time
        //
        const batchTask = batch[0];
        await startTask(batchTask as TaskItem, true);
        await utils.executeSettingsUpdate("keepTermOnStop", false);
console.log("open (exec)");
        await utils.executeTeCommand2("open", [ batchTask, true ], 100); // clickaction=execute (set in startTask)
console.log("runWithArgs");
        await utils.executeTeCommand2("runWithArgs", [ batchTask, "--test --test2" ], tc.waitTime.runCommandMin, tc.waitTime.runCommandMax);
console.log("stop");
        await utils.executeTeCommand2("stop", [ batchTask ], 0, 0);
console.log("run");
        await utils.executeTeCommand2("run", [ batchTask ], tc.waitTime.runCommandMin, tc.waitTime.runCommandMax);
console.log("pause");
        await utils.executeTeCommand("pause", 1000, tc.waitTime.max, batchTask);
console.log("pause");
        await utils.executeTeCommand2("pause", [ batchTask ], 500);
console.log("run while running");
        await utils.executeTeCommand2("run", [ batchTask ], tc.waitTime.runCommandMin, tc.waitTime.runCommandMax);
        await utils.executeSettingsUpdate("taskButtons.clickAction", "Open");
console.log("open");
        await utils.executeTeCommand2("open", [ batchTask, true ], 100);
console.log("dis anim icons");
        await utils.executeSettingsUpdate("visual.disableAnimatedIcons", false);
console.log("run");
        await utils.executeTeCommand2("run", [ batchTask ], tc.waitTime.runCommandMin, tc.waitTime.runCommandMax);
        await utils.executeSettingsUpdate("taskButtons.clickAction", "Execute");
console.log("open terminal");
        await utils.executeTeCommand2("openTerminal", [ python[0] ], 50);
        await utils.executeSettingsUpdate("keepTermOnStop", true);
console.log("stop");
        await utils.executeTeCommand2("stop", [ batchTask ], 50);
        await utils.executeSettingsUpdate("showRunningTask", false);
console.log("runLastTask");
        await utils.executeTeCommand("runLastTask", 1500, tc.waitTime.max, batchTask);
console.log("restart");
        const exec = await utils.executeTeCommand2("restart", [ batchTask ], 1500) as TaskExecution | undefined;
console.log("wait: " + exec?.task.name);
        // await utils.executeTeCommand2("stop", [ batchTask ], 400);
        // await utils.waitForTeIdle(endOfTestWaitTime);
        await utils.waitForTaskExecution(exec);
        await utils.closeActiveDocument();
        await utils.waitForTeIdle(endOfTestWaitTime);
        lastTask = batchTask;
        ++successCount;
    });


    test("Run Batch Task (With Args)", async function()
    {
        if (utils.exitRollingCount(16, successCount)) return;
        //
        // There are 2 batch file "tasks" - they both utils.sleep for 7 seconds, 1 second at a time
        //
        const slowTime = (tc.slowTime.runCommand * 3) + endOfTestWaitTime + 7000 + 1000 + (tc.waitTime.runCommandMin * 2) +
                          tc.waitTime.runCommandMin + tc.slowTime.runStopCommand + tc.slowTime.configEvent +
                          (tc.slowTime.command * 2);
        this.slow(slowTime);
        this.timeout(slowTime + 15000);
        const batchTask = batch[1];
        await startTask(batchTask as TaskItem, true);
        await utils.executeSettingsUpdate("keepTermOnStop", false);
        await utils.executeTeCommand2("open", [ batchTask, true ], 100); // clickaction=execute
        await utils.executeTeCommand2("runWithArgs", [ batchTask, "--test --test2" ], tc.waitTime.runCommandMin, tc.waitTime.runCommandMax);
        await utils.executeTeCommand2("stop", [ batchTask ], 200);
        utils.overrideNextShowInputBox("--test --test2");
        const exec = await utils.executeTeCommand2("runWithArgs", [ batchTask ], tc.waitTime.runCommandMin, tc.waitTime.runCommandMax) as TaskExecution | undefined;
        await utils.executeSettingsUpdate("showRunningTask", true);
        await utils.sleep(1000);
        await utils.executeTeCommand2("openTerminal", [ batchTask ]);
        await utils.waitForTaskExecution(exec);
        await utils.waitForTeIdle(endOfTestWaitTime);
        lastTask = batchTask;
        ++successCount;
    });

/*

    test("Run Batch Task (No Terminal)", async function()
    {
        if (utils.exitRollingCount(17, successCount)) return;
        this.slow(tc.slowTime.runCommand + tc.waitTime.runCommandMax + endOfTestWaitTime);
        const batchTask = batch[0];
        const exec = await utils.executeTeCommand2("runNoTerm", [ batchTask ], tc.waitTime.runCommandMin, tc.waitTime.runCommandMax) as TaskExecution | undefined;
        await utils.waitForTaskExecution(exec);
        lastTask = batchTask;
        await utils.waitForTeIdle(endOfTestWaitTime);
        lastTask = batchTask;
        ++successCount;
    });
*/
});


async function startTask(taskItem: TaskItem, addToSpecial: boolean)
{
    console.log(`    ${utils.figures.color.info} Run ${taskItem.taskSource} task | ${taskItem.label} | ${taskItem.getFolder()?.name}`);
    if (addToSpecial)
    {
        await utils.executeSettingsUpdate("taskButtons.clickAction", "Execute");
        // await utils.executeSettingsUpdate("specialFolders.showLastTasks", (++runCount % 2) === 1);
        let removed = await utils.executeTeCommand2("addRemoveFavorite", [ taskItem ]);
        if (removed) {
            await utils.executeTeCommand2("addRemoveFavorite", [ taskItem ]);
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
                    utils.overrideNextShowInputBox("test label");
                    removed = await utils.executeTeCommand2("addRemoveCustomLabel", [ sTaskItem ]);
                    if (removed) {
                        await utils.executeTeCommand2("addRemoveCustomLabel", [ sTaskItem ]);
                    }
                    if (lastTask) {
                        await utils.executeTeCommand2("openTerminal", [ lastTask ]);
                    }
                }
            }
        }
    }
}
