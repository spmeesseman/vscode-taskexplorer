/* eslint-disable prefer-arrow/prefer-arrow-functions */

/* ---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {
    Disposable, ExtensionContext, Uri, tasks, TaskProvider,
    workspace, window, FileSystemWatcher, ConfigurationChangeEvent, WorkspaceFolder, Task
} from "vscode";
import { TaskTreeDataProvider } from "./taskTree";
import { AntTaskProvider } from "./taskProviderAnt";
import { MakeTaskProvider } from "./taskProviderMake";
import { ScriptTaskProvider } from "./taskProviderScript";
import { GradleTaskProvider } from "./taskProviderGradle";
import { GruntTaskProvider } from "./taskProviderGrunt";
import { GulpTaskProvider } from "./taskProviderGulp";
import { AppPublisherTaskProvider } from "./taskProviderAppPublisher";
import { configuration } from "./common/configuration";
import { initStorage } from "./common/storage";
import { views } from "./views";
import { TaskExplorerProvider } from "./taskProvider";
import * as util from "./util";
import * as cache from "./cache";
import * as constants from "./common/constants";


export let treeDataProvider: TaskTreeDataProvider | undefined;
export let treeDataProvider2: TaskTreeDataProvider | undefined;
export let appDataPath: string;


const watchers: Map<string, FileSystemWatcher> = new Map();
const watcherDisposables: Map<string, Disposable> = new Map();
export const providers: Map<string, TaskExplorerProvider> = new Map();
export interface TaskExplorerApi
{
    explorerProvider: TaskTreeDataProvider | undefined;
    sidebarProvider: TaskTreeDataProvider | undefined;
    utilities: any;
    fileCache: any;
}


export async function activate(context: ExtensionContext, disposables: Disposable[]): Promise<TaskExplorerApi>
{
    util.initLog("taskExplorer", "Task Explorer", context);
    initStorage(context);

    util.log("");
    util.log("Init extension");

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
    // Register the tree providers
    //
    if (configuration.get<boolean>("enableSideBar")) {
        treeDataProvider = registerExplorer("taskExplorerSideBar", context);
    }
    if (configuration.get<boolean>("enableExplorerView")) {
        treeDataProvider2 = registerExplorer("taskExplorer", context);
    }

    //
    // Refresh tree when folders are added/removed from the workspace
    //
    const workspaceWatcher = workspace.onDidChangeWorkspaceFolders(async(_e) =>
    {
        await addWsFolder(_e.added);
        removeWsFolder(_e.removed);
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

    util.log("   Task Explorer activated");

    return {
        explorerProvider: treeDataProvider2,
        sidebarProvider: treeDataProvider,
        utilities: util,
        fileCache: cache
    };
}


export async function addWsFolder(wsf: readonly WorkspaceFolder[])
{
    for (const f in wsf) {
        if (wsf.hasOwnProperty(f)) { // skip over properties inherited by prototype
            util.log("Workspace folder added: " + wsf[f].name, 1);
            await cache.addFolderToCache(wsf[f]);
        }
    }
}


export async function deactivate()
{
    watcherDisposables.forEach((d) => {
        d.dispose();
    });

    watchers.forEach((w) => {
        w.dispose();
    });

    await cache.cancelBuildCache(true);
}


export async function removeWsFolder(wsf: readonly WorkspaceFolder[])
{
    for (const f in wsf)
    {
        if (wsf.hasOwnProperty(f)) // skip over properties inherited by prototype
        {
            util.log("Workspace folder removed: " + wsf[f].name, 1);
            // window.setStatusBarMessage("$(loading) Task Explorer - Removing projects...");
            for (const key in cache.filesCache.keys)
            {
                const toRemove = [];
                const obj = cache.filesCache.get(key);
                obj.forEach((item) =>
                {
                    if (item.folder.uri.fsPath === wsf[f].uri.fsPath) {
                        toRemove.push(item);
                    }
                });
                if (toRemove.length > 0) {
                    for (const tr in toRemove) {
                        if (toRemove.hasOwnProperty(tr)) { // skip over properties inherited by prototype
                            obj.delete(toRemove[tr]);
                        }
                    }
                }
            }
        }
    }
}


async function processConfigChanges(context: ExtensionContext, e: ConfigurationChangeEvent)
{
    let refresh: boolean;
    const taskTypes: string[] = [];

    const registerChange = (taskType: string) => {
        if (util.existsInArray(taskTypes, taskType) === false) {
            taskTypes.push(taskType);
        }
    };

    //
    // Check configs that may require a tree refresh...
    //

    //
    // if the 'autoRefresh' settings if truned off, then there's nothing to do
    //
    if (configuration.get<boolean>("autoRefresh") === false) {
        return;
    }

    //
    // Main excludes list cahnges requires global refresh
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
        if (configuration.get<boolean>("enableSideBar") && treeDataProvider)
        {
            await treeDataProvider.showSpecialTasks(configuration.get<boolean>("showLastTasks"));
        }
        if (configuration.get<boolean>("enableExplorerView") && treeDataProvider2)
        {
            await treeDataProvider2.showSpecialTasks(configuration.get<boolean>("showLastTasks"));
        }
    }

    //
    // Enable/disable task types
    //
    if (e.affectsConfiguration("taskExplorer.enableAnt") || e.affectsConfiguration("taskExplorer.includeAnt")) {
        await registerFileWatcher(context, "ant", util.getAntGlobPattern(), configuration.get<boolean>("enableAnt"));
        registerChange("ant");
    }

    if (e.affectsConfiguration("taskExplorer.enableAppPublisher")) {
        await registerFileWatcher(context, "app-publisher", constants.GLOB_APPPUBLISHER, false, configuration.get<boolean>("enableAppPublisher"));
        registerChange("app-publisher");
    }

    if (e.affectsConfiguration("taskExplorer.enableBash")) {
        await registerFileWatcher(context, "bash", constants.GLOB_BASH, true, configuration.get<boolean>("enableBash"));
        registerChange("bash");
    }

    if (e.affectsConfiguration("taskExplorer.enableBatch")) {
        await registerFileWatcher(context, "batch", constants.GLOB_BATCH, true, configuration.get<boolean>("enableBatch"));
        registerChange("batch");
    }

    if (e.affectsConfiguration("taskExplorer.enableGradle")) {
        await registerFileWatcher(context, "gradle", constants.GLOB_GRADLE, false, configuration.get<boolean>("enableGradle"));
        registerChange("gradle");
    }

    if (e.affectsConfiguration("taskExplorer.enableGrunt")) {
        await registerFileWatcher(context, "grunt", constants.GLOB_GRUNT, false, configuration.get<boolean>("enableGrunt"));
        registerChange("grunt");
    }

    if (e.affectsConfiguration("taskExplorer.enableGulp")) {
        await registerFileWatcher(context, "gulp", constants.GLOB_GULP, false, configuration.get<boolean>("enableGulp"));
        registerChange("gulp");
    }

    if (e.affectsConfiguration("taskExplorer.enableMake")) {
        await registerFileWatcher(context, "make", constants.GLOB_MAKEFILE, false, configuration.get<boolean>("enableMake"));
        registerChange("make");
    }

    if (e.affectsConfiguration("taskExplorer.enableNpm")) {
        await registerFileWatcher(context, "npm", constants.GLOB_NPM, false, configuration.get<boolean>("enableNpm"));
        registerChange("npm");
    }

    if (e.affectsConfiguration("taskExplorer.enableNsis")) {
        await registerFileWatcher(context, "nsis", constants.GLOB_NSIS, true, configuration.get<boolean>("enableNsis"));
        registerChange("nsis");
    }

    if (e.affectsConfiguration("taskExplorer.enablePerl")) {
        await registerFileWatcher(context, "perl", constants.GLOB_PERL, true, configuration.get<boolean>("enablePerl"));
         registerChange("perl");
    }

    if (e.affectsConfiguration("taskExplorer.enablePowershell")) {
        await registerFileWatcher(context, "powershell", constants.GLOB_POWERSHELL, true, configuration.get<boolean>("enablePowershell"));
        registerChange("powershell");
    }

    if (e.affectsConfiguration("taskExplorer.enablePython")) {
        await registerFileWatcher(context, "python", constants.GLOB_PYTHON, true, configuration.get<boolean>("enablePython"));
        registerChange("python");
    }

    if (e.affectsConfiguration("taskExplorer.enableRuby")) {
        await registerFileWatcher(context, "ruby", constants.GLOB_RUBY, true, configuration.get<boolean>("enableRuby"));
        registerChange("ruby");
    }

    if (e.affectsConfiguration("taskExplorer.enableTsc")) {
        await registerFileWatcher(context, "tsc", constants.GLOB_TYPESCRIPT, false, configuration.get<boolean>("enableTsc"));
        registerChange("tsc");
    }

    if (e.affectsConfiguration("taskExplorer.enableWorkspace")) {
        await registerFileWatcher(context, "workspace", constants.GLOB_VSCODE, false, configuration.get<boolean>("enableWorkspace"));
        registerChange("workspace");
    }

    //
    // Path changes to task programs require task executions to be re-set up
    //
    await util.forEachAsync(util.getTaskTypes(), (type: string) =>
    {
        if (type === "app-publisher") {
            if (e.affectsConfiguration("taskExplorer.pathToAppPublisher")) {
                taskTypes.push("app-publisher");
            }
        }
        else if (e.affectsConfiguration("taskExplorer.pathTo" + util.properCase(type))) {
            taskTypes.push(type);
        }
    });

    //
    // Extra Apache Ant 'include' paths
    //
    if (e.affectsConfiguration("taskExplorer.includeAnt")) {
        if (util.existsInArray(taskTypes, "ant") === false){
            await registerFileWatcher(context, "ant", util.getAntGlobPattern(), configuration.get<boolean>("enableAnt"));
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
    // Do a global refrsh since we don't provide the npm tasks, VSCode itself does
    //
    if (e.affectsConfiguration("npm.packageManager", null)) {
        registerChange("npm");
    }

    //
    // Enabled/disable sidebar view
    //
    if (e.affectsConfiguration("taskExplorer.enableSideBar"))
    {
        if (configuration.get<boolean>("enableSideBar")) {
            if (treeDataProvider) {
                // TODO - remove/add view on enable/disable view
                refresh = true;
            }
            else {
                treeDataProvider = registerExplorer("taskExplorerSideBar", context);
            }
        }
    }

    //
    // Enabled/disable explorer view
    //
    if (e.affectsConfiguration("taskExplorer.enableExplorerView"))
    {
        if (configuration.get<boolean>("enableExplorerView")) {
            if (treeDataProvider2) {
                // TODO - remove/add view on enable/disable view
                refresh = true;
            }
            else {
                treeDataProvider2 = registerExplorer("taskExplorer", context);
            }
        }
    }

    //
    // Integrated shell
    //
    if (e.affectsConfiguration("terminal.integrated.shell.windows") ||
        e.affectsConfiguration("terminal.integrated.shell.linux") ||
        e.affectsConfiguration("terminal.integrated.shell.macos")) {
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
    else if (taskTypes?.length > 0) {
        util.forEachAsync(taskTypes, async (t: string) => {
            await refreshTree(t);
        });
    }
}


async function registerFileWatchers(context: ExtensionContext)
{
    if (configuration.get<boolean>("enableAnt"))
    {
        await registerFileWatcher(context, "ant", util.getAntGlobPattern());
    }

    if (configuration.get<boolean>("enableAppPublisher")) {
        await registerFileWatcher(context, "app-publisher", constants.GLOB_APPPUBLISHER, true);
    }

    if (configuration.get<boolean>("enableBash")) {
        await registerFileWatcher(context, "bash", constants.GLOB_BASH, true);
    }

    if (configuration.get<boolean>("enableBatch")) {
        await registerFileWatcher(context, "batch", constants.GLOB_BATCH, true);
    }

    if (configuration.get<boolean>("enableGradle")) {
        await registerFileWatcher(context, "gradle", constants.GLOB_GRADLE);
    }

    if (configuration.get<boolean>("enableGrunt")) {
        await registerFileWatcher(context, "grunt", constants.GLOB_GRUNT);
    }

    if (configuration.get<boolean>("enableGulp")) {
        await registerFileWatcher(context, "gulp", constants.GLOB_GULP);
    }

    if (configuration.get<boolean>("enableMake")) {
        await registerFileWatcher(context, "make", constants.GLOB_MAKEFILE);
    }

    if (configuration.get<boolean>("enableNpm")) {
        await registerFileWatcher(context, "npm", constants.GLOB_NPM);
    }

    if (configuration.get<boolean>("enableNsis")) {
        await registerFileWatcher(context, "nsis", constants.GLOB_NSIS, true);
    }

    if (configuration.get<boolean>("enablePerl")) {
        await registerFileWatcher(context, "perl", constants.GLOB_PERL, true);
    }

    if (configuration.get<boolean>("enablePowershell")) {
        await registerFileWatcher(context, "powershell", constants.GLOB_POWERSHELL, true);
    }

    if (configuration.get<boolean>("enablePython")) {
        await registerFileWatcher(context, "python", constants.GLOB_PYTHON, true);
    }

    if (configuration.get<boolean>("enableRuby")) {
        await registerFileWatcher(context, "ruby", constants.GLOB_RUBY, true);
    }

    if (configuration.get<boolean>("enableTsc")) {
        await registerFileWatcher(context, "tsc", constants.GLOB_TYPESCRIPT);
    }

    if (configuration.get<boolean>("enableWorkspace")) {
        await registerFileWatcher(context, "workspace", constants.GLOB_VSCODE);
    }
}


export async function refreshTree(taskType?: string, uri?: Uri)
{
    let refreshedTasks = false;
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
    if (configuration.get<boolean>("enableSideBar") && treeDataProvider) {
        refreshedTasks = await treeDataProvider.refresh(taskType, uri);
    }
    if (configuration.get<boolean>("enableExplorerView") && treeDataProvider2) {
        // if (!refreshedTasks) {
            await treeDataProvider2.refresh(taskType, uri, refreshedTasks);
        // }
        // else {
        //     await treeDataProvider2.refresh(taskType !== "visible-event" ? false : taskType, uri);
        // }
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
    //  gulp) are provided by VSCode itself
    //
    // TODO: VSCODE API now implements "resolveTask" in addition to "provideTask".  Need to implement
    //     https://code.visualstudio.com/api/extension-guides/task-provider
    //
    registerTaskProvider("ant", new AntTaskProvider(), context);                      // Apache Ant Build Automation Tool
    registerTaskProvider("app-publisher", new AppPublisherTaskProvider(), context);   // App Publisher (work related)
    registerTaskProvider("gradle", new GradleTaskProvider(), context);                // Gradle Mulit-Language Automation Tool
    registerTaskProvider("grunt", new GruntTaskProvider(), context);                  // Gulp JavaScript Toolkit
    registerTaskProvider("gulp", new GulpTaskProvider(), context);                    // Grunt JavaScript Task Runner
    registerTaskProvider("make", new MakeTaskProvider(), context);                    // C/C++ Makefile
    //
    // The 'script' provider handles all file based 'scripts', e.g. batch files, bash, powershell, etc
    //
    registerTaskProvider("script", new ScriptTaskProvider(), context);
}


async function registerFileWatcher(context: ExtensionContext, taskType: string, fileBlob: string, isScriptType?: boolean, enabled?: boolean)
{
    util.log("Register file watcher for task type '" + taskType + "'");

    let watcher: FileSystemWatcher = watchers.get(taskType);

    if (workspace.workspaceFolders) {
        await cache.buildCache(taskType, fileBlob);
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
        if (!isScriptType) {
            watcherDisposables.set(taskType, watcher.onDidChange(async _e => {
                logFileWatcherEvent(_e, "change");
                await refreshTree(taskType, _e);
            }));
        }
        watcherDisposables.set(taskType, watcher.onDidDelete(async _e => {
            logFileWatcherEvent(_e, "delete");
            await cache.removeFileFromCache(taskType, _e);
            await refreshTree(taskType, _e);
        }));
        watcherDisposables.set(taskType, watcher.onDidCreate(async _e => {
            logFileWatcherEvent(_e, "create");
            await cache.addFileToCache(taskType, _e);
            await refreshTree(taskType, _e);
        }));
    }
}


function logFileWatcherEvent(uri: Uri, type: string)
{
    util.log("file change event");
    util.logValue("   type", type);
    util.logValue("   file", uri.fsPath);
}


function registerExplorer(name: string, context: ExtensionContext, enabled?: boolean): TaskTreeDataProvider | undefined
{
    util.log("Register explorer view / tree provider '" + name + "'");

    if (enabled !== false)
    {
        if (workspace.workspaceFolders)
        {
            const treeDataProvider = new TaskTreeDataProvider(name, context);
            const treeView = window.createTreeView(name, { treeDataProvider, showCollapseAll: true });
            treeView.onDidChangeVisibility(async _e => {
                if (_e.visible) {
                    util.log("view visibility change event");
                    await refreshTree("visible-event");
                }
            });
            views.set(name, treeView);
            context.subscriptions.push(views.get(name));
            util.log("   Tree data provider registered'" + name + "'");
            return treeDataProvider;
        }
        else {
            util.log("✘ No workspace folders!!!");
        }
    }

    return undefined;
}
