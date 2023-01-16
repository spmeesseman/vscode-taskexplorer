/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* tslint:disable */

import * as utils from "../utils/utils";
import constants from "../../lib/constants";
import TaskItem from "../../tree/item";
import SpecialTaskFolder from "../../tree/specialFolder";
import { expect } from "chai";
import { Task, TaskExecution, TaskPanelKind, TaskRevealKind, WorkspaceFolder } from "vscode";
import { ITaskExplorer, ITaskExplorerApi, ITaskItem } from "@spmeesseman/vscode-taskexplorer-types";
import { providers } from "../../extension";

const tc = utils.testControl;
const endOfTestWaitTime = 750;
const startTaskSlowTime = tc.slowTime.configEvent + (tc.slowTime.showHideSpecialFolder * 2) + (tc.slowTime.command * 2);
let lastTask: ITaskItem | null = null;
let teApi: ITaskExplorerApi;
let explorer: ITaskExplorer;
let ant: ITaskItem[];
let bash: ITaskItem[];
let batch: ITaskItem[];
let python: ITaskItem[];
let antTask: TaskItem;
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


    test("Run non-existent last task", async function()
    {
        if (utils.exitRollingCount(2, successCount)) return;
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
        if (utils.exitRollingCount(3, successCount)) return;
        this.slow((tc.slowTime.runCommand * 2) + tc.slowTime.runStopCommand + tc.slowTime.configEvent +
                  (tc.waitTime.runCommandMin * 2) + tc.waitTime.taskCommand + 2000 + 1000 + + tc.waitTime.command + endOfTestWaitTime);
        await utils.executeSettingsUpdate("keepTermOnStop", false);
        const exec = await utils.executeTeCommand2("run", [ batch[0] ], tc.waitTime.runCommandMin) as TaskExecution | undefined;
        expect(exec).to.not.be.equal(undefined, "Starting the 'batch0' task did not return a valid TaskExecution");
        await utils.waitForTaskExecution(exec, 2000);
        await utils.executeTeCommand2("stop", [ batch[0] ], tc.waitTime.taskCommand);
        // Cover, w/ no term
        batch[0].paused = true;
        utils.overrideNextShowInfoBox(undefined);
        await utils.executeTeCommand2("run", [ batch[0] ], tc.waitTime.runCommandMin) as TaskExecution | undefined;
        utils.executeTeCommand2("stop", [ batch[0] ], 0); // don't await
        await utils.waitForTeIdle(endOfTestWaitTime);
        ++successCount;
    });


    test("Keep Terminal on Stop (ON)", async function()
    {
        if (utils.exitRollingCount(4, successCount)) return;
        this.slow(tc.slowTime.runCommand + tc.slowTime.runStopCommand +
                  tc.slowTime.configEvent + (tc.waitTime.runCommandMin * 2) + 3000 + endOfTestWaitTime);
        await utils.executeSettingsUpdate("keepTermOnStop", true);
        const exec = await utils.executeTeCommand2("run", [ batch[0] ], tc.waitTime.runCommandMin) as TaskExecution | undefined;
        expect(exec).to.not.be.equal(undefined, "Starting the 'batch0' task did not return a valid TaskExecution");
        await utils.waitForTaskExecution(exec, 2000);
        await utils.executeTeCommand2("stop", [ batch[0] ], tc.waitTime.runCommandMin);
        await utils.waitForTaskExecution(exec, 0);
        await utils.waitForTeIdle(endOfTestWaitTime);
        ++successCount;
    });


    test("Trigger Busy on Task Commands", async function()
    {
        if (utils.exitRollingCount(5, successCount)) return;
        this.slow(tc.slowTime.refreshCommand + endOfTestWaitTime + (tc.slowTime.command * 4) + 1250);
        utils.clearOverrideShowInfoBox();
        utils.executeTeCommand("refresh", endOfTestWaitTime, 2000); // don't await
        await utils.sleep(1250);
        utils.overrideNextShowInfoBox(undefined);
        utils.executeTeCommand("runLastTask", 0);                   // don't await
        utils.overrideNextShowInfoBox(undefined);
        utils.executeTeCommand2("run", [ batch[0] ], 0);            // don't await
        utils.overrideNextShowInfoBox(undefined);
        utils.executeTeCommand2("restart", [ batch[0] ], 0);        // don't await
        utils.overrideNextShowInfoBox(undefined);
        utils.executeTeCommand2("stop", [ batch[0] ], 0);           // don't await
        await utils.waitForTeIdle(tc.waitTime.refreshCommand);      // now wait for refresh
        ++successCount;
    });


    test("Pause", async function()
    {
        if (utils.exitRollingCount(6, successCount)) return;
        this.slow(tc.slowTime.runCommand + tc.slowTime.runPauseCommand + tc.slowTime.runStopCommand + tc.slowTime.configEvent +
                 (tc.waitTime.taskCommand * 2) + endOfTestWaitTime + 1000 + 2000 + 1000);
        await utils.executeSettingsUpdate("keepTermOnStop", false);
        const exec = await utils.executeTeCommand2("run", [ batch[0] ], tc.waitTime.runCommandMin) as TaskExecution | undefined;
        await utils.waitForTaskExecution(exec, 2000);
        await utils.waitForTeIdle(tc.waitTime.runCommandMin);
        await utils.executeTeCommand2("pause", [ batch[0] ], tc.waitTime.taskCommand);
        await utils.sleep(1000);
        await utils.executeTeCommand2("stop", [ batch[0] ], tc.waitTime.taskCommand);
        await utils.waitForTeIdle(endOfTestWaitTime);
        ++successCount;
    });


    test("Run Ant Task (w/ Ansicon)", async function()
    {
        if (utils.exitRollingCount(7, successCount)) return;
        this.slow((tc.slowTime.configEnableEvent * 2) + (tc.waitTime.configEnableEvent * 2) + tc.slowTime.runCommand +
                  tc.waitTime.runCommandMin + endOfTestWaitTime + (tc.slowTime.tasks.antTask * 2) + (tc.waitTime.configEvent * 2));
        antTask = ant.find(t => t.taskFile.fileName.includes("hello.xml")) as TaskItem;
        expect(antTask).to.not.be.equal(undefined, "The 'hello' ant task was not found in the task tree");
        await utils.executeSettingsUpdate("pathToPrograms.ansicon", utils.getWsPath("..\\tools\\ansicon\\x64\\ansicon.exe"));
        await utils.waitForTeIdle(tc.waitTime.configEnableEvent);
        utils.overrideNextShowInfoBox(undefined);
        await utils.executeSettingsUpdate("visual.enableAnsiconForAnt", true);
        await utils.waitForTeIdle(tc.waitTime.configEnableEvent);
        await startTask(antTask, false);
        const exec = await utils.executeTeCommand2("run", [ antTask ], tc.waitTime.runCommandMin) as TaskExecution | undefined;
        await utils.waitForTaskExecution(exec);
        lastTask = antTask;
        await utils.waitForTeIdle(endOfTestWaitTime);
        ++successCount;
    });


    test("Run Ant Task (w/o Ansicon)", async function()
    {
        if (utils.exitRollingCount(8, successCount)) return;
        this.slow(tc.slowTime.configEnableEvent + tc.waitTime.configEnableEvent +tc.slowTime.runCommand +
                  tc.waitTime.runCommandMin + endOfTestWaitTime + (tc.slowTime.tasks.antTask * 2) + (tc.waitTime.configEvent * 2));
        await utils.executeSettingsUpdate("visual.enableAnsiconForAnt", false);
        await utils.waitForTeIdle(tc.waitTime.configEnableEvent);
        await startTask(antTask, false);
        const exec = await utils.executeTeCommand2("run", [ antTask ], tc.waitTime.runCommandMin) as TaskExecution | undefined;
        await utils.waitForTaskExecution(exec);
        lastTask = antTask;
        await utils.waitForTeIdle(endOfTestWaitTime);
        ++successCount;
    });


    test("Run Bash Task", async function()
    {   //
        // There is only 1 bash file "task" - it utils.sleeps for 3 seconds, 1 second at a time
        //
        if (utils.exitRollingCount(9, successCount)) return;
        this.slow(tc.slowTime.runCommand + tc.waitTime.runCommandMin + tc.waitTime.command + tc.slowTime.command + (tc.slowTime.configEvent * 3) +
                  (tc.waitTime.configEvent * 3) + tc.slowTime.configSpecialFolderEvent+ startTaskSlowTime + endOfTestWaitTime + (tc.slowTime.tasks.bashScript * 2));
        await utils.executeSettingsUpdate("visual.disableAnimatedIcons", true);
        await utils.executeSettingsUpdate("specialFolders.showLastTasks", false);
        await utils.executeSettingsUpdate("keepTermOnStop", true);
        await startTask(bash[0] as TaskItem, true);
        const exec = await utils.executeTeCommand2("run", [ bash[0] ], tc.waitTime.runCommandMin) as TaskExecution | undefined;
        await utils.executeTeCommand2("openTerminal", [ bash[0] ]);
        await utils.waitForTaskExecution(exec);
        lastTask = bash[0];
        await utils.waitForTeIdle(endOfTestWaitTime);
        ++successCount;
    });


    test("Run Batch Task", async function()
    {   //
        // There are 2 batch file "tasks" - they both utils.sleep for 7 seconds, 1 second at a time
        //
        if (utils.exitRollingCount(10, successCount)) return;
        const slowTime = (tc.slowTime.runCommand * 1) + (tc.slowTime.runStopCommand * 2) + 7000 + // wait for task exec
                          startTaskSlowTime + tc.slowTime.runPauseCommand + (tc.waitTime.runCommandMin * 6) + (tc.slowTime.configEvent * 4) +
                          (tc.slowTime.command * 2) + tc.slowTime.closeActiveDocument + endOfTestWaitTime + (tc.slowTime.tasks.batchScript * 2) + (tc.waitTime.command * 4);
        this.slow(slowTime);
        this.timeout(45000);
        const batchTask = batch[0];
        await startTask(batchTask as TaskItem, true);
        await utils.executeSettingsUpdate("keepTermOnStop", false);
        await utils.executeSettingsUpdate("visual.disableAnimatedIcons", false);
        //
        // Execute w/ open
        //
        let exec = await utils.executeTeCommand2("open", [ batchTask, true ], tc.waitTime.runCommandMin) as TaskExecution | undefined;
        await utils.waitForTaskExecution(exec, 2000);
        //
        // Stop
        //
        await utils.executeTeCommand2("stop", [ batchTask ], tc.waitTime.taskCommand);
        //
        // Run
        //
        exec = await utils.executeTeCommand2("run", [ batchTask ], tc.waitTime.runCommandMin) as TaskExecution | undefined;
        await utils.waitForTaskExecution(exec, 1000);
        //
        // Pause
        //
        await utils.executeTeCommand2("pause", [ batchTask ], tc.waitTime.runCommandMin);
        //
        // Open task file
        //
        await utils.executeSettingsUpdate("taskButtons.clickAction", "Open");
        await utils.executeTeCommand2("open", [ batchTask ], tc.waitTime.command);
        await utils.closeActiveDocument();
        //
        // Run (while paused)
        //
        exec = await utils.executeTeCommand2("run", [ batchTask ], tc.waitTime.runCommandMin) as TaskExecution | undefined;
        await utils.waitForTaskExecution(exec, 1000);
        //
        // Open terminal
        //
        await utils.executeTeCommand2("openTerminal", [ python[0] ], tc.waitTime.command);
        await utils.executeTeCommand2("openTerminal", [ batchTask ], tc.waitTime.command);
        //
        // Stop
        //
        await utils.executeTeCommand2("stop", [ batchTask ], tc.waitTime.taskCommand);
        //
        // Run Last Task
        //
        await utils.executeSettingsUpdate("showRunningTask", false);
        exec = await utils.executeTeCommand("runLastTask", tc.waitTime.runCommandMin) as TaskExecution | undefined;
        await utils.waitForTaskExecution(exec, 1000);
        //
        // Restart Task
        //
        exec = await utils.executeTeCommand2("restart", [ batchTask ], tc.waitTime.runCommandMin + 1000) as TaskExecution | undefined;
        await utils.waitForTaskExecution(exec);
        await utils.waitForTeIdle(endOfTestWaitTime);
        lastTask = batchTask;
        ++successCount;
    });


    test("Run Batch Task (With Args)", async function()
    {   //
        // There are 2 batch file "tasks" - they both utils.sleep for 7 seconds, 1 second at a time
        //
        if (utils.exitRollingCount(11, successCount)) return;
        const slowTime = (tc.slowTime.runCommand * 1) + endOfTestWaitTime + (tc.waitTime.runCommandMin * 2) + 2500 + // wait for task exec
                          startTaskSlowTime + tc.slowTime.runStopCommand + (tc.slowTime.command * 2) + (tc.slowTime.configEvent * 4) +
                          (tc.slowTime.tasks.batchScript * 2) + 1000 + tc.slowTime.configSpecialFolderEvent;
        this.slow(slowTime);
        this.timeout(35000);
        const batchTask = batch[1];
        await startTask(batchTask as TaskItem, true);
        await utils.executeSettingsUpdate("keepTermOnStop", false);
        await utils.executeSettingsUpdate("visual.disableAnimatedIcons", true);
        await utils.executeSettingsUpdate("taskButtons.clickAction", "Execute");
        await utils.executeSettingsUpdate("specialFolders.showLastTasks", true);
        let exec = await utils.executeTeCommand2("runWithArgs", [ batchTask, "--test --test2" ], tc.waitTime.runCommandMin) as TaskExecution | undefined;
        await utils.waitForTaskExecution(exec, 1500);
        await utils.executeTeCommand2("stop", [ batchTask ], tc.waitTime.taskCommand);
        utils.overrideNextShowInputBox("--test --test2");
        exec = await utils.executeTeCommand2("runWithArgs", [ batchTask ], tc.waitTime.runCommandMin + 1000) as TaskExecution | undefined;
        await utils.executeSettingsUpdate("showRunningTask", true);
        await utils.executeTeCommand2("openTerminal", [ batchTask ], tc.waitTime.command);
        await utils.waitForTaskExecution(exec);
        await utils.waitForTeIdle(endOfTestWaitTime);
        lastTask = batchTask;
        ++successCount;
    });


    test("Run Batch Task (No Terminal)", async function()
    {
        if (utils.exitRollingCount(12, successCount)) return;
        this.slow(tc.slowTime.runCommand + endOfTestWaitTime + (tc.slowTime.tasks.batchScript * 2) + tc.waitTime.runCommandMin);
        const batchTask = batch[0];
        await startTask(batchTask as TaskItem, false);
        const exec = await utils.executeTeCommand2("runNoTerm", [ batchTask ], tc.waitTime.runCommandMin) as TaskExecution | undefined;
        await utils.waitForTaskExecution(exec);
        lastTask = batchTask;
        await utils.waitForTeIdle(endOfTestWaitTime);
        lastTask = batchTask;
        ++successCount;
    });

});


async function startTask(taskItem: TaskItem, addToSpecial: boolean)
{
    console.log(`    ${utils.figures.color.info} Run ${taskItem.taskSource} task | ${taskItem.label} | ${taskItem.getFolder()?.name}`);
    if (addToSpecial)
    {
        await utils.executeSettingsUpdate("taskButtons.clickAction", "Execute");
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
