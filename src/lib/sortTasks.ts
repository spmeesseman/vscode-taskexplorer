
import * as log from "../common/log";
import TaskItem from "../tree/item";
import TaskFile from "../tree/file";
import TaskFolder from "../tree/folder";
import constants from "../common/constants";



export function sortTaskFolder(folder: TaskFolder, logPad: string, logLevel: number)
{
    sortTasks(folder.taskFiles, logPad, logLevel);
    for (const each of folder.taskFiles)
    {
        if ((each instanceof TaskFile)) { // && each.isGroup) {
            sortTasks(each.treeNodes, logPad, logLevel);
        }
    }
}


export function sortLastTasks(items: (TaskFile | TaskItem)[] | undefined, lastTasks: string[], logPad: string, logLevel: number)
{
    log.methodStart("sort last tasks", logLevel, logPad);
    items?.sort((a: TaskItem | TaskFile, b: TaskItem | TaskFile) =>
    {
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
    {
        if (a.label && b.label)
        {
            if ((a instanceof TaskFile && b instanceof TaskFile || a instanceof TaskItem && b instanceof TaskItem)) {
                return a.label?.toString()?.localeCompare(b.label?.toString());
            }
            //
            // TaskFiles we keep at the  top, like a folder in Windows Explorer
            //
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
