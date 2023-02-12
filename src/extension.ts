/* eslint-disable prefer-arrow/prefer-arrow-functions */

import { log } from "./lib/log/log";
import { TeWrapper } from "./lib/wrapper";
import { oneTimeEvent } from "./lib/utils/utils";
import { initStorage, storage } from "./lib/utils/storage";
import { ExtensionContext, ExtensionMode } from "vscode";
import { configuration, registerConfiguration } from "./lib/utils/configuration";
import { disposeFileWatchers } from "./lib/watcher/fileWatcher";
import { getTaskTypeEnabledSettingName, getTaskTypes, getTaskTypeSettingName } from "./lib/utils/taskTypeUtils";

// import "tsconfig-paths/register";

let teWrapper: TeWrapper;


export async function activate(context: ExtensionContext)
{
    const isTests = context.extensionMode === ExtensionMode.Test;
    //
    // TODO - Handle untrusted workspace
    //
    // if (!workspace.isTrusted) {
	// 	void setContext(ContextKeys.Untrusted, true);
	// 	context.subscriptions.push(
	// 		workspace.onDidGrantWorkspaceTrust(() => {
	// 			void setContext(ContextKeys.Untrusted, undefined);
	// 			container.telemetry.setGlobalAttribute('workspace.isTrusted', workspace.isTrusted);
	// 		}),
	// 	);
	// }
    //
    // Initialize configuration
    //
    registerConfiguration(context);
    //
    // Initialize logging
    //    0=off | 1=on w/red&yellow | 2=on w/ no red/yellow
    //
    await log.registerLog(context, isTests ? 2 : /* istanbul ignore next */ 0);
    log.methodStart("extension activation", 1, "", true);
    //
    // Initialize persistent storage
    //
    await initStorage(context);
    //
    // !!! Temporary after settings layout redo / rename !!!
    // !!! Remove sometime down the road (from 12/22/22) !!!
    //
    await migrateSettings();
    //
    // !!! End temporary !!!
    //
    //
    // Instantiate application container (beautiful concept from GitLens project)
    //
    teWrapper = TeWrapper.create(context, storage, configuration, log);
	oneTimeEvent(teWrapper.onInitialized)(() => { /* TODO - Show `welcome` / `version changed` page */ });
    //
    // Wait for `onInitialized` event from application container
    //
	await teWrapper.init();
    //
    // Activation complete. For tests return the app wrapper, otherwise return the api
    //
    log.write("   activation completed successfully, work pending", 1);
    log.methodDone("extension activation", 1);
    return isTests ? teWrapper : /* istanbul ignore next */teWrapper.api;
}


export async function deactivate()
{   //
    // Do some cleanup.  Most of the cleanup will have or will be done  internally by
    // VSCode as we registered all disposables during initialization.
    //
    disposeFileWatchers();
    //
    // Detect when a folder move occurs and the ext is about to deactivate/re-activate.  A
    // folder move that changes the first workspace folder will restart the extension
    // unfortunately.  Changing the first workspace folder modifies the deprecated `rootPath`
    // and I think that's why the reload is needed or happens.  A timesptamp is set by the
    // fileWatcher module in the workspaceFolderChanged event on extension activation that and
    // the below `lastDeactivated' flag is used to determine if it is being activated because
    // of this scenario, in which case we'll load from this stored file cache so that the tree
    // reload is much quicker, especially in large workspaces.
    //
    /* istanbul ignore next */
    if (!teWrapper.filecache.isBusy() && !teWrapper.config.get<boolean>("enablePersistentFileCaching"))
    {
        const now = Date.now(),
              lastWsRootPathChange = teWrapper.storage.get2Sync<number>("lastWsRootPathChange", 0);
        if (now < lastWsRootPathChange + 3000)
        {
            teWrapper.filecache.persistCache(false, true);
        }
    }
    teWrapper.storage.update2Sync("lastDeactivated", Date.now());
    //
    // VSCode will/would dispose() items in subscriptions but it won't be covered.  So dispose
    // everything here, it doesn't seem to cause any issue with Code exiting.
    //
    teWrapper.context.subscriptions.forEach((s) => {
        s.dispose();
    });
    teWrapper.context.subscriptions.splice(0);
}


/* istanbul ignore next */
const migrateSettings = async () =>
{
    const groupSep = configuration.get<string>("groupSeparator", "-");
    if (groupSep !== "-" && groupSep !== "_" && groupSep !== ":" && groupSep !== "|") {
        await configuration.update("groupSeparator", "-");
    }

    let ptp = configuration.get<string>("pathToPrograms.apppublisher");
    if (ptp !== undefined) {
        await configuration.update("pathToPrograms.apppublisher", undefined);
        await configuration.updateWs("pathToPrograms.apppublisher", undefined);
    }
    ptp = configuration.get<string>("pathToPrograms.bash");
    if (ptp !== undefined) {
        await configuration.update("pathToPrograms.bash", undefined);
        await configuration.updateWs("pathToPrograms.bash", undefined);
    }
    ptp = configuration.get<any>("specialFolders.expanded");
    if (ptp !== undefined) {
        await configuration.update("specialFolders.expanded", undefined);
        await configuration.updateWs("specialFolders.expanded", undefined);
    }

    const didSettingUpgrade = storage.get<boolean>("DID_SETTINGS_UPGRADE", false);
    if (didSettingUpgrade)
    {
        const taskTypes = getTaskTypes();
        taskTypes.push("ansicon");
        for (const taskType of taskTypes)
        {
            let oldEnabledSetting = getTaskTypeSettingName(taskType, "enable"),
                newEnabledSetting = getTaskTypeEnabledSettingName(taskType);
            if (taskType !== "ansicon" && taskType !== "curl")
            {
                const oldSettingValue1 = configuration.get<boolean | undefined>(oldEnabledSetting, undefined);
                if (oldSettingValue1 !== undefined)
                {
                    await configuration.update(newEnabledSetting, oldSettingValue1);
                    await configuration.update(oldEnabledSetting, undefined);
                    await configuration.updateWs(oldEnabledSetting, undefined);
                }
            }

            oldEnabledSetting = getTaskTypeSettingName(taskType, "pathTo");
            newEnabledSetting = getTaskTypeSettingName(taskType, "pathToPrograms.");
            const oldSettingValue2 = configuration.get<string | undefined>(oldEnabledSetting, undefined);
            if (oldSettingValue2 !== undefined)
            {
                await configuration.update(newEnabledSetting, oldSettingValue2);
                await configuration.update(oldEnabledSetting, undefined);
                await configuration.updateWs(oldEnabledSetting, undefined);
            }
        }
        await storage.update("DID_SETTINGS_UPGRADE", true);
    }
};
