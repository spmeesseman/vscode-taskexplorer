/* eslint-disable prefer-arrow/prefer-arrow-functions */

import * as util from "./lib/utils/utils";
import * as fs from "./lib/utils/fs";
import * as fileCache from "./lib/fileCache";
import log from "./lib/log/log";
import registerEnterLicenseCommand from "./commands/enterLicense";
import registerViewReportCommand from "./commands/viewReport";
import { join } from "path";
import { AntTaskProvider } from "./providers/ant";
import { AppPublisherTaskProvider } from "./providers/appPublisher";
import { BashTaskProvider } from "./providers/bash";
import { BatchTaskProvider } from "./providers/batch";
import { ComposerTaskProvider } from "./providers/composer";
import { GradleTaskProvider } from "./providers/gradle";
import { GruntTaskProvider } from "./providers/grunt";
import { GulpTaskProvider } from "./providers/gulp";
import { MakeTaskProvider } from "./providers/make";
import { MavenTaskProvider } from "./providers/maven";
import { NsisTaskProvider } from "./providers/nsis";
import { PerlTaskProvider } from "./providers/perl";
import { PipenvTaskProvider } from "./providers/pipenv";
import { PowershellTaskProvider } from "./providers/powershell";
import { PythonTaskProvider } from "./providers/python";
import { RubyTaskProvider } from "./providers/ruby";
import { configuration } from "./lib/utils/configuration";
import { initStorage, storage } from "./lib/utils/storage";
import { TaskExplorerProvider } from "./providers/provider";
import { ILicenseManager } from "./interface/ILicenseManager";
import { LicenseManager } from "./lib/licenseManager";
import { refreshTree } from "./lib/refreshTree";
import { registerExplorer } from "./lib/registerExplorer";
import { ExtensionContext, tasks, commands } from "vscode";
import { IDictionary, IExternalProvider, ITaskExplorer, ITaskExplorerApi, ITestsApi } from "./interface";
import { isProcessingConfigChange, registerConfigWatcher } from "./lib/configWatcher";
import { disposeFileWatchers, registerFileWatchers, isProcessingFsEvent, onWsFoldersChange } from "./lib/fileWatcher";


let licenseManager: ILicenseManager;
let ready = false;
let tests = false;
export const providers: IDictionary<TaskExplorerProvider> = {};
export const providersExternal: IDictionary<IExternalProvider> = {};

export const teApi: ITaskExplorerApi =
{
    config: configuration,
    explorer: undefined,
    explorerView: undefined,
    isBusy,
    isTests: () => tests,
    setTests: (isTests) => { tests = isTests; },
    log,
    providers,
    providersExternal,
    refreshExternalProvider,
    register: registerExternalProvider,
    sidebar: undefined,
    sidebarView: undefined,
    unregister: unregisterExternalProvider,
    utilities: util,
    waitForIdle: waitForTaskExplorerIdle,
    testsApi: {
        fs,
        explorer: {} as ITaskExplorer, // registerExplorer() will set
        fileCache,
        storage,
        onWsFoldersChange
    }
};


export async function activate(context: ExtensionContext) // , disposables: Disposable[]): Promise<ITaskExplorerApi>
{
    //
    // Set 'tests' flag if tests are running and this is not a user runtime
    //
    tests = await fs.pathExists(join(__dirname, "test", "runTest.js"));
    /* istanbul ignore if */
    if (!tests) {
         teApi.testsApi = null as unknown as ITestsApi;
    }

    //
    // Initialize logging
    //
    await log.initLog(context, tests ? 2 : /* istanbul ignore next */ 0); // 0=off | 1=on w/red&yellow | 2=on w/ no red/yellow

    //
    // Initialize persistent storage
    //
    await initStorage(context, tests);
    /* istanbul ignore else */
    if (tests) {
        teApi.testsApi.storage = storage;
    }

    log.write("");
    log.write("Activate extension");

    //
    // !!! Temporary after settings layout redo / rename !!!
    // !!! Remove sometime down the road (from 12/22/22) !!!
    //
    await tempRemapSettingsToNewLayout();
    //
    // !!! End temporary !!!
    //

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
    // Register the tree providers
    //
    registerExplorer("taskExplorer", context, configuration.get<boolean>("enableExplorerView", true), teApi, true);
    registerExplorer("taskExplorerSideBar", context, configuration.get<boolean>("enableSideBar", false), teApi, true);

    //
    // Register configurations/settings change watcher
    //
    registerConfigWatcher(context, teApi);

    //
    // Create license manager instance
    //
    licenseManager = new LicenseManager(context);

    //
    // Tired of VSCode complaining that the the expension was a startup hog. Performing the
    // initial scan after the extension has been instantiated stops it from getting all up
    // in stdout's business.  Displaying an 'Initializing...' message in the tree now on
    // startup resulting from this, looks kinda nice I guess, so oh well.
    //
    setTimeout(async(api: ITaskExplorerApi) =>
    {   //
        // Register file type watchers
        // This also starts the file scan to build the file task file cache
        //
        await registerFileWatchers(context, api);
        //
        // Build the file cache, thiskicks off the wholeprocess as refreshTree() will be called down
        // the line in the initialization process.
        //
        await fileCache.rebuildCache("");
        //
        // TaskTreeDataProvider fires event for engine to make tree provider to refresh on setEnabled()
        //
        /* istanbul ignore next */
        api.explorer?.setEnabled(true);
        /* istanbul ignore next */
        api.sidebar?.setEnabled(true);
        //
        // Check license
        //
        await licenseManager.checkLicense("   ");
        //
        // Signal that first task load has completed
        //
        ready = true;
        //
    }, 25, teApi);

    log.write("Task Explorer activated, tree construction pending");

    return teApi;
}


//
// !!! Temporary after settings layout redo / rename !!!
// !!! Remove sometime down the road (from 12/22/22) !!!
// !!! Remove call in method activate() too          !!!
//
async function tempRemapSettingsToNewLayout()
{
    const didSettingUpgrade = storage.get<boolean>("DID_SETTINGS_UPGRADE", false);
    /* istanbul ignore next */
    if (didSettingUpgrade)
    {   /* istanbul ignore next */
        const taskTypes = util.getTaskTypes();
        /* istanbul ignore next */
        taskTypes.push("ansicon");
        /* istanbul ignore next */
        for (const taskType of taskTypes)
        {   /* istanbul ignore next */
            let oldEnabledSetting = util.getTaskTypeSettingName(taskType, "enable"),
                newEnabledSetting = util.getTaskTypeEnabledSettingName(taskType);
            /* istanbul ignore next */
            if (taskType !== "ansicon")
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
            oldEnabledSetting = util.getTaskTypeSettingName(taskType, "pathTo");
            /* istanbul ignore next */
            newEnabledSetting = util.getTaskTypeSettingName(taskType, "pathToPrograms.");
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
}


export async function deactivate()
{
    disposeFileWatchers();
    await fileCache.cancelBuildCache();
}


export function getLicenseManager()
{
    return licenseManager;
}


/* istanbul ignore next */
function isBusy()
{   /* istanbul ignore next */
    return !ready || fileCache.isBusy() || teApi.explorer?.isBusy() || teApi.sidebar?.isBusy() ||
           isProcessingFsEvent() || isProcessingConfigChange();
}


/* istanbul ignore next */
async function refreshExternalProvider(providerName: string)
{
    /* istanbul ignore next */
    if (providersExternal[providerName])
    {
        /* istanbul ignore next */
        await refreshTree(teApi, providerName, undefined, "");
    }
}


function registerCommands(context: ExtensionContext)
{
    registerEnterLicenseCommand(context);
    registerViewReportCommand(context);
    //
    // Register GetAPI task
    //
    context.subscriptions.push(commands.registerCommand("taskExplorer.getApi", () => teApi));
}


async function registerExternalProvider(providerName: string, provider: IExternalProvider, logPad: string)
{
    providersExternal[providerName] = provider;
    await refreshTree(teApi, providerName, undefined, logPad);
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
    registerTaskProvider("make", new MakeTaskProvider(), context);                  // C/C++ Makefile
    registerTaskProvider("maven", new MavenTaskProvider(), context);                // Apache Maven Toolset
    registerTaskProvider("pipenv", new PipenvTaskProvider(), context);              // Pipfile for Python pipenv package manager
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
    await refreshTree(teApi, providerName, undefined, logPad);
}


async function waitForTaskExplorerIdle(minWait = 1, maxWait = 15000, logPad = "   ")
{
    let waited = 0;
    let iterationsIdle = 0;
    while ((iterationsIdle < 3 || isBusy()) && waited < maxWait)
    {
        await util.timeout(20);
        waited += 20;
        ++iterationsIdle;
        if (isBusy()) {
            iterationsIdle = 0;
        }
    }
    /* istanbul ignore next */
    if (minWait > waited) {
        /* istanbul ignore next */
        await util.timeout(minWait - waited);
    }
}
