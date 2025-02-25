/* eslint-disable prefer-arrow/prefer-arrow-functions */

import * as util from "./common/utils";
import * as cache from "./cache";
import * as log from "./common/log";
import constants from "./common/constants";
import registerEnterLicenseCommand from "./commands/enterLicense";
import registerViewReportCommand from "./commands/viewReport";
import { views } from "./views";
import { TaskTreeDataProvider } from "./tree/tree";
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
// import { displayInfoPage } from "./common/infoPage";
import { configuration } from "./common/configuration";
import { initStorage, storage } from "./common/storage";
import { isCachingBusy } from "./cache";
import { TaskExplorerProvider } from "./providers/provider";
import { ILicenseManager } from "./interface/licenseManager";
import { ExternalExplorerProvider, TaskExplorerApi } from "./interface";
import {
    Disposable, ExtensionContext, Uri, tasks, commands, workspace,
    window, FileSystemWatcher, ConfigurationChangeEvent, WorkspaceFolder
} from "vscode";
import { LicenseManager } from "./lib/licenseManager";
import { DenoTaskProvider } from "./providers/deno";


export let teApi: TaskExplorerApi;
let licenseManager: ILicenseManager;
let enabledTasks: any;
let pathToPrograms: any;
const watchers: Map<string, FileSystemWatcher> = new Map();
const watcherDisposables: Map<string, Disposable> = new Map();
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

    teApi = {
        log,
        providers,
        utilities: util,
        fileCache: cache,
        providersExternal,
        explorer: treeDataProvider2,
        sidebar: treeDataProvider,
        isBusy: isTaskExplorerBusy,
        refresh: refreshExternalProvider,
        register: registerExternalProvider,
        unregister: unregisterExternalProvider
    };

    //
    // Store the enabledTasks object so we can detect which properties have changed when
    // the 'enabledTasks' configuration change event occurs
    //
    enabledTasks = configuration.get<any>("enabledTasks", {});
    pathToPrograms = configuration.get<any>("pathToPrograms", {});

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
    for (const [ k, d ] of watcherDisposables) {
        d.dispose();
    }

    for (const [ k, w ] of watchers) {
        w.dispose();
    }

    await cache.cancelBuildCache(true);
}


export function getLicenseManager()
{
    return licenseManager;
}


/* istanbul ignore next */
function isTaskExplorerBusy()
{   /* istanbul ignore next */
    return isCachingBusy();
}


function logFileWatcherEvent(uri: Uri, type: string)
{
    log.write("file change event", 1);
    log.value("   type", type, 1);
    log.value("   file", uri.fsPath, 1);
}


async function processConfigChanges(context: ExtensionContext, e: ConfigurationChangeEvent)
{
    let refresh = false;
    const refreshTaskTypes: string[] = [];

    const registerChange = (taskType: string) => {
        /* istanbul ignore else */
        if (!refreshTaskTypes.includes(taskType)) {
            refreshTaskTypes.push(taskType);
        }
    };

    //
    // Check configs that may require a tree refresh...
    //

    //
    // if the 'autoRefresh' settings if turned off, then there's nothing to do
    //
    if (configuration.get<boolean>("autoRefresh") === false) {
        return;
    }

    //
    // Main excludes list changes requires global refresh
    //
    if (e.affectsConfiguration("taskExplorer.exclude") || e.affectsConfiguration("taskExplorer.excludeTask"))
    {
        refresh = true;
    }

    //
    // Groupings changes require global refresh
    //
    if (!refresh && (e.affectsConfiguration("taskExplorer.groupWithSeparator") || e.affectsConfiguration("taskExplorer.groupSeparator") ||
        e.affectsConfiguration("taskExplorer.groupMaxLevel") || e.affectsConfiguration("taskExplorer.groupStripTaskLabel")))
    {
        refresh = true;
    }

    //
    // Show/hide last tasks
    //
    if (e.affectsConfiguration("taskExplorer.showLastTasks"))
    {   /* istanbul ignore else */
        if (configuration.get<boolean>("enableSideBar") && teApi.sidebar)
        {
            await teApi.sidebar.showSpecialTasks(configuration.get<boolean>("showLastTasks"), false, true);
        }
        /* istanbul ignore else */
        if (configuration.get<boolean>("enableExplorerView") && teApi.explorer)
        {
            await teApi.explorer.showSpecialTasks(configuration.get<boolean>("showLastTasks"), false, true);
        }
    }

    //
    // Enable/disable task types
    //
    if (!refresh && e.affectsConfiguration("taskExplorer.enabledTasks"))
    {
        let didSetScriptTypeForRefresh = false;
        const newEnabledTasks = configuration.get<any>("enabledTasks");
        for (const p in enabledTasks)
        {   /* istanbul ignore else */
            if ({}.hasOwnProperty.call(enabledTasks, p))
            {
                const taskType = util.getTaskTypeRealName(p),
                      oldValue = enabledTasks[p],
                      newValue = newEnabledTasks[p];
                if (newValue !== oldValue)
                {
                    const isScriptType = util.isScriptType(taskType);
                    const ignoreModify = isScriptType || taskType === "app-publisher" || taskType === "maven";
                    await registerFileWatcher(context, taskType, util.getGlobPattern(taskType), ignoreModify, newValue);
                    if (!isScriptType || !didSetScriptTypeForRefresh) {
                        registerChange(taskType);
                    }
                    didSetScriptTypeForRefresh = didSetScriptTypeForRefresh || isScriptType;
                }
            }
        }
        Object.assign(enabledTasks, newEnabledTasks);
    }

    //
    // Path changes to task programs require task executions to be re-set up
    //
    if (!refresh)
    {
        if (e.affectsConfiguration("pathToPrograms"))
        {
            let didSetScriptTypeForRefresh = false;
            const newPathToPrograms = configuration.get<any>("pathToPrograms");
            for (const p in pathToPrograms)
            {
                if ({}.hasOwnProperty.call(pathToPrograms, p))
                {
                    const taskType = util.getTaskTypeRealName(p),
                          oldValue = pathToPrograms[p],
                          newValue = newPathToPrograms[p];
                    if (newValue !== oldValue) {
                        const isScriptType = util.isScriptType(taskType);
                        if (!isScriptType || !didSetScriptTypeForRefresh) {
                            registerChange(taskType);
                        }
                        didSetScriptTypeForRefresh = didSetScriptTypeForRefresh || isScriptType;
                    }
                }
            }
        }

        //
        // Extra Bash Globs (for extensionless script files)
        //
        if (e.affectsConfiguration("taskExplorer.globPatternsBash"))
        {   /* istanbul ignore else */
            if (refreshTaskTypes.includes("bash") === false)
            {
                await registerFileWatcher(context, "bash",
                                        util.getCombinedGlobPattern(constants.GLOB_BASH, configuration.get<string[]>("globPatternsBash", [])),
                                        false, configuration.get<boolean>("enabledTasks.bash"));
                registerChange("bash");
            }
        }

        //
        // Extra Apache Globs (for non- build.xml files)s
        //
        if (e.affectsConfiguration("taskExplorer.includeAnt") || e.affectsConfiguration("taskExplorer.globPatternsAnt"))
        {   /* istanbul ignore else */
            if (refreshTaskTypes.includes("ant") === false)
            {
                const antGlobs = [ ...configuration.get<string[]>("includeAnt", []), ...configuration.get<string[]>("globPatternsAnt", []) ];
                await registerFileWatcher(context, "ant", util.getCombinedGlobPattern(constants.GLOB_ANT, antGlobs),
                                        false, configuration.get<boolean>("enabledTasks.ant"));
                registerChange("ant");
            }
        }

        //
        // Whether or not to use the 'ant' program to detect ant tasks (default is xml2js parser)
        //
        if (e.affectsConfiguration("taskExplorer.useAnt")) {
            registerChange("ant");
        }

        //
        // Whether or not to use the 'gulp' program to detect gulp tasks (default is custom parser)
        //
        if (e.affectsConfiguration("taskExplorer.useGulp")) {
            registerChange("gulp");
        }

        //
        // NPM Package Manager change (NPM / Yarn)
        // Do a global refresh since we don't provide the npm tasks, VSCode itself does
        //
        if (e.affectsConfiguration("npm.packageManager", undefined)) {
            registerChange("npm");
        }

        //
        // if the 'autoRefresh' settings if turned off, then there's nothing to do
        //
        if (e.affectsConfiguration("taskExplorer.showHiddenWsTasks")) {
            registerChange("Workspace");
        }

        //
        // Enabled/disable sidebar view
        //
        if (e.affectsConfiguration("taskExplorer.enableSideBar"))
        {
            if (configuration.get<boolean>("enableSideBar"))
            {   /* istanbul ignore else */
                if (teApi.sidebar) {
                    // TODO - remove/add view on enable/disable view
                    refresh = true;
                }
                else {
                    teApi.sidebar = registerExplorer("taskExplorerSideBar", context);
                }
            }
            // else {
            //     teApi.sidebar = undefined;
            // }
        }

        //
        // Enabled/disable explorer view
        //
        if (e.affectsConfiguration("taskExplorer.enableExplorerView"))
        {
            if (configuration.get<boolean>("enableExplorerView"))
            {   /* istanbul ignore else */
                if (teApi.explorer) {
                    // TODO - remove/add view on enable/disable view
                    refresh = true;
                }
                else {
                    teApi.explorer = registerExplorer("taskExplorer", context);
                }
            }
            // else {
            //     teApi.explorer = undefined;
            // }
        }

        //
        // Integrated shell
        //
        if (e.affectsConfiguration("terminal.integrated.shell.windows") ||
            e.affectsConfiguration("terminal.integrated.shell.linux") ||
            e.affectsConfiguration("terminal.integrated.shell.osx")) {
            //
            // Script type task defs will change with terminal change
            //
            if (configuration.get<boolean>("enabledTasks.bash") || configuration.get<boolean>("enabledTasks.batch") ||
                configuration.get<boolean>("enabledTasks.perl") || configuration.get<boolean>("enabledTasks.powershell") ||
                configuration.get<boolean>("enabledTasks.python") || configuration.get<boolean>("enabledTasks.ruby") ||
                configuration.get<boolean>("enabledTasks.nsis")) {
                refresh = true;
            }
        }
    }

    if (refresh) {
        await refreshTree();
    }
    else if (refreshTaskTypes.length > 0) {
        for (const t of refreshTaskTypes) {
            await refreshTree(t);
        }
    }
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


export async function refreshTree(taskType?: string, uri?: Uri)
{
    // let refreshedTasks = false;
    // window.setStatusBarMessage("$(loading) Task Explorer - Refreshing tasks...");

    //
    // If this request is from a filesystem event for a file that exists in an ignored path,
    // then get out of here
    //
    if (uri && util.isExcluded(uri.path)) {
        return;
    }

    //
    // Refresh tree(s)
    //
    // Note the static task cache only needs to be refreshed once if both the explorer view
    // and the sidebar view are being used and/or enabled
    //
    if (configuration.get<boolean>("enableSideBar") && teApi.sidebar) {
        await teApi.sidebar.refresh(taskType, uri);
    }
    /* istanbul ignore else */
    if (configuration.get<boolean>("enableExplorerView") && teApi.explorer) {
        await teApi.explorer.refresh(taskType, uri);
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


function registerExplorer(name: string, context: ExtensionContext, enabled?: boolean): TaskTreeDataProvider | undefined
{
    log.write("Register explorer view / tree provider '" + name + "'");

    /* istanbul ignore else */
    if (enabled !== false)
    {   /* istanbul ignore else */
        if (workspace.workspaceFolders)
        {
            const treeDataProvider = new TaskTreeDataProvider(name, context);
            const treeView = window.createTreeView(name, { treeDataProvider, showCollapseAll: true });
            views.set(name, treeView);
            const view = views.get(name);
            /* istanbul ignore else */
            if (view) {
                context.subscriptions.push(view);
                log.write("   Tree data provider registered'" + name + "'");
            }
            return treeDataProvider;
        }
        else {
            log.write("✘ No workspace folders!!!");
        }
    }
}


async function registerExternalProvider(providerName: string, provider: ExternalExplorerProvider)
{
    providersExternal.set(providerName, provider);
    await refreshTree(providerName);
}


async function registerFileWatchers(context: ExtensionContext)
{
    const taskTypes = util.getTaskTypes();
    for (const taskType of taskTypes)
    {
        if (configuration.get<boolean>(util.getTaskTypeEnabledSettingName(taskType)))
        {
            const watchModify = util.isScriptType(taskType) || taskType === "app-publisher";
            await registerFileWatcher(context, taskType, util.getGlobPattern(taskType), watchModify);
        }
    }
}


async function registerFileWatcher(context: ExtensionContext, taskType: string, fileBlob: string, ignoreModify?: boolean, enabled?: boolean)
{
    log.write("Register file watcher for task type '" + taskType + "'");

    let watcher = watchers.get(taskType);

    /* istanbul ignore else */
    if (workspace.workspaceFolders) {
        await cache.buildCache(taskType, fileBlob, undefined, true, "   ");
    }

    if (watcher)
    {
        const watcherDisposable = watcherDisposables.get(taskType);
        if (watcherDisposable)
        {
            watcherDisposable.dispose();
            watcherDisposables.delete(taskType);
        }
    }

    if (enabled !== false)
    {
        if (!watcher) {
            watcher = workspace.createFileSystemWatcher(fileBlob);
            watchers.set(taskType, watcher);
            context.subscriptions.push(watcher);
        }
        if (!ignoreModify) {
            watcherDisposables.set(taskType, watcher.onDidChange(async _e => {
                logFileWatcherEvent(_e, "change");
                await refreshTree(taskType, _e);
            }));
        }
        watcherDisposables.set(taskType, watcher.onDidDelete(async _e => {
            logFileWatcherEvent(_e, "delete");
            await cache.removeFileFromCache(taskType, _e, "");
            await refreshTree(taskType, _e);
        }));
        watcherDisposables.set(taskType, watcher.onDidCreate(async _e => {
            logFileWatcherEvent(_e, "create");
            await cache.addFileToCache(taskType, _e);
            await refreshTree(taskType, _e);
        }));
    }
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
    registerTaskProvider("deno", new DenoTaskProvider(), context);                    // Deno
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
        for (const c of cache.filesCache)
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
