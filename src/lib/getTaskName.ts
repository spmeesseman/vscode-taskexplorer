
import { getTaskItemId } from "../common/utils";
import { storage } from "../common/storage";
import TaskItem from "../tree/item";
import constants from "../common/constants";


export function getTaskName(script: string, relativePath: string | undefined)
{
    if (relativePath && relativePath.length)
    {
        if (relativePath.endsWith("/") || relativePath.endsWith("\\")) {
            return `${script} - ${relativePath.substring(0, relativePath.length - 1)}`;
        }
        else {
            return `${script} - ${relativePath}`;
        }
    }
    return script;
}


export function getSpecialTaskName(taskItem: TaskItem)
{
    let label = taskItem.taskFile.folder.label + " - " + taskItem.taskSource;
    const renames = storage.get<string[][]>(constants.TASKS_RENAME_STORE, []),
          id = getTaskItemId(taskItem);
    for (const i in renames)
    {
        if (id === renames[i][0])
        {
            label = renames[i][1];
            break;
        }
    }
    return taskItem.label + " (" + label + ")";
}
