/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* tslint:disable */

import * as utils from "../utils/utils";
import constants from "../../lib/constants";
import TaskItem from "../../tree/item";
import TaskFolder from "../../tree/folder";
import SpecialTaskFolder from "../../tree/specialFolder";
import { sortFolders, sortTasks } from "../../lib/sortTasks";
import { IDictionary, ITaskExplorer, ITaskExplorerApi, ITaskFile, ITaskItem } from "@spmeesseman/vscode-taskexplorer-types";
import TaskFile from "../../tree/file";

const tc = utils.testControl;
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
        teApi = await utils.activate(this);
        explorer = teApi.testsApi.explorer;
        ++successCount;
    });


    suiteTeardown(async function()
    {
        utils.suiteFinished(this);
    });


	test("Activate Tree (Focus Explorer View)", async function()
	{
        if (utils.exitRollingCount(0, successCount)) return;
        await utils.focusExplorerView(this);
        ++successCount;
	});


    test("Refresh", async function()
    {
        if (utils.exitRollingCount(1, successCount)) return;
        this.slow(tc.slowTime.refreshCommand);
        await utils.executeTeCommand("refresh", tc.waitTime.refreshCommand);
        ++successCount;
    });


    test("Show Favorites", async function()
    {
        if (utils.exitRollingCount(2, successCount)) return;
        this.slow((tc.slowTime.configSpecialFolderEvent * 2) + (tc.waitTime.configEvent * 2) +
                  (tc.slowTime.getTreeTasks * 4) + tc.slowTime.storageUpdate);
        ant = await utils.treeUtils.getTreeTasks("ant", 3);
        bash = await utils.treeUtils.getTreeTasks("bash", 1);
        batch = await utils.treeUtils.getTreeTasks("batch", 2);
        python = await utils.treeUtils.getTreeTasks("python", 2);
        await teApi.testsApi.storage.update(constants.FAV_TASKS_STORE, [
            utils.getSpecialTaskItemId(batch[0]), utils.getSpecialTaskItemId(batch[1]), utils.getSpecialTaskItemId(ant[0]),
            utils.getSpecialTaskItemId(bash[0]), utils.getSpecialTaskItemId(python[0]), utils.getSpecialTaskItemId(python[1])
        ]);
        await utils.executeSettingsUpdate("specialFolders.showFavorites", false, tc.waitTime.configEvent);
        await utils.executeSettingsUpdate("specialFolders.showFavorites", true, tc.waitTime.configEvent);
        ++successCount;
    });


    test("Remove from Favorites", async function()
    {
        if (utils.exitRollingCount(3, successCount)) return;
        this.slow((tc.slowTime.command * 6) + tc.waitTime.command);
        await utils.executeTeCommand2("addRemoveFavorite", [ batch[0] ]);
        await utils.executeTeCommand2("addRemoveFavorite", [ batch[1] ]);
        await utils.executeTeCommand2("addRemoveFavorite", [ ant[0] ]);
        await utils.executeTeCommand2("addRemoveFavorite", [ bash[0] ]);
        await utils.executeTeCommand2("addRemoveFavorite", [ python[0] ]);
        await utils.executeTeCommand2("addRemoveFavorite", [ python[1] ]);
        await utils.waitForTeIdle(tc.waitTime.command);
        ++successCount;
    });


    test("Show Last Tasks", async function()
    {
        if (utils.exitRollingCount(4, successCount)) return;
        this.slow((tc.slowTime.configSpecialFolderEvent * 2) + (tc.waitTime.configEvent * 2) + (tc.slowTime.getTreeTasks * 2));
        ant = await utils.treeUtils.getTreeTasks("ant", 3);
        batch = await utils.treeUtils.getTreeTasks("batch", 2);
        await teApi.testsApi.storage.update(constants.LAST_TASKS_STORE, [
            utils.getSpecialTaskItemId(batch[0]), utils.getSpecialTaskItemId(batch[1]), utils.getSpecialTaskItemId(ant[0]),
            utils.getSpecialTaskItemId(bash[0]), utils.getSpecialTaskItemId(python[0]), utils.getSpecialTaskItemId(python[1])
        ]);
        await utils.executeSettingsUpdate("specialFolders.showLastTasks", false, tc.waitTime.configEvent);
        await utils.executeSettingsUpdate("specialFolders.showLastTasks", true, tc.waitTime.configEvent);
        ++successCount;
    });


    test("Add to Favorites", async function()
    {
        if (utils.exitRollingCount(5, successCount)) return;
        this.slow(tc.slowTime.command * 13);
        let removed = await utils.executeTeCommand2("addRemoveFavorite", [ batch[0] ]);
        if (removed) {
            await utils.executeTeCommand2("addRemoveFavorite", [ batch[0] ]);
        }
        removed = await utils.executeTeCommand2("addRemoveFavorite", [ batch[1] ]);
        if (removed) {
            await utils.executeTeCommand2("addRemoveFavorite", [ batch[1] ]);
        }
        removed = await utils.executeTeCommand2("addRemoveFavorite", [ ant[0] ]);
        if (removed) {
            await utils.executeTeCommand2("addRemoveFavorite", [ ant[0] ]);
        }
        removed = await utils.executeTeCommand2("addRemoveFavorite", [ bash[0] ]);
        if (removed) {
            await utils.executeTeCommand2("addRemoveFavorite", [ bash[0] ]);
        }
        removed = await utils.executeTeCommand2("addRemoveFavorite", [ python[0] ]);
        if (removed) {
            await utils.executeTeCommand2("addRemoveFavorite", [ python[0] ]);
        }
        removed = await utils.executeTeCommand2("addRemoveFavorite", [ python[1] ]);
        if (removed) {
            await utils.executeTeCommand2("addRemoveFavorite", [ python[1] ]);
        }
        await utils.waitForTeIdle(tc.waitTime.command);
        ++successCount;
    });


    test("Add Custom Label 1", async function()
    {
        if (utils.exitRollingCount(6, successCount)) return;
        this.slow(tc.slowTime.command + tc.waitTime.command);
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
                    utils.overrideNextShowInputBox("Label 1");
                    const removed = await utils.executeTeCommand2("addRemoveCustomLabel", [ cstItem1 ]);
                    if (removed) {
                        await utils.executeTeCommand2("addRemoveCustomLabel", [ cstItem1 ]);
                    }
                    await utils.waitForTeIdle(tc.waitTime.command);
                }
            }
        }
        ++successCount;
    });


    test("Add Custom Label 2", async function()
    {
        if (utils.exitRollingCount(7, successCount)) return;
        this.slow(tc.slowTime.command + tc.waitTime.command);
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
                    utils.overrideNextShowInputBox("Label 2");
                    const removed = await utils.executeTeCommand2("addRemoveCustomLabel", [ cstItem2 ]);
                    if (removed) {
                        await utils.executeTeCommand2("addRemoveCustomLabel", [ cstItem2 ]);
                    }
                    await utils.waitForTeIdle(tc.waitTime.command);
                }
            }
        }
        ++successCount;
    });


    test("Add Custom Label 3", async function()
    {
        if (utils.exitRollingCount(8, successCount)) return;
        this.slow(tc.slowTime.command + tc.waitTime.command);
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
                    utils.overrideNextShowInputBox("Label 3");
                    const removed = await utils.executeTeCommand2("addRemoveCustomLabel", [ cstItem3 ]);
                    if (removed) {
                        await utils.executeTeCommand2("addRemoveCustomLabel", [ cstItem3 ]);
                    }
                    await utils.waitForTeIdle(tc.waitTime.command);
                }
            }
        }
        ++successCount;
    });


    test("Add Custom Label 4", async function()
    {
        if (utils.exitRollingCount(9, successCount)) return;
        this.slow(tc.slowTime.command + tc.waitTime.command);
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
                    utils.overrideNextShowInputBox("Label 4");
                    const removed = await utils.executeTeCommand2("addRemoveCustomLabel", [ cstItem4 ]);
                    if (removed) {
                        await utils.executeTeCommand2("addRemoveCustomLabel", [ cstItem4 ]);
                    }
                    await utils.waitForTeIdle(tc.waitTime.command);
                }
            }
        }
        ++successCount;
    });


    test("Add Custom Label 5", async function()
    {
        if (utils.exitRollingCount(10, successCount)) return;
        this.slow(tc.slowTime.command + tc.waitTime.command);
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
                    utils.overrideNextShowInputBox("Label 5");
                    const removed = await utils.executeTeCommand2("addRemoveCustomLabel", [ cstItem5 ]);
                    if (removed) {
                        await utils.executeTeCommand2("addRemoveCustomLabel", [ cstItem5 ]);
                    }
                    await utils.waitForTeIdle(tc.waitTime.command);
                }
            }
        }
        ++successCount;
    });


    test("Add Custom Label 6", async function()
    {
        if (utils.exitRollingCount(11, successCount)) return;
        this.slow(tc.slowTime.command + tc.waitTime.command);
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
                    utils.overrideNextShowInputBox("Label 6");
                    const removed = await utils.executeTeCommand2("addRemoveCustomLabel", [ cstItem6 ]);
                    if (removed) {
                        await utils.executeTeCommand2("addRemoveCustomLabel", [ cstItem6 ]);
                    }
                    await utils.waitForTeIdle(tc.waitTime.command);
                }
            }
        }
        ++successCount;
    });


    test("Remove Custom Label 1", async function()
    {
        if (utils.exitRollingCount(12, successCount)) return;
        if (cstItem1) {
            this.slow(tc.slowTime.command + tc.waitTime.command);
            await utils.executeTeCommand2("addRemoveCustomLabel", [ cstItem1 ]);
            await utils.waitForTeIdle(tc.waitTime.command);
        }
        ++successCount;
    });


    test("Remove Custom Label 2", async function()
    {
        if (utils.exitRollingCount(13, successCount)) return;
        if (cstItem2) {
            this.slow(tc.slowTime.command + tc.waitTime.command);
            await utils.executeTeCommand2("addRemoveCustomLabel", [ cstItem2 ]);
            await utils.waitForTeIdle(tc.waitTime.command);
        }
        ++successCount;
    });


    test("Remove Custom Label 3", async function()
    {
        if (utils.exitRollingCount(14, successCount)) return;
        if (cstItem3) {
            this.slow(tc.slowTime.command + tc.waitTime.command);
            await utils.executeTeCommand2("addRemoveCustomLabel", [ cstItem3 ]);
            await utils.waitForTeIdle(tc.waitTime.command);
        }
        ++successCount;
    });


    test("Remove Custom Label 4", async function()
    {
        if (utils.exitRollingCount(15, successCount)) return;
        if (cstItem4) {
            this.slow(tc.slowTime.command + tc.waitTime.command);
            await utils.executeTeCommand2("addRemoveCustomLabel", [ cstItem4 ]);
            await utils.waitForTeIdle(tc.waitTime.command);
        }
        ++successCount;
    });


    test("Remove Custom Label 5", async function()
    {
        if (utils.exitRollingCount(16, successCount)) return;
        if (cstItem5) {
            this.slow(tc.slowTime.command + tc.waitTime.command);
            await utils.executeTeCommand2("addRemoveCustomLabel", [ cstItem5 ]);
            await utils.waitForTeIdle(tc.waitTime.command);
        }
        ++successCount;
    });


    test("Remove Custom Label 6", async function()
    {
        if (utils.exitRollingCount(17, successCount)) return;
        if (cstItem6) {
            this.slow(tc.slowTime.command + tc.waitTime.command);
            await utils.executeTeCommand2("addRemoveCustomLabel", [ cstItem6 ]);
            await utils.waitForTeIdle(tc.waitTime.command);
        }
        ++successCount;
    });


    test("Cancel Add Custom Label", async function()
    {
        if (utils.exitRollingCount(18, successCount)) return;
        this.slow((tc.slowTime.command * 3) + (tc.waitTime.command * 3));
        utils.overrideNextShowInputBox(undefined);
        await utils.executeTeCommand2("addRemoveCustomLabel", [ cstItem1 ]);
        await utils.waitForTeIdle(tc.waitTime.command);
        //
        // There's come kind of timing issue I havent figured out yet, send a few to make sure we hit
        //
        utils.clearOverrideShowInputBox();
        utils.overrideNextShowInputBox(undefined);
        await utils.executeTeCommand2("addRemoveCustomLabel", [ cstItem2 ]);
        await utils.waitForTeIdle(tc.waitTime.command);
        //
        utils.clearOverrideShowInputBox();
        utils.overrideNextShowInputBox(undefined);
        await utils.executeTeCommand2("addRemoveCustomLabel", [ cstItem3 ]);
        await utils.waitForTeIdle(tc.waitTime.command);
        ++successCount;
    });


    test("Hide Favorites", async function()
    {
        if (utils.exitRollingCount(19, successCount)) return;
        this.slow((tc.slowTime.showHideSpecialFolder * 2) + (tc.waitTime.command * 2) + (tc.waitTime.configEvent  * 2));
        await utils.executeSettingsUpdate("specialFolders.showFavorites", false);
        await utils.waitForTeIdle(tc.waitTime.command);
        await utils.executeSettingsUpdate("specialFolders.showFavorites", true);
        await utils.waitForTeIdle(tc.waitTime.command);
        ++successCount;
    });


    test("Hide Last Tasks", async function()
    {
        if (utils.exitRollingCount(20, successCount)) return;
        this.slow(tc.slowTime.showHideSpecialFolder + tc.waitTime.command + tc.waitTime.configEvent);
        await utils.executeSettingsUpdate("specialFolders.showLastTasks", false);
        await utils.waitForTeIdle(tc.waitTime.command);
        ++successCount;
    });


    test("Refresh", async function()
    {
        if (utils.exitRollingCount(21, successCount)) return;
        this.slow(tc.slowTime.refreshCommand + tc.waitTime.command);
        await utils.executeTeCommand("refresh", tc.waitTime.refreshCommand);
        ++successCount;
    });


    test("Show Favorites", async function()
    {
        if (utils.exitRollingCount(22, successCount)) return;
        this.slow(tc.slowTime.showHideSpecialFolder + tc.waitTime.configEvent + tc.waitTime.command);
        await utils.executeSettingsUpdate("specialFolders.showFavorites", true);
        await utils.waitForTeIdle(tc.waitTime.command);
        ++successCount;
    });


    test("Show Last Tasks", async function()
    {
        if (utils.exitRollingCount(23, successCount)) return;
        this.slow(tc.slowTime.showHideSpecialFolder + tc.waitTime.configEvent + tc.waitTime.command);
        await utils.executeSettingsUpdate("specialFolders.showLastTasks", true);
        await utils.waitForTeIdle(tc.waitTime.command);
        ++successCount;
    });


    test("Show Favorite Tasks w/ Last Tasks", async function()
    {
        if (utils.exitRollingCount(24, successCount)) return;
        this.slow((tc.slowTime.showHideSpecialFolder * 4)  + (tc.waitTime.command * 4));
        await utils.executeSettingsUpdate("specialFolders.showLastTasks", false);
        await utils.waitForTeIdle(tc.waitTime.command);
        await utils.executeSettingsUpdate("specialFolders.showLastTasks", true);
        await utils.executeSettingsUpdate("specialFolders.showFavorites", false);
        await utils.waitForTeIdle(tc.waitTime.command);
        await utils.executeSettingsUpdate("specialFolders.showFavorites", true);
        await utils.waitForTeIdle(tc.waitTime.command);
        ++successCount;
    });


    test("Show Favorite Tasks Only", async function()
    {
        if (utils.exitRollingCount(25, successCount)) return;
        this.slow(tc.slowTime.showHideSpecialFolder + tc.waitTime.command);
        await utils.executeSettingsUpdate("specialFolders.showLastTasks", false);
        ++successCount;
    });


    test("Hide Favorite and Last Tasks", async function()
    {
        if (utils.exitRollingCount(26, successCount)) return;
        this.slow((tc.slowTime.showHideSpecialFolder * 2) + tc.waitTime.command);
        await utils.executeSettingsUpdate("specialFolders.showLastTasks", false);
        await utils.executeSettingsUpdate("specialFolders.showFavorites", false);
        await utils.waitForTeIdle(tc.waitTime.command);
        ++successCount;
    });


    test("Show Favorite Tasks", async function()
    {
        if (utils.exitRollingCount(27, successCount)) return;
        this.slow(tc.slowTime.showHideSpecialFolder + tc.waitTime.command);
        await utils.executeSettingsUpdate("specialFolders.showFavorites", true);
        await utils.waitForTeIdle(tc.waitTime.command);
        ++successCount;
    });


    test("Show Last Tasks", async function()
    {
        if (utils.exitRollingCount(28, successCount)) return;
        this.slow(tc.slowTime.showHideSpecialFolder + tc.waitTime.command);
        await utils.executeSettingsUpdate("specialFolders.showLastTasks", true);
        await utils.waitForTeIdle(tc.waitTime.command);
        ++successCount;
    });


    test("User tasks", async function()
    {
        if (utils.exitRollingCount(29, successCount)) return;
        // const json = await readFileSync(".vscode/workspace.json");fv
        ++successCount;
    });


    test("Clear Special Folders", async function()
    {
        if (utils.exitRollingCount(30, successCount)) return;
        utils.clearOverrideShowInfoBox();
        this.slow(tc.slowTime.command * 4);
        utils.overrideNextShowInfoBox("No");
        await utils.executeTeCommand("clearLastTasks");
        await utils.waitForTeIdle(tc.waitTime.command);
        utils.overrideNextShowInfoBox("No");
        await utils.executeTeCommand("clearFavorites");
        await utils.waitForTeIdle(tc.waitTime.command);
        utils.overrideNextShowInfoBox("Yes");
        await utils.executeTeCommand("clearLastTasks");
        await utils.waitForTeIdle(tc.waitTime.command);
        utils.overrideNextShowInfoBox("Yes");
        await utils.executeTeCommand("clearFavorites");
        await utils.waitForTeIdle(tc.waitTime.command);
        ++successCount;
    });


    test("Sort Folders", function()
    {
        if (utils.exitRollingCount(31, successCount)) return;
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
