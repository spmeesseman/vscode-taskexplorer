/* eslint-disable prefer-arrow/prefer-arrow-functions */

import * as util from "./common/utils";
import * as cache from "./cache";
import * as log from "./common/log";
import registerEnterLicenseCommand from "./commands/enterLicense";
import registerViewReportCommand from "./commands/viewReport";
import { AntTaskProvider } from "./providers/ant";
import { MakeTaskProvider } from "./providers/make";
import { MavenTaskProvider } from "./providers/maven";
import { ScriptTaskProvider } from "./providers/script";
import { GradleTaskProvider } from "./providers/gradle";
import { GruntTaskProvider } from "./providers/grunt";
import { ComposerTaskProvider } from "./providers/composer";
import { PipenvTaskProvider } from "./providers/pipenv";
import { GulpTaskProvider } from "./providers/gulp";
import { AppPublisherTaskProvider } from "./providers/appPublisher";
import { configuration } from "./common/configuration";
import { initStorage, storage } from "./common/storage";
import { isCachingBusy } from "./cache";
import { TaskExplorerProvider } from "./providers/provider";
import { ILicenseManager } from "./interface/licenseManager";
import { ExternalExplorerProvider, TaskExplorerApi } from "./interface";
import { LicenseManager } from "./lib/licenseManager";
import { isProcessingConfigChange, processConfigChanges } from "./lib/configWatcher";
import { disposeFileWatchers, initFileWatchers, isProcessingFsEvent } from "./lib/fileWatcher";
import { refreshTree } from "./lib/refreshTree";
import { registerExplorer } from "./lib/registerExplorer";
import { Disposable, ExtensionContext, tasks, commands, workspace } from "vscode";


export const teApi = {} as TaskExplorerApi;
let licenseManager: ILicenseManager;
export const providers: Map<string, TaskExplorerProvider> = new Map();
export const providersExternal: Map<string, ExternalExplorerProvider> = new Map();


export async function activate(context: ExtensionContext, disposables: Disposable[]): Promise<TaskExplorerApi>
{
    log.initLog("taskExplorer", "Task Explorer", context);
    initStorage(context);

    log.write("");
    log.write("Init extension");

    //
    // !!! Temporary after settings layout redo / rename !!!
    // !!! Remove sometime down the road (from 12/22/22) !!!
    //
    await tempRemapSettingsToNewLayout();
    //
    // !!! End temporary !!!
    //

    //
    // Register file type watchers
    //
    await initFileWatchers(context);

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
    let treeDataProvider;
    /* istanbul ignore else */
    if (configuration.get<boolean>("enableSideBar")) {
        treeDataProvider = registerExplorer("taskExplorerSideBar", context);
    }
    let treeDataProvider2;
    /* istanbul ignore else */
    if (configuration.get<boolean>("enableExplorerView")) {
        treeDataProvider2 = registerExplorer("taskExplorer", context);
    }

    //
    // Register configurations/settings change watcher
    //
    const d = workspace.onDidChangeConfiguration(async e => {
        await processConfigChanges(context, e);
    });
    context.subscriptions.push(d);

    log.write("   Task Explorer activated");

    Object.assign(teApi, {
        log,
        providers,
        utilities: util,
        providersExternal,
        explorer: treeDataProvider2,
        sidebar: treeDataProvider,
        isBusy: isTaskExplorerBusy,
        refresh: refreshExternalProvider,
        register: registerExternalProvider,
        unregister: unregisterExternalProvider,
        waitForIdle: waitForTaskExplorerIdle,
        testsApi: {
            log,
            /* istanbul ignore next */
            explorer: treeDataProvider2 || treeDataProvider,
            fileCache: cache
        }
    });

    //
    // Create license manager instance
    //
    licenseManager = new LicenseManager(teApi, context);

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
    await cache.cancelBuildCache(true);
}


export function getLicenseManager()
{
    return licenseManager;
}


/* istanbul ignore next */
function isTaskExplorerBusy()
{   /* istanbul ignore next */
    return isCachingBusy() || teApi.explorer?.isBusy() || teApi.sidebar?.isBusy() ||
           isProcessingFsEvent() || isProcessingConfigChange();
}


/* istanbul ignore next */
async function refreshExternalProvider(providerName: string)
{
    /* istanbul ignore next */
    if (providersExternal.get(providerName))
    {
        /* istanbul ignore next */
        await refreshTree(providerName);
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


async function registerExternalProvider(providerName: string, provider: ExternalExplorerProvider)
{
    providersExternal.set(providerName, provider);
    await refreshTree(providerName);
}



function registerTaskProvider(providerName: string, provider: TaskExplorerProvider, context: ExtensionContext)
{
    context.subscriptions.push(tasks.registerTaskProvider(providerName, provider));
    providers.set(providerName, provider);
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
    registerTaskProvider("ant", new AntTaskProvider(), context);                      // Apache Ant Build Automation Tool
    registerTaskProvider("apppublisher", new AppPublisherTaskProvider(), context);   // App Publisher (work related)
    registerTaskProvider("composer", new ComposerTaskProvider(), context);            // PHP / composer.json
    registerTaskProvider("gradle", new GradleTaskProvider(), context);                // Gradle multi-Language Automation Tool
    registerTaskProvider("grunt", new GruntTaskProvider(), context);                  // Gulp JavaScript Toolkit
    registerTaskProvider("gulp", new GulpTaskProvider(), context);                    // Grunt JavaScript Task Runner
    registerTaskProvider("make", new MakeTaskProvider(), context);                    // C/C++ Makefile
    registerTaskProvider("maven", new MavenTaskProvider(), context);                  // Apache Maven Toolset
    registerTaskProvider("pipenv", new PipenvTaskProvider(), context);                // Pipfile for Python pipenv package manager
    //
    // The 'script' provider handles all file based 'scripts', e.g. batch files, bash, powershell, etc
    //
    registerTaskProvider("script", new ScriptTaskProvider(), context);
}


async function unregisterExternalProvider(providerName: string)
{
    providersExternal.delete(providerName);
    await refreshTree(providerName);
}


async function waitForTaskExplorerIdle(minWait = 1, maxWait = 15000, logPad = "   ")
{
    let waited = 0;
    let iterationsIdle = 0;
    if (isTaskExplorerBusy()) {
        log.write("waiting for task explorer extension idle state...", 3, logPad);
    }
    while ((iterationsIdle < 3 || isTaskExplorerBusy()) && waited < maxWait)
    {
        await util.timeout(10);
        waited += 10;
        ++iterationsIdle;
        if (isTaskExplorerBusy()) {
            iterationsIdle = 0;
        }
    }
    /* istanbul ignore next */
    if (minWait > waited) {
        /* istanbul ignore next */
        await util.timeout(minWait - waited);
    }
    if (waited > 0) {
        log.write(`waited ${waited} milliseconds for idle state`, 3, logPad);
    }
}
