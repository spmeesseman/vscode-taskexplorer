/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* tslint:disable */

import { expect } from "chai";
import * as utils from "../utils/utils";
import { TaskTree } from "../../tree/tree";
import { Strings } from "../../lib/constants";
import { TaskItem } from "../../tree/item";
import { TeWrapper } from "../../lib/wrapper";
import { TaskFolder } from "../../tree/folder";
import { sortFolders } from "../../lib/sortTasks";
import { startupFocus } from "../utils/suiteUtils";
import { SpecialTaskFolder } from "../../tree/specialFolder";
import { IDictionary, ITaskExplorerApi } from "@spmeesseman/vscode-taskexplorer-types";
import { executeSettingsUpdate, executeTeCommand, executeTeCommand2 } from "../utils/commandUtils";

let teWrapper: TeWrapper;
const tc = utils.testControl;
let teApi: ITaskExplorerApi;
let explorer: TaskTree;
let ant: TaskItem[];
let bash: TaskItem[];
let batch: TaskItem[];
let python: TaskItem[];
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
        if (utils.exitRollingCount(this, true)) return;
        ({ teApi, teWrapper } = await utils.activate(this));
        utils.endRollingCount(this, true);
    });


    suiteTeardown(async function()
    {
        if (utils.exitRollingCount(this, false, true)) return;
        utils.suiteFinished(this);
    });


    test("Focus Explorer View", async function()
	{
        await startupFocus(this);
	});


    test("Show Favorites", async function()
    {
        if (utils.exitRollingCount(this)) return;
        this.slow((tc.slowTime.config.showHideSpecialFolder * 2) + (tc.waitTime.config.event * 2) +
                  (tc.slowTime.getTreeTasks * 4) + tc.slowTime.storageUpdate);
        ant = await utils.treeUtils.getTreeTasks("ant", 3);
        bash = await utils.treeUtils.getTreeTasks("bash", 1);
        batch = await utils.treeUtils.getTreeTasks("batch", 2);
        python = await utils.treeUtils.getTreeTasks("python", 2);
        await teWrapper.storage.update(Strings.FAV_TASKS_STORE, [
            utils.getSpecialTaskItemId(batch[0]), utils.getSpecialTaskItemId(batch[1]), utils.getSpecialTaskItemId(ant[0]),
            utils.getSpecialTaskItemId(bash[0]), utils.getSpecialTaskItemId(python[0]), utils.getSpecialTaskItemId(python[1])
        ]);
        await executeSettingsUpdate("specialFolders.showFavorites", false, tc.waitTime.config.event);
        await executeSettingsUpdate("specialFolders.showFavorites", true, tc.waitTime.config.event);
        utils.endRollingCount(this);
    });


    test("Remove from Favorites", async function()
    {
        if (utils.exitRollingCount(this)) return;
        this.slow(tc.slowTime.commands.standard * 6);
        await executeTeCommand2("addRemoveFavorite", [ batch[0] ]);
        await executeTeCommand2("addRemoveFavorite", [ batch[1] ]);
        await executeTeCommand2("addRemoveFavorite", [ ant[0] ]);
        await executeTeCommand2("addRemoveFavorite", [ bash[0] ]);
        await executeTeCommand2("addRemoveFavorite", [ python[0] ]);
        await executeTeCommand2("addRemoveFavorite", [ python[1] ]);
        utils.endRollingCount(this);
    });


    test("Show Last Tasks", async function()
    {
        if (utils.exitRollingCount(this)) return;
        this.slow((tc.slowTime.config.showHideSpecialFolder * 2) + (tc.waitTime.config.event * 2) + (tc.slowTime.getTreeTasks * 2));
        ant = await utils.treeUtils.getTreeTasks("ant", 3);
        batch = await utils.treeUtils.getTreeTasks("batch", 2);
        await teWrapper.storage.update(Strings.LAST_TASKS_STORE, [
            utils.getSpecialTaskItemId(batch[0]), utils.getSpecialTaskItemId(batch[1]), utils.getSpecialTaskItemId(ant[0]),
            utils.getSpecialTaskItemId(bash[0]), utils.getSpecialTaskItemId(python[0]), utils.getSpecialTaskItemId(python[1])
        ]);
        await executeSettingsUpdate("specialFolders.showLastTasks", false, tc.waitTime.config.event);
        await executeSettingsUpdate("specialFolders.showLastTasks", true, tc.waitTime.config.event);
        utils.endRollingCount(this);
    });


    test("Add to Favorites", async function()
    {
        if (utils.exitRollingCount(this)) return;
        this.slow(tc.slowTime.commands.standard * 13);
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
        utils.endRollingCount(this);
    });


    test("Add Custom Label 1", async function()
    {
console.log("AAA");
        if (utils.exitRollingCount(this)) return;
        this.slow(tc.slowTime.commands.standard);
        const taskTree = teWrapper.treeManager.getTaskTree();
        if(taskTree)
        {
            const sFolder= taskTree[0].label === Strings.FAV_TASKS_LABEL ? taskTree[0] as SpecialTaskFolder :
                            (taskTree[1].label === Strings.FAV_TASKS_LABEL ? taskTree[1] as SpecialTaskFolder : null);
            if (sFolder)
            {
                cstItem1 = sFolder.taskFiles.find(t => sFolder.getTaskItemId(t) === batch[0].id);
                if (cstItem1)
                {
                    utils.overrideNextShowInputBox("Label 1");
                    const removed = await executeTeCommand2("addRemoveCustomLabel", [ cstItem1 ]);
                    if (removed) {
                        await executeTeCommand2("addRemoveCustomLabel", [ cstItem1 ]);
                    }
                }
            }
        }
        utils.endRollingCount(this);
    });


    test("Add Custom Label 2", async function()
    {
        if (utils.exitRollingCount(this)) return;
        this.slow(tc.slowTime.commands.standard);
        const taskTree = teWrapper.treeManager.getTaskTree();
        if(taskTree)
        {
            const sFolder= taskTree[0].label === Strings.FAV_TASKS_LABEL ? taskTree[0] as SpecialTaskFolder :
                            (taskTree[1].label === Strings.FAV_TASKS_LABEL ? taskTree[1] as SpecialTaskFolder : null);
            if (sFolder)
            {
                cstItem2 = sFolder.taskFiles.find(t => sFolder.getTaskItemId(t) === batch[1].id);
                if (cstItem2)
                {
                    utils.overrideNextShowInputBox("Label 2");
                    const removed = await executeTeCommand2("addRemoveCustomLabel", [ cstItem2 ]);
                    if (removed) {
                        await executeTeCommand2("addRemoveCustomLabel", [ cstItem2 ]);
                    }
                }
            }
        }
        utils.endRollingCount(this);
    });


    test("Add Custom Label 3", async function()
    {
        if (utils.exitRollingCount(this)) return;
        this.slow(tc.slowTime.commands.standard);
        const taskTree = teWrapper.treeManager.getTaskTree();
        if(taskTree)
        {
            const sFolder= taskTree[0].label === Strings.FAV_TASKS_LABEL ? taskTree[0] as SpecialTaskFolder :
                            (taskTree[1].label === Strings.FAV_TASKS_LABEL ? taskTree[1] as SpecialTaskFolder : null);
            if (sFolder)
            {
                cstItem3 = sFolder.taskFiles.find(t => sFolder.getTaskItemId(t) === bash[0].id);
                if (cstItem3)
                {
                    utils.overrideNextShowInputBox("Label 3");
                    const removed = await executeTeCommand2("addRemoveCustomLabel", [ cstItem3 ]);
                    if (removed) {
                        await executeTeCommand2("addRemoveCustomLabel", [ cstItem3 ]);
                    }
                }
            }
        }
        utils.endRollingCount(this);
    });


    test("Add Custom Label 4", async function()
    {
        if (utils.exitRollingCount(this)) return;
        this.slow(tc.slowTime.commands.standard);
        const taskTree = teWrapper.treeManager.getTaskTree();
        if(taskTree)
        {
            const sFolder= taskTree[0].label === Strings.FAV_TASKS_LABEL ? taskTree[0] as SpecialTaskFolder :
                            (taskTree[1].label === Strings.FAV_TASKS_LABEL ? taskTree[1] as SpecialTaskFolder : null);
            if (sFolder)
            {
                cstItem4 = sFolder.taskFiles.find(t => sFolder.getTaskItemId(t) === python[0].id);
                if (cstItem4)
                {
                    utils.overrideNextShowInputBox("Label 4");
                    const removed = await executeTeCommand2("addRemoveCustomLabel", [ cstItem4 ]);
                    if (removed) {
                        await executeTeCommand2("addRemoveCustomLabel", [ cstItem4 ]);
                    }
                }
            }
        }
        utils.endRollingCount(this);
    });


    test("Add Custom Label 5", async function()
    {
        if (utils.exitRollingCount(this)) return;
        this.slow(tc.slowTime.commands.standard);
        const taskTree = teWrapper.treeManager.getTaskTree();
        if(taskTree)
        {
            const sFolder= taskTree[0].label === Strings.FAV_TASKS_LABEL ? taskTree[0] as SpecialTaskFolder :
                            (taskTree[1].label === Strings.FAV_TASKS_LABEL ? taskTree[1] as SpecialTaskFolder : null);
            if (sFolder)
            {
                cstItem5 = sFolder.taskFiles.find(t => sFolder.getTaskItemId(t) === python[1].id);
                if (cstItem5)
                {
                    utils.overrideNextShowInputBox("Label 5");
                    const removed = await executeTeCommand2("addRemoveCustomLabel", [ cstItem5 ]);
                    if (removed) {
                        await executeTeCommand2("addRemoveCustomLabel", [ cstItem5 ]);
                    }
                }
            }
        }
        utils.endRollingCount(this);
    });


    test("Add Custom Label 6", async function()
    {
        if (utils.exitRollingCount(this)) return;
        this.slow(tc.slowTime.commands.standard);
        const taskTree = teWrapper.treeManager.getTaskTree();
        if (taskTree)
        {
            const sFolder= taskTree[0].label === Strings.FAV_TASKS_LABEL ? taskTree[0] as SpecialTaskFolder :
                            (taskTree[1].label === Strings.FAV_TASKS_LABEL ? taskTree[1] as SpecialTaskFolder : null);
            if (sFolder)
            {
                cstItem6 = sFolder.taskFiles.find(t => sFolder.getTaskItemId(t) === ant[0].id);
                if (cstItem6)
                {
                    utils.overrideNextShowInputBox("Label 6");
                    const removed = await executeTeCommand2("addRemoveCustomLabel", [ cstItem6 ]);
                    if (removed) {
                        await executeTeCommand2("addRemoveCustomLabel", [ cstItem6 ]);
                    }
                }
            }
        }
        utils.endRollingCount(this);
    });


    test("Remove Custom Label 1", async function()
    {
        if (utils.exitRollingCount(this)) return;
        if (cstItem1) {
            this.slow(tc.slowTime.commands.standard);
            await executeTeCommand2("addRemoveCustomLabel", [ cstItem1 ]);
        }
        utils.endRollingCount(this);
    });


    test("Remove Custom Label 2", async function()
    {
        if (utils.exitRollingCount(this)) return;
        if (cstItem2) {
            this.slow(tc.slowTime.commands.standard);
            await executeTeCommand2("addRemoveCustomLabel", [ cstItem2 ]);
        }
        utils.endRollingCount(this);
    });


    test("Remove Custom Label 3", async function()
    {
        if (utils.exitRollingCount(this)) return;
        if (cstItem3) {
            this.slow(tc.slowTime.commands.standard);
            await executeTeCommand2("addRemoveCustomLabel", [ cstItem3 ]);
        }
        utils.endRollingCount(this);
    });


    test("Remove Custom Label 4", async function()
    {
        if (utils.exitRollingCount(this)) return;
        if (cstItem4) {
            this.slow(tc.slowTime.commands.standard);
            await executeTeCommand2("addRemoveCustomLabel", [ cstItem4 ]);
        }
        utils.endRollingCount(this);
    });


    test("Remove Custom Label 5", async function()
    {
        if (utils.exitRollingCount(this)) return;
        if (cstItem5) {
            this.slow(tc.slowTime.commands.standard);
            await executeTeCommand2("addRemoveCustomLabel", [ cstItem5 ]);
        }
        utils.endRollingCount(this);
    });


    test("Remove Custom Label 6", async function()
    {
        if (utils.exitRollingCount(this)) return;
        if (cstItem6) {
            this.slow(tc.slowTime.commands.standard);
            await executeTeCommand2("addRemoveCustomLabel", [ cstItem6 ]);
        }
        utils.endRollingCount(this);
    });


    test("Cancel Add Custom Label", async function()
    {
        if (utils.exitRollingCount(this)) return;
        this.slow((tc.slowTime.commands.standard * 3) + (tc.waitTime.command * 3));
        utils.overrideNextShowInputBox(undefined);
        await executeTeCommand2("addRemoveCustomLabel", [ cstItem1 ]);
        //
        // There's come kind of timing issue I havent figured out yet, send a few to make sure we hit
        //
        utils.clearOverrideShowInputBox();
        utils.overrideNextShowInputBox(undefined);
        await executeTeCommand2("addRemoveCustomLabel", [ cstItem2 ]);
        //
        utils.clearOverrideShowInputBox();
        utils.overrideNextShowInputBox(undefined);
        await executeTeCommand2("addRemoveCustomLabel", [ cstItem3 ]);
        utils.endRollingCount(this);
    });


    test("Hide Favorites", async function()
    {
        if (utils.exitRollingCount(this)) return;
        this.slow((tc.slowTime.config.showHideSpecialFolder * 2) + (tc.waitTime.config.event  * 2));
        await executeSettingsUpdate("specialFolders.showFavorites", false, tc.waitTime.config.showHideSpecialFolder);
        await executeSettingsUpdate("specialFolders.showFavorites", true, tc.waitTime.config.showHideSpecialFolder);
        utils.endRollingCount(this);
    });


    test("Hide Last Tasks", async function()
    {
        if (utils.exitRollingCount(this)) return;
        this.slow(tc.slowTime.config.showHideSpecialFolder);
        await executeSettingsUpdate("specialFolders.showLastTasks", false, tc.waitTime.config.showHideSpecialFolder);
        utils.endRollingCount(this);
    });


    test("Show Favorites", async function()
    {
        if (utils.exitRollingCount(this)) return;
        this.slow(tc.slowTime.config.showHideSpecialFolder);
        await executeSettingsUpdate("specialFolders.showFavorites", true, tc.waitTime.config.showHideSpecialFolder);
        utils.endRollingCount(this);
    });


    test("Show Last Tasks", async function()
    {
        if (utils.exitRollingCount(this)) return;
        this.slow(tc.slowTime.config.showHideSpecialFolder);
        await executeSettingsUpdate("specialFolders.showLastTasks", true, tc.waitTime.config.showHideSpecialFolder);
        utils.endRollingCount(this);
    });


    test("Show Favorite Tasks w/ Last Tasks", async function()
    {
        if (utils.exitRollingCount(this)) return;
        this.slow((tc.slowTime.config.showHideSpecialFolder * 4));
        await executeSettingsUpdate("specialFolders.showLastTasks", false, tc.waitTime.config.showHideSpecialFolder);
        await executeSettingsUpdate("specialFolders.showLastTasks", true, tc.waitTime.config.showHideSpecialFolder);
        await executeSettingsUpdate("specialFolders.showFavorites", false, tc.waitTime.config.showHideSpecialFolder);
        await executeSettingsUpdate("specialFolders.showFavorites", true, tc.waitTime.config.showHideSpecialFolder);
        utils.endRollingCount(this);
    });


    test("Show Favorite Tasks Only", async function()
    {
        if (utils.exitRollingCount(this)) return;
        this.slow(tc.slowTime.config.showHideSpecialFolder);
        await executeSettingsUpdate("specialFolders.showLastTasks", false, tc.waitTime.config.showHideSpecialFolder);
        utils.endRollingCount(this);
    });


    test("Hide Favorite and Last Tasks", async function()
    {
        if (utils.exitRollingCount(this)) return;
        this.slow((tc.slowTime.config.showHideSpecialFolder * 2));
        await executeSettingsUpdate("specialFolders.showLastTasks", false, tc.waitTime.config.showHideSpecialFolder);
        await executeSettingsUpdate("specialFolders.showFavorites", false, tc.waitTime.config.showHideSpecialFolder);
        utils.endRollingCount(this);
    });


    test("Show Favorite Tasks", async function()
    {
        if (utils.exitRollingCount(this)) return;
        this.slow(tc.slowTime.config.showHideSpecialFolder);
        await executeSettingsUpdate("specialFolders.showFavorites", true, tc.waitTime.config.showHideSpecialFolder);
        utils.endRollingCount(this);
    });


    test("Show Last Tasks", async function()
    {
        if (utils.exitRollingCount(this)) return;
        this.slow(tc.slowTime.config.showHideSpecialFolder);
        await executeSettingsUpdate("specialFolders.showLastTasks", true, tc.waitTime.config.showHideSpecialFolder);
        utils.endRollingCount(this);
    });


    test("Hide User tasks", async function()
    {
        if (utils.exitRollingCount(this)) return;
        this.slow(tc.slowTime.config.showHideUserTasks);
        await executeSettingsUpdate("specialFolders.showUserTasks", false, tc.waitTime.config.showHideUserTasks);
        utils.endRollingCount(this);
    });


    test("Clear Special Folders", async function()
    {
        if (utils.exitRollingCount(this)) return;
        utils.clearOverrideShowInfoBox();
        this.slow(tc.slowTime.commands.standard * 4);
        utils.overrideNextShowInfoBox("No");
        await executeTeCommand("clearLastTasks");
        utils.overrideNextShowInfoBox("No");
        await executeTeCommand("clearFavorites");
        utils.overrideNextShowInfoBox("Yes");
        await executeTeCommand("clearLastTasks");
        utils.overrideNextShowInfoBox("Yes");
        await executeTeCommand("clearFavorites");
        utils.endRollingCount(this);
    });


    test("Reveal API", async function()
    {
        if (utils.exitRollingCount(this)) return;
        const taskTree = teWrapper.treeManager.getTaskTree() as TaskFolder[];
        expect(explorer.getParent(taskTree[0])).to.be.null; // Last Tasks
        expect(explorer.getParent(taskTree[1])).to.be.null; // Last Tasks
        expect(explorer.getParent(taskTree[2])).to.be.null; // Project Folder
        expect(explorer.getParent(batch[0])).to.not.be.null;
        expect(explorer.getParent(batch[0].taskFile)).to.not.be.null;
        expect(await teWrapper.explorer.getChildren(taskTree[2]).taskFiles[0]).to.not.be.null;
        expect(await teWrapper.explorer.getChildren(taskTree[2]).taskFiles[1]).to.not.be.null;
        expect(explorer.getName()).to.be.oneOf([ "taskExplorer", "taskExplorerSideBar" ]);
        utils.endRollingCount(this);
    });


    test("Project Folder State Collapsed", async function()
    {
        if (utils.exitRollingCount(this)) return;
        this.slow((tc.slowTime.config.event * 2) + tc.slowTime.commands.refreshNoChanges);
        await executeSettingsUpdate("specialFolders.folderState.project1", "Collapsed");
        await teWrapper.treeManager.refresh(undefined, undefined, "");
        await executeSettingsUpdate("specialFolders.folderState.project1", "Expanded");
        utils.endRollingCount(this);
    });


    test("Folder Sort Type Explorer Order", async function()
    {
        if (utils.exitRollingCount(this)) return;
        this.slow(tc.slowTime.config.sortingEvent);
        await executeSettingsUpdate("sortProjectFoldersAlpha", false, tc.waitTime.config.sortingEvent);
        utils.endRollingCount(this);
    });


    test("Folder Sort Type Alphabetic Order", async function()
    {
        if (utils.exitRollingCount(this)) return;
        this.slow(tc.slowTime.config.sortingEvent);
        await executeSettingsUpdate("sortProjectFoldersAlpha", true, tc.waitTime.config.sortingEvent);
        utils.endRollingCount(this);
    });


    test("Misc Sort Folders", function()
    {
        if (utils.exitRollingCount(this)) return;
        let map: IDictionary<TaskFolder>= {};
        map.frank = new TaskFolder("frank");
        map["richard face"] = new TaskFolder("richard face");
        map.bob = new TaskFolder("bob");
        map.scott = new TaskFolder("maurice");
        map[Strings.FAV_TASKS_LABEL] = new TaskFolder(Strings.FAV_TASKS_LABEL);
        map.chris = new TaskFolder("chris");
        map.maurice = new TaskFolder("maurice");
        map[Strings.USER_TASKS_LABEL] = new TaskFolder(Strings.USER_TASKS_LABEL);
        map[Strings.LAST_TASKS_LABEL] = new TaskFolder(Strings.LAST_TASKS_LABEL);
        map.peter = new TaskFolder("peter");
        map.larry = new TaskFolder("larry");
        map.mike = new TaskFolder("maurice");
        sortFolders(map);
        map = {};
        map.Zoo = new TaskFolder("onetwothree");
        map[Strings.USER_TASKS_LABEL] = new TaskFolder(Strings.USER_TASKS_LABEL);
        map.OMG = new TaskFolder("if i was");
        map[Strings.LAST_TASKS_LABEL] = new TaskFolder(Strings.LAST_TASKS_LABEL);
        map["Andrew was here"] = new TaskFolder("tasks4");
        map["maya and sierra"] = new TaskFolder("tasks5");
        map["front DOOR"] = new TaskFolder("Christmas");
        map["change folder"] = new TaskFolder("what");
        map[Strings.FAV_TASKS_LABEL] = new TaskFolder(Strings.FAV_TASKS_LABEL);
        map["extremely tired"] = new TaskFolder("tired1");
        map.tired = new TaskFolder("tired2");
        map["dozing off"] = new TaskFolder("doze");
        sortFolders(map);
        map = {};
        map.Zoo = new TaskFolder("onetwothree");
        map.OMG = new TaskFolder("if i was");
        map[Strings.FAV_TASKS_LABEL] = new TaskFolder(Strings.FAV_TASKS_LABEL);
        map[Strings.LAST_TASKS_LABEL] = new TaskFolder(Strings.LAST_TASKS_LABEL);
        map["Andrew was here"] = new TaskFolder("tasks4");
        map["maya and sierra"] = new TaskFolder("tasks5");
        map["front DOOR"] = new TaskFolder("Christmas");
        map["change folder"] = new TaskFolder("what");
        map["extremely tired"] = new TaskFolder("tired1");
        map.tired = new TaskFolder("tired2");
        map["dozing off"] = new TaskFolder("doze");
        map[Strings.USER_TASKS_LABEL] = new TaskFolder(Strings.USER_TASKS_LABEL);
        sortFolders(map);
        map = {};
        map.Zoo = new TaskFolder("onetwothree");
        map.OMG = new TaskFolder("if i was");
        map[Strings.USER_TASKS_LABEL] = new TaskFolder(Strings.USER_TASKS_LABEL);
        map[Strings.FAV_TASKS_LABEL] = new TaskFolder(Strings.FAV_TASKS_LABEL);
        map[Strings.LAST_TASKS_LABEL] = new TaskFolder(Strings.LAST_TASKS_LABEL);
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
        map[Strings.FAV_TASKS_LABEL] = new TaskFolder(Strings.FAV_TASKS_LABEL);
        map[Strings.USER_TASKS_LABEL] = new TaskFolder(Strings.USER_TASKS_LABEL);
        map[Strings.LAST_TASKS_LABEL] = new TaskFolder(Strings.LAST_TASKS_LABEL);
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
        map[Strings.FAV_TASKS_LABEL] = new TaskFolder(Strings.FAV_TASKS_LABEL);
        map[Strings.LAST_TASKS_LABEL] = new TaskFolder(Strings.LAST_TASKS_LABEL);
        map[Strings.USER_TASKS_LABEL] = new TaskFolder(Strings.USER_TASKS_LABEL);
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
        map[Strings.LAST_TASKS_LABEL] = new TaskFolder(Strings.LAST_TASKS_LABEL);
        map[Strings.FAV_TASKS_LABEL] = new TaskFolder(Strings.FAV_TASKS_LABEL);
        map[Strings.USER_TASKS_LABEL] = new TaskFolder(Strings.USER_TASKS_LABEL);
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
        map[Strings.USER_TASKS_LABEL] = new TaskFolder(Strings.USER_TASKS_LABEL);
        map[Strings.LAST_TASKS_LABEL] = new TaskFolder(Strings.LAST_TASKS_LABEL);
        map[Strings.FAV_TASKS_LABEL] = new TaskFolder(Strings.FAV_TASKS_LABEL);
        map["Andrew was here"] = new TaskFolder("tasks4");
        map["maya and sierra"] = new TaskFolder("tasks5");
        map["front DOOR"] = new TaskFolder("Christmas");
        map["change folder"] = new TaskFolder("what");
        map["extremely tired"] = new TaskFolder("tired1");
        map.tired = new TaskFolder("tired2");
        map["dozing off"] = new TaskFolder("doze");
        sortFolders(map);
        map = {};
        map[Strings.LAST_TASKS_LABEL] = new TaskFolder(Strings.LAST_TASKS_LABEL);
        map[""] = new TaskFolder("onetwothree");
        map.OMG = new TaskFolder("if i was");
        map["Andrew was here"] = new TaskFolder("");
        map[Strings.FAV_TASKS_LABEL] = new TaskFolder(Strings.FAV_TASKS_LABEL);
        map["maya and sierra"] = new TaskFolder("tasks5");
        map["front DOOR"] = new TaskFolder("");
        map[Strings.USER_TASKS_LABEL] = new TaskFolder(Strings.USER_TASKS_LABEL);
        map[""] = new TaskFolder("what");
        map["extremely tired"] = new TaskFolder("tired1");
        map.tired = new TaskFolder("tired2");
        map["dozing off"] = new TaskFolder("doze");
        sortFolders(map);
        utils.endRollingCount(this);
    });

});
