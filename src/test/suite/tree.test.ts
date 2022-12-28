/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* tslint:disable */

import * as assert from "assert";
import * as util from "../../common/utils";
import TaskFolder from "../../tree/folder";
import { TaskExplorerApi } from "@spmeesseman/vscode-taskexplorer-types";
import { configuration } from "../../common/configuration";
import constants from "../../common/constants";
import { storage } from "../../common/storage";
import TaskItem from "../../tree/item";
import { TreeItem, TreeItemCollapsibleState } from "vscode";
import {
    activate, executeTeCommand, getTreeTasks, isReady, overrideNextShowInfoBox, overrideNextShowInputBox, refresh, sleep, verifyTaskCount
} from "../helper";


let teApi: TaskExplorerApi;
let favTasks: string[];
let lastTasks: string[];
let ant: TaskItem[];
let batch: TaskItem[];


suite("Tree Tests", () =>
{

    suiteSetup(async function()
    {
        teApi = await activate(this);
        assert(isReady() === true, "    ✘ TeApi not ready");
        favTasks = storage.get<string[]>(constants.FAV_TASKS_STORE, []);
        lastTasks = storage.get<string[]>(constants.LAST_TASKS_STORE, []);
    });


    suiteTeardown(async function()
    {
        await storage.update(constants.FAV_TASKS_STORE, favTasks);
        await storage.update(constants.LAST_TASKS_STORE, lastTasks);
    });


    test("Refresh", async function()
    {
        await executeTeCommand("refresh", 1000);
    });


    test("Show Last Tasks", async function()
    {
        ant = await getTreeTasks("ant", 3);
        batch = await getTreeTasks("batch", 2);
        if (lastTasks.length === 0)
        {
            await storage.update(constants.LAST_TASKS_STORE, [
                util.getTaskItemId(batch[0]), util.getTaskItemId(batch[1]), util.getTaskItemId(ant[0])
            ]);
        }
        await configuration.updateWs("showLastTasks", false);
        await configuration.updateWs("showLastTasks", true);
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
        let removed = await executeTeCommand("addRemoveFromFavorites", 10, 100, batch[0]);
        if (removed) {
            await executeTeCommand("addRemoveFromFavorites", 10, 100, batch[0]);
        }

        removed = await executeTeCommand("addRemoveFromFavorites", 10, 100, batch[1]);
        if (removed) {
            await executeTeCommand("addRemoveFromFavorites", 10, 100, batch[1]);
        }
    });


    test("Remove from Favorites", async function()
    {
        await executeTeCommand("addRemoveFromFavorites", 10, 100, batch[0]);
        await executeTeCommand("addRemoveFromFavorites", 10, 100, batch[1]);
    });


    test("Add Custom Label 1", async function()
    {
        overrideNextShowInputBox("Label 1");
        await executeTeCommand("addRemoveCustomLabel", 50, 50, batch[0]);
    });


    test("Add Custom Label 2", async function()
    {
        overrideNextShowInputBox("Label 2");
        await executeTeCommand("addRemoveCustomLabel", 50, 50, batch[0]);
    });


    test("Add Custom Label 3", async function()
    {
        overrideNextShowInputBox("Label 3");
        await executeTeCommand("addRemoveCustomLabel", 50, 50, batch[1]);
    });


    test("Add Custom Label 4", async function()
    {
        overrideNextShowInputBox("Label 4");
        await executeTeCommand("addRemoveCustomLabel", 50, 50, batch[1]);
    });


    test("Add Custom Label 5", async function()
    {
        overrideNextShowInputBox("Label 5");
        await executeTeCommand("addRemoveCustomLabel", 50, 50, ant[0]);
    });


    test("Add Custom Label 6", async function()
    {
        overrideNextShowInputBox("Label 6");
        await executeTeCommand("addRemoveCustomLabel", 50, 50, ant[0]);
    });


    test("Remove Custom Label 1", async function()
    {
        await executeTeCommand("addRemoveCustomLabel", 50, 50, batch[0]);
    });


    test("Remove Custom Label 2", async function()
    {
        await executeTeCommand("addRemoveCustomLabel", 50, 50, batch[0]);
    });


    test("Remove Custom Label 3", async function()
    {
        await executeTeCommand("addRemoveCustomLabel", 50, 50, batch[1]);
    });


    test("Remove Custom Label 4", async function()
    {
        await executeTeCommand("addRemoveCustomLabel", 50, 50, batch[1]);
    });


    test("Remove Custom Label 5", async function()
    {
        await executeTeCommand("addRemoveCustomLabel", 50, 50, ant[0]);
    });


    test("Remove Custom Label 6", async function()
    {
        await executeTeCommand("addRemoveCustomLabel", 50, 50, ant[0]);
    });


    test("Cancel Add Custom Label", async function()
    {
        overrideNextShowInputBox(undefined);
        await executeTeCommand("addRemoveCustomLabel", 50, 50, ant[0]);
    });


    test("Hide last tasks", async function()
    {
        await configuration.updateWs("showLastTasks", false);
        await teApi.explorer?.showSpecialTasks(false);
        await teApi.explorer?.showSpecialTasks(true);
    });


    test("Refresh", async function()
    {
        await refresh();
    });


    test("Show last tasks", async function()
    {
        await configuration.updateWs("showLastTasks", true);
        await teApi.explorer?.showSpecialTasks(false);
        await teApi.explorer?.showSpecialTasks(true);
    });


    test("Refresh", async function()
    {
        await refresh();
    });


    test("Show Favorite Tasks w/ Last Tasks", async function()
    {
        await configuration.updateWs("showLastTasks", false);
        await teApi.explorer?.showSpecialTasks(false, true);
        await configuration.updateWs("showLastTasks", true);
        await teApi.explorer?.showSpecialTasks(false, true);
        await refresh();
        await configuration.updateWs("showLastTasks", false);
    });


    test("Refresh", async function()
    {
        await refresh();
    });


    test("Show Favorite Tasks Only", async function()
    {
        await configuration.updateWs("showLastTasks", false);
    });


    test("Refresh", async function()
    {
        await refresh();
    });


    test("Hide Favorite and Last Tasks", async function()
    {
        await configuration.updateWs("showLastTasks", false);
        await teApi.explorer?.showSpecialTasks(true, true);
    });


    test("Hide Favorite Tasks", async function()
    {
        await configuration.updateWs("showLastTasks", true);
        await teApi.explorer?.showSpecialTasks(true, true);
    });


    test("Refresh", async function()
    {
        await refresh();
    });


    test("User tasks", async function()
    {
        // const json = await readFileSync(".vscode/workspace.json");
    });


    test("Clear Special Folders", async function()
    {
        await executeTeCommand("clearSpecialFolder", 1000, 1000, constants.LAST_TASKS_LABEL);
        await executeTeCommand("clearSpecialFolder", 1000, 1000, constants.FAV_TASKS_LABEL);
        await executeTeCommand("clearSpecialFolder", 1000, 1000, "Invalid");
        overrideNextShowInfoBox("test ask");
        await executeTeCommand("clearSpecialFolder", 1000, 1000, batch[0].getFolder());
    });


    test("Sort folders", async function()
    {
        const map: Map<string, TaskFolder> = new Map<string, TaskFolder>();
        map.set("frank", new TaskFolder("frank"));
        map.set("richard face", new TaskFolder("richard face"));
        map.set("bob", new TaskFolder("bob"));
        map.set("scott", new TaskFolder("maurice"));
        map.set(constants.FAV_TASKS_LABEL, new TaskFolder(constants.FAV_TASKS_LABEL));
        map.set("chris", new TaskFolder("chris"));
        map.set("maurice", new TaskFolder("maurice"));
        map.set(constants.FAV_TASKS_LABEL, new TaskFolder(constants.FAV_TASKS_LABEL));
        map.set("peter", new TaskFolder("peter"));
        map.set("larry", new TaskFolder("larry"));
        map.set("mike", new TaskFolder("maurice"));
    });


    test("Invalidation", async function()
    {
        /* Don't await */ teApi.explorer?.getChildren(undefined, "", 1);
        await teApi.explorer?.invalidateTasksCache("ant");
        await refresh();
        await teApi.explorer?.invalidateTasksCache();
        await refresh();
    });


    test("Get tree parent", async function()
    {
        teApi.explorer?.getParent("Invalid" as TreeItem);
        teApi.explorer?.getParent(new NoScripts());
        teApi.explorer?.getParent(batch[0]);
    });


    test("Get tree children when busy", async function()
    {
        /* Don't await */ teApi.explorer?.getChildren(undefined, "", 1);
        await teApi.explorer?.getChildren(undefined, "");
    });

});


class NoScripts extends TreeItem
{
    constructor()
    {
        super("No scripts found", TreeItemCollapsibleState.None);
        this.contextValue = "noscripts";
    }
}
