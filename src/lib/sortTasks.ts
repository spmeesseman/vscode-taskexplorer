
import * as log from "../common/log";
import TaskItem from "../tree/item";
import TaskFile from "../tree/file";
import TaskFolder from "../tree/folder";
import constants from "../common/constants";



export function sortFolders(folders: Map<string, TaskFolder>): TaskFolder[]
{
    return [ ...folders.values() ].sort((a: TaskFolder, b: TaskFolder) =>
    {
        if (a.label === constants.LAST_TASKS_LABEL) {
            return -1;
        }
        else if (b.label === constants.LAST_TASKS_LABEL) {
            return 1;
        }
        else if (a.label === constants.FAV_TASKS_LABEL) {
            if (b.label !== constants.LAST_TASKS_LABEL) {
                return -1;
            }
            return 1;
        }
        else if (b.label === constants.FAV_TASKS_LABEL) {
            if (a.label !== constants.LAST_TASKS_LABEL) {
                return 1;
            }
            return -1;
        }
        else if (a.label === constants.USER_TASKS_LABEL) {
            if (b.label !== constants.LAST_TASKS_LABEL && b.label !== constants.FAV_TASKS_LABEL) {
                return -1;
            }
            return 1;
        }
        else if (b.label === constants.USER_TASKS_LABEL) {
            if (a.label !== constants.LAST_TASKS_LABEL && a.label !== constants.FAV_TASKS_LABEL) {
                return 1;
            }
            return -1;
        }
        if (a.label && b.label) {
            return a.label.toString().localeCompare(b.label?.toString());
        }
        return 0;
    });
}


export function sortTaskFolder(folder: TaskFolder, logPad: string, logLevel: number)
{
    sortTasks(folder.taskFiles, logPad, logLevel);
    for (const each of folder.taskFiles)
    {
        /* istanbul ignore else */
        if ((each instanceof TaskFile)) { // && each.isGroup) {
            sortTasks(each.treeNodes, logPad, logLevel);
        }
    }
}


export function sortLastTasks(items: (TaskFile | TaskItem)[] | undefined, lastTasks: string[], logPad: string, logLevel: number)
{
    log.methodStart("sort last tasks", logLevel, logPad);
    items?.sort((a: TaskItem | TaskFile, b: TaskItem | TaskFile) =>
    {   /* istanbul ignore else */
        if (a.id && b.id) {
            const aIdx = lastTasks.indexOf(a.id.replace(constants.LAST_TASKS_LABEL + ":", ""));
            const bIdx = lastTasks.indexOf(b.id.replace(constants.LAST_TASKS_LABEL + ":", ""));
            return (aIdx < bIdx ? 1 : (bIdx < aIdx ? -1 : 0));
        }
        return 0;
    });
    log.methodDone("sort last tasks", logLevel, logPad);
}


export function sortTasks(items: (TaskFile | TaskItem)[] | undefined, logPad = "", logLevel = 1)
{
    log.methodStart("sort tasks", logLevel, logPad);
    items?.sort((a: TaskFile| TaskItem, b: TaskFile| TaskItem) =>
    {   /* istanbul ignore else */
        if (a.label && b.label)
        {
            if ((a instanceof TaskFile && b instanceof TaskFile || a instanceof TaskItem && b instanceof TaskItem)) {
                return a.label?.toString()?.localeCompare(b.label?.toString());
            }
            //
            // TaskFiles we keep at the  top, like a folder in Windows Explorer
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
}
