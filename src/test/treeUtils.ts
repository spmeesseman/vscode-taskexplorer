/* eslint-disable import/no-extraneous-dependencies */

import { commands, window } from "vscode";
import constants from "../lib/constants";
import TaskItem from "../tree/item";
import TaskFile from "../tree/file";
import TaskFolder from "../tree/folder";
import { isWorkspaceFolder } from "../lib/utils/utils";
import { ITaskExplorerApi, TaskMap } from "@spmeesseman/vscode-taskexplorer-types";
import { executeSettingsUpdate, executeTeCommand2, testsControl } from "./helper";
import { log } from "console";

export default class TreeUtils
{

    private teApi: ITaskExplorerApi;


    constructor(api: ITaskExplorerApi)
    {
        this.teApi = api;
    }


    /**
     * Pretty much mimics the tree construction in cases when we want to construct it
     * when the tree view is collapsed and not updating automatically via GUI events.
     * Once the view/shelf is focused/opened somewhere within the running tests, there'd
     * be no need to call this function anymore.
     *
     * @param instance The test instance to set the timeout and slow time on.
     */
    async buildTree(instance: any)
    {
        instance.slow(20000);
        instance.timeout(30000);

        await executeSettingsUpdate("groupWithSeparator", true);
        await executeSettingsUpdate("groupMaxLevel", 5);

        //
        // A special refresh() for test suite, will open all task files and open to position
        //
        await this.teApi.explorer?.refresh("tests");
        await this.teApi.waitForIdle(testsControl.waitTimeForBuildTree);
        // this.teApi.explorer?.getTaskMap();
        // return this.teApi.explorer?.getChildren();
    }


    // async getTreeItem(taskId: string): Promise<TaskItem | undefined>
    // {
    //     return this.teApi.explorer?.getTaskMap()[taskId];
    // }


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
    async walkTreeItems(taskId: string | undefined, executeOpenForTests = false): Promise<TaskMap>
    {
        const taskMap: TaskMap = {};
        let done = false;
        if (!this.teApi.explorer) {
            return taskMap;
        }
        const teExplorer = this.teApi.explorer;

        const treeItems = await this.teApi.explorer.getChildren(undefined, "", 5);
        if (!treeItems || treeItems.length === 0)
        {
            window.showInformationMessage("No tasks found!");
            return taskMap;
        }

        const processItem2g = async (pItem2: TaskFile) =>
        {
            const treeFiles: any[] = await teExplorer.getChildren(pItem2, "", 5);
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
            const treeTasks: any[] = await teExplorer.getChildren(pItem2, "", 5);
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
            const treeFiles = await teExplorer.getChildren(pItem, "", 5);
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
                let isFav = false, isLast = false, isUser = false;
                isFav = (item.label as string).includes(constants.FAV_TASKS_LABEL);
                isLast = (item.label as string).includes(constants.LAST_TASKS_LABEL);
                isUser = (item.label as string).includes(constants.USER_TASKS_LABEL);
                await processItem(item);
            }
        }

        return taskMap;
    }
}
