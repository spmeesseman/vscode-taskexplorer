/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* tslint:disable */

import * as utils from "../utils/utils";
import constants from "../../lib/constants";
import TaskItem from "../../tree/item";
import SpecialTaskFolder from "../../tree/specialFolder";
import { expect } from "chai";
import { TaskExecution } from "vscode";
import { ITaskExplorer, ITaskExplorerApi, ITaskFolder, ITaskItem, ITestsApi } from "@spmeesseman/vscode-taskexplorer-types";
import { executeSettingsUpdate, executeTeCommand, executeTeCommand2, focusExplorerView, focusSearchView } from "../utils/commandUtils";

const tc = utils.testControl;
const startTaskSlowTime = tc.slowTime.config.event + (tc.slowTime.config.showHideSpecialFolder * 2) + (tc.slowTime.command * 2);

let teApi: ITaskExplorerApi;
let explorer: ITaskExplorer;
let testsApi: ITestsApi;
let lastTask: ITaskItem | null = null;
let ant: ITaskItem[];
let bash: ITaskItem[];
let batch: ITaskItem[];
let python: ITaskItem[];
let antTask: TaskItem;
let clickAction: string;


suite("Task Tests", () =>
{

    suiteSetup(async function()
    {
        if (utils.exitRollingCount(this, true)) return;
        ({ teApi, testsApi, explorer } = await utils.activate(this));
        clickAction = teApi.config.get<string>("taskButtons.clickAction");
        await executeSettingsUpdate("specialFolders.showLastTasks", true);
        utils.endRollingCount(this, true);
    });


    suiteTeardown(async function()
    {
        if (utils.exitRollingCount(this, false, true)) return;
        await executeSettingsUpdate("taskButtons.clickAction", clickAction);
        utils.suiteFinished(this);
    });


	test("Focus Tree View", async function()
	{
        if (utils.exitRollingCount(this)) return;
        if (utils.needsTreeBuild()) {
            await focusExplorerView(this);
        }
        utils.endRollingCount(this);
	});


    test("Check Task Counts", async function()
    {
        if (utils.exitRollingCount(this)) return;
        this.slow(tc.slowTime.getTreeTasks * 4);
        bash = await utils.treeUtils.getTreeTasks("bash", 1);
        await utils.waitForTeIdle(tc.waitTime.getTreeTasks);
        batch = await utils.treeUtils.getTreeTasks("batch", 2);
        await utils.waitForTeIdle(tc.waitTime.getTreeTasks);
        ant = await utils.treeUtils.getTreeTasks("ant", 3);
        await utils.waitForTeIdle(tc.waitTime.getTreeTasks);
        python = await utils.treeUtils.getTreeTasks("python", 2);
        await utils.waitForTeIdle(tc.waitTime.getTreeTasks);
        utils.endRollingCount(this);
    });


    test("Run Non-Existent Last Task", async function()
    {
        if (utils.exitRollingCount(this)) return;
        this.slow(tc.slowTime.runCommand + tc.slowTime.storageUpdate);
        const tree = explorer.getTaskTree() as ITaskFolder[];
        expect(tree).to.not.be.oneOf([ undefined, null ]);
        const lastTasksFolder = tree[0] as SpecialTaskFolder;
        lastTasksFolder.clearTaskItems();
        await utils.sleep(1);
        expect(await executeTeCommand("runLastTask", tc.waitTime.runCommandMin)).to.be.equal(undefined, "Return TaskExecution should be undefined");
        utils.endRollingCount(this);
    });


    test("Keep Terminal on Stop (OFF)", async function()
    {
        if (utils.exitRollingCount(this)) return;
        this.slow(tc.slowTime.config.event + (tc.slowTime.runCommand * 2) + tc.slowTime.runStopCommand + tc.slowTime.runPauseCommand + 4000);
        await executeSettingsUpdate("keepTermOnStop", false);
        let exec = await executeTeCommand2("run", [ batch[0] ], tc.waitTime.runCommandMin) as TaskExecution | undefined;
        expect(exec).to.not.be.equal(undefined, "Starting the 'batch0' task did not return a valid TaskExecution");
        await utils.waitForTaskExecution(exec, 2000);
        await executeTeCommand2("stop", [ batch[0] ], tc.waitTime.taskCommand);
        batch[0].paused = true;
        utils.overrideNextShowInfoBox(undefined);
        exec = await executeTeCommand2("run", [ batch[0] ], tc.waitTime.taskCommand) as TaskExecution | undefined;
        await utils.waitForTaskExecution(exec, 2000);
        await executeTeCommand2("stop", [ batch[0] ]);
        utils.endRollingCount(this);
    });


    test("Run Pause and Run", async function()
    {
        if (utils.exitRollingCount(this)) return;
        this.slow((tc.slowTime.runCommand * 2) + tc.slowTime.runStopCommand + tc.slowTime.runPauseCommand + 8000);
        const exec = await executeTeCommand2("run", [ batch[0] ], tc.waitTime.runCommandMin) as TaskExecution | undefined;
        await utils.waitForTaskExecution(exec, 2000);
        await executeTeCommand2("pause", [ batch[0] ], tc.waitTime.taskCommand);
        await utils.sleep(500);
        await executeTeCommand2("run", [ batch[0] ], tc.waitTime.taskCommand) as TaskExecution | undefined;
        await utils.waitForTaskExecution(exec, 1000);
        await executeTeCommand2("stop", [ batch[0] ]);
        await utils.waitForTaskExecution(exec, 500);
        utils.endRollingCount(this);
    });


    test("Run Pause and Stop (Keep Terminal on Stop OFF)", async function()
    {
        if (utils.exitRollingCount(this)) return;
        this.slow(tc.slowTime.runCommand + tc.slowTime.runStopCommand + tc.slowTime.runPauseCommand + 7000);
        const exec = await executeTeCommand2("run", [ batch[0] ], tc.waitTime.runCommandMin) as TaskExecution | undefined;
        await utils.waitForTaskExecution(exec, 2000);
        await executeTeCommand2("pause", [ batch[0] ], tc.waitTime.taskCommand);
        await utils.sleep(500);
        await utils.waitForTaskExecution(exec, 500);
        await executeTeCommand2("stop", [ batch[0] ]);
        await utils.waitForTaskExecution(exec, 500);
        utils.endRollingCount(this);
    });


    test("Keep Terminal on Stop (ON)", async function()
    {
        if (utils.exitRollingCount(this)) return;
        this.slow(tc.slowTime.runCommand + tc.slowTime.runStopCommand + tc.slowTime.config.event + 6000);
        await executeSettingsUpdate("keepTermOnStop", true);
        const exec = await executeTeCommand2("run", [ batch[0] ], tc.waitTime.runCommandMin) as TaskExecution | undefined;
        expect(exec).to.not.be.equal(undefined, "Starting the 'batch0' task did not return a valid TaskExecution");
        await utils.waitForTaskExecution(exec, 2000);
        await executeTeCommand2("stop", [ batch[0] ], tc.waitTime.taskCommand);
        await utils.waitForTaskExecution(exec, 1000);
        utils.endRollingCount(this);
    });


    test("Run Pause and Stop (Keep Terminal on Stop ON)", async function()
    {
        if (utils.exitRollingCount(this)) return;
        this.slow(tc.slowTime.runCommand + tc.slowTime.runStopCommand + tc.slowTime.runPauseCommand + 6000);
        const exec = await executeTeCommand2("run", [ batch[0] ], tc.waitTime.runCommandMin) as TaskExecution | undefined;
        await utils.waitForTaskExecution(exec, 2000);
        await executeTeCommand2("pause", [ batch[0] ], tc.waitTime.taskCommand);
        await utils.sleep(500);
        await utils.waitForTaskExecution(exec, 500);
        await executeTeCommand2("stop", [ batch[0] ], tc.waitTime.taskCommand);
        utils.endRollingCount(this);
    });


    test("Trigger Busy on Task Commands", async function()
    {
        if (utils.exitRollingCount(this)) return;
        this.slow(tc.slowTime.refreshCommand + (tc.slowTime.command * 5) + 1200);
        utils.clearOverrideShowInfoBox();
        executeTeCommand("refresh", 500, 2000);               // don't await
        await utils.sleep(2);
        utils.overrideNextShowInfoBox(undefined);
        executeTeCommand("runLastTask", 0);                   // don't await
        utils.overrideNextShowInfoBox(undefined);
        executeTeCommand2("run", [ batch[0] ], 0);            // don't await
        utils.overrideNextShowInfoBox(undefined);
        executeTeCommand2("restart", [ batch[0] ], 0);        // don't await
        utils.overrideNextShowInfoBox(undefined);
        executeTeCommand2("stop", [ batch[0] ], 0);           // don't await
        utils.overrideNextShowInfoBox(undefined);
        executeTeCommand2("pause", [ batch[0] ], 0);           // don't await
        await utils.waitForTeIdle(tc.waitTime.refreshCommand);      // now wait for refresh
        utils.endRollingCount(this);
    });


    test("Pause", async function()
    {
        if (utils.exitRollingCount(this)) return;
        this.slow(tc.slowTime.runCommand + tc.slowTime.runPauseCommand + tc.slowTime.runStopCommand + tc.slowTime.config.event + 6000);
        await executeSettingsUpdate("keepTermOnStop", false);
        const exec = await executeTeCommand2("run", [ batch[0] ], tc.waitTime.runCommandMin) as TaskExecution | undefined;
        await utils.waitForTaskExecution(exec, 2000);
        await utils.waitForTeIdle(tc.waitTime.runCommandMin);
        await executeTeCommand2("pause", [ batch[0] ], tc.waitTime.taskCommand);
        await utils.sleep(1000);
        await executeTeCommand2("stop", [ batch[0] ], tc.waitTime.taskCommand);
        utils.endRollingCount(this);
    });


    test("Run Task (No Terminal)", async function()
    {
        if (utils.exitRollingCount(this)) return;
        this.slow(tc.slowTime.runCommand + tc.slowTime.tasks.bashScript + tc.slowTime.runStopCommand  + 5500);
        const bashTask = bash[0];
        await startTask(bashTask as TaskItem, false);
        const exec = await executeTeCommand2("runNoTerm", [ bashTask ], tc.waitTime.runCommandMin) as TaskExecution | undefined;
        await utils.sleep(250);
        await utils.waitForTaskExecution(exec, 2000);
        await executeTeCommand2("stop", [ bash[0] ], tc.waitTime.taskCommand);
        await utils.waitForTaskExecution(exec, 500);
        lastTask = bashTask;
        utils.endRollingCount(this);
    });


    test("Run Ant Task (w/ Ansicon)", async function()
    {
        if (utils.exitRollingCount(this)) return;
        this.slow((tc.slowTime.config.enableEvent * 2) + tc.slowTime.runCommand +
                  tc.slowTime.tasks.antTaskWithAnsicon + 500 + tc.slowTime.focusCommandChangeViews);
        antTask = ant.find(t => t.taskFile.fileName.includes("hello.xml")) as TaskItem;
        expect(antTask).to.not.be.equal(undefined, "The 'hello' ant task was not found in the task tree");
        await executeSettingsUpdate("pathToPrograms.ansicon", utils.getWsPath("..\\tools\\ansicon\\x64\\ansicon.exe"), tc.waitTime.config.enableEvent);
        utils.overrideNextShowInfoBox(undefined);
        await executeSettingsUpdate("visual.enableAnsiconForAnt", true, tc.waitTime.config.enableEvent);
        await startTask(antTask, false);
        const exec = await executeTeCommand2("run", [ antTask ], tc.waitTime.runCommandMin) as TaskExecution | undefined;
        await utils.sleep(250);
        await focusSearchView(); // randomly show/hide view to test refresh event queue in tree/tree.ts
        await utils.waitForTaskExecution(exec);
        lastTask = antTask;
        utils.endRollingCount(this);
    });


    test("Run Ant Task (w/o Ansicon)", async function()
    {
        if (utils.exitRollingCount(this)) return;
        this.slow((tc.slowTime.config.event * 2) + tc.slowTime.runCommand + tc.slowTime.tasks.antTask);
        await executeSettingsUpdate("visual.enableAnsiconForAnt", false, tc.waitTime.config.enableEvent);
        await executeSettingsUpdate("keepTermOnStop", true);
        await startTask(antTask, false);
        const exec = await executeTeCommand2("run", [ antTask ], tc.waitTime.runCommandMin) as TaskExecution | undefined;
        await utils.waitForTaskExecution(exec);
        lastTask = antTask;
        utils.endRollingCount(this);
    });


    test("Run Batch Task", async function()
    {
        if (utils.exitRollingCount(this)) return;
        const slowTime = (tc.slowTime.runCommand * 2) + tc.slowTime.runStopCommand + 6500 +
                          startTaskSlowTime + (tc.slowTime.config.event * 5) +
                          (tc.slowTime.command * 2) + tc.slowTime.closeEditors + tc.slowTime.tasks.batchScriptCmd;
        this.slow(slowTime);
        await focusExplorerView(); // randomly show/hide view to test refresh event queue in tree/tree.ts
        const batchTask = batch[0];
        await startTask(batchTask as TaskItem, true);
        await executeSettingsUpdate("keepTermOnStop", false);
        await executeSettingsUpdate("visual.disableAnimatedIcons", false);
        await executeSettingsUpdate("specialFolders.showLastTasks", false);
        //
        // Execute w/ open
        //
        let exec = await executeTeCommand2("open", [ batchTask, true ], tc.waitTime.runCommandMin) as TaskExecution | undefined;
        await utils.waitForTaskExecution(exec, 2000);
        //
        // Stop
        //
        await executeTeCommand2("stop", [ batchTask ], tc.waitTime.taskCommand);
        //
        // Open task file
        //
        await executeSettingsUpdate("taskButtons.clickAction", "Open");
        await executeTeCommand2("open", [ batchTask ], tc.waitTime.command);
        await utils.closeEditors();
        //
        // Open terminal
        //
        await executeTeCommand2("openTerminal", [ python[0] ], tc.waitTime.command);
        await executeTeCommand2("openTerminal", [ batchTask ], tc.waitTime.command);
        //
        // Run Last Task
        //
        await executeSettingsUpdate("showRunningTask", false);
        exec = await executeTeCommand("runLastTask", tc.waitTime.runCommandMin) as TaskExecution | undefined;
        await utils.waitForTaskExecution(exec, 1250);
        //
        // Restart Task
        //
        exec = await executeTeCommand2("restart", [ batchTask ], tc.waitTime.runCommandMin) as TaskExecution | undefined;
        await utils.waitForTaskExecution(exec);
        lastTask = batchTask;
        utils.endRollingCount(this);
    });


    test("Run Batch Task (With Args)", async function()
    {   //
        // There are 2 batch file "tasks" - they both utils.sleep for 7 seconds, 1 second at a time
        //
        if (utils.exitRollingCount(this)) return;
        const slowTime = (tc.slowTime.runCommand * 1) + 5000 /* 7500 */ + startTaskSlowTime + (tc.slowTime.runStopCommand * 1 /* 2 */) +
                         (tc.slowTime.command * 3) + (tc.slowTime.config.event * 4) + tc.slowTime.tasks.batchScriptBat + tc.slowTime.config.showHideSpecialFolder;
        this.slow(slowTime);
        const batchTask = batch[1];
        await startTask(batchTask as TaskItem, true);
        await executeSettingsUpdate("visual.disableAnimatedIcons", true);
        await executeSettingsUpdate("taskButtons.clickAction", "Execute");
        await executeSettingsUpdate("specialFolders.showLastTasks", true);
        utils.overrideNextShowInputBox(undefined);
        let exec = await executeTeCommand2("runWithArgs", [ batchTask ], tc.waitTime.runCommandMin) as TaskExecution | undefined;
        expect(exec).to.be.undefined;
        exec = await executeTeCommand2("runWithArgs", [ batchTask, "--test --test2" ], tc.waitTime.runCommandMin) as TaskExecution | undefined;
        expect(exec).to.not.be.undefined;
        await utils.waitForTaskExecution(exec, 1500);
        await executeTeCommand2("stop", [ batchTask ], tc.waitTime.taskCommand);
        // const tree = explorer.getTaskTree() as ITaskFolder[];
        // expect(tree).to.not.be.oneOf([ undefined, null ]);
        // const lastTasksFolder = tree[0] as SpecialTaskFolder;
        // const lastTasksItem = lastTasksFolder.taskFiles[0];
        // utils.overrideNextShowInputBox("--test --test2");
        // exec = await executeTeCommand2("runWithArgs", [ lastTasksItem ], tc.waitTime.runCommandMin) as TaskExecution | undefined;
        // expect(exec).to.not.be.undefined;
        // await utils.waitForTaskExecution(exec, 1250);
        // await executeTeCommand2("stop", [ batchTask ], tc.waitTime.taskCommand);
        utils.overrideNextShowInputBox("--test --test2");
        exec = await executeTeCommand2("runWithArgs", [ batchTask ], tc.waitTime.runCommandMin + 1000) as TaskExecution | undefined;
        expect(exec).to.not.be.undefined;
        await executeSettingsUpdate("showRunningTask", true);
        await executeTeCommand2("openTerminal", [ batchTask ], tc.waitTime.command);
        await utils.waitForTaskExecution(exec);
        lastTask = batchTask;
        utils.endRollingCount(this);
    });


    test("Run Non-Existent Last Task 2", async function()
    {
        if (utils.exitRollingCount(this)) return;
        this.slow(tc.slowTime.runCommand + (tc.slowTime.storageUpdate * 2));
        const tree = explorer.getTaskTree() as ITaskFolder[];
        expect(tree).to.not.be.oneOf([ undefined, null ]);
        const lastTasksFolder = tree[0] as SpecialTaskFolder;
        const lastTasksStore = lastTasksFolder.getStore();
        const item = lastTasksFolder.taskFiles[0];
        expect(item).to.not.equal(undefined, "The 'Last Tasks' folder has no taskitems");
        try
        {   const tempId = item.id + "_noId";
            item.id = tempId;
            utils.overrideNextShowInfoBox(undefined);
            lastTasksStore.push(tempId);
            await utils.sleep(1);
            expect(await executeTeCommand("runLastTask", tc.waitTime.runCommandMin)).to.be.equal(undefined, "Return TaskExecution should be undefined");
        }
        catch (e) { throw e; }
        finally {
            item.id = item.id.replace("_noId", "");
            lastTasksStore.pop();
        }
        utils.endRollingCount(this);
    });


    test("Surpass Max Last Tasks", async function()
    {
        if (utils.exitRollingCount(this)) return;
        this.slow(tc.slowTime.config.showHideSpecialFolder + (tc.slowTime.config.event * 2));
        const tree = explorer.getTaskTree() as ITaskFolder[];
        expect(tree).to.not.be.oneOf([ undefined, null ]);
        const lastTasksFolder = tree[0] as SpecialTaskFolder;
        const maxLastTasks = teApi.config.get<number>("specialFolders.numLastTasks");
        testsApi.enableConfigWatcher(false);
        await executeSettingsUpdate("specialFolders.numLastTasks", 6);
        try {
            lastTasksFolder.saveTask(ant[0] as TaskItem, "");
            lastTasksFolder.saveTask(ant[1] as TaskItem, "");
            lastTasksFolder.saveTask(ant[2] as TaskItem, "");
            lastTasksFolder.saveTask(bash[0] as TaskItem, "");
            lastTasksFolder.saveTask(batch[0] as TaskItem, "");
            lastTasksFolder.saveTask(batch[1] as TaskItem, "");
            lastTasksFolder.saveTask(python[0] as TaskItem, "");
            lastTasksFolder.saveTask(python[1] as TaskItem, "");
        }
        catch (e) { throw e; }
        finally {
            await executeSettingsUpdate("specialFolders.numLastTasks", maxLastTasks);
            testsApi.enableConfigWatcher(true);
        }
        utils.endRollingCount(this);
    });

});


async function startTask(taskItem: TaskItem, addToSpecial: boolean)
{
    if (tc.log.taskExecutionSteps) {
        console.log(`    ${utils.figures.color.info} Run ${taskItem.taskSource} task | ${taskItem.label} | ${taskItem.getFolder()?.name}`);
    }
    if (addToSpecial)
    {
        await executeSettingsUpdate("taskButtons.clickAction", "Execute");
        let removed = await executeTeCommand2("addRemoveFavorite", [ taskItem ]);
        if (removed) {
            await executeTeCommand2("addRemoveFavorite", [ taskItem ]);
        }
        const taskTree = explorer.getTaskTree();
        if (taskTree)
        {
            const sFolder= taskTree[0].label === constants.FAV_TASKS_LABEL ? taskTree[0] as SpecialTaskFolder :
                           (taskTree[1].label === constants.FAV_TASKS_LABEL ? taskTree[1] as SpecialTaskFolder : null);
            if (sFolder)
            {
                const sTaskItem = sFolder.taskFiles.find(t => sFolder.getTaskItemId(t) === taskItem.id);
                if (sTaskItem)
                {
                    utils.overrideNextShowInputBox("test label");
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
