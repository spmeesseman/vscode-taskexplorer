/* eslint-disable prefer-arrow/prefer-arrow-functions */

import * as log from "./utils/log";
import * as util from "./utils/utils";
import { join } from "path";
import { findFiles } from "./utils/fs";
import { configuration } from "./utils/configuration";
import { getLicenseManager, providers, providersExternal } from "../extension";
import { ICacheItem } from "../interface/cacheItem";
import { TaskExplorerProvider } from "../providers/provider";
import {
    workspace, window, RelativePattern, WorkspaceFolder, Uri, StatusBarAlignment, StatusBarItem
} from "vscode";


let statusBarSpace: StatusBarItem;
let cacheBuilding = false;
let cancel = false;
let projectFilesMap: { [project: string]:  { [taskType: string]: Uri[] }} = {};
let projectToFileCountMap: { [project: string]:  { [taskType: string]: number }} = {};
let taskGlobs: any = {};
let taskFilesMap: { [taskType: string]:  ICacheItem[] } = {};


/**
 * @method addFileToCache
 * @since 3.0.0
 */
export function addFileToCache(taskType: string, uri: Uri, logPad: string)
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

            /* istanbul ignore else */
            if (!providersExternal.get(providerName))
            {
                log.write(`   adding new directory to '${providerName}' file cache`, 3, logPad);
                try
                {   let maxFiles = Infinity,
                        numFilesAdded = 0;
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
                        numFilesAdded += addToMappings(providerName, { uri: uriFile, folder: wsFolder }, logPad + "      ");
                    }
                    projectToFileCountMap[wsFolder.name][providerName] += numFilesAdded;
                    log.write(`   Folder scan complete, found ${paths.length} file(s), added ${numFilesAdded} file(s)`, 2, logPad);
                }
                catch (e: any) { log.error(e); }
                log.write(`   finished adding new directory to '${providerName}' file cache`, 3, logPad);
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
    log.methodStart("add item to mappings", 3, logPad, false, [[ "task type", taskType ], [ "file", item.uri.fsPath ]]);

    initMaps(taskType, item.folder.name);
    const added = {
        c1: 0, c2: 0
    };

    if (!taskFilesMap[taskType].find(i => i.uri.fsPath.toLowerCase() === item.uri.fsPath.toLowerCase()))
    {
        taskFilesMap[taskType].push(item);
        ++added.c1;
    }

    if (!projectFilesMap[item.folder.name][taskType].find(i => i.fsPath.toLowerCase() === item.uri.fsPath.toLowerCase()))
    {
        projectFilesMap[item.folder.name][taskType].push(item.uri);
        ++added.c2;
    }

    log.values(4, logPad + "      ", [[ "cache1 count", added.c1 ], [ "cache2 count", added.c2 ]]);

    /* istanbul ignore else */
    if (added.c1 > 0)
    {
        log.value("   added to cache", item.uri.fsPath, 4, logPad);
    }
    else {
        log.write("   already exists in cache", 4, logPad);
    }

    log.methodDone("add item to mappings", 3, logPad);
    return added.c1;
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
            log.write(`   Workspace folder scan complete, found '${paths.length}' files`, 2, logPad);
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


export const getTaskFiles = (taskType: string) => taskFilesMap[taskType];


/**
 * @method getTaskFileCount
 * @since 3.0.0
 */
const getTaskFileCount = () =>
{
    let count = 0;
    Object.keys(taskFilesMap).forEach((value, key) =>
    {
        count += value.length;
    });
    return count;
};


function initMaps(taskType: string, project: string)
{
    if (!taskFilesMap[taskType]) {
        taskFilesMap[taskType] = [];
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
    taskFilesMap = {};
    projectFilesMap = {};
    projectToFileCountMap = {};
    taskGlobs = {};
    await addWsFolderToCache(undefined, true, logPad + "   ");
    log.methodDone("rebuild cache", 1, logPad);
}


export function removeFileFromCache(taskType: string, uri: Uri, logPad: string)
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
export function removeFolderFromCache(uri: Uri, logPad: string)
{
    log.methodStart("remove folder from cache", 2, logPad, false, [[ "folder", uri.fsPath ]]);
    Object.keys(taskFilesMap).forEach((taskType) =>
    {
        log.write(`   Processing files cached for ${taskType} tasks`, 2, logPad);
        removeFromMappings(taskType, uri, true, logPad + "   ");
    });
    log.methodDone("remove folder from cache", 1, logPad);
}


/**
 * @method removeTaskTypeFromCache
 * @since 3.0.0
 */
export function removeTaskTypeFromCache(taskType: string, logPad: string)
{
    log.methodStart("remove task type from cache", 2, logPad, false, [[ "task type", taskType ]]);
    const count = removeFromMappings(taskType, undefined, true, logPad + "   ");
    log.methodDone("remove task type from cache", 2, logPad, false, [[ "# of files removed", count ]]);
}


/**
 * @method removeFromMappings
 * @since 3.0.0
 */
function removeFromMappings(taskType: string, uri: Uri | undefined, isFolder: boolean, logPad: string)
{
    let wsFolders: readonly WorkspaceFolder[];
    log.methodStart("remove item from mappings", 3, logPad, false, [[ "task type", taskType ], [ "path", uri?.fsPath ]]);

    if (uri === undefined) {
        wsFolders = workspace.workspaceFolders as readonly WorkspaceFolder[];
    }
    else {
        const wsf = workspace.getWorkspaceFolder(uri) as WorkspaceFolder;
        wsFolders = [ wsf ];
    }
    const removed = {
        c1: 0, c2: 0
    };

    for (const wsf of wsFolders)
    {
        initMaps(taskType, wsf.name);

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
                        ++removed.c1;
                    }
                }
                else
                {   /* istanbul ignore else */
                    if (item.fsPath.startsWith(wsf.uri.fsPath))
                    {
                        log.value(`   remove from project files map (${index})`, item.fsPath, 3, logPad);
                        projectFilesMap[wsf.name][taskType].splice(object.length - 1 - index, 1);
                        ++removed.c1;
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
                        ++removed.c2;
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

    log.values(4, logPad + "   ", [[ "cache1 rmv count", removed.c1 ], [ "cache2 rmv count", removed.c2 ]]);

    if (uri === undefined && taskFilesMap[taskType])
    {
        log.write("   clear task files map", 4, logPad);
        taskFilesMap[taskType] = [];
    }
    else if (uri && removed.c1 > 0)
    {
        log.value("   removed from cache", uri.fsPath, 4, logPad);
    }
    /* istanbul ignore else */
    else if (uri) {
        log.write("   already exists in cache", 4, logPad);
    }

    log.methodDone("remove item from mappings", 3, logPad);
    return removed.c1;
}


export function removeWsFolders(wsf: readonly WorkspaceFolder[], logPad = "")
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
        Object.keys(taskFilesMap).forEach((taskType) =>
        {   /* istanbul ignore next */
            log.value("   start remove task files from cache", taskType, 2, logPad);
            /* istanbul ignore next */
            removeFromMappings(taskType, f.uri, true, logPad + "      ");
            /* istanbul ignore next */
            log.value("   completed remove files from cache", taskType, 2, logPad);
        });
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
