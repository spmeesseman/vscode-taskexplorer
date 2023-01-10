/* eslint-disable prefer-arrow/prefer-arrow-functions */

import * as util from "./utils/utils";
import log from "./utils/log";
import { join } from "path";
import { findFiles, numFilesInDirectory } from "./utils/fs";
import { configuration } from "./utils/configuration";
import { getLicenseManager, providers, providersExternal } from "../extension";
import { ICacheItem } from "../interface/cacheItem";
import { TaskExplorerProvider } from "../providers/provider";
import {
    workspace, window, RelativePattern, WorkspaceFolder, Uri, StatusBarAlignment, StatusBarItem
} from "vscode";
import { isString } from "./utils/utils";


const eventQueue: any[] = [];
let statusBarSpace: StatusBarItem;
let cacheBuilding = false;
let cancel = false;
let taskGlobs: any = {};
let taskFilesMap: IDictionary<ICacheItem[]> = {};
let projectFilesMap: IDictionary<IDictionary<Uri[]>> = {};
let projectToFileCountMap: IDictionary<IDictionary<number>> = {};


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
    let numFilesFound = 0;
    const licMgr = getLicenseManager();
    const wsFolder = workspace.getWorkspaceFolder(folder) as WorkspaceFolder;

    if (isCachingBusy()) {
        queueJob(addFolderToCache, folder);
        return;
    }

    log.methodStart("add folder to cache", 1, logPad, false, [[ "folder", folder.fsPath ]]);

    const numFiles = await numFilesInDirectory(folder.fsPath);
    if (numFiles > 0)
    {
        await startCacheBuild();

        const taskProviders = ([ ...util.getTaskTypes(), ...providersExternal.keys() ]).sort((a, b) => {
            return util.getTaskTypeFriendlyName(a).localeCompare(util.getTaskTypeFriendlyName(b));
        });

        for (const providerName of taskProviders)
        {
            const externalProvider = providersExternal.get(providerName);
            //
            // TODO - remove below ignore tags when test for copy/move folder w/files is implemented
            //
            if (!cancel && numFilesFound < numFiles && (externalProvider || util.isTaskTypeEnabled(providerName)))
            {
                let glob;
                if (!util.isWatchTask(providerName))
                {
                    const provider = providers.get(providerName) || /* istanbul ignore next */externalProvider;
                    /* istanbul ignore next */
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
                    let numFilesAdded = 0;
                    log.write(`   adding new directory to '${providerName}' file cache`, 2, logPad);
                    try
                    {   let maxFiles = Infinity;
                        log.write(`      Start folder scan for ${providerName} tasks`, 3, logPad);
                        //
                        // TODO - replace istanbul ignore tags when lic mgr test suite is done
                        //
                        /* istanbul ignore else */
                        if (licMgr && !licMgr.isLicensed())
                        {
                            const cachedFileCount = getTaskFileCount();
                            maxFiles = licMgr.getMaxNumberOfTaskFiles() - cachedFileCount;
                            /* istanbul ignore if */
                            if (maxFiles <= 0) {
                                util.showMaxTasksReachedMessage();
                                return;
                            }
                            log.write(`      Set max files to scan at ${maxFiles} files (no license)`, 2, logPad);
                        }
                        const paths = await findFiles(glob, { nocase: true, ignore: getExcludesPatternGlob(), cwd: folder.fsPath  });
                        for (const fPath of paths)
                        {   //
                            // TODO - remove below ignore tags when test for copy/move folder w/ files is implemented
                            //
                            /* istanbul ignore next */
                            if (cancel) {
                                break;
                            }
                            /* istanbul ignore next */
                            const uriFile = Uri.file(join(folder.fsPath, fPath));
                            /* istanbul ignore next */
                            numFilesAdded += addToMappings(providerName, { uri: uriFile, folder: wsFolder }, logPad + "      ");
                        }
                        projectToFileCountMap[wsFolder.name][providerName] += numFilesAdded;
                        log.write(`      Folder scan complete, found ${paths.length} ${providerName} file(s), added ${numFilesAdded} file(s)`, 3, logPad);
                    }
                    catch (e: any) { /* istanbul ignore next */ log.error(e); }
                    numFilesFound += numFilesAdded;
                    log.value("      # of files added", numFilesAdded, 3);
                    log.write(`   finished adding new directory to '${providerName}' file cache`, 3, logPad);
                }
                else {
                    await util.timeout(150);
                }
            }
        }
        finishCacheBuild();
    }

    log.methodDone("add folder to cache", 1, logPad, [[ "# of files in directory", numFiles ], [ "# of files matched", numFiles ]]);
}


async function addWsFolderToCache(folder: WorkspaceFolder, logPad: string)
{
    log.methodStart("add workspace project folder to cache", 2, logPad, logPad === "", [[ "folder", folder.name ]]);

    let numFilesFound = 0;
    const numFiles = await numFilesInDirectory(folder.uri.fsPath);

    if (numFiles)
    {
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
                numFilesFound += await buildCache(providerName, glob, folder, false, logPad + "   ");
                if (cancel || numFilesFound >= numFiles) {
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
    }

    log.methodDone("add workspace project folder to cache", 2, logPad, [[ "# of files in directory", numFiles ], [ "# of files matched", numFilesFound ]]);
}


export async function addWsFolders(wsf: readonly WorkspaceFolder[] | undefined, logPad = "")
{
    if (wsf)
    {
        log.methodStart("add workspace project folders", 1, logPad, logPad === "");
        await startCacheBuild();
        if (!cancel)
        {
            for (const f of wsf)
            {
                await addWsFolderToCache(f, logPad + "   ");
                if (cancel) {
                    break;
                }
            }
        }
        finishCacheBuild();
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

    log.methodDone("add item to mappings", 4, logPad);
    return added.c1;
}


export async function buildCache(taskType: string, fileGlob: string, wsFolder: WorkspaceFolder | undefined, setCacheBuilding: boolean, logPad: string)
{
    let numFilesFound = 0;
    const providerType = util.isScriptType(taskType) ? "script" : taskType;
    log.methodStart("build file cache", 1, logPad, false, [
        [ "folder", !wsFolder ? "entire workspace" : wsFolder.name ], [ "task type", taskType ],
        [ "task provider type", providerType ], [ "glob", fileGlob ], [ "setCacheBuilding", setCacheBuilding.toString() ]
    ]);

    if (setCacheBuilding) {
        await startCacheBuild();
    }

    if (!cancel)
    {   //
        // If 'wsFolder' if falsey, build the entire cache.  If truthy, build the cache for the
        // specified folder only
        //
        if (!wsFolder)
        {
            log.write("   Scan all projects for taskType '" + taskType + "' (" + providerType + ")", 1, logPad);
            for (const folder of workspace.workspaceFolders as readonly WorkspaceFolder[])
            {
                numFilesFound += await buildFolderCache(folder, taskType, fileGlob, logPad + "   ");
                if (cancel) {
                    break;
                }
            }
        }
        else {
            numFilesFound = await buildFolderCache(wsFolder, taskType, fileGlob, logPad + "   ");
        }
    }

    if (setCacheBuilding) {
        finishCacheBuild();
    }

    log.methodDone("build file cache", 1, logPad);
    return numFilesFound;
}


async function buildFolderCache(folder: WorkspaceFolder, taskType: string, fileGlob: string, logPad: string)
{
    let numFilesFound = 0;
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
            /* istanbul ignore else */
            if (licMgr && !licMgr.isLicensed())
            {
                const cachedFileCount = getTaskFileCount();
                maxFiles = licMgr.getMaxNumberOfTaskFiles() - cachedFileCount;
                /* istanbul ignore if */
                if (maxFiles <= 0) {
                    util.showMaxTasksReachedMessage();
                    return numFilesFound;
                }
                log.write(`   Set max files to scan at ${maxFiles} files (no license)`, 3, logPad);
            }
            const relativePattern = new RelativePattern(folder, fileGlob),
                  paths = await workspace.findFiles(relativePattern, getExcludesPatternVsc(folder), maxFiles);
            for (const fPath of paths)
            {
                addToMappings(taskType, { uri: fPath, folder }, logPad + "   ");
                if (cancel) {
                    break;
                }
            }
            projectToFileCountMap[folder.name][taskType] = numFilesFound = paths.length;
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
    else /* istanbul ignore next */if (isExternal) {
        await util.timeout(150);
    }

    log.methodDone(logMsg, 1, logPad);
    return numFilesFound;
}


export async function cancelBuildCache()
{
    if (cacheBuilding)
    {
        cancel = true;
        while (cacheBuilding) {
            await util.timeout(100);
        }
    }
}


function disposeStatusBarSpace(statusBarSpace: StatusBarItem)
{
    statusBarSpace.hide();
    statusBarSpace.dispose();
}


const finishCacheBuild = () =>
{
    disposeStatusBarSpace(statusBarSpace);
    cacheBuilding = false;
    cancel = false;
};


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


export const isCachingBusy = () => cacheBuilding;


function isFsChanged(taskType: string, project: string)
{
    let fsChanged = true;
    /* istanbul ignore else */
    if (projectFilesMap[project] && projectFilesMap[project][taskType])
    {
        fsChanged = projectToFileCountMap[project][taskType] !== projectFilesMap[project][taskType].length;
    }
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


const processQueue = async () =>
{
    if (eventQueue.length > 0)
    {
        const next = eventQueue.shift();
        log.methodStart("file cache event queue", 1, "", true, [
            [ "event", next.event ], [ "arg1", isString(next.args[0]) ? next.args[0] : next.args[0].fsPath ],
            [ "arg2", next.args[1] instanceof Uri ? next.args[1].fsPath : "none (log padding)" ],
            [ "# of events still pending", eventQueue.length ]
        ]);
        cacheBuilding = true;
        await next.fn(...next.args);
        // cacheBuilding = false;
        log.methodDone("file cache event queue", 1, "");
    }
};


const queueJob = (fn: any, uri: Uri, taskType?: string) =>
{
    if (isCachingBusy())
    {
        eventQueue.push({ fn, args: [ taskType, uri, "   " ], event: "caching busy, queue request" });
    }
};


export async function rebuildCache(logPad: string)
{
    const needCancel = cacheBuilding === true;
    log.methodStart("rebuild cache", 1, logPad, logPad === "");
    if (needCancel) {
        await cancelBuildCache();
    }
    taskFilesMap = {};
    projectFilesMap = {};
    projectToFileCountMap = {};
    taskGlobs = {};
    await addWsFolders(workspace.workspaceFolders, logPad + "   ");
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
    log.methodDone("remove task type from cache", 2, logPad, [[ "# of files removed", count ]]);
}


/**
 * @method removeFromMappings
 * @since 3.0.0
 */
function removeFromMappings(taskType: string, uri: Uri | WorkspaceFolder | undefined, isFolder: boolean, logPad: string)
{
    let folderUri: Uri | undefined;
    let wsFolders: readonly WorkspaceFolder[];
    log.methodStart("remove item from mappings", 3, logPad, false, [[ "task type", taskType ]]);

    if (uri === undefined) {
        wsFolders = workspace.workspaceFolders as readonly WorkspaceFolder[];
    }
    else if (uri instanceof Uri) {
        const wsf = workspace.getWorkspaceFolder(uri) as WorkspaceFolder;
        log.value("   path", uri.fsPath, 3);
        wsFolders = [ wsf ];
        folderUri = uri;
    }
    else {
        wsFolders = [ uri ];
        folderUri = wsFolders[0].uri;
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
                if (folderUri !== undefined)
                {
                    if (item.fsPath === folderUri.fsPath || (isFolder && item.fsPath.startsWith(folderUri.fsPath)))
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
                if (folderUri !== undefined)
                {
                    if (item.uri.fsPath === folderUri.fsPath || (isFolder && item.uri.fsPath.startsWith(folderUri.fsPath)))
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

    /* istanbul ignore else */
    if (uri === undefined && taskFilesMap[taskType])
    {
        log.write("   clear task files map", 4, logPad);
        taskFilesMap[taskType] = [];
    }
    else if (folderUri && removed.c1 > 0)
    {
        log.value("   removed from cache", folderUri.fsPath, 4, logPad);
    }
    else if (folderUri) {
        log.write("   doesnt exists in cache", 4, logPad);
    }

    log.methodDone("remove item from mappings", 3, logPad);
    return removed.c1;
}


export async function removeWsFolders(wsf: readonly WorkspaceFolder[], logPad = "")
{
    const needCancel = cacheBuilding === true;
    log.methodStart("remove workspace folder", 1, logPad);
    if (needCancel) {
        await cancelBuildCache();
    }
    for (const f of wsf)
    {
        log.value("   workspace folder", f.name, 1, logPad);
        Object.keys(taskFilesMap).forEach((taskType) =>
        {
            log.value("   start remove task files from cache", taskType, 2, logPad);
            const removed = removeFromMappings(taskType, f, true, logPad + "      ");
            log.write(`      removed ${removed} files`, 2, logPad);
            log.value("   completed remove files from cache", taskType, 2, logPad);
        });
        delete projectToFileCountMap[f.name];
        /* istanbul ignore else */
        if (projectFilesMap[f.name])
        {
            delete projectFilesMap[f.name];
        }
        log.write("   workspace folder removed", 1, logPad);
    }
    if (needCancel) {
        await rebuildCache(logPad + "   ");
    }
    log.methodDone("remove workspace folder", 1, logPad);
}


async function startCacheBuild()
{
    while (cacheBuilding === true) {
        await util.timeout(100);
    }
    cacheBuilding = true;
    statusBarSpace = window.createStatusBarItem(StatusBarAlignment.Left, -10000);
    statusBarSpace.tooltip = "Task Explorer is building the file cache";
    statusBarSpace.show();
}
