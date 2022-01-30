/* eslint-disable prefer-arrow/prefer-arrow-functions */

import * as util from "./common/utils";
import * as cache from "./cache";
import * as log from "./common/log";
import constants from "./common/constants";
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
import { displayInfoPage } from "./common/infoPage";
import { configuration } from "./common/configuration";
import { initStorage } from "./common/storage";
import { TaskExplorerProvider } from "./providers/provider";
import { ExternalExplorerProvider, TaskExplorerApi } from "./interface";
import {
    Disposable, ExtensionContext, Uri, tasks, commands, workspace,
    window, FileSystemWatcher, ConfigurationChangeEvent, WorkspaceFolder
} from "vscode";


let teApi: TaskExplorerApi,
    hasLicense: boolean,
    version: string;

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
    // Register file type watchers
    //
    await registerFileWatchers(context);

    //
    // Register internal task providers.  Npm, VScode type tasks are provided
    // by VSCode, not internally.
    //
    registerTaskProviders(context);

    //
    // Register GetAPI task
    //
    context.subscriptions.push(commands.registerCommand("taskExplorer.getApi", () => teApi));

    //
    // Register the tree providers
    //
    let treeDataProvider;
    if (configuration.get<boolean>("enableSideBar")) {
        treeDataProvider = registerExplorer("taskExplorerSideBar", context);
    }
    let treeDataProvider2;
    if (configuration.get<boolean>("enableExplorerView")) {
        treeDataProvider2 = registerExplorer("taskExplorer", context);
    }

    //
    // Refresh tree when folders are added/removed from the workspace
    //
    const workspaceWatcher = workspace.onDidChangeWorkspaceFolders(async(_e) =>
    {
        await addWsFolder(_e.added);
        await removeWsFolder(_e.removed);
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

    //
    // Store  extensionversion
    //
    version = context.extension.packageJSON.version;

    //
    // Check license / info display
    //
    // const panel = await displayInfoPage(version);
    // if (panel) {
    //     panel.onDidDispose(() =>
    //     {
    //
    //     },
    //     null, context.subscriptions);
    // }

    log.write("   Task Explorer activated");

    teApi = {
        log,
        providers,
        utilities: util,
        fileCache: cache,
        providersExternal,
        explorer: treeDataProvider2,
        sidebar: treeDataProvider,
        refresh: refreshExternalProvider,
        register: registerExternalProvider,
        unregister: unregisterExternalProvider
    };

    return teApi;
}


export async function addWsFolder(wsf: readonly WorkspaceFolder[] | undefined)
{
    if (wsf)
    {
        for (const f in wsf)
        {
            if (wsf.hasOwnProperty(f)) { // skip over properties inherited by prototype
                log.methodStart("workspace folder added", 1, "", true, [["name", wsf[f].name]]);
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


export function getVersion()
{
    return version;
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
    const refreshTaskTypes: string[] = [],
          taskTypes = util.getTaskTypes();

    const registerChange = (taskType: string) => {
        if (util.existsInArray(refreshTaskTypes, taskType) === false) {
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
    if (e.affectsConfiguration("taskExplorer.exclude")) {
        refresh = true;
    }

    //
    // Groupings changes require global refresh
    //
    if (e.affectsConfiguration("taskExplorer.groupWithSeparator") || e.affectsConfiguration("taskExplorer.groupSeparator") ||
        e.affectsConfiguration("taskExplorer.groupMaxLevel") || e.affectsConfiguration("taskExplorer.groupStripTaskLabel")) {
        refresh = true;
    }

    //
    // Show/hide last tasks
    //
    if (e.affectsConfiguration("taskExplorer.showLastTasks"))
    {
        if (configuration.get<boolean>("enableSideBar") && teApi.sidebar)
        {
            await teApi.sidebar.showSpecialTasks(configuration.get<boolean>("showLastTasks"));
        }
        if (configuration.get<boolean>("enableExplorerView") && teApi.explorer)
        {
            await teApi.explorer.showSpecialTasks(configuration.get<boolean>("showLastTasks"));
        }
    }

    //
    // Enable/disable task types
    //
    for (const i in taskTypes)
    {
        if (taskTypes.hasOwnProperty(i))
        {
            const taskType = taskTypes[i],
                  enabledSetting = util.getTaskTypeEnabledSettingName(taskType);
            if (e.affectsConfiguration("taskExplorer." + enabledSetting))
            {
                const ignoreModify = util.isScriptType(taskType) || taskType === "app-publisher" || taskType === "maven";
                await registerFileWatcher(context, taskType, util.getGlobPattern(taskType), ignoreModify, configuration.get<boolean>(enabledSetting));
                registerChange(taskType);
            }
        }
    }

    //
    // Path changes to task programs require task executions to be re-set up
    //
    for (const type of util.getTaskTypes())
    {
        if (e.affectsConfiguration(util.getTaskTypeSettingName(type, "pathTo"))) {
            refreshTaskTypes.push(type);
        }
    }

    //
    // Extra Bash Globs (for extensionless script files)
    //
    if (e.affectsConfiguration("taskExplorer.globPatternsBash"))
    {
        if (util.existsInArray(refreshTaskTypes, "bash") === false)
        {
            await registerFileWatcher(context, "bash",
                                      util.getCombinedGlobPattern(constants.GLOB_BASH, configuration.get<string[]>("globPatternsBash", [])),
                                      false, configuration.get<boolean>("enableBash"));
            registerChange("bash");
        }
    }

    //
    // Extra Apache Globs (for non- build.xml files)s
    //
    if (e.affectsConfiguration("taskExplorer.includeAnt") || e.affectsConfiguration("taskExplorer.globPatternsAnt"))
    {
        if (util.existsInArray(refreshTaskTypes, "ant") === false)
        {
            const antGlobs = [...configuration.get<string[]>("includeAnt", []), ...configuration.get<string[]>("globPatternsAnt", [])];
            await registerFileWatcher(context, "ant", util.getCombinedGlobPattern(constants.GLOB_ANT, antGlobs),
                                      false, configuration.get<boolean>("enableAnt"));
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
    // Enabled/disable sidebar view
    //
    if (e.affectsConfiguration("taskExplorer.enableSideBar"))
    {
        if (configuration.get<boolean>("enableSideBar"))
        {
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
        {
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
        if (configuration.get<boolean>("enableBash") || configuration.get<boolean>("enableBatch") ||
            configuration.get<boolean>("enablePerl") || configuration.get<boolean>("enablePowershell") ||
            configuration.get<boolean>("enablePython") || configuration.get<boolean>("enableRuby") ||
            configuration.get<boolean>("enableNsis")) {
            refresh = true;
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


async function refreshExternalProvider(providerName: string)
{
    if (providersExternal.get(providerName))
    {
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
    if (configuration.get<boolean>("enableExplorerView") && teApi.explorer) {
        await teApi.explorer.refresh(taskType, uri);
    }
}


function registerExplorer(name: string, context: ExtensionContext, enabled?: boolean): TaskTreeDataProvider | undefined
{
    log.write("Register explorer view / tree provider '" + name + "'");

    if (enabled !== false)
    {
        if (workspace.workspaceFolders)
        {
            const treeDataProvider = new TaskTreeDataProvider(name, context);
            const treeView = window.createTreeView(name, { treeDataProvider, showCollapseAll: true });
            views.set(name, treeView);
            const view = views.get(name);
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
    for (const t of taskTypes)
    {
        const taskType = t,
            taskTypeP = taskType !== "app-publisher" ? util.properCase(taskType) : "AppPublisher";
        if (configuration.get<boolean>("enable" + taskTypeP))
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
    {
        log.value("      folder", f.name, 1, logPad);
        // window.setStatusBarMessage("$(loading) Task Explorer - Removing projects...");
        for (const c of cache.filesCache)
        {
            const files = c[1], provider = c[0],
                  toRemove: cache.ICacheItem[] = [];

            log.value("      start remove task files from cache", provider, 2, logPad);

            for (const file of files)
            {
                log.value("         checking cache file", file.uri.fsPath, 4, logPad);
                if (file.folder.uri.fsPath === f.uri.fsPath) {
                    log.write("            added for removal",  4, logPad);
                    toRemove.push(file);
                }
            }

            if (toRemove.length > 0)
            {
                for (const tr of toRemove) {
                    log.value("         remove file", tr.uri.fsPath, 2, logPad);
                    files.delete(tr);
                }
            }

            log.value("      completed remove files from cache", provider, 2, logPad);
        }
        log.write("   folder removed", 1, logPad);
    }

    log.methodDone("process remove workspace folder", 1, logPad, true);
}


async function unregisterExternalProvider(providerName: string)
{
    providersExternal.delete(providerName);
    await refreshTree(providerName);
}
