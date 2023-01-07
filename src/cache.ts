/* eslint-disable prefer-arrow/prefer-arrow-functions */

import * as util from "./lib/utils/utils";
import * as log from "./lib/utils/log";
import { configuration } from "./lib/utils/configuration";
import { getLicenseManager, providers, providersExternal } from "./extension";
import {
    workspace, window, RelativePattern, WorkspaceFolder, Uri, StatusBarAlignment, StatusBarItem
} from "vscode";
import { join } from "path";
import { ICacheItem } from "./interface/cacheItem";
import { TaskExplorerProvider } from "./providers/provider";
import { findFiles } from "./lib/utils/fs";


let statusBarSpace: StatusBarItem;
let cacheBuilding = false;
let cancel = false;
let projectFilesMap: { [project: string]:  { [taskType: string]: Uri[] }} = {};
let projectToFileCountMap: { [project: string]:  { [taskType: string]: number }} = {};
let taskGlobs: any = {};
let taskFilesMap: { [taskType: string]:  ICacheItem[] } = {};  // will replace filesCache with this at some point
const filesCache: Map<string, Set<ICacheItem>> = new Map<string, Set<ICacheItem>>();


/**
 * @method addFileToCache
 * @since 3.0.0
 */
export async function addFileToCache(taskType: string, uri: Uri, logPad: string)
{
    log.methodStart("add file to cache", 1, logPad);
    const wsf = workspace.getWorkspaceFolder(uri) as WorkspaceFolder,
          item = { uri, folder: wsf };
    addToMappings(taskType, item, logPad + "   ");
    log.methodDone("add file to cache", 1, logPad);
}


/**
 * @method addFolderToCache
 *
 * @param folder The folder to be added to the cache.  This folder should be a sub-folder within
 * a workspace folder.  Workspace folders are handled differently and are handled by the
 * 'addWsFolderToCache()` function.  This function is calledfrom thefileWatcher instance when
 * a new folder is created, or copied into a workspace.
 *
 * @since 3.0.0
 */
export async function addFolderToCache(folder: Uri, logPad: string)
{
    const licMgr = getLicenseManager();
    const wsFolder = workspace.getWorkspaceFolder(folder) as WorkspaceFolder;

    log.methodStart("add folder to cache", 1, logPad, false, [[ "folder", folder.fsPath ]]);

    //
    // Wait for caches to get done building before proceeding
    //
    await waitForCache();
    cacheBuilding = true;

    //
    // Status bar
    //
    statusBarSpace = window.createStatusBarItem(StatusBarAlignment.Left, -10000);
    statusBarSpace.tooltip = "Task Explorer is building the task cache";
    statusBarSpace.show();

    const taskProviders = ([ ...util.getTaskTypes(), ...providersExternal.keys() ]).sort((a, b) => {
        return util.getTaskTypeFriendlyName(a).localeCompare(util.getTaskTypeFriendlyName(b));
    });

    for (const providerName of taskProviders)
    {
        const externalProvider = providersExternal.get(providerName);

        if (!cancel && (externalProvider || util.isTaskTypeEnabled(providerName)))
        {
            /* istanbul ignore if */
            if (!filesCache.get(providerName)) {
                throw new Error("Workspace project folder has not yet been scanned");
            }

            let glob;
            if (!util.isWatchTask(providerName))
            {
                const provider = providers.get(providerName) || externalProvider;
                glob = provider?.getGlobPattern();
            }
            if (!glob) {
                glob = util.getGlobPattern(providerName);
            }

            const dspTaskType = util.getTaskTypeFriendlyName(providerName);
            statusBarSpace.text = getStatusString(`Scanning for ${dspTaskType} tasks in project ${wsFolder.name}`, 65);
            log.value("   adding folder cache for provider", providerName, 3, logPad);

            /* istanbul ignore else */
            if (!providersExternal.get(providerName))
            {
                try
                {   let maxFiles = Infinity;
                    log.write("   Start folder scan", 2, logPad);
                    if (licMgr && !licMgr.isLicensed())
                    {
                        const cachedFileCount = getTaskFileCount();
                        maxFiles = licMgr.getMaxNumberOfTaskFiles() - cachedFileCount;
                        if (maxFiles <= 0) {
                            util.showMaxTasksReachedMessage();
                            return;
                        }
                        log.write(`   Set max files to scan at ${maxFiles} files (no license)`, 2, logPad);
                    }
                    const paths = await findFiles(glob, { nocase: true, ignore: getExcludesPatternGlob(), cwd: folder.fsPath  });
                    for (const fPath of paths)
                    {   /* istanbul ignore if */
                        if (cancel) {
                            break;
                        }
                        const uriFile = Uri.file(join(folder.fsPath, fPath));
                        addToMappings(providerName, { uri: uriFile, folder: wsFolder }, logPad + "      ");
                    }
                    projectToFileCountMap[wsFolder.name][providerName] += paths.length;
                    log.write(`   Folder scan complete, found '${paths.length}' files`, 2, logPad);
                }
                catch (e: any) { log.error(e); }
            }
            else {
                await util.timeout(250);
            }
        }
    }

    //
    // Release status bar reserved space
    //
    disposeStatusBarSpace(statusBarSpace);

    /* istanbul ignore if */
    if (cancel) {
        log.write("Add folder to cache cancelled", 3, logPad);
    }
    else {
        log.write("Add folder to cache complete", 3, logPad);
    }

    cacheBuilding = false;
    cancel = false;

    log.methodDone("add folder to cache", 1, logPad);
}


async function addWsFolderToCache(folder: WorkspaceFolder | undefined, setCacheBuilding: boolean, logPad: string)
{
    log.methodStart("add workspace project folder to cache", 2, logPad, logPad === "", [
        [ "folder", !folder ? "entire workspace" : folder.name ]
    ]);

    if (setCacheBuilding)
    {   //
        // Wait for caches to get done building before proceeding
        //
        await waitForCache();
        cacheBuilding = true;
        //
        // Status bar
        //
        statusBarSpace = window.createStatusBarItem(StatusBarAlignment.Left, -10000);
        statusBarSpace.tooltip = "Task Explorer is building the task cache";
        statusBarSpace.show();
    }


    const taskProviders = ([ ...util.getTaskTypes(), ...providersExternal.keys() ]).sort();
    for (const providerName of taskProviders)
    {
        const externalProvider = providersExternal.get(providerName);
        if (!cancel && (externalProvider || util.isTaskTypeEnabled(providerName)))
        {
            let glob;
            if (!util.isWatchTask(providerName))
            {
                const provider = providers.get(providerName) || /* istanbul ignore next */externalProvider;
                glob = (provider as TaskExplorerProvider).getGlobPattern();
            }
            if (!glob) {
                glob = util.getGlobPattern(providerName);
            }

            log.value("   building workspace project cache for provider", providerName, 3, logPad);
            await buildCache(providerName, glob, folder, false, logPad + "   ");
            if (cancel) {
                break;
            }
        }
    }

    if (cancel) {
        log.write("Add workspace project folder to cache cancelled", 3, logPad);
    }
    else {
        log.write("Add workspace project folder to cache complete", 3, logPad);
    }

    if (setCacheBuilding)
    {
        disposeStatusBarSpace(statusBarSpace);
        cacheBuilding = false;
        cancel = false;
    }

    log.methodDone("add workspace project folder to cache", 2, logPad);
}


export async function addWsFolders(wsf: readonly WorkspaceFolder[] | undefined, logPad = "")
{
    /* istanbul ignore else */
    if (wsf)
    {
        log.methodStart("add workspace project folders", 1, logPad, logPad === "");
        //
        // Wait for caches to get done building before proceeding
        //
        await waitForCache();
        cacheBuilding = true;

        //
        // Status bar
        //
        statusBarSpace = window.createStatusBarItem(StatusBarAlignment.Left, -10000);
        statusBarSpace.tooltip = "Task Explorer is building the task cache";
        statusBarSpace.show();

        for (const f of wsf)
        {
            await addWsFolderToCache(f, false, logPad + "   ");
            /* istanbul ignore if */
            if (cancel) {
                break;
            }
        }

        disposeStatusBarSpace(statusBarSpace);
        cacheBuilding = false;
        cancel = false;

        log.methodDone("add workspace project folders", 1, logPad);
    }
}


/**
 * @method addToMappings
 * @since 3.0.0
 */
function addToMappings(taskType: string, item: ICacheItem, logPad: string)
{
    log.methodStart("add item to mappings", 4, logPad, false, [[ "task type", taskType ], [ "file", item.uri.fsPath ]]);

    // if (!util.isExcluded(item.uri.path, "   "))
    // {
        initMaps(taskType, item.folder.name);
        const added = {
            c1: 0, c2: 0, c3: 0
        };
        const fCache = filesCache.get(taskType) as Set<ICacheItem>;

        /* istanbul ignore else */
        if (!fCache.has(item))
        {
            fCache.add(item);
            ++added.c1;
        }

        if (!taskFilesMap[taskType].find(i => i.uri.fsPath === item.uri.fsPath))
        {
            taskFilesMap[taskType].push(item);
           ++added.c2;
        }

        if (!projectFilesMap[item.folder.name][taskType].find(i => i.fsPath === item.uri.fsPath))
        {
            projectFilesMap[item.folder.name][taskType].push(item.uri);
            ++added.c3;
        }

        log.values(4, logPad + "      ", [
            [ "cache1 count", added.c1 ], [ "cache2 count", added.c2 ], [ "cache3 count", added.c3 ]
        ]);

        /* istanbul ignore else */
        if (added.c1 > 0)
        {
            log.value("   added to cache", item.uri.fsPath, 4, logPad);
        }
        else {
            log.write("   already exists in cache", 4, logPad);
        }
    // }
    // else {
    //     log.write("   ignored by 'excludes'", 4, logPad);
    // }

    log.methodDone("add item to mappings", 4, logPad);
}


export async function buildCache(taskType: string, fileGlob: string, wsFolder: WorkspaceFolder | undefined, setCacheBuilding: boolean, logPad: string)
{
    const providerType = util.isScriptType(taskType) ? "script" : taskType;
    log.methodStart("build file cache", 1, logPad, false, [
        [ "folder", !wsFolder ? "entire workspace" : wsFolder.name ], [ "task type", taskType ],
        [ "task provider type", providerType ], [ "glob", fileGlob ], [ "setCacheBuilding", setCacheBuilding.toString() ]
    ]);

    if (setCacheBuilding)
    {
        await waitForCache();
        cacheBuilding = true;
        //
        // Status bar
        //
        statusBarSpace = window.createStatusBarItem(StatusBarAlignment.Left, -10000);
        statusBarSpace.tooltip = "Task Explorer is building the task cache";
        statusBarSpace.show();
    }

    //
    // If 'wsFolder' if falsey, build the entire cache.  If truthy, build the cache for the
    // specified folder only
    //
    if (!wsFolder)
    {
        log.write("   Scan all projects for taskType '" + taskType + "' (" + providerType + ")", 1, logPad);
        for (const folder of workspace.workspaceFolders as readonly WorkspaceFolder[])
        {
            await buildFolderCache(folder, taskType, fileGlob, logPad + "   ");
            if (cancel) {
                break;
            }
        }
    }
    else {
        await buildFolderCache(wsFolder, taskType, fileGlob, logPad + "   ");
    }

    if (setCacheBuilding)
    {
        disposeStatusBarSpace(statusBarSpace);
        cacheBuilding = false;
        cancel = false;
    }

    log.methodDone("build file cache", 1, logPad);
}


async function buildFolderCache(folder: WorkspaceFolder, taskType: string, fileGlob: string, logPad: string)
{
    const licMgr = getLicenseManager();
    const logMsg = "Scan project " + folder.name + " for " + taskType + " tasks",
          dspTaskType = taskType !== "tsc" && taskType !== "apppublisher" ?
                        util.properCase(taskType) : (taskType === "tsc" ? "Typescript" : "App-Publisher");

    log.methodStart(logMsg, 1, logPad);
    statusBarSpace.text = getStatusString(`Scanning for ${dspTaskType} tasks in project ${folder.name}`, 65);

    initMaps(taskType, folder.name);

    const isExternal = providersExternal.get(taskType),
          fsChanged = isFsChanged(taskType, folder.name),
          globChanged = isGlobChanged(taskType, fileGlob);

    log.value("   glob changed", globChanged, 3, logPad);
    log.value("   fIlesystem changed", fsChanged, 3, logPad);
    log.value("   is external", isExternal, 3, logPad);

    if (!isExternal && (globChanged || fsChanged))
    {
        try {
            let maxFiles = Infinity;
            log.write("   Start workspace folder scan", 3, logPad);
            if (licMgr && !licMgr.isLicensed())
            {
                const cachedFileCount = getTaskFileCount();
                maxFiles = licMgr.getMaxNumberOfTaskFiles() - cachedFileCount;
                if (maxFiles <= 0) {
                    util.showMaxTasksReachedMessage();
                    return;
                }
                log.write(`   Set max files to scan at ${maxFiles} files (no license)`, 3, logPad);
            }
            const relativePattern = new RelativePattern(folder, fileGlob),
                  paths = await workspace.findFiles(relativePattern, getExcludesPatternVsc(folder), maxFiles);
            for (const fPath of paths)
            {
                addToMappings(taskType, { uri: fPath, folder }, logPad + "   ");
                if (cancel) {
                    return;
                }
            }
            projectToFileCountMap[folder.name][taskType] = paths.length;
            log.write(`   Workspace folder scan complete, found '${paths.length}' files`, 3, logPad);
        }
        catch (e: any) { /* istanbul ignore next */ log.error(e); }
        /*
        const paths = await globAsync(fileGlob, { cwd: folder.uri.fsPath, ignore: getExcludesPatternsGlob() });
        for (const fPath of paths)
        {
            const uriFile = Uri.file(join(folder.uri.fsPath, fPath));
            if (!util.isExcluded(uriFile.path, "   "))
            {
                fCache.add({ uri: uriFile, folder });
                log.value("   Added to cache", uriFile.fsPath, 3, logPad);
                log.value("      Cache size (# of files)", fCache.size, 4, logPad);
            }
            if (cancel) {
                return;
            }
        }
        */
    }
    /* istanbul ignore if */
    else if (isExternal) {
        await util.timeout(250);
    }

    log.methodDone(logMsg, 1, logPad);
}


export async function cancelBuildCache(wait?: boolean)
{
    let waitCount = 20;
    if (!cacheBuilding) {
        return;
    }
    cancel = true;
    while (wait && cacheBuilding && --waitCount > 0) {
        await util.timeout(500);
    }
}


function disposeStatusBarSpace(statusBarSpace: StatusBarItem)
{
    statusBarSpace.hide();
    statusBarSpace.dispose();
}


/**
 * @method getExcludesPatternGlob
 * @since 3.0.0
 */
function getExcludesPatternGlob()
{
    const excludes: string[] = configuration.get("exclude");
    return [ "**/node_modules/**", "**/work/**", ...excludes ];
}


function getExcludesPatternVsc(folder: string | WorkspaceFolder): RelativePattern
{
    const excludes: string[] = configuration.get("exclude"),
          multiFilePattern = util.getCombinedGlobPattern("**/node_modules/**,**/work/**", excludes);
    return new RelativePattern(folder, multiFilePattern);
}


function getStatusString(msg: string, statusLength: number)
{
    /* istanbul ignore else */
    if (msg.length < statusLength)
    {
        for (let i = msg.length; i < statusLength; i++) {
            msg += " ";
        }
    }
    else {
        msg = msg.substring(0, statusLength - 3) + "...";
    }
    return "$(loading~spin) " + msg;
}


export const getTaskFiles = (taskType: string) =>
{
    return filesCache.get(taskType) || new Set();
};


/**
 * @method getTaskFileCount
 * @since 3.0.0
 */
const getTaskFileCount = (taskType?: string) =>
{
    let count = 0;
    filesCache.forEach((value, key) =>
    {
        if (!taskType || taskType === key) {
            count += value.size;
        }
    });
    return count;
};


function initMaps(taskType: string, project: string)
{
    if (!taskFilesMap[taskType]) {
        taskFilesMap[taskType] = [];
    }
    if (!filesCache.get(taskType)) {
        filesCache.set(taskType, new Set());
    }
    if (!projectToFileCountMap[project]) {
        projectToFileCountMap[project] = {};
    }
    if (!projectToFileCountMap[project][taskType]) {
        projectToFileCountMap[project][taskType] = -1;
    }
    if (!projectFilesMap[project]) {
        projectFilesMap[project] = {};
    }
    if (!projectFilesMap[project][taskType]) {
        projectFilesMap[project][taskType] = [];
    }
}


export function isCachingBusy()
{
    return cacheBuilding === true;
}


function isFsChanged(taskType: string, project: string)
{
    let fsChanged = true;
    /* istanbul ignore else */
    if (projectFilesMap[project] && projectFilesMap[project][taskType])
    {
        fsChanged = projectToFileCountMap[project][taskType] !== projectFilesMap[project][taskType].length;
    }
    // else if (taskFilesMap[taskType])
    // {
    //     fsChanged = projectToFileCountMap[project][taskType] !== taskFilesMap[taskType].filter(f => f.folder.name === project).length;
    // }
    return fsChanged;
}


function isGlobChanged(taskType: string, fileGlob: string)
{
    let globChanged = !taskGlobs[taskType];
    if (taskGlobs[taskType] && taskGlobs[taskType] !== fileGlob) {
        globChanged = true;
    }
    taskGlobs[taskType] = fileGlob;
    return globChanged;
}


export async function rebuildCache(logPad = "")
{
    log.methodStart("rebuild cache", 1, logPad, logPad === "");
    filesCache.clear();
    taskFilesMap = {};
    projectFilesMap = {};
    projectToFileCountMap = {};
    taskGlobs = {};
    await addWsFolderToCache(undefined, true, logPad + "   ");
    log.methodDone("rebuild cache", 1, logPad);
}


export async function removeFileFromCache(taskType: string, uri: Uri, logPad: string)
{
    log.methodStart("remove file from cache", 2, logPad, false, [[ "task type", taskType ], [ "path", uri.fsPath ]]);
    removeFromMappings(taskType, uri, false, logPad + "   ");
    log.methodDone("remove file from cache", 2, logPad);
}


/**
 * @method removeFolderFromCache
 *
 * @param folder The folder to be removed from the cache.  This folder should be a sub-folder within
 * a workspace folder.  Workspace folders are handled differently and are handled by the
 * 'removeWsFolders()` function.  This function is calledfrom the fileWatcher instance when
 * a new folder is deleted or renamed.
 *
 * @since 3.0.0
 */
export async function removeFolderFromCache(uri: Uri, logPad: string)
{
    log.methodStart("remove folder from cache", 2, logPad, false, [[ "folder", uri.fsPath ]]);
    for (const taskType of filesCache.keys())
    {
        log.write(`   Processing files cached for ${taskType} tasks`, 2, logPad);
        removeFromMappings(taskType, uri, true, logPad + "   ");
    }
    log.methodDone("remove folder from cache", 1, logPad);
}


/**
 * @method removeTaskTypeFromCache
 * @since 3.0.0
 */
export async function removeTaskTypeFromCache(taskType: string, logPad: string)
{
    log.methodStart("remove task type from cache", 2, logPad, false, [[ "task type", taskType ]]);
    removeFromMappings(taskType, undefined, true, logPad + "   ");
    log.methodDone("remove task type from cache", 2, logPad);
}


/**
 * @method removeFromMappings
 * @since 3.0.0
 */
function removeFromMappings(taskType: string, uri: Uri | undefined, isFolder: boolean, logPad: string)
{
    let wsFolders: readonly WorkspaceFolder[];
    log.methodStart("remove item from mappings", 2, logPad, false, [[ "task type", taskType ], [ "path", uri?.fsPath ]]);

    if (uri === undefined) {
        wsFolders = workspace.workspaceFolders as readonly WorkspaceFolder[];
    }
    else {
        const wsf = workspace.getWorkspaceFolder(uri) as WorkspaceFolder;
        wsFolders = [ wsf ];
    }
    const removed = {
        c1: 0, c2: 0, c3: 0
    };

    for (const wsf of wsFolders)
    {
        initMaps(taskType, wsf.name);
        const fCache = filesCache.get(taskType) as Set<ICacheItem>;

        const toRemove = [];
        for (const item of fCache)
        {
            if (uri !== undefined)
            {
                if (item.uri.fsPath === uri.fsPath || (isFolder && item.uri.fsPath.startsWith(uri.fsPath)))
                {
                    toRemove.push(item);
                    if (!isFolder) {
                        break;
                    }
                }
            }
            else {
                if (item.folder.name === wsf.name)
                {
                    toRemove.push(item);
                    /* istanbul ignore if */
                    if (!isFolder) {
                        break;
                    }
                }
            }
        }
        for (const tr of toRemove)
        {
            log.value("   remove from files map", tr.uri.fsPath, 2, logPad);
            fCache.delete(tr);
            ++removed.c1;
        }

        /* istanbul ignore else */
        if (projectFilesMap[wsf.name] && projectFilesMap[wsf.name][taskType])
        {
            projectFilesMap[wsf.name][taskType].slice().reverse().forEach((item, index, object) =>
            {
                if (uri !== undefined)
                {
                    if (item.fsPath === uri.fsPath || (isFolder && item.fsPath.startsWith(uri.fsPath)))
                    {
                        log.value(`   remove from project files map (${index})`, item.fsPath, 3, logPad);
                        projectFilesMap[wsf.name][taskType].splice(object.length - 1 - index, 1);
                        ++removed.c2;
                    }
                }
                else
                {   /* istanbul ignore else */
                    if (item.fsPath.startsWith(wsf.uri.fsPath))
                    {
                        log.value(`   remove from project files map (${index})`, item.fsPath, 3, logPad);
                        projectFilesMap[wsf.name][taskType].splice(object.length - 1 - index, 1);
                        ++removed.c2;
                    }
                }
            });
        }

        /* istanbul ignore else */
        if (taskFilesMap[taskType])
        {
            taskFilesMap[taskType].slice().reverse().forEach((item, index, object) =>
            {
                if (uri !== undefined)
                {
                    if (item.uri.fsPath === uri.fsPath || (isFolder && item.uri.fsPath.startsWith(uri.fsPath)))
                    {
                        log.value(`   remove from task files map (${index})`, item.uri.fsPath, 3, logPad);
                        taskFilesMap[taskType].splice(object.length - 1 - index, 1);
                        ++removed.c3;
                    }
                }
                else
                {   /* istanbul ignore else */
                    if (item.folder.name === wsf.name)
                    {
                        log.value(`   remove from task files map (${index})`, item.uri.fsPath, 3, logPad);
                        projectFilesMap[wsf.name][taskType].splice(object.length - 1 - index, 1);
                        ++removed.c2;
                    }
                }
            });
        }
    }

    if (uri === undefined && taskFilesMap[taskType])
    {
        log.write("   clear task files map", 3, logPad);
        taskFilesMap[taskType] = [];
    }

    log.values(2, logPad + "   ", [
        [ "cache1 count", removed.c1 ], [ "cache2 count", removed.c2 ], [ "cache3 count", removed.c3 ]
    ]);

    log.methodDone("remove item from mappings", 2, logPad);
}


export async function removeWsFolders(wsf: readonly WorkspaceFolder[], logPad = "")
{
    log.methodStart("remove workspace folder", 1, logPad);
    for (const f of wsf)
    {   /* istanbul ignore next */
        log.value("   workspace folder", f.name, 1, logPad);
        /* istanbul ignore next */
        delete projectToFileCountMap[f.name];
        /* istanbul ignore next */
        if (projectFilesMap[f.name])
        {   /* istanbul ignore next */
            delete projectFilesMap[f.name];
        }
        /* istanbul ignore next */
        for (const taskType of filesCache.keys())
        {   /* istanbul ignore next */
            log.value("   start remove task files from cache", taskType, 2, logPad);
            /* istanbul ignore next */
            removeFromMappings(taskType, f.uri, true, logPad + "      ");
            /* istanbul ignore next */
            log.value("   completed remove files from cache", taskType, 2, logPad);
        }
        /* istanbul ignore next */
        log.write("   workspace folder removed", 1, logPad);
    }
    log.methodDone("remove workspace folder", 1, logPad);
}


export async function waitForCache()
{
    while (cacheBuilding === true) {
        await util.timeout(100);
    }
}
