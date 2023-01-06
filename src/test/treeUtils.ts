/* eslint-disable import/no-extraneous-dependencies */

import * as assert from "assert";
import constants from "../lib/constants";
import TaskItem from "../tree/item";
import TaskFile from "../tree/file";
import TaskFolder from "../tree/folder";
import { isObjectEmpty } from "../lib/utils/utils";
import { IExplorerApi, ITaskExplorerApi, TaskMap } from "@spmeesseman/vscode-taskexplorer-types";
import { executeSettingsUpdate, executeTeCommand2, figures, getTeApi, testControl } from "./helper";

let treeBuiltOnce = false;


/**
 * Pretty much mimics the tree construction in cases when we want to construct it
 * when the tree view is collapsed and not updating automatically via GUI events.
 * Once the view/shelf is focused/opened somewhere within the running tests, there'd
 * be no need to call this function anymore.
 *
 * @param instance The test instance to set the timeout and slow time on.
 */
export const buildTree = async(instance: any,  rebuild?: boolean) =>
{
    const teApi = getTeApi();

    if (rebuild || !treeBuiltOnce)
    {
        instance.slow(20000);
        instance.timeout(30000);

        await executeSettingsUpdate("groupWithSeparator", true);
        await executeSettingsUpdate("groupMaxLevel", 5);

        //
        // A special refresh() for test suite, will open all task files and open to position
        //
        await teApi.explorer?.refresh("tests");
    }
    await teApi.waitForIdle(testControl.waitTimeForBuildTree);
    // teApi.explorer?.getTaskMap();
    // return teApi.explorer?.getChildren();
    treeBuiltOnce = true;
};


export const findIdInTaskMap = (id: string, taskMap: TaskMap) =>
{
    let found = 0;
    Object.values(taskMap).forEach((taskItem) =>
    {
        if (taskItem)
        {
            if (taskItem.id?.includes(id) && !taskItem.isUser) {
                if (taskItem.id === ":ant") {
                    console.error("ant: " + taskItem.resourceUri?.fsPath);
                }
                found++;
            }
        }
    });
    return found;
};


// async getTreeItem(taskId: string): Promise<TaskItem | undefined>
// {
//     return rteApi.explorer?.getTaskMap()[taskId];
// }


export const getTreeTasks = async(taskType: string, expectedCount: number) =>
{
    const teApi = getTeApi();
    const taskItems: TaskItem[] = [];
    //
    // Get the task mapped tree items
    //
    let taskMap = teApi.testsApi.explorer.getTaskMap();
    if (!taskMap || isObjectEmpty(taskMap)) {
        console.log(`    ${figures.warning} Task map is empty, fall back to walkTreeItems`);
        taskMap = await walkTreeItems(undefined);
        if (!taskMap || isObjectEmpty(taskMap)) {
            console.log(`    ${figures.error} Task map is empty, test will fail in 3, 2, 1...`);
        }
    }
    //
    // Make sure the tasks have been mapped in the explorer tree
    //
    const taskCount = taskMap ? findIdInTaskMap(`:${taskType}:`, taskMap) : 0;
    if (taskCount !== expectedCount) {
        assert.fail(`${figures.error} Unexpected ${taskType} task count (Found ${taskCount} of ${expectedCount})`);
    }
    //
    // Get the NPM tasks from the tree mappings
    //
    Object.values(taskMap).forEach((taskItem) =>
    {
        if (taskItem && taskItem.taskSource === taskType) {
            taskItems.push(taskItem);
        }
    });
    return taskItems;
};

/**
 * @method walkTreeItems
 *
 * For test suites.
 * Returns a flat mapped list of tree items, or the tre item specified by taskId.
 *
 * @param taskId Task ID
 * @param logPad Padding to prepend to log entries.  Should be a string of any # of space characters.
 * @param executeOpenForTests For running mocha tests only.
 */
export const walkTreeItems = async(taskId: string | undefined, executeOpenForTests = false) =>
{
    const teApi = getTeApi(),
         taskMap: TaskMap = {},
         now = Date.now();
    let done = false;

    let treeItems = await teApi.testsApi.explorer.getChildren(undefined, "", 5);
    if (!treeItems || treeItems.length === 0)
    {
        console.log(`    ${figures.warning} No tree items!`);
        if (Date.now() - now < 500) {
            console.log(`    ${figures.warning} Trying again...`);
            treeItems = await teApi.testsApi.explorer.getChildren(undefined, "", 5);
        }
        if (!treeItems || treeItems.length === 0) {
            console.log(`    ${figures.error} No tree items!!`);
            return taskMap;
        }
    }

    const processItem2g = async (pItem2: TaskFile) =>
    {
        const treeFiles = await teApi.testsApi.explorer.getChildren(pItem2, "", 5);
        if (treeFiles.length > 0)
        {
            for (const item2 of treeFiles)
            {
                if (done) {
                    break;
                }
                if (item2 instanceof TaskItem)
                {
                    await processItem2(item2);
                }
                else if (item2 instanceof TaskFile && item2.isGroup)
                {
                    await processItem2g(item2);
                }
                else if (item2 instanceof TaskFile && !item2.isGroup)
                {
                    await processItem2(item2);
                }
            }
        }
    };

    const processItem2 = async (pItem2: any) =>
    {
        const treeTasks = await teApi.testsApi.explorer.getChildren(pItem2, "", 5);
        if (treeTasks.length > 0)
        {
            for (const item3 of treeTasks)
            {
                if (done) {
                    break;
                }

                if (item3 instanceof TaskItem)
                {
                    if (executeOpenForTests) {
                        await executeTeCommand2("open", [ item3 ], 5);
                    }
                    if (item3.task && item3.task.definition)
                    {
                        if (item3.id) {
                            taskMap[item3.id] = item3;
                            if (taskId && taskId === item3.id) {
                                done = true;
                            }
                        }
                    }
                }
                else if (item3 instanceof TaskFile && item3.isGroup)
                {
                    await processItem2(item3);
                }
            }
        }
    };

    const processItem = async (pItem: any) =>
    {
        const treeFiles = await teApi.testsApi.explorer.getChildren(pItem, "", 5);
        if (treeFiles && treeFiles.length > 0)
        {
            for (const item2 of treeFiles)
            {
                if (done) {
                    break;
                }
                if (item2 instanceof TaskFile && !item2.isGroup)
                {
                    await processItem2(item2);
                }
                else if (item2 instanceof TaskFile && item2.isGroup)
                {
                    await processItem2g(item2);
                }
                else if (item2 instanceof TaskItem)
                {
                    await processItem2(item2);
                }
            }
        }
    };

    for (const item of treeItems)
    {
        if (item instanceof TaskFolder)
        {
            // let isFav = false, isLast = false, isUser = false;
            // isFav = (item.label as string).includes(constants.FAV_TASKS_LABEL);
            // isLast = (item.label as string).includes(constants.LAST_TASKS_LABEL);
            // isUser = (item.label as string).includes(constants.USER_TASKS_LABEL);
            await processItem(item);
        }
    }

    return taskMap;
};


export const verifyTaskCountByTree = async(taskType: string, expectedCount: number, taskMap?: TaskMap) =>
{
    const tasksMap = (taskMap || (await walkTreeItems(undefined))),
    // const tasksMap = (teApi.explorer as IExplorerApi).getTaskMap(),
            taskCount = findIdInTaskMap(`:${taskType}:`, tasksMap);
    assert(taskCount === expectedCount, `Unexpected ${taskType} task count (Found ${taskCount} of ${expectedCount})`);
};
