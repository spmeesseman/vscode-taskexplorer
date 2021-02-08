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
import * as path from "path";

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
        util.log("Workspace folder added: " + wsf[f].name, 1);
        await cache.addFolderToCache(wsf[f]);
    }
}


export async function removeWsFolder(wsf: readonly WorkspaceFolder[])
{
    for (const f in wsf)
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
                    obj.delete(toRemove[tr]);
                }
            }
        }
    }
}


 async function processConfigChanges(context: ExtensionContext, e: ConfigurationChangeEvent)
{
    let refresh: boolean;

    if (configuration.get<boolean>("autoRefresh") === false) {
        return;
    }

    if (e.affectsConfiguration("taskExplorer.exclude")) {
        refresh = true;
    }

    if (e.affectsConfiguration("taskExplorer.groupWithSeparator")) {
        refresh = true;
    }

    if (e.affectsConfiguration("taskExplorer.groupSeparator")) {
        refresh = true;
    }

    if (e.affectsConfiguration("taskExplorer.useAnt") || e.affectsConfiguration("taskExplorer.useGulp")) {
        refresh = true;
    }

    if (e.affectsConfiguration("taskExplorer.showLastTasks"))
    {
        if (configuration.get<boolean>("enableSideBar") && treeDataProvider)
        {
            await treeDataProvider2.showLastTasks(configuration.get<boolean>("showLastTasks"));
        }
        if (configuration.get<boolean>("enableExplorerView") && treeDataProvider2)
        {
            await treeDataProvider2.showLastTasks(configuration.get<boolean>("showLastTasks"));
        }
    }

    if (e.affectsConfiguration("taskExplorer.enableAnt") || e.affectsConfiguration("taskExplorer.includeAnt")) {
        await registerFileWatcherAnt(context, configuration.get<boolean>("enableAnt"));
        refresh = true;
    }

    if (e.affectsConfiguration("taskExplorer.enableAppPublisher")) {
        await registerFileWatcher(context, "app-publisher", "**/.publishrc*", false, configuration.get<boolean>("enableAppPublisher"));
        refresh = true;
    }

    if (e.affectsConfiguration("taskExplorer.enableBash")) {
        await registerFileWatcher(context, "bash", "**/*.[Ss][Hh]", true, configuration.get<boolean>("enableBash"));
        refresh = true;
    }

    if (e.affectsConfiguration("taskExplorer.enableBatch")) {
        await registerFileWatcher(context, "batch", "**/*.[Bb][Aa][Tt]", true, configuration.get<boolean>("enableBatch"));
        await registerFileWatcher(context, "batch", "**/*.[Cc][Mm][Dd]", true, configuration.get<boolean>("enableBatch"));
        refresh = true;
    }

    if (e.affectsConfiguration("taskExplorer.enableGradle")) {
        await registerFileWatcher(context, "gradle", "**/*.[Gg][Rr][Aa][Dd][Ll][Ee]", false, configuration.get<boolean>("enableGradle"));
        refresh = true;
    }

    if (e.affectsConfiguration("taskExplorer.enableGrunt")) {
        await registerFileWatcher(context, "grunt", "**/[Gg][Rr][Uu][Nn][Tt][Ff][Ii][Ll][Ee].[Jj][Ss]", false, configuration.get<boolean>("enableGrunt"));
        refresh = true;
    }

    if (e.affectsConfiguration("taskExplorer.enableGulp")) {
        await registerFileWatcher(context, "gulp", "**/[Gg][Uu][Ll][Pp][Ff][Ii][Ll][Ee].*[JjTt][Ss]", false, configuration.get<boolean>("enableGulp"));
        refresh = true;
    }

    if (e.affectsConfiguration("taskExplorer.enableMake")) {
        await registerFileWatcher(context, "make", "**/[Mm]akefile", false, configuration.get<boolean>("enableMake"));
        refresh = true;
    }

    if (e.affectsConfiguration("taskExplorer.enableNpm")) {
        await registerFileWatcher(context, "npm", "**/package.json", false, configuration.get<boolean>("enableNpm"));
        refresh = true;
    }

    if (e.affectsConfiguration("taskExplorer.enableNsis")) {
        await registerFileWatcher(context, "nsis", "**/*.[Nn][Ss][Ii]", true, configuration.get<boolean>("enableNsis"));
        refresh = true;
    }

    if (e.affectsConfiguration("taskExplorer.enablePerl")) {
        await registerFileWatcher(context, "perl", "**/*.[Pp][Ll]", true, configuration.get<boolean>("enablePerl"));
        refresh = true;
    }

    if (e.affectsConfiguration("taskExplorer.enablePowershell")) {
        await registerFileWatcher(context, "powershell", "**/*.[Pp][Ss]1", true, configuration.get<boolean>("enablePowershell"));
        refresh = true;
    }

    if (e.affectsConfiguration("taskExplorer.enablePython")) {
        await registerFileWatcher(context, "python", "**/[Ss][Ee][Tt][Uu][Pp].[Pp][Yy]", true, configuration.get<boolean>("enablePython"));
        refresh = true;
    }

    if (e.affectsConfiguration("taskExplorer.enableRuby")) {
        await registerFileWatcher(context, "ruby", "**/*.rb", true, configuration.get<boolean>("enableRuby"));
        refresh = true;
    }

    if (e.affectsConfiguration("taskExplorer.enableTsc")) {
        await registerFileWatcher(context, "tsc", "**/tsconfig.json", false, configuration.get<boolean>("enableTsc"));
        refresh = true;
    }

    if (e.affectsConfiguration("taskExplorer.enableWorkspace")) {
        await registerFileWatcher(context, "workspace", "**/.vscode/tasks.json", false, configuration.get<boolean>("enableWorkspace"));
        refresh = true;
    }

    if (e.affectsConfiguration("npm.packageManager", null)) {
        refresh = true;
    }

    if (e.affectsConfiguration("taskExplorer.enableSideBar")) {
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

    if (e.affectsConfiguration("taskExplorer.enableExplorerView")) {
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

    if (e.affectsConfiguration("taskExplorer.pathToAnsicon") || e.affectsConfiguration("taskExplorer.pathToAnt") ||
        e.affectsConfiguration("taskExplorer.pathToGradle") || e.affectsConfiguration("taskExplorer.pathToMake") ||
        e.affectsConfiguration("taskExplorer.pathToNsis") || e.affectsConfiguration("taskExplorer.pathToPerl") ||
        e.affectsConfiguration("taskExplorer.pathToPython") || e.affectsConfiguration("taskExplorer.pathToRuby")  ||
        e.affectsConfiguration("taskExplorer.pathToBash") || e.affectsConfiguration("taskExplorer.pathToAppPublisher") ||
        e.affectsConfiguration("taskExplorer.pathToPowershell")) {
        refresh = true;
    }

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
}


async function registerFileWatchers(context: ExtensionContext)
{
    if (configuration.get<boolean>("enableAnt")) {
        await registerFileWatcherAnt(context);
    }

    if (configuration.get<boolean>("enableAppPublisher")) {
        await registerFileWatcher(context, "app-publisher", "**/.publishrc*", true);
    }

    if (configuration.get<boolean>("enableBash")) {
        await registerFileWatcher(context, "bash", "**/*.[Ss][Hh]", true);
    }

    if (configuration.get<boolean>("enableBatch")) {
        await registerFileWatcher(context, "batch", "**/*.[Bb][Aa][Tt]", true);
        await registerFileWatcher(context, "batch2", "**/*.[Cc][Mm][Dd]", true);
    }

    if (configuration.get<boolean>("enableGradle")) {
        await registerFileWatcher(context, "gradle", "**/*.[Gg][Rr][Aa][Dd][Ll][Ee]");
    }

    if (configuration.get<boolean>("enableGrunt")) {
        await registerFileWatcher(context, "grunt", "**/[Gg][Rr][Uu][Nn][Tt][Ff][Ii][Ll][Ee].[Jj][Ss]");
    }

    if (configuration.get<boolean>("enableGulp")) {
        await registerFileWatcher(context, "gulp", "**/[Gg][Uu][Ll][Pp][Ff][Ii][Ll][Ee].*[JjTt][Ss]");
    }

    if (configuration.get<boolean>("enableMake")) {
        await registerFileWatcher(context, "make", "**/[Mm]akefile");
    }

    if (configuration.get<boolean>("enableNpm")) {
        await registerFileWatcher(context, "npm", "**/package.json");
    }

    if (configuration.get<boolean>("enableNsis")) {
        await registerFileWatcher(context, "nsis", "**/*.[Nn][Ss][Ii]", true);
    }

    if (configuration.get<boolean>("enablePerl")) {
        await registerFileWatcher(context, "perl", "**/*.[Pp][Ll]", true);
    }

    if (configuration.get<boolean>("enablePowershell")) {
        await registerFileWatcher(context, "powershell", "**/*.[Pp][Ss]1", true);
    }

    if (configuration.get<boolean>("enablePython")) {
        await registerFileWatcher(context, "python", "**/[Ss][Ee][Tt][Uu][Pp].[Pp][Yy]", true);
    }

    if (configuration.get<boolean>("enableRuby")) {
        await registerFileWatcher(context, "ruby", "**/*.[Rr][Bb]", true);
    }

    if (configuration.get<boolean>("enableTsc")) {
        await registerFileWatcher(context, "tsc", "**/tsconfig.json");
    }

    if (configuration.get<boolean>("enableWorkspace")) {
        await registerFileWatcher(context, "workspace", "**/.vscode/tasks.json");
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
    // If the task type received from a filewatcher event is "ant-*" then it is a custom
    // defined ant file in the includeAnt setting, named accordingly so that the watchers
    // can be tracked.  change the taskType to "ant" here
    //
    if (taskType && taskType.indexOf("ant-") !== -1) {
        taskType = "ant";
    }

    //
    // Refresh tree
    //
    // Note the task cache only needs to be refreshed once if both the explorer view and
    // the sidebar view are being used and/or enabled
    //
    if (configuration.get<boolean>("enableSideBar") && treeDataProvider) {
        refreshedTasks = await treeDataProvider.refresh(taskType, uri);
    }
    if (configuration.get<boolean>("enableExplorerView") && treeDataProvider2) {
        if (!refreshedTasks) {
            await treeDataProvider2.refresh(taskType, uri);
        }
        else {
            await treeDataProvider2.refresh(taskType !== "visible-event" ? false : taskType, uri);
        }
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
    registerTaskProvider("ant", new AntTaskProvider(), context);
    registerTaskProvider("app-publisher", new AppPublisherTaskProvider(), context);
    registerTaskProvider("gradle", new GradleTaskProvider(), context);
    registerTaskProvider("grunt", new GruntTaskProvider(), context);
    registerTaskProvider("gulp", new GulpTaskProvider(), context);
    registerTaskProvider("make", new MakeTaskProvider(), context);
    registerTaskProvider("script", new ScriptTaskProvider(), context);
}


async function registerFileWatcherAnt(context: ExtensionContext, enabled?: boolean)
{
    await registerFileWatcher(context, "ant", "**/[Bb]uild.xml", false, enabled);

    //
    // For extra file globs configured in settings, we need to first go through and disable
    // all current watchers since there is no way of knowing which glob patterns were
    // removed (if any).
    //
    watchers.forEach((watcher, key) => {
        if (key.startsWith("ant") && key !== "ant")
        {
            const watcher = watchers.get(key);
            watcher.onDidChange(_e => undefined);
            watcher.onDidDelete(_e => undefined);
            watcher.onDidCreate(_e => undefined);
        }
    });

    const includeAnt: string[] = configuration.get("includeAnt");
    if (includeAnt && includeAnt.length > 0) {
        for (let i = 0; i < includeAnt.length; i++) {
            await registerFileWatcher(context, "ant-" + includeAnt[i], includeAnt[i], false, enabled);
        }
    }
}


async function registerFileWatcher(context: ExtensionContext, taskType: string, fileBlob: string, isScriptType?: boolean, enabled?: boolean)
{
    util.log("Register file watcher for task type '" + taskType + "'");

    let taskAlias = taskType;
    let taskTypeR = taskType !== "batch2" ? taskType : "batch";
    let watcher: FileSystemWatcher = watchers.get(taskTypeR);

    if (taskType && taskType.indexOf("ant-") !== -1) {
        taskAlias = "ant";
        taskTypeR = "ant";
    }
    if (taskType && taskType.indexOf("batch2") !== -1) {
        taskAlias = "batch";
    }

    if (workspace.workspaceFolders) {
        await cache.buildCache(isScriptType && taskAlias !== "app-publisher" ? "script" : taskAlias, taskTypeR, fileBlob);
    }

    if (watcher)
    {
        const watcherDisposable = watcherDisposables.get(taskTypeR);
        if (watcherDisposable)
        {
            watcherDisposable.dispose();
            watcherDisposables.delete(taskTypeR);
        }
    }

    if (enabled !== false)
    {
        if (!watcher) {
            watcher = workspace.createFileSystemWatcher(fileBlob);
            watchers.set(taskTypeR, watcher);
            context.subscriptions.push(watcher);
        }
        if (!isScriptType) {
            watcherDisposables.set(taskTypeR, watcher.onDidChange(async _e => {
                logFileWatcherEvent(_e, "change");
                await refreshTree(taskTypeR, _e);
            }));
        }
        watcherDisposables.set(taskTypeR, watcher.onDidDelete(async _e => {
            logFileWatcherEvent(_e, "delete");
            await cache.removeFileFromCache(taskTypeR, _e);
            await refreshTree(taskTypeR, _e);
        }));
        watcherDisposables.set(taskTypeR, watcher.onDidCreate(async _e => {
            logFileWatcherEvent(_e, "create");
            await cache.addFileToCache(taskTypeR, _e);
            await refreshTree(taskTypeR, _e);
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
            treeView.onDidChangeVisibility(_e => {
                if (_e.visible) {
                    util.log("view visibility change event");
                    refreshTree("visible-event");
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
