/* eslint-disable prefer-arrow/prefer-arrow-functions */

import * as util from "./utils/utils";
import log from "./log/log";
import { join } from "path";
import { storage } from "./utils/storage";
import { findFiles, numFilesInDirectory } from "./utils/fs";
import { configuration } from "./utils/configuration";
import { getLicenseManager, providers, providersExternal } from "../extension";
import { IDictionary, ICacheItem, ITaskExplorerApi } from "../interface";
import {
    workspace, window, RelativePattern, WorkspaceFolder, Uri, StatusBarAlignment, StatusBarItem, ExtensionContext
} from "vscode";


let teApi: ITaskExplorerApi;
let statusBarSpace: StatusBarItem;
let cacheBuilding = false;
let cacheBusy = false;
let cancel = false;
let firstRun = true;
let taskGlobs: any = {};
let taskFilesMap: IDictionary<ICacheItem[]> = {};
let projectFilesMap: IDictionary<IDictionary<string[]>> = {};
let projectToFileCountMap: IDictionary<IDictionary<number>> = {};


/**
 * @method addFileToCache
 * @since 3.0.0
 */
export function addFileToCache(taskType: string, uri: Uri, logPad: string)
{
    log.methodStart("add file to cache", 1, logPad);
    const wsf = workspace.getWorkspaceFolder(uri) as WorkspaceFolder,
          item = { uri, project: wsf.name };
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
export async function addFolder(folder: Uri, logPad: string)
{
    let numFilesFound = 0;
    const licMgr = getLicenseManager();
    const wsFolder = workspace.getWorkspaceFolder(folder) as WorkspaceFolder;

    log.methodStart("add folder to cache", 1, logPad, false, [[ "folder", folder.fsPath ]]);

    const numFiles = await numFilesInDirectory(folder.fsPath);
    if (numFiles > 0)
    {
        await startBuild();

        const taskProviders = ([ ...util.getTaskTypes(), ...Object.keys(providersExternal) ]).sort((a, b) => {
            return util.getTaskTypeFriendlyName(a).localeCompare(util.getTaskTypeFriendlyName(b));
        });

        for (const providerName of taskProviders)
        {
            const externalProvider = providersExternal[providerName];
            //
            // TODO - remove below ignore tags when test for copy/move folder w/files is implemented
            //
            if (!cancel && numFilesFound < numFiles && (externalProvider || util.isTaskTypeEnabled(providerName)))
            {
                let glob;
                if (!util.isWatchTask(providerName))
                {
                    const provider = providers[providerName] || /* istanbul ignore next */externalProvider;
                    /* istanbul ignore next */
                    glob = provider?.getGlobPattern();
                }
                if (!glob) {
                    glob = util.getGlobPattern(providerName);
                }

                const dspTaskType = util.getTaskTypeFriendlyName(providerName);
                statusBarSpace.text = getStatusString(`Scanning for ${dspTaskType} tasks in project ${wsFolder.name}`, 65);

                /* istanbul ignore else */
                if (!providersExternal[providerName])
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
                                return numFilesFound;
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
                            numFilesAdded += addToMappings(providerName, { uri: uriFile, project: wsFolder.name }, logPad + "      ");
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
        finishBuild();
    }

    log.methodDone("add folder to cache", 1, logPad, [[ "# of files in directory", numFiles ], [ "# of files matched", numFiles ]]);
    return numFilesFound;
}


async function addWsFolder(folder: WorkspaceFolder, taskType: string, logPad: string)
{
    let numFilesFound = 0;
    log.methodStart("add workspace project folder to cache", 1, logPad, logPad === "", [[ "folder", folder.name ]]);

    const externalProvider = providersExternal[taskType];
    if (!cancel && (externalProvider || util.isTaskTypeEnabled(taskType)))
    {
        log.value("   building workspace project cache", taskType, 3, logPad);
        numFilesFound += await buildTaskTypeCache(taskType, folder, false, logPad + "   ");
        log.value("   completed building workspace project cache", taskType, 3, logPad);
    }

    if (cancel) {
        log.write("   add workspace project folder to cache cancelled", 3, logPad);
    }
    log.methodDone("add workspace project folder to cache", 1, logPad, [[ "# of files matched", numFilesFound ]]);
    return numFilesFound;
}


export async function addWsFolders(wsf: readonly WorkspaceFolder[] | undefined, logPad = "")
{
    let numFilesFound = 0;
    if (wsf)
    {
        log.methodStart("add workspace project folders", 1, logPad, logPad === "");
        await startBuild();
        if (!cancel)
        {
            const taskProviders = ([ ...util.getTaskTypes(), ...Object.keys(providersExternal) ]).sort((a, b) => {
                return util.getTaskTypeFriendlyName(a).localeCompare(util.getTaskTypeFriendlyName(b));
            });

            for (const tasktype of taskProviders)
            {
                for (const f of wsf)
                {
                    numFilesFound += await addWsFolder(f, tasktype, logPad + "   ");
                    if (cancel) {
                        break;
                    }
                }
                if (cancel) {
                    break;
                }
            }
        }
        finishBuild();
        log.value("   was cancelled", cancel, 3);
        log.methodDone("add workspace project folders", 1, logPad, [[ "# of file found", numFilesFound ]]);
    }
    return numFilesFound;
}


/**
 * @method addToMappings
 * @since 3.0.0
 */
function addToMappings(taskType: string, item: ICacheItem, logPad: string)
{
    log.methodStart("add item to mappings", 4, logPad, false, [[ "task type", taskType ], [ "file", item.uri.fsPath ]]);

    initMaps(taskType, item.project);
    const added = {
        c1: 0, c2: 0
    };

    if (!taskFilesMap[taskType].find(i => i.uri.fsPath.toLowerCase() === item.uri.fsPath.toLowerCase()))
    {
        taskFilesMap[taskType].push(item);
        ++added.c1;
    }

    if (!projectFilesMap[item.project][taskType].find(fsPath => fsPath.toLowerCase() === item.uri.fsPath.toLowerCase()))
    {
        projectFilesMap[item.project][taskType].push(item.uri.fsPath);
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
    /* istanbul ignore if */
    if (added.c1 !== added.c2) {
        log.error("   the 'added' counts in the mappings do not match, there is an issue in the file cache");
    }

    log.methodDone("add item to mappings", 4, logPad);
    return added.c1;
}


export async function buildTaskTypeCache(taskType: string, wsFolder: WorkspaceFolder | undefined, setCacheBuilding: boolean, logPad: string)
{
    let numFilesFound = 0;
    const providerType = util.isScriptType(taskType) ? "script" : taskType;
    log.methodStart("build file cache", 1, logPad, false, [
        [ "folder", !wsFolder ? "entire workspace" : wsFolder.name ], [ "task type", taskType ],
        [ "task provider type", providerType ], [ "setCacheBuilding", setCacheBuilding.toString() ]
    ]);

    if (setCacheBuilding) {
        await startBuild();
    }

    if (!cancel)
    {
        // const glob = util.getGlobPattern(taskType);
        let glob;
        if (!util.isWatchTask(taskType))
        {
            const externalProvider = providersExternal[taskType];
            const provider = providers[taskType] || /* istanbul ignore next */externalProvider;
            glob = provider.getGlobPattern();
        }
        if (!glob) {
            glob = util.getGlobPattern(taskType);
        }
        log.value("   glob", glob, 1, logPad);

        //
        // If 'wsFolder' if falsey, build the entire cache.  If truthy, build the cache for the
        // specified folder only
        //
        if (!wsFolder)
        {
            log.write("   Scan all projects for taskType '" + taskType + "' (" + providerType + ")", 1, logPad);
            for (const folder of workspace.workspaceFolders as readonly WorkspaceFolder[])
            {
                numFilesFound += await buildFolderCache(folder, taskType, glob, logPad + "   ");
                if (cancel) {
                    break;
                }
            }
        }
        else {
            numFilesFound = await buildFolderCache(wsFolder, taskType, glob, logPad + "   ");
        }
    }

    if (setCacheBuilding) {
        finishBuild();
    }

    log.methodDone("build file cache", 1, logPad);
    return numFilesFound;
}


async function buildFolderCache(folder: WorkspaceFolder, taskType: string, fileGlob: string, logPad: string)
{
    let numFilesFound = 0;
    const licMgr = getLicenseManager();
    const logMsg = "Scan project " + folder.name + " for " + taskType + " tasks",
          dspTaskType = util.getTaskTypeFriendlyName(taskType);

    log.methodStart(logMsg, 1, logPad);
    statusBarSpace.text = getStatusString(`Scanning for ${dspTaskType} tasks in project ${folder.name}`, 65);

    initMaps(taskType, folder.name);

    const isExternal = providersExternal[taskType],
          fsChanged = isFsChanged(taskType, folder.name),
          globChanged = isGlobChanged(taskType, fileGlob);

    log.value("   glob changed", globChanged, 3, logPad);
    log.value("   fIlesystem changed", fsChanged, 3, logPad);
    log.value("   is external", isExternal, 3, logPad);

    if (!isExternal && (globChanged || fsChanged))
    {
        try {
            let maxFiles = Infinity;
            log.write(`   Start workspace folder scan for ${taskType} files`, 3, logPad);
            //
            // TODO - Replace istanbul ignore tags when mic mgr test suite is done.  Several below.
            //
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
                addToMappings(taskType, { uri: fPath, project: folder.name }, logPad + "   ");
                /* istanbul ignore if */
                if (++numFilesFound === maxFiles) {
                    log.write(`   Max files to scan reached at ${licMgr.getMaxNumberOfTaskFiles()} files (no license)`, 3, logPad);
                    break;
                }
                if (cancel) {
                    break;
                }
            }
            projectToFileCountMap[folder.name][taskType] = numFilesFound;
            log.write(`   Workspace folder scan completed, found ${numFilesFound} ${taskType} files`, 3, logPad);
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
{   //
    // Note 1/21/23.  This may not be needed anymore, as we now wait for any caching
    // operation to finish in the main extension module's `deactivate` function as
    // opposed to cancelling it.
    //
    if (cacheBuilding)
    {
        cancel = true;
        while (cacheBuilding) {
            await util.timeout(100);
        }
    }
}


const clearMaps = () =>
{
    taskFilesMap = {};
    projectFilesMap = {};
    projectToFileCountMap = {};
    taskGlobs = {};
};


const finishBuild = () =>
{
    persistCache();
    statusBarSpace.hide();
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


export const isBusy = () => cacheBuilding === true ||  cacheBusy === true;


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


export const persistCache = (clear?: boolean, force?: boolean) =>
{   //
    // This all has to be synchronous because if it's not, the updates do not
    // work when called from the extension's deactivate() method. Dumb.  And the
    // docs say the deactivate() method can be async.  BS.  THere was some weird
    // stuff going on when this was all started as async and then added to the
    // deactivate() method.
    //
    if (clear !== true && (force || configuration.get<boolean>("enablePersistentFileCaching")))
    // if (clear !== true && (!teApi.isTests() || configuration.get<boolean>("enablePersistentFileCaching")))
    {
        const text = statusBarSpace.text;
        statusBarSpace.text = "Persisting file cache...";
        storage.update2Sync("fileCacheTaskFilesMap", taskFilesMap);
        storage.update2Sync("fileCacheProjectFilesMap", projectFilesMap);
        storage.update2Sync("fileCacheProjectFileToFileCountMap", projectToFileCountMap);
        statusBarSpace.text = text;
    }
    else if (clear === true)
    {
        storage.update2Sync("fileCacheTaskFilesMap", undefined);
        storage.update2Sync("fileCacheProjectFilesMap", undefined);
        storage.update2Sync("fileCacheProjectFileToFileCountMap", undefined);
    }
};


export const registerFileCache = (context: ExtensionContext, api: ITaskExplorerApi) =>
{
    teApi = api;
    statusBarSpace = window.createStatusBarItem(StatusBarAlignment.Left, -10000);
    statusBarSpace.tooltip = "Task Explorer Status";
    context.subscriptions.push(statusBarSpace);
};


export async function rebuildCache(logPad: string, forceForTests?: boolean)
{
    let numFilesFound = 0,
        loadedFromStorage = false;

    log.methodStart("rebuild cache", 1, logPad, logPad === "");
    cacheBusy = true;
    clearMaps();
    if (firstRun || forceForTests)
    {
        if (configuration.get<boolean>("enablePersistentFileCaching"))
        {
            const fileCache = await storage.get2<IDictionary<ICacheItem[]>>("fileCacheTaskFilesMap", {});
            const projectCache = await storage.get2<IDictionary<IDictionary<string[]>>>("fileCacheProjectFilesMap", {});
            const fileCountCache = await storage.get2<IDictionary<IDictionary<number>>>("fileCacheProjectFileToFileCountMap", {});
            if (!util.isObjectEmpty(fileCache) && !util.isObjectEmpty(projectCache) && !util.isObjectEmpty(fileCountCache))
            {
                taskFilesMap = fileCache;
                projectFilesMap = projectCache;
                projectToFileCountMap = fileCountCache;
                numFilesFound = getTaskFileCount();
                loadedFromStorage = true;
            }
        }
        firstRun = false;
    }

    if (!loadedFromStorage)
    {
        numFilesFound = await addWsFolders(workspace.workspaceFolders, logPad + "   ");
        if (numFilesFound === 0) {
            clearMaps();
        }
    }

    cacheBusy = false;
    log.methodDone("rebuild cache", 1, logPad);
    return numFilesFound;
}


export function removeFileFromCache(taskType: string, uri: Uri, logPad: string)
{
    log.methodStart("remove file from cache", 2, logPad, false, [[ "task type", taskType ], [ "path", uri.fsPath ]]);
    const numFilesRemoved = removeFromMappings(taskType, uri, false, logPad + "   ");
    log.methodDone("remove file from cache", 2, logPad);
    return numFilesRemoved;
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
    let numFilesRemoved = 0;
    log.methodStart("remove folder from cache", 2, logPad, false, [[ "folder", uri.fsPath ]]);
    Object.keys(taskFilesMap).forEach((taskType) =>
    {
        log.write(`   Processing files cached for ${taskType} tasks`, 2, logPad);
        numFilesRemoved += removeFromMappings(taskType, uri, true, logPad + "   ");
    });
    log.methodDone("remove folder from cache", 1, logPad);
    return numFilesRemoved;
}


/**
 * @method removeTaskTypeFromCache
 * @since 3.0.0
 */
export function removeTaskTypeFromCache(taskType: string, logPad: string)
{
    log.methodStart("remove task type from cache", 2, logPad, false, [[ "task type", taskType ]]);
    const numFilesRemoved = removeFromMappings(taskType, undefined, true, logPad + "   ");
    log.methodDone("remove task type from cache", 2, logPad, [[ "# of files removed", numFilesRemoved ]]);
    return numFilesRemoved;
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

    if (uri === undefined)
    {
        wsFolders = workspace.workspaceFolders as readonly WorkspaceFolder[];
    }
    else if (uri instanceof Uri)
    {
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
            projectFilesMap[wsf.name][taskType].slice().reverse().forEach((fsPath, index, object) =>
            {
                if (folderUri !== undefined)
                {
                    if (fsPath === folderUri.fsPath || (isFolder && fsPath.startsWith(folderUri.fsPath)))
                    {
                        log.value(`   remove from project files map (${index})`, fsPath, 3, logPad);
                        projectFilesMap[wsf.name][taskType].splice(object.length - 1 - index, 1);
                        ++removed.c1;
                    }
                }
                else
                {   /* istanbul ignore else */
                    if (fsPath.startsWith(wsf.uri.fsPath))
                    {
                        log.value(`   remove from project files map (${index})`, fsPath, 3, logPad);
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
                    if (item.project === wsf.name)
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
        log.write("   doesnt exist in cache", 4, logPad);
    }
    /* istanbul ignore if */
    if (removed.c1 !== removed.c2) {
        log.error("   the 'remove' counts in the mappings do not match, there is an issue in the file cache");
    }

    log.methodDone("remove item from mappings", 3, logPad);
    return removed.c2;
}


export function removeWsFolders(wsf: readonly WorkspaceFolder[], logPad: string)
{
    let numFilesRemoved = 0;
    log.methodStart("remove workspace folder", 1, logPad);
    for (const f of wsf)
    {
        log.value("   workspace folder", f.name, 1, logPad);
        Object.keys(taskFilesMap).forEach((taskType) =>
        {
            log.value("   start remove task files from cache", taskType, 2, logPad);
            numFilesRemoved = removeFromMappings(taskType, f, true, logPad + "      ");
            log.write(`      removed ${numFilesRemoved} files`, 2, logPad);
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
    log.methodDone("remove workspace folder", 1, logPad);
    return numFilesRemoved;
}


async function startBuild()
{
    while (cacheBuilding === true) {
        await util.timeout(100);
    }
    cacheBuilding = true;
    statusBarSpace.show();
}
