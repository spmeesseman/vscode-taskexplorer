/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* tslint:disable */

import { sortFolders } from "../../lib/sortTasks";
import TaskFolder from "../../tree/folder";
import { IExplorerApi, ITaskExplorerApi, ITaskItemApi } from "@spmeesseman/vscode-taskexplorer-types";
import constants from "../../lib/constants";
import { storage } from "../../lib/utils/storage";
import TaskItem from "../../tree/item";
import {
    activate, clearOverrideShowInfoBox, clearOverrideShowInputBox, executeSettingsUpdate, executeTeCommand, executeTeCommand2, focusExplorerView,
    getSpecialTaskItemId, overrideNextShowInfoBox, overrideNextShowInputBox, suiteFinished, testControl, treeUtils
} from "../helper";
import SpecialTaskFolder from "../../tree/specialFolder";

let teApi: ITaskExplorerApi;
let explorer: IExplorerApi;
let ant: ITaskItemApi[];
let bash: ITaskItemApi[];
let batch: ITaskItemApi[];
let python: ITaskItemApi[];
let cstItem1: TaskItem | undefined;
let cstItem2: TaskItem | undefined;
let cstItem3: TaskItem | undefined;
let cstItem4: TaskItem | undefined;
let cstItem5: TaskItem | undefined;
let cstItem6: TaskItem | undefined;


suite("Tree Tests", () =>
{

    suiteSetup(async function()
    {
        teApi = await activate(this);
        explorer = teApi.testsApi.explorer;
    });


    suiteTeardown(async function()
    {
        suiteFinished(this);
    });


	test("Activate Tree (Focus Explorer View)", async function()
	{
        await focusExplorerView(this);
	});


    test("Refresh", async function()
    {
        this.slow(testControl.slowTime.refreshCommand);
        await executeTeCommand("refresh", testControl.waitTime.refreshCommand);
    });


    test("Show Favorites", async function()
    {
        this.slow((testControl.slowTime.configSpecialFolderEvent * 2) + (testControl.waitTime.configEvent * 2) +
                  (testControl.slowTime.getTreeTasks * 4) + testControl.slowTime.storageUpdate);
        ant = await treeUtils.getTreeTasks("ant", 3);
        bash = await treeUtils.getTreeTasks("bash", 1);
        batch = await treeUtils.getTreeTasks("batch", 2);
        python = await treeUtils.getTreeTasks("python", 2);
        await storage.update(constants.FAV_TASKS_STORE, [
            getSpecialTaskItemId(batch[0]), getSpecialTaskItemId(batch[1]), getSpecialTaskItemId(ant[0]),
            getSpecialTaskItemId(bash[0]), getSpecialTaskItemId(python[0]), getSpecialTaskItemId(python[1])
        ]);
        await executeSettingsUpdate("specialFolders.showFavorites", false, testControl.waitTime.configEvent);
        await executeSettingsUpdate("specialFolders.showFavorites", true, testControl.waitTime.configEvent);
    });


    test("Remove from Favorites", async function()
    {
        this.slow((testControl.slowTime.command * 6) + testControl.waitTime.command);
        await executeTeCommand2("addRemoveFavorite", [ batch[0] ]);
        await executeTeCommand2("addRemoveFavorite", [ batch[1] ]);
        await executeTeCommand2("addRemoveFavorite", [ ant[0] ]);
        await executeTeCommand2("addRemoveFavorite", [ bash[0] ]);
        await executeTeCommand2("addRemoveFavorite", [ python[0] ]);
        await executeTeCommand2("addRemoveFavorite", [ python[1] ]);
        await teApi.waitForIdle(testControl.waitTime.command);
    });


    test("Show Last Tasks", async function()
    {
        this.slow((testControl.slowTime.configSpecialFolderEvent * 2) + (testControl.waitTime.configEvent * 2) + (testControl.slowTime.getTreeTasks * 2));
        ant = await treeUtils.getTreeTasks("ant", 3);
        batch = await treeUtils.getTreeTasks("batch", 2);
        await storage.update(constants.LAST_TASKS_STORE, [
            getSpecialTaskItemId(batch[0]), getSpecialTaskItemId(batch[1]), getSpecialTaskItemId(ant[0]),
            getSpecialTaskItemId(bash[0]), getSpecialTaskItemId(python[0]), getSpecialTaskItemId(python[1])
        ]);
        await executeSettingsUpdate("specialFolders.showLastTasks", false, testControl.waitTime.configEvent);
        await executeSettingsUpdate("specialFolders.showLastTasks", true, testControl.waitTime.configEvent);
    });


    test("Add to Favorites", async function()
    {
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
    });


    test("Add Custom Label 1", async function()
    {
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
    });


    test("Add Custom Label 2", async function()
    {
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
    });


    test("Add Custom Label 3", async function()
    {
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
    });


    test("Add Custom Label 4", async function()
    {
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
    });


    test("Add Custom Label 5", async function()
    {
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
    });


    test("Add Custom Label 6", async function()
    {
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
    });


    test("Remove Custom Label 1", async function()
    {
        if (cstItem1) {
            this.slow(testControl.slowTime.command + testControl.waitTime.command);
            await executeTeCommand2("addRemoveCustomLabel", [ cstItem1 ]);
            await teApi.waitForIdle(testControl.waitTime.command);
        }
    });


    test("Remove Custom Label 2", async function()
    {
        if (cstItem2) {
            this.slow(testControl.slowTime.command + testControl.waitTime.command);
            await executeTeCommand2("addRemoveCustomLabel", [ cstItem2 ]);
            await teApi.waitForIdle(testControl.waitTime.command);
        }
    });


    test("Remove Custom Label 3", async function()
    {
        if (cstItem3) {
            this.slow(testControl.slowTime.command + testControl.waitTime.command);
            await executeTeCommand2("addRemoveCustomLabel", [ cstItem3 ]);
            await teApi.waitForIdle(testControl.waitTime.command);
        }
    });


    test("Remove Custom Label 4", async function()
    {
        if (cstItem4) {
            this.slow(testControl.slowTime.command + testControl.waitTime.command);
            await executeTeCommand2("addRemoveCustomLabel", [ cstItem4 ]);
            await teApi.waitForIdle(testControl.waitTime.command);
        }
    });


    test("Remove Custom Label 5", async function()
    {
        if (cstItem5) {
            this.slow(testControl.slowTime.command + testControl.waitTime.command);
            await executeTeCommand2("addRemoveCustomLabel", [ cstItem5 ]);
            await teApi.waitForIdle(testControl.waitTime.command);
        }
    });


    test("Remove Custom Label 6", async function()
    {
        if (cstItem6) {
            this.slow(testControl.slowTime.command + testControl.waitTime.command);
            await executeTeCommand2("addRemoveCustomLabel", [ cstItem6 ]);
            await teApi.waitForIdle(testControl.waitTime.command);
        }
    });


    test("Cancel Add Custom Label", async function()
    {;
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
    });


    test("Hide Favorites", async function()
    {
        this.slow((testControl.slowTime.showHideSpecialFolder * 2) + (testControl.waitTime.command * 2));
        await executeSettingsUpdate("specialFolders.showFavorites", false);
        await teApi.waitForIdle(testControl.waitTime.command);
        await executeSettingsUpdate("specialFolders.showFavorites", true);
        await teApi.waitForIdle(testControl.waitTime.command);
    });


    test("Hide Last Tasks", async function()
    {
        this.slow(testControl.slowTime.showHideSpecialFolder + testControl.waitTime.command);
        await executeSettingsUpdate("specialFolders.showLastTasks", false);
        await teApi.waitForIdle(testControl.waitTime.command);
    });


    test("Refresh", async function()
    {
        this.slow(testControl.slowTime.refreshCommand + testControl.waitTime.command);
        await executeTeCommand("refresh", testControl.waitTime.refreshCommand);
    });


    test("Show Favorites", async function()
    {
        this.slow(testControl.slowTime.configEnableEvent + testControl.waitTime.command);
        await executeSettingsUpdate("specialFolders.showFavorites", true);
        await teApi.waitForIdle(testControl.waitTime.command);
    });


    test("Show Last Tasks", async function()
    {
        this.slow(testControl.slowTime.showHideSpecialFolder + testControl.waitTime.command);
        await executeSettingsUpdate("specialFolders.showLastTasks", true);
        await teApi.waitForIdle(testControl.waitTime.command);
    });


    test("Show Favorite Tasks w/ Last Tasks", async function()
    {
        this.slow((testControl.slowTime.showHideSpecialFolder * 4)  + (testControl.waitTime.command * 4));
        await executeSettingsUpdate("specialFolders.showLastTasks", false);
        await teApi.waitForIdle(testControl.waitTime.command);
        await executeSettingsUpdate("specialFolders.showLastTasks", true);
        await executeSettingsUpdate("specialFolders.showFavorites", false);
        await teApi.waitForIdle(testControl.waitTime.command);
        await executeSettingsUpdate("specialFolders.showFavorites", true);
        await teApi.waitForIdle(testControl.waitTime.command);
    });


    test("Show Favorite Tasks Only", async function()
    {
        this.slow(testControl.slowTime.showHideSpecialFolder + testControl.waitTime.command);
        await executeSettingsUpdate("specialFolders.showLastTasks", false);
    });


    test("Hide Favorite and Last Tasks", async function()
    {
        this.slow((testControl.slowTime.showHideSpecialFolder * 2) + testControl.waitTime.command);
        await executeSettingsUpdate("specialFolders.showLastTasks", false);
        await executeSettingsUpdate("specialFolders.showFavorites", false);
        await teApi.waitForIdle(testControl.waitTime.command);
    });


    test("Show Favorite Tasks", async function()
    {
        this.slow(testControl.slowTime.showHideSpecialFolder + testControl.waitTime.command);
        await executeSettingsUpdate("specialFolders.showFavorites", true);
        await teApi.waitForIdle(testControl.waitTime.command);
    });


    test("Show Last Tasks", async function()
    {
        this.slow(testControl.slowTime.showHideSpecialFolder + testControl.waitTime.command);
        await executeSettingsUpdate("specialFolders.showLastTasks", true);
        await teApi.waitForIdle(testControl.waitTime.command);
    });


    test("User tasks", async function()
    {
        // const json = await readFileSync(".vscode/workspace.json");fv
    });


    test("Clear Special Folders", async function()
    {
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
    });


    test("Sort folders", function()
    {
        let map: Map<string, TaskFolder> = new Map<string, TaskFolder>();
        map.set("frank", new TaskFolder("frank"));
        map.set("richard face", new TaskFolder("richard face"));
        map.set("bob", new TaskFolder("bob"));
        map.set("scott", new TaskFolder("maurice"));
        map.set(constants.FAV_TASKS_LABEL, new TaskFolder(constants.FAV_TASKS_LABEL));
        map.set("chris", new TaskFolder("chris"));
        map.set("maurice", new TaskFolder("maurice"));
        map.set(constants.USER_TASKS_LABEL, new TaskFolder(constants.USER_TASKS_LABEL));
        map.set(constants.LAST_TASKS_LABEL, new TaskFolder(constants.LAST_TASKS_LABEL));
        map.set("peter", new TaskFolder("peter"));
        map.set("larry", new TaskFolder("larry"));
        map.set("mike", new TaskFolder("maurice"));
        sortFolders(map);
        map = new Map<string, TaskFolder>();
        map.set("Zoo", new TaskFolder("onetwothree"));
        map.set(constants.USER_TASKS_LABEL, new TaskFolder(constants.USER_TASKS_LABEL));
        map.set("OMG", new TaskFolder("if i was"));
        map.set(constants.LAST_TASKS_LABEL, new TaskFolder(constants.LAST_TASKS_LABEL));
        map.set("Andrew was here", new TaskFolder("tasks4"));
        map.set("maya and sierra", new TaskFolder("tasks5"));
        map.set("front DOOR", new TaskFolder("Christmas"));
        map.set("change folder", new TaskFolder("what"));
        map.set(constants.FAV_TASKS_LABEL, new TaskFolder(constants.FAV_TASKS_LABEL));
        map.set("extremely tired", new TaskFolder("tired1"));
        map.set("tired", new TaskFolder("tired2"));
        map.set("dozing off", new TaskFolder("doze"));
        sortFolders(map);
        map = new Map<string, TaskFolder>();
        map.set("Zoo", new TaskFolder("onetwothree"));
        map.set("OMG", new TaskFolder("if i was"));
        map.set(constants.FAV_TASKS_LABEL, new TaskFolder(constants.FAV_TASKS_LABEL));
        map.set(constants.LAST_TASKS_LABEL, new TaskFolder(constants.LAST_TASKS_LABEL));
        map.set("Andrew was here", new TaskFolder("tasks4"));
        map.set("maya and sierra", new TaskFolder("tasks5"));
        map.set("front DOOR", new TaskFolder("Christmas"));
        map.set("change folder", new TaskFolder("what"));
        map.set("extremely tired", new TaskFolder("tired1"));
        map.set("tired", new TaskFolder("tired2"));
        map.set("dozing off", new TaskFolder("doze"));
        map.set(constants.USER_TASKS_LABEL, new TaskFolder(constants.USER_TASKS_LABEL));
        sortFolders(map);
        map = new Map<string, TaskFolder>();
        map.set("Zoo", new TaskFolder("onetwothree"));
        map.set("OMG", new TaskFolder("if i was"));
        map.set(constants.USER_TASKS_LABEL, new TaskFolder(constants.USER_TASKS_LABEL));
        map.set(constants.FAV_TASKS_LABEL, new TaskFolder(constants.FAV_TASKS_LABEL));
        map.set(constants.LAST_TASKS_LABEL, new TaskFolder(constants.LAST_TASKS_LABEL));
        map.set("Andrew was here", new TaskFolder("tasks4"));
        map.set("maya and sierra", new TaskFolder("tasks5"));
        map.set("front DOOR", new TaskFolder("Christmas"));
        map.set("change folder", new TaskFolder("what"));
        map.set("extremely tired", new TaskFolder("tired1"));
        map.set("tired", new TaskFolder("tired2"));
        map.set("dozing off", new TaskFolder("doze"));
        sortFolders(map);
        map = new Map<string, TaskFolder>();
        map.set("Zoo", new TaskFolder("onetwothree"));
        map.set("OMG", new TaskFolder("if i was"));
        map.set(constants.FAV_TASKS_LABEL, new TaskFolder(constants.FAV_TASKS_LABEL));
        map.set(constants.USER_TASKS_LABEL, new TaskFolder(constants.USER_TASKS_LABEL));
        map.set(constants.LAST_TASKS_LABEL, new TaskFolder(constants.LAST_TASKS_LABEL));
        map.set("Andrew was here", new TaskFolder("tasks4"));
        map.set("maya and sierra", new TaskFolder("tasks5"));
        map.set("front DOOR", new TaskFolder("Christmas"));
        map.set("change folder", new TaskFolder("what"));
        map.set("extremely tired", new TaskFolder("tired1"));
        map.set("tired", new TaskFolder("tired2"));
        map.set("dozing off", new TaskFolder("doze"));
        sortFolders(map);
        map = new Map<string, TaskFolder>();
        map.set("Zoo", new TaskFolder("onetwothree"));
        map.set("OMG", new TaskFolder("if i was"));
        map.set(constants.FAV_TASKS_LABEL, new TaskFolder(constants.FAV_TASKS_LABEL));
        map.set(constants.LAST_TASKS_LABEL, new TaskFolder(constants.LAST_TASKS_LABEL));
        map.set(constants.USER_TASKS_LABEL, new TaskFolder(constants.USER_TASKS_LABEL));
        map.set("Andrew was here", new TaskFolder("tasks4"));
        map.set("maya and sierra", new TaskFolder("tasks5"));
        map.set("front DOOR", new TaskFolder("Christmas"));
        map.set("change folder", new TaskFolder("what"));
        map.set("extremely tired", new TaskFolder("tired1"));
        map.set("tired", new TaskFolder("tired2"));
        map.set("dozing off", new TaskFolder("doze"));
        sortFolders(map);
        map = new Map<string, TaskFolder>();
        map.set("Zoo", new TaskFolder("onetwothree"));
        map.set("OMG", new TaskFolder("if i was"));
        map.set(constants.LAST_TASKS_LABEL, new TaskFolder(constants.LAST_TASKS_LABEL));
        map.set(constants.FAV_TASKS_LABEL, new TaskFolder(constants.FAV_TASKS_LABEL));
        map.set(constants.USER_TASKS_LABEL, new TaskFolder(constants.USER_TASKS_LABEL));
        map.set("Andrew was here", new TaskFolder("tasks4"));
        map.set("maya and sierra", new TaskFolder("tasks5"));
        map.set("front DOOR", new TaskFolder("Christmas"));
        map.set("change folder", new TaskFolder("what"));
        map.set("extremely tired", new TaskFolder("tired1"));
        map.set("tired", new TaskFolder("tired2"));
        map.set("dozing off", new TaskFolder("doze"));
        sortFolders(map);
        map = new Map<string, TaskFolder>();
        map.set("Zoo", new TaskFolder("onetwothree"));
        map.set("OMG", new TaskFolder("if i was"));
        map.set(constants.USER_TASKS_LABEL, new TaskFolder(constants.USER_TASKS_LABEL));
        map.set(constants.LAST_TASKS_LABEL, new TaskFolder(constants.LAST_TASKS_LABEL));
        map.set(constants.FAV_TASKS_LABEL, new TaskFolder(constants.FAV_TASKS_LABEL));
        map.set("Andrew was here", new TaskFolder("tasks4"));
        map.set("maya and sierra", new TaskFolder("tasks5"));
        map.set("front DOOR", new TaskFolder("Christmas"));
        map.set("change folder", new TaskFolder("what"));
        map.set("extremely tired", new TaskFolder("tired1"));
        map.set("tired", new TaskFolder("tired2"));
        map.set("dozing off", new TaskFolder("doze"));
        sortFolders(map);
        map = new Map<string, TaskFolder>();
        map.set(constants.LAST_TASKS_LABEL, new TaskFolder(constants.LAST_TASKS_LABEL));
        map.set("", new TaskFolder("onetwothree"));
        map.set("OMG", new TaskFolder("if i was"));
        map.set("Andrew was here", new TaskFolder(""));
        map.set(constants.FAV_TASKS_LABEL, new TaskFolder(constants.FAV_TASKS_LABEL));
        map.set("maya and sierra", new TaskFolder("tasks5"));
        map.set("front DOOR", new TaskFolder(""));
        map.set(constants.USER_TASKS_LABEL, new TaskFolder(constants.USER_TASKS_LABEL));
        map.set("", new TaskFolder("what"));
        map.set("extremely tired", new TaskFolder("tired1"));
        map.set("tired", new TaskFolder("tired2"));
        map.set("dozing off", new TaskFolder("doze"));
        sortFolders(map);
    });

});
