/* eslint-disable import/no-extraneous-dependencies */

import * as assert from "assert";
import * as utils from "./utils";
import TaskItem from "../../tree/item";
import TaskFile from "../../tree/file";
import TaskFolder from "../../tree/folder";
import { isObjectEmpty } from "../../lib/utils/utils";
import { ITaskItem, TaskMap } from "@spmeesseman/vscode-taskexplorer-types";

let didSetGroupLevel = false;

/**
 * Pretty much mimics the tree construction in cases when we want to construct it
 * when the tree view is collapsed and not updating automatically via GUI events.
 * Once the view/shelf is focused/opened somewhere within the running tests, there'd
 * be no need to call this function anymore.
 *
 * @param instance The test instance to set the timeout and slow time on.
 */
export const refresh = async(instance?: any) =>
{
    const teApi = utils.getTeApi(),
          tc = utils.testControl;
    if (instance) {
        instance.slow(tc.slowTime.refreshCommand + tc.waitTime.refreshCommand +
                      (tc.waitTime.min * 2) + (!didSetGroupLevel ? (tc.slowTime.config.groupingEvent * 2) : 0));
        instance.timeout((tc.slowTime.refreshCommand  * 2) + (!didSetGroupLevel ? (tc.slowTime.config.groupingEvent * 2) : 0) + (tc.waitTime.min * 2));
    }
    if (!didSetGroupLevel)
    {
        await utils.executeSettingsUpdate("groupWithSeparator", true, tc.waitTime.config.groupingEvent);
        await utils.executeSettingsUpdate("groupMaxLevel", 5, tc.waitTime.config.groupingEvent);
        await utils.waitForTeIdle(tc.waitTime.min);
        didSetGroupLevel = true;
    }
    await utils.executeTeCommand("refresh", tc.waitTime.refreshCommand);
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
    const teApi = utils.getTeApi(),
          figures = utils.figures,
          tc = utils.testControl,
          taskItems: ITaskItem[] = [];

    const _getTaskMap = async(retries: number) =>
    {
        let taskMap = teApi.testsApi.explorer.getTaskMap();

        if (!taskMap || isObjectEmpty(taskMap) || !findIdInTaskMap(`:${taskType}:`, taskMap))
        {
            await utils.waitForTeIdle(tc.waitTime.getTreeMin, tc.waitTime.getTreeMax);
            taskMap = teApi.testsApi.explorer.getTaskMap();
        }

        if (!taskMap || isObjectEmpty(taskMap) || !findIdInTaskMap(`:${taskType}:`, taskMap))
        {
            if (retries === 0) {
                console.log(`    ${figures.color.warning} ${figures.withColor("Task map is empty, fall back to walkTreeItems", figures.colors.grey)}`);
            }
            if (retries % 10 === 0)
            {
                taskMap = await walkTreeItems(undefined);
            }
            if (!taskMap || isObjectEmpty(taskMap))
            {
                if (retries === 40) {
                    console.log(`    ${figures.color.error} ${figures.withColor("Task map is empty, test will fail in 3, 2, 1...", figures.colors.grey)}`);
                }
                else {
                    await utils.sleep(250);
                    taskMap = await _getTaskMap(++retries);
                }
            }
        }

        return taskMap || {} as TaskMap;
    };

    const taskMap = await _getTaskMap(0);
    const taskCount = taskMap ? findIdInTaskMap(`:${taskType}:`, taskMap) : 0;
    if (taskCount !== expectedCount)
    {
        console.log(`    ${figures.color.warning} ${figures.withColor("Task map is empty.", figures.colors.grey)}`);
        console.log(figures.withColor(`    ${figures.color.warning} TaskMap files:\n    ${figures.color.warning}    ` +
                    Object.keys(taskMap).join(`\n    ${figures.color.warning}    `), figures.colors.grey));
        assert.fail(`${figures.color.error} Unexpected ${taskType} task count (Found ${taskCount} of ${expectedCount})`);
    }

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
    const teApi = utils.getTeApi(),
          figures = utils.figures,
          taskMap: TaskMap = {},
          now = Date.now();
    let done = false;

    let treeItems = await teApi.testsApi.explorer.getChildren();
    if (!treeItems || treeItems.length === 0)
    {
        console.log(`    ${figures.color.warning} ${figures.withColor("No tree items!", figures.colors.grey)}`);
        if (Date.now() - now < 500) {
            console.log(`    ${figures.warning} ${figures.withColor("Trying again..." , figures.colors.grey)}`);
            treeItems = await teApi.testsApi.explorer.getChildren();
        }
        if (!treeItems || treeItems.length === 0) {
            console.log(`    ${figures.color.error} No tree items!!`);
            return taskMap;
        }
    }

    const processItem2g = async (pItem2: TaskFile) =>
    {
        const treeFiles = await teApi.testsApi.explorer.getChildren(pItem2);
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
        const treeTasks = await teApi.testsApi.explorer.getChildren(pItem2);
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
                        await utils.executeTeCommand2("open", [ item3 ], 5);
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
        const treeFiles = await teApi.testsApi.explorer.getChildren(pItem);
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

    for (const item of treeItems.filter(i => i instanceof TaskFolder))
    {
        // let isFav = false, isLast = false, isUser = false;
        // isFav = (item.label as string).includes(constants.FAV_TASKS_LABEL);
        // isLast = (item.label as string).includes(constants.LAST_TASKS_LABEL);
        // isUser = (item.label as string).includes(constants.USER_TASKS_LABEL);
        await processItem(item);
    }

    return taskMap;
};


export const verifyTaskCountByTree = async(taskType: string, expectedCount: number, taskMap?: TaskMap) =>
{
    const figures = utils.figures,
          tasksMap = (taskMap || (await walkTreeItems(undefined))),
    // const tasksMap = (teApi.explorer as ITaskExplorer).getTaskMap(),
            taskCount = findIdInTaskMap(`:${taskType}:`, tasksMap);
    assert(taskCount === expectedCount, `${figures.color.error} Unexpected ${taskType} task count (Found ${taskCount} of ${expectedCount})`);
};
