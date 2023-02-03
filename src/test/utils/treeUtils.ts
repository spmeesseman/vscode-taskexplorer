/* eslint-disable import/no-extraneous-dependencies */

import { expect } from "chai";
import { isObjectEmpty } from "../../lib/utils/utils";
import { ITaskItem, TaskMap } from "@spmeesseman/vscode-taskexplorer-types";
import { executeSettingsUpdate, executeTeCommand } from "./commandUtils";
import { figures, getTeApi, sleep, testControl as tc, verifyTaskCount, waitForTeIdle } from "./utils";

let didRefresh = false;
let didSetGroupLevel = false;


export const hasRefreshed = () => didRefresh;


export const findIdInTaskMap = (id: string, tMap: TaskMap) => Object.values(tMap).filter((t) => t && t.id?.includes(id) && !t.isUser).length;


export const getTreeTasks = async(taskType: string, expectedCount: number) =>
{
    const teApi = getTeApi(),
          taskItems: ITaskItem[] = [];

    const _getTaskMap = async(retries: number) =>
    {
        let taskMap = teApi.testsApi.treeManager.getTaskMap();

        if (!taskMap || isObjectEmpty(taskMap) || !findIdInTaskMap(`:${taskType}:`, taskMap))
        {
            await waitForTeIdle(150, 1600);
            taskMap = teApi.testsApi.treeManager.getTaskMap();
        }

        if (!taskMap || isObjectEmpty(taskMap) || !findIdInTaskMap(`:${taskType}:`, taskMap))
        {
            if (retries === 0) {
                console.log(`    ${figures.color.warning} ${figures.withColor("Task map is empty, retry", figures.colors.grey)}`);
            }
            if (retries % 10 === 0)
            {
                await refresh();
                taskMap = teApi.testsApi.treeManager.getTaskMap();
            }
            if (!taskMap || isObjectEmpty(taskMap))
            {
                if (retries === 40) {
                    console.log(`    ${figures.color.error} ${figures.withColor("Task map is empty, test will fail in 3, 2, 1...", figures.colors.grey)}`);
                }
                else {
                    await sleep(250);
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
    if (instance)
    {
        instance.slow(tc.slowTime.commands.refresh +
                      (!didSetGroupLevel ? (tc.slowTime.config.groupingEvent * 2) : 0) +
                      (!didRefresh ? 1000 : 0));
        instance.timeout((tc.slowTime.commands.refresh  * 2) + (!didSetGroupLevel ? (tc.slowTime.config.groupingEvent * 2) : 0));
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
    taskMap = taskMap || getTeApi().testsApi.treeManager.getTaskMap();
    const _getCount = async() =>
    {
        let tasksMap = taskMap;
        if (!tasksMap || isObjectEmpty(tasksMap)) {
            await refresh();
            tasksMap = getTeApi().testsApi.treeManager.getTaskMap();
        }
        return findIdInTaskMap(`:${taskType}:`, tasksMap);
    };
    let taskCount = await _getCount();
    if (taskCount !== expectedCount)
    {
        try {
            const msg = `Found ${taskCount} of ${expectedCount} expected tasks in Tree, trying 'Verify Task Count'`;
            console.log(`    ${figures.color.warning} ${figures.withColor(msg, figures.colors.grey)}`);
            taskCount = await verifyTaskCount(taskType, expectedCount, 2);
        }
        catch {}
    }
    expect(taskCount).to.be.equal(expectedCount, `${figures.color.error} Unexpected ${taskType} task count (Found ${taskCount} of ${expectedCount})`);
};
