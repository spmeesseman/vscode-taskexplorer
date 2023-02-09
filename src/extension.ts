/* eslint-disable prefer-arrow/prefer-arrow-functions */

import { log } from "./lib/log/log";
import { TeApi } from "./lib/api";
import { TeWrapper } from "./lib/wrapper";
import * as fileCache from "./lib/fileCache";
import { ITaskExplorerApi } from "./interface";
import { oneTimeEvent } from "./lib/utils/utils";
import { initStorage, storage } from "./lib/utils/storage";
import { ExtensionContext, env, ExtensionMode } from "vscode";
import { configuration, registerConfiguration } from "./lib/utils/configuration";
import { enableConfigWatcher, isProcessingConfigChange } from "./lib/watcher/configWatcher";
import { disposeFileWatchers, registerFileWatchers, isProcessingFsEvent } from "./lib/watcher/fileWatcher";
import { getTaskTypeEnabledSettingName, getTaskTypes, getTaskTypeSettingName } from "./lib/utils/taskTypeUtils";

// import "tsconfig-paths/register";

let ready = false;
let teApi: ITaskExplorerApi;


export async function activate(context: ExtensionContext)
{
    const version: string = context.extension.packageJSON.version;
	const insiders = context.extension.id === "spmeesseman-vscode-taskexplorer-insiders";
	const prerelease = false; // insiders || satisfies(version, "> 2023.0.0");

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
    await log.registerLog(context, context.extensionMode === ExtensionMode.Test ? 2 : /* istanbul ignore next */ 0);
    log.methodStart("activation", 1, "", true);

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
    // Figure out previous version
    //
	let previousVersion: string | undefined;
	const syncedVersion = storage.get<string>(prerelease && !insiders ? "synced:preVersion" : "synced:version"),
          localVersion = storage.get<string>(prerelease && !insiders ? "preVersion" : "version");
	if (!localVersion || !syncedVersion) {
		previousVersion = syncedVersion ?? localVersion;
	}
    else if (syncedVersion === localVersion) {
		previousVersion = syncedVersion;
	}
    else {
		previousVersion = localVersion;
	}

    //
    // Instantiate application container (beautiful concept from GitLens project)
    //
    const wrapper = TeWrapper.create(context, storage, configuration, prerelease, version, previousVersion);
	oneTimeEvent(wrapper.onReady)(() =>
    {
		// void showWelcomeOrWhatsNew(container, version, previousVersion, "   ");
		void storage.update(prerelease && !insiders ? "preVersion" : "version", version);
		if (!syncedVersion || (version === syncedVersion)) {
			void storage.update(prerelease && !insiders ? "synced:preVersion" : "synced:version", version);
		}
	});

    //
    // Wait for ready signal from application container
    //
	await wrapper.ready();

    //
    // Instantiate the extension API
    //
	teApi = new TeApi(wrapper);

    //
    // TODO - Telemetry
    //
	// teWrapper.telemetry.setGlobalAttributes({
	// 	debugging: container.debugging,
	// 	insiders: insiders,
	// 	prerelease: prerelease,
	// 	install: previousVersion == null,
	// 	upgrade: previousVersion != null && version !== previousVersion,
	// 	upgradedFrom: previousVersion != null && version !== previousVersion ? previousVersion : undefined,
	// });

    //
    // TODO - Telemetry
    //
	// const startTime = sw.startTime;
	// const endTime = hrtime();
	// const elapsed = sw.elapsed();
    // container.telemetry.sendEvent(
	// 	"activate",
	// 	{
	// 		"activation.elapsed": elapsed,
	// 		"activation.mode": mode?.name,
	// 		...flatCfg,
	// 	},
	// 	startTime,
	// 	endTime,
	// );

    //
    // Use a delayed initialization so we can display an 'Initializing...' message
    // in the tree on startup.  Really no good way to do that w/o this.
    //
    setTimeout(initialize, 25, wrapper);

    log.write("   activation completed successfully, initialization pending", 1);
    log.methodDone("activation", 1);

    return teApi;
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
    if (!fileCache.isBusy() && !configuration.get<boolean>("enablePersistentFileCaching"))
    {
        const now = Date.now(),
              lastWsRootPathChange = storage.get2Sync<number>("lastWsRootPathChange", 0);
        if (now < lastWsRootPathChange + 3000)
        {
            fileCache.persistCache(false, true);
        }
    }
    storage.update2Sync("lastDeactivated", Date.now());
    //
    // VSCode will/would dispose() items in subscriptions but it won't be covered.  So dispose
    // everything here, it doesn't seem to cause any issue with Code exiting.
    //
    TeWrapper.instance.context.subscriptions.forEach((s) => {
        s.dispose();
    });
    TeWrapper.instance.context.subscriptions.splice(0);
}


const initialize = async(wrapper: TeWrapper) =>
{
    const now = Date.now(),
          lastDeactivated = await storage.get2<number>("lastDeactivated", 0),
          lastWsRootPathChange = await storage.get2<number>("lastWsRootPathChange", 0);
    log.methodStart("initialization", 1, "", true);
    //
    // Authentication
    //
    // const session = await authentication.getSession("auth0", [], { createIfNone: false });
    // if (session) {
    //     window.showInformationMessage(`Welcome back ${session.account.label}`);
    // }
    //
    // Check license
    //
    await wrapper.licenseManager.checkLicense("   ");
    //
    // Register file type watchers
    // This "used" to also start the file scan to build the file task file cache. It now
    // does not on startup.  We use rebuildCache() below, so as to initiate one scan as
    // opposed to one scan per task type, like it did previously.  Note that if task types
    // are enabled or disabled in settings after startup, then the individual calls to
    // registerFileWatcher() will perform the scan for that task type.
    //
    await registerFileWatchers(wrapper.context, "   ");
    //
    // Build the file cache, this kicks off the whole process as refreshTree() will be called
    // down the line in the initialization process.
    //
    // On a workspace folder move that changes the 1st folder, VSCode restarts the extension.
    // To make the tree reload pain as light as possible, we now always persist the file cache
    // regardless if the user settings has activated it or not when the extension deactivates
    // in this scenario. So check this case and proceed as necessary.
    //
    const rootFolderChanged  = now < lastDeactivated + 5000 && /* istanbul ignore next */now < lastWsRootPathChange + 5000;
    /* istanbul ignore else */
    if (wrapper.tests || /* istanbul ignore next */!rootFolderChanged)
    {
        await fileCache.rebuildCache("   ");
    }     //
    else // See comments/notes above
    {   //
        const enablePersistentFileCaching = configuration.get<boolean>("enablePersistentFileCaching");
        enableConfigWatcher(false);
        await configuration.update("enablePersistentFileCaching", true);
        await fileCache.rebuildCache("   ");
        await configuration.update("enablePersistentFileCaching", enablePersistentFileCaching);
        enableConfigWatcher(true);
    }
    await storage.update2("lastDeactivated", 0);
    await storage.update2("lastWsRootPathChange", 0);
    //
    // Start the first tree build/load
    //
    await wrapper.treeManager.loadTasks("   ");
    //
    // Log the environment
    //
    log.methodDone("initialization", 1, "", [
        [ "machine id", env.machineId ], [ "session id", env.sessionId ], [ "app name", env.appName ],
        [ "remote name", env.remoteName ], [ "is new ap install", env.isNewAppInstall ]
    ]);
    //
    // Signal that first task load has completed
    //
    setTimeout(() => { ready = true; }, 1);
};


export function isExtensionBusy()
{
    return !ready || fileCache.isBusy() || TeWrapper.instance.treeManager.isBusy() || teApi.explorer?.isBusy() || teApi.sidebar?.isBusy() ||
           isProcessingFsEvent() || isProcessingConfigChange() || TeWrapper.instance.licenseManager.isBusy();
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
