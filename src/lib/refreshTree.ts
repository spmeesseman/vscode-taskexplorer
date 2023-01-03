import { Uri } from "vscode";
import { isExcluded } from "./utils/utils";
import { ITaskExplorerApi } from "../interface";


export async function refreshTree(teApi: ITaskExplorerApi, taskType?: string, uri?: Uri, logPad?: string)
{   //
    // Refresh tree(s)
    //
    // Note the static task cache only needs to be refreshed once if both the explorer view
    // and the sidebar view are being used and/or enabled
    //
    /* istanbul ignore else */
    if (teApi.explorer) {
        await teApi.explorer.refresh(taskType, uri, logPad);
    }
    if (teApi.sidebar) {
        await teApi.sidebar.refresh(taskType, uri, logPad);
    }
}
