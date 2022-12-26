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
import { isProcessingConfigChange, processConfigChanges } from "./lib/processConfigChanges";
import { disposeFileWatchers, registerFileWatchers, isProcessingFsEvent } from "./lib/fileWatcher";
import { refreshTree } from "./lib/refreshTree";
import { registerExplorer } from "./lib/registerExplorer";
import { Disposable, ExtensionContext, tasks, commands, workspace, WorkspaceFolder } from "vscode";


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
    await registerFileWatchers(context);

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
    // Refresh tree when folders are added/removed from the workspace
    //
    const workspaceWatcher = workspace.onDidChangeWorkspaceFolders(/* istanbul ignore next */ async(_e) =>
    {   /* istanbul ignore next */
        await addWsFolder(_e.added);
        /* istanbul ignore next */
        await removeWsFolder(_e.removed);
        /* istanbul ignore next */
        await refreshTree();
    });
    context.subscriptions.push(workspaceWatcher);

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


export async function addWsFolder(wsf: readonly WorkspaceFolder[] | undefined)
{
    /* istanbul ignore else */
    if (wsf)
    {
        for (const f in wsf)
        {   /* istanbul ignore else */
            if ([].hasOwnProperty.call(wsf, f)) { // skip over properties inherited by prototype
                log.methodStart("workspace folder added", 1, "", true, [[ "name", wsf[f].name ]]);
                await cache.addFolderToCache(wsf[f], "   ");
                log.methodDone("workspace folder added", 1, "");
            }
        }
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
    return isCachingBusy() || teApi.explorer?.isRefreshPending() || teApi.sidebar?.isRefreshPending() ||
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
    registerTaskProvider("app-publisher", new AppPublisherTaskProvider(), context);   // App Publisher (work related)
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


export async function removeWsFolder(wsf: readonly WorkspaceFolder[], logPad = "")
{
    log.methodStart("process remove workspace folder", 1, logPad, true);

    for (const f of wsf)
    {   /* istanbul ignore next */
        log.value("      folder", f.name, 1, logPad);
        // window.setStatusBarMessage("$(loading) Task Explorer - Removing projects...");
        /* istanbul ignore next */
        for (const c of cache.getFilesCache())
        {
            /* istanbul ignore next */
            const files = c[1], provider = c[0],
                  toRemove: cache.ICacheItem[] = [];

            /* istanbul ignore next */
            log.value("      start remove task files from cache", provider, 2, logPad);

            /* istanbul ignore next */
            for (const file of files)
            {
                /* istanbul ignore next */
                log.value("         checking cache file", file.uri.fsPath, 4, logPad);
                /* istanbul ignore next */
                if (file.folder.uri.fsPath === f.uri.fsPath) {
                    /* istanbul ignore next */
                    log.write("            added for removal",  4, logPad);
                    /* istanbul ignore next */
                    toRemove.push(file);
                }
            }

            /* istanbul ignore next */
            if (toRemove.length > 0)
            {
                /* istanbul ignore next */
                for (const tr of toRemove) {
                    /* istanbul ignore next */
                    log.value("         remove file", tr.uri.fsPath, 2, logPad);
                    /* istanbul ignore next */
                    files.delete(tr);
                }
            }

            /* istanbul ignore next */
            log.value("      completed remove files from cache", provider, 2, logPad);
        }
        /* istanbul ignore next */
        log.write("   folder removed", 1, logPad);
    }

    log.methodDone("process remove workspace folder", 1, logPad, true);
}


async function unregisterExternalProvider(providerName: string)
{
    providersExternal.delete(providerName);
    await refreshTree(providerName);
}


async function waitForTaskExplorerIdle(minWait = 1, maxWait = 15000, logPad = "   ")
{
    let waited = 0;
    if (minWait > 0) {
        await util.timeout(minWait);
    }
    if (isTaskExplorerBusy()) {
        log.write("waiting for previous refresh to complete...", 1, logPad);
    }
    else
    {
        let lilWait = Math.round(minWait / 5);
        while (lilWait > 1)
        {
            await util.timeout(lilWait);
            // waited += lilWait;
            if (isTaskExplorerBusy()) {
                log.write("waiting for previous refresh to complete...", 1, logPad);
                break;
            }
            lilWait = Math.round(lilWait / 5);
        }
    }
    while (isTaskExplorerBusy() && waited < maxWait) {
        // console.log(Date.now);
        await util.timeout(10);
        waited += 10;
    }
}
