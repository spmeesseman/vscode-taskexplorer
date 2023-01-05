
import * as log from "../lib/utils/log";
import { commands, window } from "vscode";
import { TaskMap } from "../interface";
import constants from "../lib/constants";
import { storage } from "../lib/utils/storage";
import TaskItem from "./item";
import TaskFile from "./file";
import { TaskTreeDataProvider } from "./tree";
import TaskFolder from "./folder";
import { isWorkspaceFolder } from "../lib/utils/utils";

export default class TreeUtils
{
    explorerName: string;
    explorer: TaskTreeDataProvider;


    constructor(name: "taskExplorer"|"taskExplorerSideBar", treeProvider: TaskTreeDataProvider)
    {
        this.explorer = treeProvider;
        this.explorerName = name;
    }


    async getTreeItem(taskId: string, logPad = "", logLevel = 1): Promise<TaskItem | undefined>
    {
        log.methodStart("Get task item from tree", logLevel, logPad, false, [[ "task id", taskId ?? "all tasks" ]]);
        const taskItems = await this.getTreeItems(taskId, logPad + "   ", false, logLevel);
        log.methodDone("Get task item(s) from tree", logLevel, logPad);
        return taskItems[taskId];
    }


    /**
     * @method getTaskItems
     *
     * Returns a flat mapped list of tree items, or the tre item specified by taskId.
     *
     * @param taskId Task ID
     * @param logPad Padding to prepend to log entries.  Should be a string of any # of space characters.
     * @param executeOpenForTests For running mocha tests only.
     */
    async getTreeItems(taskId: string | undefined, logPad = "", executeOpenForTests = false, logLevel = 1): Promise<TaskMap>
    {
        const me = this;
        const taskMap: TaskMap = {};
        let done = false;

        log.methodStart("Get task items from tree", logLevel, logPad, false, [[ "execute open", executeOpenForTests ]]);

        const treeItems = await this.explorer.getChildren(undefined, "   ", logLevel + 1);
        if (!treeItems || treeItems.length === 0)
        {
            window.showInformationMessage("No tasks found!");
            await storage.update(constants.FAV_TASKS_STORE, []);
            await storage.update(constants.LAST_TASKS_STORE, []);
            return taskMap;
        }

        const processItem2g = async (pItem2: TaskFile) =>
        {
            const treeFiles: any[] = await this.explorer.getChildren(pItem2, "   ", logLevel + 1);
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
                        log.write("        Task File (grouped): " + item2.path + item2.fileName, logLevel + 2);
                        await processItem2g(item2);
                    }
                    else if (item2 instanceof TaskFile && !item2.isGroup)
                    {
                        log.write("        Task File (grouped): " + item2.path + item2.fileName, logLevel + 2);
                        await processItem2(item2);
                    }
                }
            }
        };

        const processItem2 = async (pItem2: any) =>
        {
            const treeTasks: any[] = await this.explorer.getChildren(pItem2, "   ", logLevel + 1);
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
                            await commands.executeCommand(this.explorerName + ".open", [ item3 ]);
                        }
                        if (item3.task && item3.task.definition)
                        {
                            let tPath: string;

                            if (isWorkspaceFolder(item3)) {
                                tPath = item3.task.definition.uri ? item3.task.definition.uri.fsPath :
                                    (item3.task.definition.path ? item3.task.definition.path : "root");
                            }
                            else {
                                tPath = "root";
                            }

                            log.write(logPad + "   ✔ Processed " + item3.task.name, logLevel + 2);
                            log.value(logPad + "        id", item3.id, logLevel + 2);
                            log.value(logPad + "        type", item3.taskSource + " @ " + tPath, logLevel + 2);
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
            let tmp: any;
            const treeFiles: any[] = await this.explorer.getChildren(pItem, "   ", logLevel + 2);
            if (treeFiles.length > 0)
            {
                for (const item2 of treeFiles)
                {
                    if (done) {
                        break;
                    }
                    if (item2 instanceof TaskFile && !item2.isGroup)
                    {
                        log.write(logPad + "   Task File: " + item2.path + item2.fileName, logLevel + 2);
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
                log.write("   Task Folder " + item.label + ":  " + (!isFav && !isLast && !isUser ?
                            item.resourceUri?.fsPath : (isLast ? constants.LAST_TASKS_LABEL :
                            (isUser ? constants.USER_TASKS_LABEL : constants.FAV_TASKS_LABEL))), logLevel + 1, logPad);
                await processItem(item);
            }
        }

        log.methodDone("Get task item(s) from tree", logLevel, logPad, false, [
            [ "# of items found", Object.keys(taskMap).length ]
        ]);

        return taskMap;
    }
}
