
import log from "./log/log";
import TaskItem from "../tree/item";
import TaskFile from "../tree/file";
import TaskFolder from "../tree/folder";
import constants from "./constants";
import { IDictionary, ITaskFile, ITaskItem } from "../interface";



export const sortFolders = (folders: IDictionary<TaskFolder>): TaskFolder[] =>
{
    return [ ...Object.values(folders) ].sort((a: TaskFolder, b: TaskFolder) =>
    {
        if (a.label === constants.LAST_TASKS_LABEL) {
            return -1;
        }
        else if (b.label === constants.LAST_TASKS_LABEL) {
            return 1;
        }
        else if (a.label === constants.FAV_TASKS_LABEL) {
            return -1;
        }
        else if (b.label === constants.FAV_TASKS_LABEL) {
            return 1;
        }
        else if (a.label === constants.USER_TASKS_LABEL) {
            return -1;
        }
        else if (b.label === constants.USER_TASKS_LABEL) {
            return 1;
        }
        if (a.label && b.label) {
            return a.label.toString().localeCompare(b.label.toString());
        }
        return 0;
    });
};


export const sortTaskFolder = (folder: TaskFolder, logPad: string, logLevel: number) =>
{
    sortTasks(folder.taskFiles, logPad, logLevel);
    for (const each of folder.taskFiles)
    {
        /* istanbul ignore else */
        if ((each instanceof TaskFile)) { // && each.isGroup) {
            sortTasks(each.treeNodes, logPad, logLevel);
        }
    }
};


export const sortTasks = (items: (ITaskFile | ITaskItem)[] | undefined, logPad = "", logLevel = 1) =>
{
    log.methodStart("sort tasks", logLevel, logPad);
    items?.sort((a: ITaskFile | ITaskItem, b: ITaskFile | ITaskItem) =>
    {   /* istanbul ignore else */
        if (a.label && b.label)
        {
            if ((a instanceof TaskFile && b instanceof TaskFile || a instanceof TaskItem && b instanceof TaskItem)) {
                return a.label?.toString()?.localeCompare(b.label?.toString());
            }
            //
            // TaskFiles we keep at the top, like a folder in Windows Explorer
            //
            /* istanbul ignore if */
            else if (a instanceof TaskFile && b instanceof TaskItem)
            {
                return -1;
            }
            return 1;
        }
        return 0;
    });
    log.methodDone("sort tasks", logLevel, logPad);
};
