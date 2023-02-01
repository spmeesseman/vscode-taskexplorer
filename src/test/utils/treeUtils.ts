/* eslint-disable import/no-extraneous-dependencies */

import * as utils from "./utils";
import TaskItem from "../../tree/item";
import TaskFile from "../../tree/file";
import TaskFolder from "../../tree/folder";
import { expect } from "chai";
import { isObjectEmpty } from "../../lib/utils/utils";
import { ITaskItem, TaskMap } from "@spmeesseman/vscode-taskexplorer-types";
import { executeSettingsUpdate, executeTeCommand, executeTeCommand2 } from "./commandUtils";
import { Task } from "vscode";

let didRefresh = false;
let didSetGroupLevel = false;


export const hasRefreshed = () => didRefresh;


export const findIdInTaskMap = (id: string, taskMap: TaskMap) =>
{
    let found = 0;
    Object.values(taskMap).forEach((taskItem) =>
    {
        if (taskItem && taskItem.id?.includes(id) && !taskItem.isUser) {
            found++;
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
            await utils.waitForTeIdle(tc.waitTime.getTreeMin, 1600);
            taskMap = teApi.testsApi.explorer.getTaskMap();
        }

        if (!taskMap || isObjectEmpty(taskMap) || !findIdInTaskMap(`:${taskType}:`, taskMap))
        {
            if (retries === 0) {
                console.log(`    ${figures.color.warning} ${figures.withColor("Task map is empty, fall back to direct getChildren", figures.colors.grey)}`);
            }
            if (retries % 10 === 0)
            {
                await teApi.testsApi.explorer.getChildren();
                taskMap = teApi.testsApi.explorer.getTaskMap();
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
        expect.fail(`${figures.color.error} Unexpected ${taskType} task count (Found ${taskCount} of ${expectedCount})`);
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
 * Pretty much mimics the tree construction in cases when we want to construct it
 * when the tree view is collapsed and not updating automatically via GUI events.
 * Once the view/shelf is focused/opened somewhere within the running tests, there'd
 * be no need to call this function anymore.
 *
 * @param instance The test instance to set the timeout and slow time on.
 */
export const refresh = async(instance?: any) =>
{
    const tc = utils.testControl;
    if (instance)
    {
        instance.slow(tc.slowTime.refreshCommand +
                      (!didSetGroupLevel ? (tc.slowTime.config.groupingEvent * 2) : 0) +
                      (!didRefresh ? 1000 : 0));
        instance.timeout((tc.slowTime.refreshCommand  * 2) + (!didSetGroupLevel ? (tc.slowTime.config.groupingEvent * 2) : 0));
        if (!didSetGroupLevel)
        {
            // utils.getTeApi().testsApi.enableConfigWatcher(false);
            await executeSettingsUpdate("groupWithSeparator", true, tc.waitTime.config.groupingEvent);
            await executeSettingsUpdate("groupMaxLevel", 5, tc.waitTime.config.groupingEvent);
            // utils.getTeApi().testsApi.enableConfigWatcher(true);
            didSetGroupLevel = true;
        }
    }
    await executeTeCommand("refresh", tc.waitTime.refreshCommand);
    didRefresh = true;
};



export const verifyTaskCountByTree = async(taskType: string, expectedCount: number, taskMap?: TaskMap) =>
{
    let taskCount: number;

    const _getCount = async() =>
    {
        let tasksMap = taskMap;
        if (!tasksMap || isObjectEmpty(tasksMap)) {
            await utils.getTeApi().testsApi.explorer.getChildren();
            tasksMap = utils.getTeApi().testsApi.explorer.getTaskMap();
        }
          // const tasksMap = (teApi.explorer as ITaskExplorer).getTaskMap(),
        return findIdInTaskMap(`:${taskType}:`, tasksMap);
    };

    taskCount = await _getCount();
    if (taskCount !== expectedCount)
    {
        try {
            await utils.verifyTaskCount(taskType, expectedCount, 2);
            taskCount = await _getCount();
        }
        catch {}
    }

    expect(taskCount).to.be.equal(expectedCount, `${utils.figures.color.error} Unexpected ${taskType} task count (Found ${taskCount} of ${expectedCount})`);
};
