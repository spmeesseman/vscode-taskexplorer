/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* tslint:disable */

import { sortFolders } from "../../lib/sortTasks";
import TaskFolder from "../../tree/folder";
import { IDictionary, ITaskExplorer, ITaskExplorerApi, ITaskItem } from "@spmeesseman/vscode-taskexplorer-types";
import constants from "../../lib/constants";
import TaskItem from "../../tree/item";
import {
    activate, clearOverrideShowInfoBox, clearOverrideShowInputBox, executeSettingsUpdate, executeTeCommand, executeTeCommand2, exitRollingCount, focusExplorerView,
    getSpecialTaskItemId, overrideNextShowInfoBox, overrideNextShowInputBox, suiteFinished, testControl, treeUtils
} from "../utils/utils";
import SpecialTaskFolder from "../../tree/specialFolder";

let teApi: ITaskExplorerApi;
let explorer: ITaskExplorer;
let ant: ITaskItem[];
let bash: ITaskItem[];
let batch: ITaskItem[];
let python: ITaskItem[];
let cstItem1: TaskItem | undefined;
let cstItem2: TaskItem | undefined;
let cstItem3: TaskItem | undefined;
let cstItem4: TaskItem | undefined;
let cstItem5: TaskItem | undefined;
let cstItem6: TaskItem | undefined;
let successCount = -1;


suite("Tree Tests", () =>
{

    suiteSetup(async function()
    {
        teApi = await activate(this);
        explorer = teApi.testsApi.explorer;
        ++successCount;
    });


    suiteTeardown(async function()
    {
        suiteFinished(this);
    });


	test("Activate Tree (Focus Explorer View)", async function()
	{
        if (exitRollingCount(0, successCount)) return;
        await focusExplorerView(this);
        ++successCount;
	});


    test("Refresh", async function()
    {
        if (exitRollingCount(1, successCount)) return;
        this.slow(testControl.slowTime.refreshCommand);
        await executeTeCommand("refresh", testControl.waitTime.refreshCommand);
        ++successCount;
    });


    test("Show Favorites", async function()
    {
        if (exitRollingCount(2, successCount)) return;
        this.slow((testControl.slowTime.configSpecialFolderEvent * 2) + (testControl.waitTime.configEvent * 2) +
                  (testControl.slowTime.getTreeTasks * 4) + testControl.slowTime.storageUpdate);
        ant = await treeUtils.getTreeTasks("ant", 3);
        bash = await treeUtils.getTreeTasks("bash", 1);
        batch = await treeUtils.getTreeTasks("batch", 2);
        python = await treeUtils.getTreeTasks("python", 2);
        await teApi.testsApi.storage.update(constants.FAV_TASKS_STORE, [
            getSpecialTaskItemId(batch[0]), getSpecialTaskItemId(batch[1]), getSpecialTaskItemId(ant[0]),
            getSpecialTaskItemId(bash[0]), getSpecialTaskItemId(python[0]), getSpecialTaskItemId(python[1])
        ]);
        await executeSettingsUpdate("specialFolders.showFavorites", false, testControl.waitTime.configEvent);
        await executeSettingsUpdate("specialFolders.showFavorites", true, testControl.waitTime.configEvent);
        ++successCount;
    });


    test("Remove from Favorites", async function()
    {
        if (exitRollingCount(3, successCount)) return;
        this.slow((testControl.slowTime.command * 6) + testControl.waitTime.command);
        await executeTeCommand2("addRemoveFavorite", [ batch[0] ]);
        await executeTeCommand2("addRemoveFavorite", [ batch[1] ]);
        await executeTeCommand2("addRemoveFavorite", [ ant[0] ]);
        await executeTeCommand2("addRemoveFavorite", [ bash[0] ]);
        await executeTeCommand2("addRemoveFavorite", [ python[0] ]);
        await executeTeCommand2("addRemoveFavorite", [ python[1] ]);
        await teApi.waitForIdle(testControl.waitTime.command);
        ++successCount;
    });


    test("Show Last Tasks", async function()
    {
        if (exitRollingCount(4, successCount)) return;
        this.slow((testControl.slowTime.configSpecialFolderEvent * 2) + (testControl.waitTime.configEvent * 2) + (testControl.slowTime.getTreeTasks * 2));
        ant = await treeUtils.getTreeTasks("ant", 3);
        batch = await treeUtils.getTreeTasks("batch", 2);
        await teApi.testsApi.storage.update(constants.LAST_TASKS_STORE, [
            getSpecialTaskItemId(batch[0]), getSpecialTaskItemId(batch[1]), getSpecialTaskItemId(ant[0]),
            getSpecialTaskItemId(bash[0]), getSpecialTaskItemId(python[0]), getSpecialTaskItemId(python[1])
        ]);
        await executeSettingsUpdate("specialFolders.showLastTasks", false, testControl.waitTime.configEvent);
        await executeSettingsUpdate("specialFolders.showLastTasks", true, testControl.waitTime.configEvent);
        ++successCount;
    });


    test("Add to Favorites", async function()
    {
        if (exitRollingCount(5, successCount)) return;
        this.slow(testControl.slowTime.command * 13);
        let removed = await executeTeCommand2("addRemoveFavorite", [ batch[0] ]);
        if (removed) {
            await executeTeCommand2("addRemoveFavorite", [ batch[0] ]);
        }
        removed = await executeTeCommand2("addRemoveFavorite", [ batch[1] ]);
        if (removed) {
            await executeTeCommand2("addRemoveFavorite", [ batch[1] ]);
        }
        removed = await executeTeCommand2("addRemoveFavorite", [ ant[0] ]);
        if (removed) {
            await executeTeCommand2("addRemoveFavorite", [ ant[0] ]);
        }
        removed = await executeTeCommand2("addRemoveFavorite", [ bash[0] ]);
        if (removed) {
            await executeTeCommand2("addRemoveFavorite", [ bash[0] ]);
        }
        removed = await executeTeCommand2("addRemoveFavorite", [ python[0] ]);
        if (removed) {
            await executeTeCommand2("addRemoveFavorite", [ python[0] ]);
        }
        removed = await executeTeCommand2("addRemoveFavorite", [ python[1] ]);
        if (removed) {
            await executeTeCommand2("addRemoveFavorite", [ python[1] ]);
        }
        await teApi.waitForIdle(testControl.waitTime.command);
        ++successCount;
    });


    test("Add Custom Label 1", async function()
    {
        if (exitRollingCount(6, successCount)) return;
        this.slow(testControl.slowTime.command + testControl.waitTime.command);
        const taskTree = explorer.getTaskTree();
        if(taskTree)
        {
            const sFolder= taskTree[0].label === constants.FAV_TASKS_LABEL ? taskTree[0] as SpecialTaskFolder :
                            (taskTree[1].label === constants.FAV_TASKS_LABEL ? taskTree[1] as SpecialTaskFolder : null);
            if (sFolder)
            {
                cstItem1 = sFolder.taskFiles.find(t => sFolder.getTaskItemId(t) === batch[0].id);
                if (cstItem1)
                {
                    overrideNextShowInputBox("Label 1");
                    const removed = await executeTeCommand2("addRemoveCustomLabel", [ cstItem1 ]);
                    if (removed) {
                        await executeTeCommand2("addRemoveCustomLabel", [ cstItem1 ]);
                    }
                    await teApi.waitForIdle(testControl.waitTime.command);
                }
            }
        }
        ++successCount;
    });


    test("Add Custom Label 2", async function()
    {
        if (exitRollingCount(7, successCount)) return;
        this.slow(testControl.slowTime.command + testControl.waitTime.command);
        const taskTree = explorer.getTaskTree();
        if(taskTree)
        {
            const sFolder= taskTree[0].label === constants.FAV_TASKS_LABEL ? taskTree[0] as SpecialTaskFolder :
                            (taskTree[1].label === constants.FAV_TASKS_LABEL ? taskTree[1] as SpecialTaskFolder : null);
            if (sFolder)
            {
                cstItem2 = sFolder.taskFiles.find(t => sFolder.getTaskItemId(t) === batch[1].id);
                if (cstItem2)
                {
                    overrideNextShowInputBox("Label 2");
                    const removed = await executeTeCommand2("addRemoveCustomLabel", [ cstItem2 ]);
                    if (removed) {
                        await executeTeCommand2("addRemoveCustomLabel", [ cstItem2 ]);
                    }
                    await teApi.waitForIdle(testControl.waitTime.command);
                }
            }
        }
        ++successCount;
    });


    test("Add Custom Label 3", async function()
    {
        if (exitRollingCount(8, successCount)) return;
        this.slow(testControl.slowTime.command + testControl.waitTime.command);
        const taskTree = explorer.getTaskTree();
        if(taskTree)
        {
            const sFolder= taskTree[0].label === constants.FAV_TASKS_LABEL ? taskTree[0] as SpecialTaskFolder :
                            (taskTree[1].label === constants.FAV_TASKS_LABEL ? taskTree[1] as SpecialTaskFolder : null);
            if (sFolder)
            {
                cstItem3 = sFolder.taskFiles.find(t => sFolder.getTaskItemId(t) === bash[0].id);
                if (cstItem3)
                {
                    overrideNextShowInputBox("Label 3");
                    const removed = await executeTeCommand2("addRemoveCustomLabel", [ cstItem3 ]);
                    if (removed) {
                        await executeTeCommand2("addRemoveCustomLabel", [ cstItem3 ]);
                    }
                    await teApi.waitForIdle(testControl.waitTime.command);
                }
            }
        }
        ++successCount;
    });


    test("Add Custom Label 4", async function()
    {
        if (exitRollingCount(9, successCount)) return;
        this.slow(testControl.slowTime.command + testControl.waitTime.command);
        const taskTree = explorer.getTaskTree();
        if(taskTree)
        {
            const sFolder= taskTree[0].label === constants.FAV_TASKS_LABEL ? taskTree[0] as SpecialTaskFolder :
                            (taskTree[1].label === constants.FAV_TASKS_LABEL ? taskTree[1] as SpecialTaskFolder : null);
            if (sFolder)
            {
                cstItem4 = sFolder.taskFiles.find(t => sFolder.getTaskItemId(t) === python[0].id);
                if (cstItem4)
                {
                    overrideNextShowInputBox("Label 4");
                    const removed = await executeTeCommand2("addRemoveCustomLabel", [ cstItem4 ]);
                    if (removed) {
                        await executeTeCommand2("addRemoveCustomLabel", [ cstItem4 ]);
                    }
                    await teApi.waitForIdle(testControl.waitTime.command);
                }
            }
        }
        ++successCount;
    });


    test("Add Custom Label 5", async function()
    {
        if (exitRollingCount(10, successCount)) return;
        this.slow(testControl.slowTime.command + testControl.waitTime.command);
        const taskTree = explorer.getTaskTree();
        if(taskTree)
        {
            const sFolder= taskTree[0].label === constants.FAV_TASKS_LABEL ? taskTree[0] as SpecialTaskFolder :
                            (taskTree[1].label === constants.FAV_TASKS_LABEL ? taskTree[1] as SpecialTaskFolder : null);
            if (sFolder)
            {
                cstItem5 = sFolder.taskFiles.find(t => sFolder.getTaskItemId(t) === python[1].id);
                if (cstItem5)
                {
                    overrideNextShowInputBox("Label 5");
                    const removed = await executeTeCommand2("addRemoveCustomLabel", [ cstItem5 ]);
                    if (removed) {
                        await executeTeCommand2("addRemoveCustomLabel", [ cstItem5 ]);
                    }
                    await teApi.waitForIdle(testControl.waitTime.command);
                }
            }
        }
        ++successCount;
    });


    test("Add Custom Label 6", async function()
    {
        if (exitRollingCount(11, successCount)) return;
        this.slow(testControl.slowTime.command + testControl.waitTime.command);
        const taskTree = explorer.getTaskTree();
        if (taskTree)
        {
            const sFolder= taskTree[0].label === constants.FAV_TASKS_LABEL ? taskTree[0] as SpecialTaskFolder :
                            (taskTree[1].label === constants.FAV_TASKS_LABEL ? taskTree[1] as SpecialTaskFolder : null);
            if (sFolder)
            {
                cstItem6 = sFolder.taskFiles.find(t => sFolder.getTaskItemId(t) === ant[0].id);
                if (cstItem6)
                {
                    overrideNextShowInputBox("Label 6");
                    const removed = await executeTeCommand2("addRemoveCustomLabel", [ cstItem6 ]);
                    if (removed) {
                        await executeTeCommand2("addRemoveCustomLabel", [ cstItem6 ]);
                    }
                    await teApi.waitForIdle(testControl.waitTime.command);
                }
            }
        }
        ++successCount;
    });


    test("Remove Custom Label 1", async function()
    {
        if (exitRollingCount(12, successCount)) return;
        if (cstItem1) {
            this.slow(testControl.slowTime.command + testControl.waitTime.command);
            await executeTeCommand2("addRemoveCustomLabel", [ cstItem1 ]);
            await teApi.waitForIdle(testControl.waitTime.command);
        }
        ++successCount;
    });


    test("Remove Custom Label 2", async function()
    {
        if (exitRollingCount(13, successCount)) return;
        if (cstItem2) {
            this.slow(testControl.slowTime.command + testControl.waitTime.command);
            await executeTeCommand2("addRemoveCustomLabel", [ cstItem2 ]);
            await teApi.waitForIdle(testControl.waitTime.command);
        }
        ++successCount;
    });


    test("Remove Custom Label 3", async function()
    {
        if (exitRollingCount(14, successCount)) return;
        if (cstItem3) {
            this.slow(testControl.slowTime.command + testControl.waitTime.command);
            await executeTeCommand2("addRemoveCustomLabel", [ cstItem3 ]);
            await teApi.waitForIdle(testControl.waitTime.command);
        }
        ++successCount;
    });


    test("Remove Custom Label 4", async function()
    {
        if (exitRollingCount(15, successCount)) return;
        if (cstItem4) {
            this.slow(testControl.slowTime.command + testControl.waitTime.command);
            await executeTeCommand2("addRemoveCustomLabel", [ cstItem4 ]);
            await teApi.waitForIdle(testControl.waitTime.command);
        }
        ++successCount;
    });


    test("Remove Custom Label 5", async function()
    {
        if (exitRollingCount(16, successCount)) return;
        if (cstItem5) {
            this.slow(testControl.slowTime.command + testControl.waitTime.command);
            await executeTeCommand2("addRemoveCustomLabel", [ cstItem5 ]);
            await teApi.waitForIdle(testControl.waitTime.command);
        }
        ++successCount;
    });


    test("Remove Custom Label 6", async function()
    {
        if (exitRollingCount(17, successCount)) return;
        if (cstItem6) {
            this.slow(testControl.slowTime.command + testControl.waitTime.command);
            await executeTeCommand2("addRemoveCustomLabel", [ cstItem6 ]);
            await teApi.waitForIdle(testControl.waitTime.command);
        }
        ++successCount;
    });


    test("Cancel Add Custom Label", async function()
    {
        if (exitRollingCount(18, successCount)) return;
        this.slow((testControl.slowTime.command * 3) + (testControl.waitTime.command * 3));
        overrideNextShowInputBox(undefined);
        await executeTeCommand2("addRemoveCustomLabel", [ cstItem1 ]);
        await teApi.waitForIdle(testControl.waitTime.command);
        //
        // There's come kind of timing issue I havent figured out yet, send a few to make sure we hit
        //
        clearOverrideShowInputBox();
        overrideNextShowInputBox(undefined);
        await executeTeCommand2("addRemoveCustomLabel", [ cstItem2 ]);
        await teApi.waitForIdle(testControl.waitTime.command);
        //
        clearOverrideShowInputBox();
        overrideNextShowInputBox(undefined);
        await executeTeCommand2("addRemoveCustomLabel", [ cstItem3 ]);
        await teApi.waitForIdle(testControl.waitTime.command);
        ++successCount;
    });


    test("Hide Favorites", async function()
    {
        if (exitRollingCount(19, successCount)) return;
        this.slow((testControl.slowTime.showHideSpecialFolder * 2) + (testControl.waitTime.command * 2));
        await executeSettingsUpdate("specialFolders.showFavorites", false);
        await teApi.waitForIdle(testControl.waitTime.command);
        await executeSettingsUpdate("specialFolders.showFavorites", true);
        await teApi.waitForIdle(testControl.waitTime.command);
        ++successCount;
    });


    test("Hide Last Tasks", async function()
    {
        if (exitRollingCount(20, successCount)) return;
        this.slow(testControl.slowTime.showHideSpecialFolder + testControl.waitTime.command);
        await executeSettingsUpdate("specialFolders.showLastTasks", false);
        await teApi.waitForIdle(testControl.waitTime.command);
        ++successCount;
    });


    test("Refresh", async function()
    {
        if (exitRollingCount(21, successCount)) return;
        this.slow(testControl.slowTime.refreshCommand + testControl.waitTime.command);
        await executeTeCommand("refresh", testControl.waitTime.refreshCommand);
        ++successCount;
    });


    test("Show Favorites", async function()
    {
        if (exitRollingCount(22, successCount)) return;
        this.slow(testControl.slowTime.configEnableEvent + testControl.waitTime.command);
        await executeSettingsUpdate("specialFolders.showFavorites", true);
        await teApi.waitForIdle(testControl.waitTime.command);
        ++successCount;
    });


    test("Show Last Tasks", async function()
    {
        if (exitRollingCount(23, successCount)) return;
        this.slow(testControl.slowTime.showHideSpecialFolder + testControl.waitTime.command);
        await executeSettingsUpdate("specialFolders.showLastTasks", true);
        await teApi.waitForIdle(testControl.waitTime.command);
        ++successCount;
    });


    test("Show Favorite Tasks w/ Last Tasks", async function()
    {
        if (exitRollingCount(24, successCount)) return;
        this.slow((testControl.slowTime.showHideSpecialFolder * 4)  + (testControl.waitTime.command * 4));
        await executeSettingsUpdate("specialFolders.showLastTasks", false);
        await teApi.waitForIdle(testControl.waitTime.command);
        await executeSettingsUpdate("specialFolders.showLastTasks", true);
        await executeSettingsUpdate("specialFolders.showFavorites", false);
        await teApi.waitForIdle(testControl.waitTime.command);
        await executeSettingsUpdate("specialFolders.showFavorites", true);
        await teApi.waitForIdle(testControl.waitTime.command);
        ++successCount;
    });


    test("Show Favorite Tasks Only", async function()
    {
        if (exitRollingCount(25, successCount)) return;
        this.slow(testControl.slowTime.showHideSpecialFolder + testControl.waitTime.command);
        await executeSettingsUpdate("specialFolders.showLastTasks", false);
        ++successCount;
    });


    test("Hide Favorite and Last Tasks", async function()
    {
        if (exitRollingCount(26, successCount)) return;
        this.slow((testControl.slowTime.showHideSpecialFolder * 2) + testControl.waitTime.command);
        await executeSettingsUpdate("specialFolders.showLastTasks", false);
        await executeSettingsUpdate("specialFolders.showFavorites", false);
        await teApi.waitForIdle(testControl.waitTime.command);
        ++successCount;
    });


    test("Show Favorite Tasks", async function()
    {
        if (exitRollingCount(27, successCount)) return;
        this.slow(testControl.slowTime.showHideSpecialFolder + testControl.waitTime.command);
        await executeSettingsUpdate("specialFolders.showFavorites", true);
        await teApi.waitForIdle(testControl.waitTime.command);
        ++successCount;
    });


    test("Show Last Tasks", async function()
    {
        if (exitRollingCount(28, successCount)) return;
        this.slow(testControl.slowTime.showHideSpecialFolder + testControl.waitTime.command);
        await executeSettingsUpdate("specialFolders.showLastTasks", true);
        await teApi.waitForIdle(testControl.waitTime.command);
        ++successCount;
    });


    test("User tasks", async function()
    {
        if (exitRollingCount(29, successCount)) return;
        // const json = await readFileSync(".vscode/workspace.json");fv
        ++successCount;
    });


    test("Clear Special Folders", async function()
    {
        if (exitRollingCount(30, successCount)) return;
        clearOverrideShowInfoBox();
        this.slow(testControl.slowTime.command * 4);
        overrideNextShowInfoBox("No");
        await executeTeCommand("clearLastTasks");
        await teApi.waitForIdle(testControl.waitTime.command);
        overrideNextShowInfoBox("No");
        await executeTeCommand("clearFavorites");
        await teApi.waitForIdle(testControl.waitTime.command);
        overrideNextShowInfoBox("Yes");
        await executeTeCommand("clearLastTasks");
        await teApi.waitForIdle(testControl.waitTime.command);
        overrideNextShowInfoBox("Yes");
        await executeTeCommand("clearFavorites");
        await teApi.waitForIdle(testControl.waitTime.command);
        ++successCount;
    });


    test("Sort folders", function()
    {
        if (exitRollingCount(31, successCount)) return;
        let map: IDictionary<TaskFolder>= {};
        map.frank = new TaskFolder("frank");
        map["richard face"] = new TaskFolder("richard face");
        map.bob = new TaskFolder("bob");
        map.scott = new TaskFolder("maurice");
        map[constants.FAV_TASKS_LABEL] = new TaskFolder(constants.FAV_TASKS_LABEL);
        map.chris = new TaskFolder("chris");
        map.maurice = new TaskFolder("maurice");
        map[constants.USER_TASKS_LABEL] = new TaskFolder(constants.USER_TASKS_LABEL);
        map[constants.LAST_TASKS_LABEL] = new TaskFolder(constants.LAST_TASKS_LABEL);
        map.peter = new TaskFolder("peter");
        map.larry = new TaskFolder("larry");
        map.mike = new TaskFolder("maurice");
        sortFolders(map);
        map = {};
        map.Zoo = new TaskFolder("onetwothree");
        map[constants.USER_TASKS_LABEL] = new TaskFolder(constants.USER_TASKS_LABEL);
        map.OMG = new TaskFolder("if i was");
        map[constants.LAST_TASKS_LABEL] = new TaskFolder(constants.LAST_TASKS_LABEL);
        map["Andrew was here"] = new TaskFolder("tasks4");
        map["maya and sierra"] = new TaskFolder("tasks5");
        map["front DOOR"] = new TaskFolder("Christmas");
        map["change folder"] = new TaskFolder("what");
        map[constants.FAV_TASKS_LABEL] = new TaskFolder(constants.FAV_TASKS_LABEL);
        map["extremely tired"] = new TaskFolder("tired1");
        map.tired = new TaskFolder("tired2");
        map["dozing off"] = new TaskFolder("doze");
        sortFolders(map);
        map = {};
        map.Zoo = new TaskFolder("onetwothree");
        map.OMG = new TaskFolder("if i was");
        map[constants.FAV_TASKS_LABEL] = new TaskFolder(constants.FAV_TASKS_LABEL);
        map[constants.LAST_TASKS_LABEL] = new TaskFolder(constants.LAST_TASKS_LABEL);
        map["Andrew was here"] = new TaskFolder("tasks4");
        map["maya and sierra"] = new TaskFolder("tasks5");
        map["front DOOR"] = new TaskFolder("Christmas");
        map["change folder"] = new TaskFolder("what");
        map["extremely tired"] = new TaskFolder("tired1");
        map.tired = new TaskFolder("tired2");
        map["dozing off"] = new TaskFolder("doze");
        map[constants.USER_TASKS_LABEL] = new TaskFolder(constants.USER_TASKS_LABEL);
        sortFolders(map);
        map = {};
        map.Zoo = new TaskFolder("onetwothree");
        map.OMG = new TaskFolder("if i was");
        map[constants.USER_TASKS_LABEL] = new TaskFolder(constants.USER_TASKS_LABEL);
        map[constants.FAV_TASKS_LABEL] = new TaskFolder(constants.FAV_TASKS_LABEL);
        map[constants.LAST_TASKS_LABEL] = new TaskFolder(constants.LAST_TASKS_LABEL);
        map["Andrew was here"] = new TaskFolder("tasks4");
        map["maya and sierra"] = new TaskFolder("tasks5");
        map["front DOOR"] = new TaskFolder("Christmas");
        map["change folder"] = new TaskFolder("what");
        map["extremely tired"] = new TaskFolder("tired1");
        map.tired = new TaskFolder("tired2");
        map["dozing off"] = new TaskFolder("doze");
        sortFolders(map);
        map = {};
        map.Zoo = new TaskFolder("onetwothree");
        map.OMG = new TaskFolder("if i was");
        map[constants.FAV_TASKS_LABEL] = new TaskFolder(constants.FAV_TASKS_LABEL);
        map[constants.USER_TASKS_LABEL] = new TaskFolder(constants.USER_TASKS_LABEL);
        map[constants.LAST_TASKS_LABEL] = new TaskFolder(constants.LAST_TASKS_LABEL);
        map["Andrew was here"] = new TaskFolder("tasks4");
        map["maya and sierra"] = new TaskFolder("tasks5");
        map["front DOOR"] = new TaskFolder("Christmas");
        map["change folder"] = new TaskFolder("what");
        map["extremely tired"] = new TaskFolder("tired1");
        map.tired = new TaskFolder("tired2");
        map["dozing off"] = new TaskFolder("doze");
        sortFolders(map);
        map = {};
        map.Zoo = new TaskFolder("onetwothree");
        map.OMG = new TaskFolder("if i was");
        map[constants.FAV_TASKS_LABEL] = new TaskFolder(constants.FAV_TASKS_LABEL);
        map[constants.LAST_TASKS_LABEL] = new TaskFolder(constants.LAST_TASKS_LABEL);
        map[constants.USER_TASKS_LABEL] = new TaskFolder(constants.USER_TASKS_LABEL);
        map["Andrew was here"] = new TaskFolder("tasks4");
        map["maya and sierra"] = new TaskFolder("tasks5");
        map["front DOOR"] = new TaskFolder("Christmas");
        map["change folder"] = new TaskFolder("what");
        map["extremely tired"] = new TaskFolder("tired1");
        map.tired = new TaskFolder("tired2");
        map["dozing off"] = new TaskFolder("doze");
        sortFolders(map);
        map = {};
        map.Zoo = new TaskFolder("onetwothree");
        map.OMG = new TaskFolder("if i was");
        map[constants.LAST_TASKS_LABEL] = new TaskFolder(constants.LAST_TASKS_LABEL);
        map[constants.FAV_TASKS_LABEL] = new TaskFolder(constants.FAV_TASKS_LABEL);
        map[constants.USER_TASKS_LABEL] = new TaskFolder(constants.USER_TASKS_LABEL);
        map["Andrew was here"] = new TaskFolder("tasks4");
        map["maya and sierra"] = new TaskFolder("tasks5");
        map["front DOOR"] = new TaskFolder("Christmas");
        map["change folder"] = new TaskFolder("what");
        map["extremely tired"] = new TaskFolder("tired1");
        map.tired = new TaskFolder("tired2");
        map["dozing off"] = new TaskFolder("doze");
        sortFolders(map);
        map = {};
        map.Zoo = new TaskFolder("onetwothree");
        map.OMG = new TaskFolder("if i was");
        map[constants.USER_TASKS_LABEL] = new TaskFolder(constants.USER_TASKS_LABEL);
        map[constants.LAST_TASKS_LABEL] = new TaskFolder(constants.LAST_TASKS_LABEL);
        map[constants.FAV_TASKS_LABEL] = new TaskFolder(constants.FAV_TASKS_LABEL);
        map["Andrew was here"] = new TaskFolder("tasks4");
        map["maya and sierra"] = new TaskFolder("tasks5");
        map["front DOOR"] = new TaskFolder("Christmas");
        map["change folder"] = new TaskFolder("what");
        map["extremely tired"] = new TaskFolder("tired1");
        map.tired = new TaskFolder("tired2");
        map["dozing off"] = new TaskFolder("doze");
        sortFolders(map);
        map = {};
        map[constants.LAST_TASKS_LABEL] = new TaskFolder(constants.LAST_TASKS_LABEL);
        map[""] = new TaskFolder("onetwothree");
        map.OMG = new TaskFolder("if i was");
        map["Andrew was here"] = new TaskFolder("");
        map[constants.FAV_TASKS_LABEL] = new TaskFolder(constants.FAV_TASKS_LABEL);
        map["maya and sierra"] = new TaskFolder("tasks5");
        map["front DOOR"] = new TaskFolder("");
        map[constants.USER_TASKS_LABEL] = new TaskFolder(constants.USER_TASKS_LABEL);
        map[""] = new TaskFolder("what");
        map["extremely tired"] = new TaskFolder("tired1");
        map.tired = new TaskFolder("tired2");
        map["dozing off"] = new TaskFolder("doze");
        sortFolders(map);
        ++successCount;
    });

});
