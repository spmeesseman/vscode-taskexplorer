/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* tslint:disable */

import { sortFolders } from "../../lib/sortTasks";
import TaskFolder from "../../tree/folder";
import { IExplorerApi, ITaskExplorerApi } from "@spmeesseman/vscode-taskexplorer-types";
import constants from "../../lib/constants";
import { storage } from "../../lib/utils/storage";
import TaskItem from "../../tree/item";
import {
    activate, executeSettingsUpdate, executeTeCommand, executeTeCommand2, focusExplorer,
    getSpecialTaskItemId, getTreeTasks, overrideNextShowInputBox, testControl
} from "../helper";


let teApi: ITaskExplorerApi;
let explorer: IExplorerApi;
let favTasks: string[];
let lastTasks: string[];
let ant: TaskItem[];
let batch: TaskItem[];


suite("Tree Tests", () =>
{

    suiteSetup(async function()
    {
        teApi = await activate(this);
        explorer = teApi.testsApi.explorer;
        favTasks = storage.get<string[]>(constants.FAV_TASKS_STORE, []);
        lastTasks = storage.get<string[]>(constants.LAST_TASKS_STORE, []);
    });


    suiteTeardown(async function()
    {
        await storage.update(constants.FAV_TASKS_STORE, favTasks);
        await storage.update(constants.LAST_TASKS_STORE, lastTasks);
    });


	test("Focus Task Explorer View for Tree Population", async function()
	{
        await focusExplorer(this);
	});


    test("Refresh", async function()
    {
        this.slow(testControl.slowTimeForRefreshCommand);
        await executeTeCommand("refresh", testControl.waitTimeForRefreshCommand);
    });


    test("Show Favorites", async function()
    {
        ant = await getTreeTasks("ant", 3);
        batch = await getTreeTasks("batch", 2);
        if (favTasks.length === 0)
        {
            await storage.update(constants.FAV_TASKS_STORE, [
                getSpecialTaskItemId(batch[0]), getSpecialTaskItemId(batch[1]), getSpecialTaskItemId(ant[0])
            ]);
        }
        await executeSettingsUpdate("specialFolders.showFavorites", false);
        await executeSettingsUpdate("specialFolders.showFavorites", true);
    });


    test("Show Last Tasks", async function()
    {
        ant = await getTreeTasks("ant", 3);
        batch = await getTreeTasks("batch", 2);
        if (lastTasks.length === 0)
        {
            await storage.update(constants.LAST_TASKS_STORE, [
                getSpecialTaskItemId(batch[0]), getSpecialTaskItemId(batch[1]), getSpecialTaskItemId(ant[0])
            ]);
        }
        await executeSettingsUpdate("specialFolders.showLastTasks", false);
        await executeSettingsUpdate("specialFolders.showLastTasks", true);
    });


    //
    // The next two tests belong here in this suite but they're pretty embedded into
    // provider.test.ts with the dumb task file runtime creation b4i knewhow the test
    // fixtures worked. Will pull them into this suite someday.  Finding the taskitem
    // node to hide is crappy.
    //
    // test("Add to Excludes - TaskFile", async function()
    // {
    //     const taskItems = await tasks.fetchTasks({ type: "grunt" }),
    //           gruntCt = taskItems.length;
    //     for (const map of taskMap)
    //     {
    //         const value = map[1];
    //         if (value && value.taskSource === "grunt" && !value.taskFile.path.startsWith("grunt"))
    //         {
    //             await commands.executeCommand("taskExplorer.addToExcludes", value.taskFile);
    //             await sleep(500);
    //             await waitForCache();
    //             break;
    //         }
    //     }
    //     await verifyTaskCount("grunt", gruntCt - 2);
    // });
    //
    // test("Add to Excludes - TaskItem", async function()
    // {
    //     const taskItems = await tasks.fetchTasks({ type: "grunt" }),
    //           gruntCt = taskItems.length;
    //     for (const map of taskMap)
    //     {
    //         const value = map[1];
    //         if (value && value.taskSource === "grunt" && !value.taskFile.path.startsWith("grunt"))
    //         {
    //             const node = value.taskFile.treeNodes.find(n => n instanceof TaskItem);
    //             if (node)
    //             {
    //                 await commands.executeCommand("taskExplorer.addToExcludes", node);
    //                 await sleep(500);
    //                 await waitForCache();
    //                 break;
    //             }
    //         }
    //     }
    //     await verifyTaskCount("grunt", gruntCt - 1);
    // });


    test("Add to Favorites", async function()
    {
        this.slow(testControl.slowTimeForCommand * 4);
        let removed = await executeTeCommand2("addRemoveFavorite", [ batch[0] ]);
        if (removed) {
            await executeTeCommand2("addRemoveFavorite", [ batch[0] ]);
        }

        removed = await executeTeCommand2("addRemoveFavorite", [ batch[1] ]);
        if (removed) {
            await executeTeCommand2("addRemoveFavorite", [ batch[1] ]);
        }
    });


    test("Remove from Favorites", async function()
    {
        this.slow(testControl.slowTimeForCommand * 2);
        await executeTeCommand2("addRemoveFavorite", [ batch[0] ]);
        await executeTeCommand2("addRemoveFavorite", [ batch[1] ]);
    });


    test("Add Custom Label 1", async function()
    {
        this.slow(testControl.slowTimeForCommand);
        overrideNextShowInputBox("Label 1");
        await executeTeCommand2("addRemoveCustomLabel", [ batch[0] ]);
    });


    test("Add Custom Label 2", async function()
    {
        this.slow(testControl.slowTimeForCommand);
        overrideNextShowInputBox("Label 2");
        await executeTeCommand2("addRemoveCustomLabel", [ batch[0] ]);
    });


    test("Add Custom Label 3", async function()
    {
        this.slow(testControl.slowTimeForCommand);
        overrideNextShowInputBox("Label 3");
        await executeTeCommand2("addRemoveCustomLabel", [ batch[1] ]);
    });


    test("Add Custom Label 4", async function()
    {
        this.slow(testControl.slowTimeForCommand);
        overrideNextShowInputBox("Label 4");
        await executeTeCommand2("addRemoveCustomLabel", [ batch[1] ]);
    });


    test("Add Custom Label 5", async function()
    {
        this.slow(testControl.slowTimeForCommand);
        overrideNextShowInputBox("Label 5");
        await executeTeCommand2("addRemoveCustomLabel", [ ant[0] ]);
    });


    test("Add Custom Label 6", async function()
    {
        this.slow(testControl.slowTimeForCommand);
        overrideNextShowInputBox("Label 6");
        await executeTeCommand2("addRemoveCustomLabel", [ ant[0] ]);
    });


    test("Remove Custom Label 1", async function()
    {
        this.slow(testControl.slowTimeForCommand);
        await executeTeCommand2("addRemoveCustomLabel", [ batch[0] ]);
    });


    test("Remove Custom Label 2", async function()
    {
        this.slow(testControl.slowTimeForCommand);
        await executeTeCommand2("addRemoveCustomLabel", [ batch[0] ]);
    });


    test("Remove Custom Label 3", async function()
    {
        this.slow(testControl.slowTimeForCommand);
        await executeTeCommand2("addRemoveCustomLabel", [ batch[1] ]);
    });


    test("Remove Custom Label 4", async function()
    {
        this.slow(testControl.slowTimeForCommand);
        await executeTeCommand2("addRemoveCustomLabel", [ batch[1] ]);
    });


    test("Remove Custom Label 5", async function()
    {
        this.slow(testControl.slowTimeForCommand);
        await executeTeCommand2("addRemoveCustomLabel", [ ant[0] ]);
    });


    test("Remove Custom Label 6", async function()
    {
        this.slow(testControl.slowTimeForCommand);
        await executeTeCommand2("addRemoveCustomLabel", [ ant[0] ]);
    });


    test("Cancel Add Custom Label", async function()
    {
        this.slow(testControl.slowTimeForCommand);
        overrideNextShowInputBox(undefined);
        await executeTeCommand2("addRemoveCustomLabel", [ ant[0] ]);
    });


    test("Hide Favorites", async function()
    {
        this.slow(testControl.slowTimeForConfigEvent * 3);
        await executeSettingsUpdate("specialFolders.showFavorites", false);
        await teApi.waitForIdle(testControl.waitTimeForCommand);
        await executeSettingsUpdate("specialFolders.showFavorites", true);
        await teApi.waitForIdle(testControl.waitTimeForCommand);
    });


    test("Hide Last Tasks", async function()
    {
        this.slow(testControl.slowTimeForConfigEvent * 3);
        await executeSettingsUpdate("specialFolders.showLastTasks", false);
        await teApi.waitForIdle(testControl.waitTimeForCommand);
    });


    test("Refresh", async function()
    {
        this.slow(testControl.slowTimeForRefreshCommand);
        await executeTeCommand("refresh", testControl.waitTimeForRefreshCommand);
    });


    test("Show Favorites", async function()
    {
        this.slow(testControl.slowTimeForConfigEnableEvent);
        await executeSettingsUpdate("specialFolders.showFavorites", true);
        await teApi.waitForIdle(testControl.waitTimeForCommand);
    });


    test("Show Last Tasks", async function()
    {
        this.slow(testControl.slowTimeForConfigEvent * 3);
        await executeSettingsUpdate("specialFolders.showLastTasks", true);
        await teApi.waitForIdle(testControl.waitTimeForCommand);
    });


    test("Show Favorite Tasks w/ Last Tasks", async function()
    {
        this.slow((testControl.waitTimeForConfigEvent * 3) + (testControl.waitTimeForCommand * 2));
        await executeSettingsUpdate("specialFolders.showLastTasks", false);
        await teApi.waitForIdle(testControl.waitTimeForCommand);
        await executeSettingsUpdate("specialFolders.showLastTasks", true);
        await executeSettingsUpdate("specialFolders.showFavorites", false);
        await teApi.waitForIdle(testControl.waitTimeForCommand);
        await executeSettingsUpdate("specialFolders.showFavorites", true);
        await teApi.waitForIdle(testControl.waitTimeForCommand);
    });


    test("Show Favorite Tasks Only", async function()
    {
        await executeSettingsUpdate("specialFolders.showLastTasks", false);
    });


    test("Hide Favorite and Last Tasks", async function()
    {
        await executeSettingsUpdate("specialFolders.showLastTasks", false);
        await executeSettingsUpdate("specialFolders.showFavorites", false);
        await teApi.waitForIdle(testControl.waitTimeForCommand);
    });


    test("Show Favorite Tasks", async function()
    {
        await executeSettingsUpdate("specialFolders.showFavorites", true);
        await teApi.waitForIdle(testControl.waitTimeForCommand);
    });


    test("Show Last Tasks", async function()
    {
        await executeSettingsUpdate("specialFolders.showLastTasks", true);
        await teApi.waitForIdle(testControl.waitTimeForCommand);
    });


    test("User tasks", async function()
    {
        // const json = await readFileSync(".vscode/workspace.json");
    });


    test("Clear Special Folders", async function()
    {
        this.slow(testControl.slowTimeForCommand * 2);
        overrideNextShowInputBox("Yes");
        await executeTeCommand("clearLastTasks");
        overrideNextShowInputBox("Yes");
        await executeTeCommand("clearFavorites");
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


    test("Invalidation (Workspace)", async function()
    {
        this.slow(15000);
        await explorer.invalidateTasksCache();
        await teApi.waitForIdle(testControl.waitTimeForCommand);
        await executeTeCommand("refresh", testControl.waitTimeForRefreshCommand);
    });

});
