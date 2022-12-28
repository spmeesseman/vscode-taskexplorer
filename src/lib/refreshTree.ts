import { commands, Uri } from "vscode";
import { configuration } from "../common/configuration";
import { isExcluded } from "../common/utils";
import { TaskExplorerApi } from "../interface";

let teApi: TaskExplorerApi;


export async function refreshTree(taskType?: string, uri?: Uri, logPad?: string)
{
    if (!teApi) {
        teApi = await commands.executeCommand("taskExplorer.getApi")  as TaskExplorerApi;
    }
    // let refreshedTasks = false;
    // window.setStatusBarMessage("$(loading) Task Explorer - Refreshing tasks...");

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
    if (configuration.get<boolean>("enableSideBar") && teApi.sidebar) {
        await teApi.sidebar.refresh(taskType, uri, logPad);
    }
    /* istanbul ignore else */
    if (configuration.get<boolean>("enableExplorerView") && teApi.explorer) {
        await teApi.explorer.refresh(taskType, uri, logPad);
    }
}
