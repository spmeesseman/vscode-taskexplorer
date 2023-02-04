/* eslint-disable prefer-arrow/prefer-arrow-functions */

import * as util from "./lib/utils/utils";
import * as fs from "./lib/utils/fs";
import * as fileCache from "./lib/fileCache";
import log from "./lib/log/log";
import registerViewReportCommand from "./commands/viewReport";
import registerGetLicenseCommand from "./commands/getLicense";
import registerViewLicenseCommand from "./commands/viewLicense";
import registerEnterLicenseCommand from "./commands/enterLicense";
import registerAddToExcludesCommand from "./commands/addToExcludes";
import registerEnableTaskTypeCommand from "./commands/enableTaskType";
import registerDisableTaskTypeCommand from "./commands/disableTaskType";
import registerViewReleaseNotesCommand from "./commands/viewReleaseNotes";
import registerRemoveFromExcludesCommand from "./commands/removeFromExcludes";
import { join, resolve } from "path";
import { refreshTree } from "./lib/refreshTree";
import { AntTaskProvider } from "./providers/ant";
import { BashTaskProvider } from "./providers/bash";
import { GulpTaskProvider } from "./providers/gulp";
import { MakeTaskProvider } from "./providers/make";
import { RubyTaskProvider } from "./providers/ruby";
import { NsisTaskProvider } from "./providers/nsis";
import { PerlTaskProvider } from "./providers/perl";
import { BatchTaskProvider } from "./providers/batch";
import { MavenTaskProvider } from "./providers/maven";
import { GruntTaskProvider } from "./providers/grunt";
import { GradleTaskProvider } from "./providers/gradle";
import { PipenvTaskProvider } from "./providers/pipenv";
import { PythonTaskProvider } from "./providers/python";
import { WebpackTaskProvider } from "./providers/webpack";
import { JenkinsTaskProvider } from "./providers/jenkins";
import { initStorage, storage } from "./lib/utils/storage";
import { LicenseManager } from "./lib/auth/licenseManager";
import { ComposerTaskProvider } from "./providers/composer";
import { TaskExplorerProvider } from "./providers/provider";
import { IConfiguration } from "./interface/IConfiguration";
import { registerStatusBarItem } from "./lib/statusBarItem";
import { ILicenseManager } from "./interface/ILicenseManager";
import { PowershellTaskProvider } from "./providers/powershell";
import { AppPublisherTaskProvider } from "./providers/appPublisher";
import { configuration, registerConfiguration } from "./lib/utils/configuration";
import { ExtensionContext, tasks, commands, workspace, WorkspaceFolder, env } from "vscode";
import { IDictionary, IExternalProvider, ITaskTree, ITaskExplorerApi, ITestsApi, ITaskTreeManager } from "./interface";
import { getTaskTypeEnabledSettingName, getTaskTypes, getTaskTypeSettingName } from "./lib/utils/taskTypeUtils";
import { enableConfigWatcher, isProcessingConfigChange, registerConfigWatcher } from "./lib/watcher/configWatcher";
import { disposeFileWatchers, registerFileWatchers, isProcessingFsEvent, onWsFoldersChange } from "./lib/watcher/fileWatcher";
import { TaskTreeManager } from "./tree/treeManager";
import TaskTree from "./tree/tree";


export const providers: IDictionary<TaskExplorerProvider> = {};
export const providersExternal: IDictionary<IExternalProvider> = {};

let ready = false;
let tests = false;
let dev = false;
let licenseManager: ILicenseManager;
let treeManager: TaskTreeManager;

export const teApi: ITaskExplorerApi =
{
    explorer: undefined,
    explorerView: undefined,
    isBusy,
    log,
    providers,
    providersExternal,
    refreshExternalProvider,
    register: registerExternalProvider,
    sidebar: undefined,
    sidebarView: undefined,
    unregister: unregisterExternalProvider,
    testsApi: {} as unknown as ITestsApi,
    isLicensed: () => licenseManager.isLicensed(),
    isTests: () => tests,
    setTests: () => {}
};


export async function activate(context: ExtensionContext) // , disposables: Disposable[]): Promise<ITaskExplorerApi>
{
    //
    // Set 'tests' flag if tests are running and this is not a user runtime
    //
    tests = await fs.pathExists(join(__dirname, "test", "runTest.js"));

    //
    // Set 'dev' flag if running a debugging session from vSCode
    //
    dev = !tests && /* istanbul ignore next */await fs.pathExists(resolve(__dirname, "..", "src"));

    //
    // Initialize logging
    //
    registerConfiguration(context, dev, tests);

    //
    // Initialize logging
    //
    await log.registerLog(context, tests ? 2 : /* istanbul ignore next */ 0); // 0=off | 1=on w/red&yellow | 2=on w/ no red/yellow

    //
    // Initialize global status Bar Item
    //
    registerStatusBarItem(context);

    //
    // Initialize persistent storage
    //
    await initStorage(context, dev, tests);

    log.methodStart("activation", 1, "", true);

    //
    // !!! Temporary after settings layout redo / rename !!!
    // !!! Remove sometime down the road (from 12/22/22) !!!
    //
    await tempRemapSettingsToNewLayout();
    await tempResetGroupingSep();
    await tempDeleteSomePathToPrograms();
    //
    // !!! End temporary !!!
    //

    //
    // Register file cache
    //
    await fileCache.registerFileCache(context);

    //
    // Register internal task providers.  Npm, VScode type tasks are provided
    // by VSCode, not internally.
    //
    registerTaskProviders(context);

    //
    // Register non-ui commands found in package.json contributes.commands
    //
    registerCommands(context);

    //
    // Create task tree manager and register the tree providers
    //
    treeManager = new TaskTreeManager(context, teApi);

    //
    // Register configurations/settings change watcher
    //
    registerConfigWatcher(context);

    //
    // Create license manager instance
    //
    licenseManager = new LicenseManager(context, teApi);

    //
    // Authentication Provider
    //
    // context.subscriptions.push(
	// 	new TeAuthenticationProvider(context)
	// );

    if (tests)
    {
        teApi.testsApi = { // Will get removed on activation if not tests environment
            fs,
            config: configuration,
            explorer: teApi.explorer as ITaskTree, // TaskTreeManager has set
            fileCache,
            isBusy: false,
            storage,
            enableConfigWatcher,
            onWsFoldersChange,
            utilities: util,
            treeManager,
            extensionContext: context,
            wsFolder: (workspace.workspaceFolders as WorkspaceFolder[])[0]
        };
        teApi.setTests = (isTests) => { tests = isTests; };
        teApi.isBusy = () => isBusy() || teApi.testsApi.isBusy;
    }

    //
    // Use a delayed initialization so we can display an 'Initializing...' message
    // in the tree on startup.  Really no good way to do that w/o this.
    //
    setTimeout(initialize, 25, context);

    log.write("   activation completed successfully, initialization pending", 1);
    log.methodDone("activation", 1);

    return teApi;
}


const initialize = async(context: ExtensionContext) =>
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
    await licenseManager.checkLicense("   ");
    //
    // Register file type watchers
    // This "used" to also start the file scan to build the file task file cache. It now
    // does not on startup.  We use rebuildCache() below, so as to initiate one scan as
    // opposed to one scan per task type, like it did previously.  Note that if task types
    // are enabled or disabled in settings after startup, then the individual calls to
    // registerFileWatcher() will perform the scan for that task type.
    //
    await registerFileWatchers(context, "   ");
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
    // Start the first tree build
    //
    await treeManager.initialize("   ");
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


//
// !!! Temporary                                     !!!
// !!! Remove sometime down the road (from 1/18/22)  !!!
// !!! Remove call in method activate() too          !!!
//
const tempResetGroupingSep = async () =>
{
    const groupSep = configuration.get<string>("groupSeparator", "-");
    /* istanbul ignore next */
    if (groupSep !== "-" && groupSep !== "_" && groupSep !== ":" && groupSep !== "|") {
        /* istanbul ignore next */
        await configuration.update("groupSeparator", "-");
    }
};


//
// !!! Temporary                                     !!!
// !!! Remove sometime down the road (from 1/18/22)  !!!
// !!! Remove call in method activate() too          !!!
//
const tempDeleteSomePathToPrograms = async () =>
{
    await configuration.update("pathToPrograms.apppublisher", undefined);
    await configuration.updateWs("pathToPrograms.apppublisher", undefined);
    await configuration.update("pathToPrograms.bash", undefined);
    await configuration.updateWs("pathToPrograms.bash", undefined);
};


//
// !!! Temporary after settings layout redo / rename !!!
// !!! Remove sometime down the road (from 12/22/22) !!!
// !!! Remove call in method activate() too          !!!
//
const tempRemapSettingsToNewLayout = async() =>
{
    const didSettingUpgrade = storage.get<boolean>("DID_SETTINGS_UPGRADE", false);
    /* istanbul ignore next */
    if (didSettingUpgrade)
    {   /* istanbul ignore next */
        const taskTypes = getTaskTypes();
        /* istanbul ignore next */
        taskTypes.push("ansicon");
        /* istanbul ignore next */
        for (const taskType of taskTypes)
        {   /* istanbul ignore next */
            let oldEnabledSetting = getTaskTypeSettingName(taskType, "enable"),
                newEnabledSetting = getTaskTypeEnabledSettingName(taskType);
            /* istanbul ignore next */
            if (taskType !== "ansicon" && taskType !== "curl")
            {   /* istanbul ignore next */
                const oldSettingValue1 = configuration.get<boolean | undefined>(oldEnabledSetting, undefined);
                /* istanbul ignore next */
                if (oldSettingValue1 !== undefined)
                {   /* istanbul ignore next */
                    await configuration.update(newEnabledSetting, oldSettingValue1);
                    /* istanbul ignore next */
                    await configuration.update(oldEnabledSetting, undefined);
                    /* istanbul ignore next */
                    await configuration.updateWs(oldEnabledSetting, undefined);
                }
            }

            /* istanbul ignore next */
            oldEnabledSetting = getTaskTypeSettingName(taskType, "pathTo");
            /* istanbul ignore next */
            newEnabledSetting = getTaskTypeSettingName(taskType, "pathToPrograms.");
            /* istanbul ignore next */
            const oldSettingValue2 = configuration.get<string | undefined>(oldEnabledSetting, undefined);
            /* istanbul ignore next */
            if (oldSettingValue2 !== undefined)
            {
                /* istanbul ignore next */
                await configuration.update(newEnabledSetting, oldSettingValue2);
                /* istanbul ignore next */
                await configuration.update(oldEnabledSetting, undefined);
                /* istanbul ignore next */
                await configuration.updateWs(oldEnabledSetting, undefined);
            }
        }
        /* istanbul ignore next */
        await storage.update("DID_SETTINGS_UPGRADE", true);
    }
};


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
    /* istanbul ignore else */
    if (!fileCache.isBusy() && !configuration.get<boolean>("enablePersistentFileCaching"))
    {
        const now = Date.now(),
              lastWsRootPathChange = storage.get2Sync<number>("lastWsRootPathChange", 0);
        /* istanbul ignore if */
        if (now < lastWsRootPathChange + 3000)
        {
            fileCache.persistCache(false, true);
        }
    }
    storage.update2Sync("lastDeactivated", Date.now());
}


export const getLicenseManager = () => licenseManager;


export const getTaskTreeManager = () => treeManager;


function isBusy()
{
    return !ready || fileCache.isBusy() || TaskTreeManager.isBusy() ||
           isProcessingFsEvent() || isProcessingConfigChange() || licenseManager.isBusy();
}


async function refreshExternalProvider(providerName: string)
{
    if (providersExternal[providerName])
    {
        await refreshTree(providerName, undefined, "");
    }
}


function registerCommands(context: ExtensionContext)
{
    registerAddToExcludesCommand(context);
    registerDisableTaskTypeCommand(context);
    registerEnableTaskTypeCommand(context);
    registerEnterLicenseCommand(context);
    registerGetLicenseCommand(context, teApi);
    registerRemoveFromExcludesCommand(context);
    registerViewLicenseCommand(context, teApi);
    registerViewReportCommand(context, teApi);
    registerViewReleaseNotesCommand(context, teApi);
    //
    // Register GetAPI task
    //
    context.subscriptions.push(commands.registerCommand("vscode-taskexplorer.getApi", () => teApi));
}


async function registerExternalProvider(providerName: string, provider: IExternalProvider, logPad: string)
{
    providersExternal[providerName] = provider;
    await refreshTree(providerName, undefined, logPad);
}



function registerTaskProvider(providerName: string, provider: TaskExplorerProvider, context: ExtensionContext)
{
    context.subscriptions.push(tasks.registerTaskProvider(providerName, provider));
    providers[providerName] = provider;
}


function registerTaskProviders(context: ExtensionContext)
{   //
    // Internal Task Providers
    //
    // These tak types are provided internally by the extension.  Some task types (npm, grunt,
    //  gulp, ts) are provided by VSCode itself
    //
    // TODO: VSCODE API now implements "resolveTask" in addition to "provideTask".  Need to implement
    //     https://code.visualstudio.com/api/extension-guides/task-provider
    //
    registerTaskProvider("ant", new AntTaskProvider(), context);                    // Apache Ant Build Automation Tool
    registerTaskProvider("apppublisher", new AppPublisherTaskProvider(), context);  // App Publisher (work related)
    registerTaskProvider("composer", new ComposerTaskProvider(), context);          // PHP / composer.json
    registerTaskProvider("gradle", new GradleTaskProvider(), context);              // Gradle multi-Language Automation Tool
    registerTaskProvider("grunt", new GruntTaskProvider(), context);                // Gulp JavaScript Toolkit
    registerTaskProvider("gulp", new GulpTaskProvider(), context);                  // Grunt JavaScript Task Runner
    registerTaskProvider("jenkins", new JenkinsTaskProvider(), context);            // Jenkinsfile validation task
    registerTaskProvider("make", new MakeTaskProvider(), context);                  // C/C++ Makefile
    registerTaskProvider("maven", new MavenTaskProvider(), context);                // Apache Maven Toolset
    registerTaskProvider("pipenv", new PipenvTaskProvider(), context);              // Pipfile for Python pipenv package manager
    registerTaskProvider("webpack", new WebpackTaskProvider(), context);
    // Script type tasks
    registerTaskProvider("bash", new BashTaskProvider(), context);
    registerTaskProvider("batch", new BatchTaskProvider(), context);
    registerTaskProvider("nsis", new NsisTaskProvider(), context);
    registerTaskProvider("perl", new PerlTaskProvider(), context);
    registerTaskProvider("powershell", new PowershellTaskProvider(), context);
    registerTaskProvider("python", new PythonTaskProvider(), context);
    registerTaskProvider("ruby", new RubyTaskProvider(), context);
}


async function unregisterExternalProvider(providerName: string, logPad: string)
{
    delete providersExternal[providerName];
    await refreshTree(providerName, undefined, logPad);
}
