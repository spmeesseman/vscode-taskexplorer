/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {
    commands, Disposable, ExtensionContext, OutputChannel, Uri, TreeView, TreeItem, TaskProvider,
    workspace, window, FileSystemWatcher, ConfigurationChangeEvent, RelativePattern, WorkspaceFolder
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
import { Storage } from "./common/storage";
import { log, logValue, getExcludesGlob, isExcluded, properCase } from "./util";
export let treeDataProvider: TaskTreeDataProvider | undefined;
export let treeDataProvider2: TaskTreeDataProvider | undefined;
export let logOutputChannel: OutputChannel | undefined;
export let storage: Storage | undefined;
export let views: Map<string, TreeView<TreeItem>> = new Map();
export let filesCache: Map<string, Set<any>> = new Map();
const watchers: Map<string, FileSystemWatcher> = new Map();

export function getTreeDataProvider(name?: string)
{
    if (name === "taskExplorerSideBar") {
        return treeDataProvider;
    }
    return treeDataProvider2;
}

export async function activate(context: ExtensionContext, disposables: Disposable[])
{
    //
    // Set up a log in the Output window
    //
    logOutputChannel = window.createOutputChannel("Task Explorer");
    context.subscriptions.push(logOutputChannel);
    context.subscriptions.push(commands.registerCommand("taskExplorer.showOutput", () => logOutputChannel.show()));
    const showOutput = configuration.get<boolean>("showOutput");
    if (showOutput) {
        logOutputChannel.show();
    }

    log("");
    log("Init extension");

    //
    // Register file type watchers
    //
    await registerFileWatchers(context);

    //
    // Register internal task providers.  Npm, Tas, Gulp, and Grunt type tasks are provided
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
        for (const a in _e.added) {
            log("Workspace folder added: " + _e.added[a].name, 1);
            await addFolderToCache(_e.added[a]);
        }
        for (const r in _e.removed)
        {
            log("Workspace folder removed: " + _e.removed[r].name, 1);
            // window.setStatusBarMessage("$(loading) Task Explorer - Removing projects...");
            for (const key in filesCache.keys)
            {
                const toRemove = [];
                const obj = filesCache.get(key);
                obj.forEach((item) =>
                {
                    if (item.folder.uri.fsPath === _e.removed[r].uri.fsPath) {
                        toRemove.push(item);
                    }
                });
                if (toRemove.length > 0) {
                    for (const tr in toRemove) {
                        obj.delete(toRemove[tr]);
                    }
                }
            }
            // window.setStatusBarMessage("");
        }
        refreshTree();
    });
    context.subscriptions.push(workspaceWatcher);

    //
    // Register configurations/settings change watcher
    //
    const d = workspace.onDidChangeConfiguration(e => {
        processConfigChanges(context, e);
    });
    context.subscriptions.push(d);

    //
    // Set up extension custom storage
    //
    storage = new Storage(context.globalState);

    log("   Task Explorer activated");
}


function processConfigChanges(context: ExtensionContext, e: ConfigurationChangeEvent)
{
    let refresh: boolean;

    if (e.affectsConfiguration("taskExplorer.exclude")) {
        refresh = true;
    }

    if (e.affectsConfiguration("taskExplorer.enableAnt") || e.affectsConfiguration("taskExplorer.includeAnt")) {
        registerFileWatcherAnt(context, configuration.get<boolean>("enableAnt"));
        refresh = true;
    }

    if (e.affectsConfiguration("taskExplorer.enableAppPublisher")) {
        registerFileWatcher(context, "app-publisher", "**/.publishrc*", false, configuration.get<boolean>("enableAppPublisher"));
        refresh = true;
    }

    if (e.affectsConfiguration("taskExplorer.enableBash")) {
        registerFileWatcher(context, "bash", "**/*.[Ss][Hh]", true, configuration.get<boolean>("enableBash"));
        refresh = true;
    }

    if (e.affectsConfiguration("taskExplorer.enableBatch")) {
        registerFileWatcher(context, "batch", "**/*.[Bb][Aa][Tt]", true, configuration.get<boolean>("enableBatch"));
        registerFileWatcher(context, "batch", "**/*.[Cc][Mm][Dd]", true, configuration.get<boolean>("enableBatch"));
        refresh = true;
    }

    if (e.affectsConfiguration("taskExplorer.enableGradle")) {
        registerFileWatcher(context, "grunt", "**/*.[Gg][Rr][Aa][Dd][Ll][Ee]", false, configuration.get<boolean>("enableGradle"));
        refresh = true;
    }

    if (e.affectsConfiguration("taskExplorer.enableGrunt")) {
        registerFileWatcher(context, "grunt", "**/[Gg][Rr][Uu][Nn][Tt][Ff][Ii][Ll][Ee].[Jj][Ss]", false, configuration.get<boolean>("enableGrunt"));
        refresh = true;
    }

    if (e.affectsConfiguration("taskExplorer.enableGulp")) {
        registerFileWatcher(context, "gulp", "**/[Gg][Uu][Ll][Pp][Ff][Ii][Ll][Ee].[Jj][Ss]", false, configuration.get<boolean>("enableGulp"));
        refresh = true;
    }

    if (e.affectsConfiguration("taskExplorer.enableMake")) {
        registerFileWatcher(context, "make", "**/[Mm]akefile", false, configuration.get<boolean>("enableMake"));
        refresh = true;
    }

    if (e.affectsConfiguration("taskExplorer.enableNpm")) {
        registerFileWatcher(context, "npm", "**/package.json", false, configuration.get<boolean>("enableNpm"));
        refresh = true;
    }

    if (e.affectsConfiguration("taskExplorer.enableNsis")) {
        registerFileWatcher(context, "nsis", "**/*.[Nn][Ss][Ii]", true, configuration.get<boolean>("enableNsis"));
        refresh = true;
    }

    if (e.affectsConfiguration("taskExplorer.enablePerl")) {
        registerFileWatcher(context, "perl", "**/*.[Pp][Ll]", true, configuration.get<boolean>("enablePerl"));
        refresh = true;
    }

    if (e.affectsConfiguration("taskExplorer.enablePowershell")) {
        registerFileWatcher(context, "powershell", "**/*.[Pp][Ss]1", true, configuration.get<boolean>("enablePowershell"));
        refresh = true;
    }

    if (e.affectsConfiguration("taskExplorer.enablePython")) {
        registerFileWatcher(context, "python", "**/[Ss][Ee][Tt][Uu][Pp].[Pp][Yy]", true, configuration.get<boolean>("enablePython"));
        refresh = true;
    }

    if (e.affectsConfiguration("taskExplorer.enableRuby")) {
        registerFileWatcher(context, "ruby", "**/*.rb", true, configuration.get<boolean>("enableRuby"));
        refresh = true;
    }

    if (e.affectsConfiguration("taskExplorer.enableTsc")) {
        registerFileWatcher(context, "tsc", "**/tsconfig.json", false, configuration.get<boolean>("enableTsc"));
        refresh = true;
    }

    if (e.affectsConfiguration("taskExplorer.enableWorkspace")) {
        registerFileWatcher(context, "workspace", "**/.vscode/tasks.json", false, configuration.get<boolean>("enableWorkspace"));
        refresh = true;
    }

    if (e.affectsConfiguration("taskExplorer.enableSideBar")) {
        if (configuration.get<boolean>("enableSideBar")) {
            if (treeDataProvider) {
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

    if (refresh) {
        refreshTree();
    }
}


export async function addFolderToCache(folder?: WorkspaceFolder | undefined)
{
    if (configuration.get<boolean>("enableAnt")) {
        await buildCache("ant", "ant", "**/[Bb]uild.xml", folder);
    }

    if (configuration.get<boolean>("enableAppPublisher")) {
        await buildCache("app-publisher", "app-publisher", "**/.publishrc*", folder);
    }

    if (configuration.get<boolean>("enableBash")) {
        await buildCache("script", "bash", "**/*.[Ss][Hh]", folder);
    }

    if (configuration.get<boolean>("enableBatch")) {
        await buildCache("script", "batch", "**/*.[Bb][Aa][Tt]", folder);
        await buildCache("script", "batch", "**/*.[Cc][Mm][Dd]", folder);
    }

    if (configuration.get<boolean>("enableGradle")) {
        await buildCache("gradle", "gradle", "**/*.[Gg][Rr][Aa][Dd][Ll][Ee]", folder);
    }

    if (configuration.get<boolean>("enableGrunt")) {
        await buildCache("grunt", "grunt", "**/[Gg][Rr][Uu][Nn][Tt][Ff][Ii][Ll][Ee].[Jj][Ss]", folder);
    }

    if (configuration.get<boolean>("enableGulp")) {
        await buildCache("gulp", "gulp", "**/[Gg][Uu][Ll][Pp][Ff][Ii][Ll][Ee].[Jj][Ss]", folder);
    }

    if (configuration.get<boolean>("enableMake")) {
        await buildCache("make", "make", "**/[Mm]akefile", folder);
    }

    if (configuration.get<boolean>("enableNpm")) {
        await buildCache("npm", "npm", "**/package.json", folder);
    }

    if (configuration.get<boolean>("enableNsis")) {
        await buildCache("script", "nsis", "**/*.[Nn][Ss][Ii]", folder);
    }

    if (configuration.get<boolean>("enablePerl")) {
        await buildCache("script", "perl", "**/*.[Pp][Ll]", folder);
    }

    if (configuration.get<boolean>("enablePowershell")) {
        await buildCache("script", "powershell", "**/*.[Pp][Ss]1", folder);
    }

    if (configuration.get<boolean>("enablePython")) {
        await buildCache("script", "python", "**/[Ss][Ee][Tt][Uu][Pp].[Pp][Yy]", folder);
    }

    if (configuration.get<boolean>("enableRuby")) {
        await buildCache("script", "ruby", "**/*.[Rr][Bb]", folder);
    }

    if (configuration.get<boolean>("enableTsc")) {
        await buildCache("tsc", "tsc", "**/tsconfig.json", folder);
    }

    if (configuration.get<boolean>("enableWorkspace")) {
        await buildCache("workspace", "workspace", "**/.vscode/tasks.json", folder);
    }
}


async function addFileToCache(taskAlias: string, uri: Uri)
{
    if (!filesCache.get(taskAlias)) {
        filesCache.set(taskAlias, new Set());
    }
    const taskCache = filesCache.get(taskAlias);
    taskCache.add({
        uri,
        folder: workspace.getWorkspaceFolder(uri)
    });
}


async function removeFileFromCache(taskAlias: string, uri: Uri)
{
    if (!filesCache.get(taskAlias)) {
        return;
    }
    const taskCache = filesCache.get(taskAlias);
    const toRemove = [];
    taskCache.forEach((item) =>
    {
        if (item.uri.fsPath === uri.fsPath) {
            toRemove.push(item);
        }
    });
    if (toRemove.length > 0) {
        for (const tr in toRemove) {
            taskCache.delete(toRemove[tr]);
        }
    }

}


async function buildCache(taskAlias: string, taskType: string, fileBlob: string, wsfolder?: WorkspaceFolder | undefined)
{
    if (!filesCache.get(taskAlias)) {
        filesCache.set(taskAlias, new Set());
    }
    const fCache = filesCache.get(taskAlias);
    let dispTaskType = properCase(taskType);
    if (dispTaskType.indexOf("Ant") !== -1) {
        dispTaskType = "Ant";
    }
    if (!wsfolder)
    {
        log("Scan all projects");
        window.setStatusBarMessage("$(loading) Task Explorer - Scanning projects...");

        if (workspace.workspaceFolders)
        {
            try {
                for (const folder of workspace.workspaceFolders)
                {
                    log("   Scan project: " + folder.name);
                    window.setStatusBarMessage("$(loading~spin) Scanning for " + dispTaskType + " tasks in project " + folder.name + "...");
                    const relativePattern = new RelativePattern(folder, fileBlob);
                    const paths = await workspace.findFiles(relativePattern, getExcludesGlob(folder));
                    for (const fpath of paths)
                    {
                        if (!isExcluded(fpath.path)) {
                        // if (!isExcluded(fpath.path) && !fCache.has(fpath)) {
                            fCache.add({
                                uri: fpath,
                                folder
                            });
                        }
                    }
                }
            // tslint:disable-next-line: no-empty
            } catch (error) {}
        }
    }
    else
    {
        log("Scan project: " + wsfolder.name);
        window.setStatusBarMessage("$(loading~spin) Scanning for tasks in project " + wsfolder.name + "...");

        const relativePattern = new RelativePattern(wsfolder, fileBlob);
        const paths = await workspace.findFiles(relativePattern, getExcludesGlob(wsfolder));
        for (const fpath of paths)
        {
            if (!isExcluded(fpath.path)) {
            // if (!isExcluded(fpath.path) && !fCache.has(fpath)) {
                fCache.add({
                    uri: fpath,
                    folder: wsfolder
                });
            }
        }
    }

    window.setStatusBarMessage("");
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
        await registerFileWatcher(context, "batch", "**/*.[Cc][Mm][Dd]", true);
    }

    if (configuration.get<boolean>("enableGradle")) {
        await registerFileWatcher(context, "gradle", "**/*.[Gg][Rr][Aa][Dd][Ll][Ee]");
    }

    if (configuration.get<boolean>("enableGrunt")) {
        await registerFileWatcher(context, "grunt", "**/[Gg][Rr][Uu][Nn][Tt][Ff][Ii][Ll][Ee].[Jj][Ss]");
    }

    if (configuration.get<boolean>("enableGulp")) {
        await registerFileWatcher(context, "gulp", "**/[Gg][Uu][Ll][Pp][Ff][Ii][Ll][Ee].[Jj][Ss]");
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


async function refreshTree(taskType?: string, uri?: Uri)
{
    let refreshedTasks = false;
    // window.setStatusBarMessage("$(loading) Task Explorer - Refreshing tasks...");

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

    // window.setStatusBarMessage("");
}


function registerTaskProviders(context: ExtensionContext)
{
    //
    // Internal Task Providers
    //
    // These tak types are provided internally by the extension.  Some task types (npm, grunt,
    //  gulp) are provided by VSCode itself
    //
    context.subscriptions.push(workspace.registerTaskProvider("ant", new AntTaskProvider()));
    context.subscriptions.push(workspace.registerTaskProvider("make", new MakeTaskProvider()));
    context.subscriptions.push(workspace.registerTaskProvider("script", new ScriptTaskProvider()));
    context.subscriptions.push(workspace.registerTaskProvider("grunt", new GruntTaskProvider()));
    context.subscriptions.push(workspace.registerTaskProvider("gulp", new GulpTaskProvider()));
    context.subscriptions.push(workspace.registerTaskProvider("gradle", new GradleTaskProvider()));
    context.subscriptions.push(workspace.registerTaskProvider("app-publisher", new AppPublisherTaskProvider()));
}


async function registerFileWatcherAnt(context: ExtensionContext, enabled?: boolean)
{
    registerFileWatcher(context, "ant", "**/[Bb]uild.xml", false, enabled);

    //
    // For extra file globs configured in settings, we need to first go through and disable
    // all current watchers since there is no way of knowing which glob patterns were
    // removed (if any).
    //
    for (const key in watchers.keys)
    {
        if (key.startsWith("ant") && key !== "ant")
        {
            const watcher = watchers.get(key);
            watcher.onDidChange(_e => undefined);
            watcher.onDidDelete(_e => undefined);
            watcher.onDidCreate(_e => undefined);
        }
    }

    const includeAnt: string[] = configuration.get("includeAnt");
    if (includeAnt && includeAnt.length > 0) {
        for (let i = 0; i < includeAnt.length; i++) {
            await registerFileWatcher(context, "ant-" + includeAnt[i], includeAnt[i], false, enabled);
        }
    }
}


async function registerFileWatcher(context: ExtensionContext, taskType: string, fileBlob: string, isScriptType?: boolean, enabled?: boolean)
{
    let watcher: FileSystemWatcher = watchers.get(taskType);

    await buildCache(isScriptType && taskType !== "app-publisher" ? "script" : taskType, taskType, fileBlob);

    if (enabled !== false) {
        if (!watcher) {
            watcher = workspace.createFileSystemWatcher(fileBlob);
            watchers.set(taskType, watcher);
            context.subscriptions.push(watcher);
        }
        if (!isScriptType) {
            watcher.onDidChange(_e => {
                logFileWatcherEvent(_e, "change");
                refreshTree(taskType, _e);
            });
        }
        watcher.onDidDelete(_e => {
            logFileWatcherEvent(_e, "delete");
            removeFileFromCache(taskType, _e);
            refreshTree(taskType, _e);
        });
        watcher.onDidCreate(_e => {
            logFileWatcherEvent(_e, "create");
            addFileToCache(taskType, _e);
            refreshTree(taskType, _e);
        });
    }
    else if (watcher) {
        if (!isScriptType) {
            watcher.onDidChange(_e => undefined);
        }
        watcher.onDidDelete(_e => undefined);
        watcher.onDidCreate(_e => undefined);
    }
}


function logFileWatcherEvent(uri: Uri, type: string)
{
    log("file change event");
    logValue("   type", type);
    logValue("   file", uri.fsPath);
}


function registerExplorer(name: string, context: ExtensionContext, enabled?: boolean): TaskTreeDataProvider | undefined
{
    if (enabled !== false)
    {
        if (workspace.workspaceFolders)
        {
            const treeDataProvider = new TaskTreeDataProvider(name, context);
            const treeView = window.createTreeView(name, { treeDataProvider, showCollapseAll: true });
            treeView.onDidChangeVisibility(_e => {
                if (_e.visible) {
                    log("view visibility change event");
                    refreshTree("visible-event");
                }
            });
            views.set(name, treeView);
            context.subscriptions.push(views.get(name));
            return treeDataProvider;
        }
        else {
            console.log("✘ Task Explorer - No workspace folders!!!");
            log("No workspace folders!!!");
        }
    }
    return undefined;
}


// tslint:disable-next-line: no-empty
export function deactivate() {}
