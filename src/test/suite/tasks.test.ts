/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* tslint:disable */

//
// Documentation on https://mochajs.org/ for help.
//
import TaskItem from "../../tree/item";
import { expect } from "chai";
import { storage } from "../../lib/utils/storage";
import constants from "../../lib/constants";
import { IExplorerApi, ITaskExplorerApi, ITaskItemApi } from "@spmeesseman/vscode-taskexplorer-types";
import {
    activate, executeSettingsUpdate, executeTeCommand, executeTeCommand2, figures, focusExplorer,
    treeUtils, overrideNextShowInfoBox, overrideNextShowInputBox, testControl
} from "../helper";
import SpecialTaskFolder from "../../tree/specialFolder";

let lastTask: ITaskItemApi | null = null;
let teApi: ITaskExplorerApi;
let explorer: IExplorerApi;
let ant: ITaskItemApi[];
let bash: ITaskItemApi[];
let batch: ITaskItemApi[];
let successCount = 0;


suite("Task Tests", () =>
{

    suiteSetup(async function()
    {
        teApi = await activate(this);
        explorer = teApi.testsApi.explorer;
        ++successCount;
    });


	test("Focus Task Explorer View for Tree Population", async function()
	{
        await focusExplorer(this);
	});


    test("Check task counts", async function()
    {
        this.slow(testControl.slowTime.getTreeTasks * 3);
        expect(successCount).to.be.equal(1);
        bash = await treeUtils.getTreeTasks("bash", 1);
        batch = await treeUtils.getTreeTasks("batch", 2);
        ant = await treeUtils.getTreeTasks("ant", 3);
        ++successCount;
    });


    test("Empty TaskItem Parameter - Run", async function()
    {
        this.slow(testControl.slowTime.runCommand);
        expect(successCount).to.be.equal(2);
        await executeTeCommand("run", testControl.waitTime.runCommand);
        ++successCount;
    });


    test("Empty TaskItem Parameter - Pause", async function()
    {
        this.slow(testControl.slowTime.runPauseCommand);
        expect(successCount).to.be.equal(3);
        await executeTeCommand("pause", 500);
        ++successCount;
    });


    test("Empty TaskItem Parameter - Restart", async function()
    {
        this.slow(testControl.slowTime.runCommand);
        expect(successCount).to.be.equal(4);
        await executeTeCommand("restart", 500);
        ++successCount;
    });


    test("Run non-existent last task", async function()
    {
        this.slow(testControl.slowTime.runCommand + (testControl.slowTime.storageUpdate * 2));
        expect(successCount).to.be.equal(5);
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
        ++successCount;
    });


    test("Keep Terminal on Stop (OFF)", async function()
    {
        this.slow(testControl.slowTime.runCommand + testControl.slowTime.runStopCommand + testControl.slowTime.configEvent);
        expect(successCount).to.be.equal(6);
        await executeSettingsUpdate("keepTermOnStop", false);
        await executeTeCommand("run", testControl.waitTime.runCommand, 5000, batch[0]);
        await executeTeCommand("stop", 1000, 1500, batch[0]);
        ++successCount;
    });


    test("Keep Terminal on Stop (ON)", async function()
    {
        this.slow(testControl.slowTime.runCommand + testControl.slowTime.runStopCommand + testControl.slowTime.configEvent);
        expect(successCount).to.be.equal(7);
        await executeSettingsUpdate("keepTermOnStop", true);
        await executeTeCommand("run", testControl.waitTime.runCommand, 5000, batch[0]);
        await executeTeCommand("stop", 1000, 1500, batch[0]);
        ++successCount;
    });


    test("Trigger busy on run last task", async function()
    {
        this.slow(testControl.slowTime.runCommand + testControl.waitTime.fsCreateEvent);
        expect(successCount).to.be.equal(8);
        explorer.invalidateTasksCache();// Don't await
        await executeTeCommand("runLastTask", testControl.waitTime.runCommand, testControl.slowTime.runCommand);
        ++successCount;
    });


    test("Resume task no terminal", async function()
    {
        this.slow(testControl.slowTime.runCommand);
        expect(successCount).to.be.equal(9);
        bash[0].paused = true;
        await executeTeCommand2("runLastTask", [ batch[0] ], testControl.waitTime.runCommand);
        bash[0].paused = false;
        ++successCount;
    });


    test("Pause", async function()
    {
        this.slow((testControl.waitTime.runCommand * 2) + testControl.slowTime.runCommand);
        expect(successCount).to.be.equal(10);
        await executeTeCommand2("run", [ batch[0] ], testControl.waitTime.runCommand);
        await executeTeCommand2("pause", [ batch[0] ], 500);
        await executeTeCommand2("stop", [ batch[0] ], 400);
        ++successCount;
    });


    test("Pause (No Task)", async function()
    {
        this.slow(testControl.slowTime.commandFast);
        expect(successCount).to.be.equal(11);
        overrideNextShowInfoBox(undefined);
        await executeTeCommand2("pause", [ batch[0] ], 50);
        ++successCount;
    });


    test("Resume (No Task)", async function()
    {
        this.slow(testControl.slowTime.commandFast);
        expect(successCount).to.be.equal(12);
        overrideNextShowInfoBox(undefined);
        await executeTeCommand2("pause", [ batch[0] ], 50);
        ++successCount;
    });


    test("Ant", async function()
    {
        this.slow(testControl.waitTime.runCommand * 2);
        expect(successCount).to.be.equal(13);
        const antTask = ant.find(t => t.taskFile.fileName.includes("hello.xml")) as TaskItem;
        await executeTeCommand2("run", [ antTask ], testControl.waitTime.runCommand);
        lastTask = antTask;
        ++successCount;
    });


    test("Bash", async function()
    {   //
        // There is only 1 bash file "task" - it sleeps for 3 seconds, 1 second at a time
        //
        this.slow(testControl.slowTime.runCommand + (testControl.slowTime.configEvent * 4) + (testControl.slowTime.command * 4));
        expect(successCount).to.be.equal(14);
        await executeSettingsUpdate("visual.disableAnimatedIcons", true);
        await startTask(bash[0] as TaskItem);
        await executeTeCommand2("run", [ bash[0] ], testControl.waitTime.runCommand);
        await endTask(bash[0] as TaskItem);
        lastTask = bash[0];
        ++successCount;
    });


    test("Batch 1", async function()
    {
        this.slow(testControl.slowTime.runCommand * 6);
        expect(successCount).to.be.equal(15);
        this.timeout(testControl.slowTime.runCommand * 8);
        //
        // There are 2 batch file "tasks" - they both sleep for 7 seconds, 1 second at a time
        //
        const batchTask = batch[0];
        await startTask(batchTask as TaskItem);
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
        await endTask(batchTask as TaskItem);
        ++successCount;
    });


    test("Batch 2", async function()
    {   //
        // There are 2 batch file "tasks" - they both sleep for 7 seconds, 1 second at a time
        //
        this.slow(testControl.slowTime.runCommand * 5);
        expect(successCount).to.be.equal(16);
        this.timeout(testControl.slowTime.runCommand * 7);
        const batchTask = batch[1];
        await startTask(batchTask as TaskItem);
        await executeSettingsUpdate("keepTermOnStop", false);
        await executeTeCommand2("open", [ batchTask, true ], 100); // clickaction=execute
        await executeTeCommand2("runWithArgs", [ batchTask, "--test --test2" ], testControl.waitTime.runCommand);
        await executeTeCommand2("stop", [ batchTask ], 200);
        overrideNextShowInputBox("--test --test2");
        await executeTeCommand2("runWithArgs", [ batchTask ], testControl.waitTime.runCommand / 3);
        // await executeTeCommand("stop", 200, testControl.waitTime.max, batchTask);
        await executeSettingsUpdate("showRunningTask", true);
        await teApi.waitForIdle(8000);
        await endTask(batchTask as TaskItem);
        ++successCount;
    });

});


async function startTask(taskItem: TaskItem)
{
    console.log(`    ${figures.color.info} Run ${taskItem.taskSource} task: ${taskItem.label}`);
    console.log(`        Folder: ${taskItem.getFolder()?.name}`);
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


async function endTask(taskItem: TaskItem)
{
    await executeTeCommand2("openTerminal", [ taskItem ]);
    console.log(`    ✔ Done ${taskItem.taskSource} task: ${taskItem.label}`);
    lastTask = taskItem;
}
