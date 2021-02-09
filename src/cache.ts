/* eslint-disable prefer-arrow/prefer-arrow-functions */

import { workspace, window, RelativePattern, WorkspaceFolder, Uri, StatusBarAlignment, StatusBarItem } from "vscode";
import * as util from "./util";
import { configuration } from "./common/configuration";
import * as constants from "./common/constants";

let cacheBuilding = false;
let folderCaching = false;
let cancel = false;

export const filesCache: Map<string, Set<any>> = new Map();


export async function addFolderToCache(folder?: WorkspaceFolder | undefined)
{
    util.log("Add folder to cache", 3);
    util.logValue("   folder", !folder ? "entire workspace" : folder.name, 3);

    //
    // Wait for caches to get done building before proceeding
    //
    await waitForCache();            // If the global cache is still building, wait
    await waitForFolderCaching();    // If the folder cache is still building, wait

    folderCaching = true;  // set flag
    cacheBuilding = true;  // set flag

    //
    // For Ant tasks, users can add additional file matching globs in Settings, so use the
    // util.getAntGlllobPattern() to comine the glob patterns with the default
    //
    if (!cancel && configuration.get<boolean>("enableAnt")) {
        await buildCache("ant", util.getAntGlobPattern(), folder, false);
    }
    //
    // App Publisher (work related)
    //
    if (!cancel && configuration.get<boolean>("enableAppPublisher")) {
        await buildCache("app-publisher", constants.GLOB_APPPUBLISHER, folder, false);
    }
    //
    // Bash
    //
    if (!cancel && configuration.get<boolean>("enableBash")) {
        await buildCache("bash", constants.GLOB_BASH, folder, false);
    }
    //
    // Batch / Cmd
    //
    if (!cancel && configuration.get<boolean>("enableBatch")) {
        await buildCache("batch", constants.GLOB_BATCH, folder, false);
    }
    //
    // Gradle Mulit-Language Automation Tool
    //
    if (!cancel && configuration.get<boolean>("enableGradle")) {
        await buildCache("gradle", constants.GLOB_GRADLE, folder, false);
    }
    //
    // Grunt JavaScript Task Runner
    //
    if (!cancel && configuration.get<boolean>("enableGrunt")) {
        await buildCache("grunt", constants.GLOB_GRUNT, folder, false);
    }
    //
    // Gulp JavaScript Toolkit
    //
    if (!cancel && configuration.get<boolean>("enableGulp")) {
        await buildCache("gulp", constants.GLOB_GULP, folder, false);
    }
    //
    // C/C++ Makefile
    //
    if (!cancel && configuration.get<boolean>("enableMake")) {
        await buildCache("make", constants.GLOB_MAKEFILE, folder, false);
    }
    //
    // NPM
    // Note that NPM tasks are provided by VSCode, not this extension
    //
    if (!cancel && configuration.get<boolean>("enableNpm")) {
        await buildCache("npm", constants.GLOB_NPM, folder, false);
    }
    //
    // Nullsoft NSIS Installer
    //
    if (!cancel && configuration.get<boolean>("enableNsis")) {
        await buildCache("nsis", constants.GLOB_NSIS, folder, false);
    }
    //
    // Old Lady Perl
    //
    if (!cancel && configuration.get<boolean>("enablePerl")) {
        await buildCache("perl", constants.GLOB_PERL, folder, false);
    }
    //
    // Powershell
    //
    if (!cancel && configuration.get<boolean>("enablePowershell")) {
        await buildCache("powershell", constants.GLOB_POWERSHELL, folder, false);
    }
    //
    // Python
    //
    if (!cancel && configuration.get<boolean>("enablePython")) {
        await buildCache("python", constants.GLOB_PYTHON, folder, false);
    }
    //
    // Ruby
    //
    if (!cancel && configuration.get<boolean>("enableRuby")) {
        await buildCache("ruby", constants.GLOB_RUBY, folder, false);
    }
    //
    // Typescript
    //
    if (!cancel && configuration.get<boolean>("enableTsc")) {
        await buildCache("tsc", constants.GLOB_TYPESCRIPT, folder, false);
    }
    //
    // VSCode / Workspace
    // Note that VSCode tasks are provided by VSCode, not this extension
    //
    if (!cancel && configuration.get<boolean>("enableWorkspace")) {
        await buildCache("workspace", constants.GLOB_VSCODE, folder, false);
    }

    cacheBuilding = false;   // un-set flag
    folderCaching = false;   // un-set flag
    if (cancel) {
        util.log("Add folder to cache cancelled", 3);
    }
    else {
        util.log("Add folder to cache complete", 3);
    }
    cancel = false;          // un-set flag
}


export async function buildCache(taskType: string, fileBlob: string, wsfolder?: WorkspaceFolder | undefined, setCacheBuilding = true)
{
    const taskAlias = !util.isScriptType(taskType) ? taskType : "script";

    logBuildCache(taskType, taskAlias, fileBlob, wsfolder, setCacheBuilding);

    if (setCacheBuilding) {
        //
        // If buildCache is already running in another scope, then wait before proceeding
        //
        await waitForCache();
        cacheBuilding = true;
    }

    if (!filesCache.get(taskAlias)) {
        filesCache.set(taskAlias, new Set());
    }
    const fCache = filesCache.get(taskAlias);
    const dispTaskType = util.properCase(taskType);

    //
    // Status bar
    //
    const statusBarSpace = window.createStatusBarItem(StatusBarAlignment.Left, -10000);
    statusBarSpace.tooltip = "Task Explorer is building the task cache";
    statusBarSpace.show();

    //
    // If 'wsfolder' if falsey, build the entire cache.  If truthy, build the cache for the
    // specified folder only
    //
    if (!wsfolder)
    {
        util.logBlank(1);
        util.log("   Build cache - Scan all projects for taskType '" + taskType + "' (" + dispTaskType + ")", 1);
        await buildFolderCaches(fCache, dispTaskType, fileBlob, statusBarSpace, setCacheBuilding);
    }
    else {
        await buildFolderCache(fCache, wsfolder, dispTaskType, fileBlob, statusBarSpace, setCacheBuilding);
    }

    //
    // Release status bar reserved space
    //
    disposeStatusBarSpace(statusBarSpace);

    util.log("Cache building complete", 1);
    if (setCacheBuilding) {
        cancel = false;           // reset flag
        cacheBuilding = false;    // reset flag
    }
}


async function buildFolderCache(fCache: Set<any>, folder: WorkspaceFolder, taskType: string, fileBlob: string, statusBarSpace: StatusBarItem, setCacheBuilding: boolean)
{
    if (cancel) {
        cancelInternal(setCacheBuilding, statusBarSpace);
        return;
    }

    util.logBlank(1);
    util.log("   Scan project " + folder.name + " for " + taskType + " tasks", 1);
    statusBarSpace.text = getStatusString("Scanning for " + taskType + " tasks in project " + folder.name, 65);

    try {
        const relativePattern = new RelativePattern(folder, fileBlob);
        const paths = await workspace.findFiles(relativePattern, util.getExcludesGlob(folder));
        for (const fpath of paths)
        {
            if (cancel) {
                cancelInternal(setCacheBuilding, statusBarSpace);
                return;
            }
            if (!util.isExcluded(fpath.path, "   ")) {
                fCache.add({
                    uri: fpath,
                    folder
                });
                util.logBlank(1);
                util.logValue("   Added to cache", fpath.fsPath, 3);
            }
        }
    } catch (error) {
        util.logError(error.toString());
    }
}


async function buildFolderCaches(fCache: Set<any>, taskType: string, fileBlob: string, statusBarSpace: StatusBarItem, setCacheBuilding: boolean)
{
    if (workspace.workspaceFolders) // ensure workspace folders exist
    {
        for (const folder of workspace.workspaceFolders)
        {
            await buildFolderCache(fCache, folder, taskType, fileBlob, statusBarSpace, setCacheBuilding);
        }
    }
}


export async function addFileToCache(taskAlias: string, uri: Uri)
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


function cancelInternal(setCacheBuilding: boolean, statusBarSpace: StatusBarItem)
{
    if (setCacheBuilding) {
        cacheBuilding = false;
        cancel = false;
    }
    disposeStatusBarSpace(statusBarSpace);
    util.log("   Cache building cancelled", 1);
}


export async function cancelBuildCache(wait?: boolean)
{
    let waitCount = 20;
    if (!cacheBuilding) {
        return;
    }
    cancel = true;
    while (wait && cacheBuilding && waitCount > 0) {
        waitCount--;
        await util.timeout(500);
    }
}


function disposeStatusBarSpace(statusBarSpace: StatusBarItem)
{
    statusBarSpace?.hide();
    statusBarSpace?.dispose();
}


function getStatusString(msg: string, statusLength = 0)
{
    if (msg)
    {
        if (statusLength > 0)
        {
            if (msg.length < statusLength)
            {
                for (let i = msg.length; i < statusLength; i++) {
                    msg += " ";
                }
            }
            else {
                msg = msg.substring(0, statusLength - 3) + "...";
            }
        }
        return "$(loading~spin) " + msg;
    }
    return "";
}


function logBuildCache(taskType: string, taskAlias: string, fileBlob: string, wsfolder: WorkspaceFolder | undefined, setCacheBuilding: boolean)
{
    util.logBlank(2);
    util.log("Start cache building", 2);
    util.logValue("   folder", !wsfolder ? "entire workspace" : wsfolder.name, 2);
    util.logValue("   task type", taskType, 2);
    util.logValue("   task alias", taskAlias, 2);
    util.logValue("   blob", fileBlob, 2);
    util.logValue("   setCacheBuilding", setCacheBuilding.toString(), 2);
}


export async function rebuildCache()
{
    util.logBlank(1);
    util.log("rebuild cache", 1);
    filesCache.clear();
    await addFolderToCache();
}


export async function removeFileFromCache(taskAlias: string, uri: Uri)
{
    util.logBlank(1);
    util.log("remove file from cache", 1);
    util.logValue("   task type", taskAlias, 2);
    util.logValue("   file", uri.fsPath, 2);

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
            if (toRemove.hasOwnProperty(tr)) { // skip over properties inherited by prototype
                taskCache.delete(toRemove[tr]);
            }
        }
    }
}



export async function waitForCache()
{
    while (cacheBuilding === true || folderCaching === true) {
        await util.timeout(100);
    }
}


async function waitForFolderCaching()
{
    while (folderCaching === true) {
        await util.timeout(100);
    }
}

