
import { log } from "./log/log";
import { Globs } from "./constants";
import { TreeItemLabel } from "vscode";
import { TaskItem } from "../tree/item";
import { TaskFile } from "../tree/file";
import { TaskFolder } from "../tree/folder";
import { IDictionary, ITaskFile, ITaskItem } from "../interface";
import { configuration } from "./utils/configuration";


export const sortFolders = (folders: IDictionary<TaskFolder>): TaskFolder[] =>
{
    return [ ...Object.values(folders) ].sort((a: TaskFolder, b: TaskFolder) =>
    {
        if (a.label === Globs.LAST_TASKS_LABEL) {
            return -1;
        }
        else if (b.label === Globs.LAST_TASKS_LABEL) {
            return 1;
        }
        else if (a.label === Globs.FAV_TASKS_LABEL) {
            return -1;
        }
        else if (b.label === Globs.FAV_TASKS_LABEL) {
            return 1;
        }
        else if (a.label === Globs.USER_TASKS_LABEL) {
            return -1;
        }
        else if (b.label === Globs.USER_TASKS_LABEL) {
            return 1;
        }
        if (a.label && b.label && configuration.get<boolean>("sortProjectFoldersAlpha")) {
            return a.label.toString().localeCompare(b.label.toString());
        }
        return 0;
    });
};


export const sortTaskFolder = (folder: TaskFolder, logPad: string, logLevel: number) =>
{
    sortTasks(folder.taskFiles, logPad, logLevel);
    for (const each of folder.taskFiles.filter(t => t instanceof TaskFile) as TaskFile[])
    {
        sortTasks(each.treeNodes, logPad, logLevel);
    }
};


export const sortTasks = (items: (ITaskFile | ITaskItem)[] | undefined, logPad: string, logLevel: number) =>
{
    log.methodStart("sort tasks", logLevel, logPad);
    items?.sort((a: ITaskFile | ITaskItem, b: ITaskFile | ITaskItem) =>
    {               // TaskFiles are kept at the top, like a folder in Windows
        let s = -1; // Explorer (b instanceof TaskItem && a instanceof TaskFile)
        const labelA = (a.label as string | TreeItemLabel).toString(),
              labelB = (b.label as string | TreeItemLabel).toString();
        if ((a instanceof TaskFile && b instanceof TaskFile) || (a instanceof TaskItem && b instanceof TaskItem))
        {
            s = labelA.localeCompare(labelB);
        }
        else /* istanbul ignore else */ if (a instanceof TaskItem) // TaskFiles are kept at the top, like a folder in Windows Explorer
        {
            s = 1;
        }
        return s;
    });
    log.methodDone("sort tasks", logLevel, logPad);
};
