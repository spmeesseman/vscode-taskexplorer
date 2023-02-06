/* eslint-disable prefer-arrow/prefer-arrow-functions */

import * as fs from "./lib/utils/fs";
import * as fileCache from "./lib/fileCache";
import log from "./lib/log/log";
import { once } from "./lib/event";
import { join, resolve } from "path";
// import { isWeb } from "@env/platform";
import { isWeb } from "./lib/env/node/platform";
import { TeContainer } from "./lib/container";
// import { hrtime } from "@env/hrtime";
import { TeApi } from "./lib/api";
import { Stopwatch } from "./lib/stopwatch";
import { Commands } from "./lib/constants";
import { executeCommand } from "./lib/command";
import { showWhatsNewMessage } from "./lib/messages";
import { initStorage, storage } from "./lib/utils/storage";
import { TaskTreeManager } from "./tree/treeManager";
import { registerStatusBarItem } from "./lib/statusBarItem";
import { configuration, registerConfiguration } from "./lib/utils/configuration";
import { ExtensionContext, env, version as codeVersion, window } from "vscode";
import { ITaskExplorerApi } from "./interface";
import { getTaskTypeEnabledSettingName, getTaskTypes, getTaskTypeSettingName } from "./lib/utils/taskTypeUtils";
import { enableConfigWatcher, isProcessingConfigChange, registerConfigWatcher } from "./lib/watcher/configWatcher";
import { disposeFileWatchers, registerFileWatchers, isProcessingFsEvent } from "./lib/watcher/fileWatcher";

// import "tsconfig-paths/register";



let ready = false;
let tests = false;
let dev = false;
let extensionContext: ExtensionContext;


export let teApi: ITaskExplorerApi;


export async function activate(context: ExtensionContext)
{
    const version: string = context.extension.packageJSON.version;
	const insiders = context.extension.id === "spmeesseman-vscode-taskexplorer-insiders";
	const prerelease = false; // insiders || satisfies(version, "> 2023.0.0");

	const sw = new Stopwatch(
		// `TaskExplorer${prerelease ? (insiders ? " (Insiders)" : " (pre-release)") : ""} v${version}`,
		`Task Explorer v${version}`,
		{
			log: {
				message: ` activating in ${env.appName}(${codeVersion}) on the ${isWeb ? "web" : "desktop"} (${
					env.machineId
				}|${env.sessionId})`,
				// ${context.extensionRuntime !== ExtensionRuntime.Node ? ' in a webworker' : ''}
			},
            logLevel: 1
		},
	);

    extensionContext = context;

    //
    // Set 'tests' flag if tests are running and this is not a user runtime
    //
    tests = await fs.pathExists(join(__dirname, "test", "runTest.js"));

    //
    // Set 'dev' flag if running a debugging session from vSCode
    //
    dev = !tests && /* istanbul ignore next */await fs.pathExists(resolve(__dirname, "..", "src"));

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
    // Initialize logging
    //
    registerConfiguration(context, dev, tests);

    //
    // Initialize logging
    //
    await log.registerLog(context, tests ? 2 : /* istanbul ignore next */ 0); // 0=off | 1=on w/red&yellow | 2=on w/ no red/yellow
    log.methodStart("activation", 1, "", true);

    //
    // Initialize global status Bar Item
    //
    registerStatusBarItem(context);

    //
    // Initialize persistent storage
    //
    await initStorage(context, dev, tests);

    //
    // !!! Temporary after settings layout redo / rename !!!
    // !!! Remove sometime down the road (from 12/22/22) !!!
    //
    await migrateSettings();
    //
    // !!! End temporary !!!
    //

    //
    // Register file cache
    //
    await fileCache.registerFileCache(context);

    //
    // Register configurations/settings change watcher
    //
    registerConfigWatcher(context);

	const syncedVersion = storage.get<string>(prerelease && !insiders ? "synced:preVersion" : "synced:version");
	const localVersion = storage.get<string>(prerelease && !insiders ? "preVersion" : "version");

	let previousVersion: string | undefined;
	if (!localVersion || !syncedVersion) {
		previousVersion = syncedVersion ?? localVersion;
	}
    else if (syncedVersion === localVersion) {
		previousVersion = syncedVersion;
	}
    else {
		previousVersion = localVersion;
	}

    const container = TeContainer.create(context, storage, prerelease, version, previousVersion);
	once(container.onReady)(() =>
    {
		void showWelcomeOrWhatsNew(container, version, previousVersion, "   ");
		void storage.update(prerelease && !insiders ? "preVersion" : "version", version);
		if (!syncedVersion || (version === syncedVersion)) {
			void storage.update(prerelease && !insiders ? "synced:preVersion" : "synced:version", version);
		}
	});

	await container.ready();

	// if (teContainer.debugging) {
	// 	void setContext(ContextKeys.Debugging, true);
	// }

    //
    // TODO - Telemetry
    //
	// teContainer.telemetry.setGlobalAttributes({
	// 	debugging: container.debugging,
	// 	insiders: insiders,
	// 	prerelease: prerelease,
	// 	install: previousVersion == null,
	// 	upgrade: previousVersion != null && version !== previousVersion,
	// 	upgradedFrom: previousVersion != null && version !== previousVersion ? previousVersion : undefined,
	// });


    const exitMessage =
    `syncedVersion=${syncedVersion}, localVersion=${localVersion}, previousVersion=${previousVersion}, welcome=${storage.get(
        "views:welcome:visible",
    )}`;
	sw.stop({ message: ` activated${!exitMessage ? `, ${exitMessage}` : ""}` });

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
    // Create API instance
    //
	teApi = new TeApi(container, tests);

    //
    // Use a delayed initialization so we can display an 'Initializing...' message
    // in the tree on startup.  Really no good way to do that w/o this.
    //
    setTimeout(initialize, 25, container);

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
    extensionContext.subscriptions.forEach((s) => {
        s.dispose();
    });
    extensionContext.subscriptions.splice(0);
}


const initialize = async(container: TeContainer) =>
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
    await container.licenseManager.checkLicense("   ");
    //
    // Register file type watchers
    // This "used" to also start the file scan to build the file task file cache. It now
    // does not on startup.  We use rebuildCache() below, so as to initiate one scan as
    // opposed to one scan per task type, like it did previously.  Note that if task types
    // are enabled or disabled in settings after startup, then the individual calls to
    // registerFileWatcher() will perform the scan for that task type.
    //
    await registerFileWatchers(container.context, "   ");
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
    if (tests || /* istanbul ignore next */!rootFolderChanged)
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
    await container.treeManager.loadTasks("   ");
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


export const getExtensionContext = () => extensionContext;


export function isExtensionBusy()
{
    return !ready || fileCache.isBusy() || TaskTreeManager.isBusy() || teApi.explorer?.isBusy() || teApi.sidebar?.isBusy() ||
           isProcessingFsEvent() || isProcessingConfigChange() || TeContainer.instance.licenseManager.isBusy();
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


async function showWelcomeOrWhatsNew(container: TeContainer, version: string, previousVersion: string | undefined, logPad: string)
{
	if (!previousVersion)
    {
		log.write(`First-time install; window.focused=${window.state.focused}`, 1, logPad);

		if (configuration.get<boolean>("showWelcomeOnInstall") === false) return;

		if (window.state.focused) {
			await container.storage.delete("pendingWelcomeOnFocus");
			await executeCommand(Commands.ShowWelcomePage);
		}     //
        else // Save pending on window getting focus
		{   //
            await container.storage.update("pendingWelcomeOnFocus", true);
			const disposable = window.onDidChangeWindowState(e =>
            {
				if (!e.focused) return;
				disposable.dispose();
                //
				// If the window is now focused and we are pending the welcome, clear the pending state and show
                //
				if (container.storage.get("pendingWelcomeOnFocus") === true)
                {
					void container.storage.delete("pendingWelcomeOnFocus");
					if (configuration.get("showWelcomeOnInstall")) {
						void executeCommand(Commands.ShowWelcomePage);
					}
				}
			});
			container.context.subscriptions.push(disposable);
		}
		return;
	}

	if (previousVersion !== version) {
		log.write(`GitLens upgraded from v${previousVersion} to v${version}; window.focused=${window.state.focused}`, 1, logPad);
	}

	const [ major, minor ] = version.split(".").map(v => parseInt(v, 10));
	const [ prevMajor, prevMinor ] = previousVersion.split(".").map(v => parseInt(v, 10));

    //
	// Don't notify on downgrades
    //
	if (major === prevMajor || major < prevMajor || (major === prevMajor && minor < prevMinor)) {
		return;
	}

	if (major !== prevMajor) {
		version = String(major);
	}

	void executeCommand(Commands.ShowHomeView);

	if (configuration.get("showWhatsNewAfterUpgrades"))
    {
		if (window.state.focused) {
			await container.storage.delete("pendingWhatsNewOnFocus");
			await showWhatsNewMessage(version);
		}     //
        else // Save pending on window getting focus
        {   //
			await container.storage.update("pendingWhatsNewOnFocus", true);
			const disposable = window.onDidChangeWindowState(e =>
            {
				if (!e.focused) return;
				disposable.dispose();
				if (container.storage.get("pendingWhatsNewOnFocus") === true)
                {
					void container.storage.delete("pendingWhatsNewOnFocus");
					if (configuration.get("showWhatsNewAfterUpgrades")) {
						void showWhatsNewMessage(version);
					}
				}
			});
			container.context.subscriptions.push(disposable);
		}
	}
}
