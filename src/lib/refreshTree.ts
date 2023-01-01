import { Uri } from "vscode";
import { isExcluded } from "./utils/utils";
import { TaskExplorerApi } from "../interface";


export async function refreshTree(teApi: TaskExplorerApi, taskType?: string, uri?: Uri, logPad?: string)
{
    //
    // If this request is from a filesystem event for a file that exists in an ignored path,
    // then get out of here
    //
    if (uri && isExcluded(uri.path)) {
        return;
    }
    //
    // Refresh tree(s)
    //
    // Note the static task cache only needs to be refreshed once if both the explorer view
    // and the sidebar view are being used and/or enabled
    //
    if (teApi.explorer) {
        await teApi.explorer.refresh(taskType, uri, logPad);
    }
    if (teApi.sidebar) {
        await teApi.sidebar.refresh(taskType, uri, logPad);
    }
}
