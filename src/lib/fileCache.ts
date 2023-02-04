/* eslint-disable prefer-arrow/prefer-arrow-functions */

import * as util from "./utils/utils";
import * as taskTypeUtils from "./utils/taskTypeUtils";
import log from "./log/log";
import statusBarItem from "./statusBarItem";
import { join } from "path";
import { storage } from "./utils/storage";
import { configuration } from "./utils/configuration";
import { IDictionary, ICacheItem } from "../interface";
import { findFiles, numFilesInDirectory } from "./utils/fs";
import { getLicenseManager, providers } from "../extension";
import { workspace, RelativePattern, WorkspaceFolder, Uri, ExtensionContext, commands } from "vscode";


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


const addFromStorage = async() =>
{
    await startBuild();
    statusBarItem.update("Loading tasks from file cache...");
    taskFilesMap = await storage.get2<IDictionary<ICacheItem[]>>("fileCacheTaskFilesMap", {});
    projectFilesMap = await storage.get2<IDictionary<IDictionary<string[]>>>("fileCacheProjectFilesMap", {});
    projectToFileCountMap = await storage.get2<IDictionary<IDictionary<number>>>("fileCacheProjectFileToFileCountMap", {});
    await finishBuild(true);
};


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

        const taskProviders = ([ ...Object.keys(providers), ...taskTypeUtils.getWatchTaskTypes() ]).sort((a, b) => {
            return taskTypeUtils.getTaskTypeFriendlyName(a).localeCompare(taskTypeUtils.getTaskTypeFriendlyName(b));
        });

        for (const providerName of taskProviders)
        {
            const isExternal = providers[providerName] && providers[providerName].isExternal;
            if (!cancel && numFilesFound < numFiles && (isExternal || util.isTaskTypeEnabled(providerName)))
            {
                let glob;
                if (!taskTypeUtils.isWatchTask(providerName))
                {
                    const provider = providers[providerName];
                    glob = provider?.getGlobPattern();
                }
                if (!glob) {
                    glob = util.getGlobPattern(providerName);
                }

                const dspTaskType = taskTypeUtils.getTaskTypeFriendlyName(providerName);
                statusBarItem.update(`Scanning for ${dspTaskType} tasks in project ${wsFolder.name}`);

                /* istanbul ignore else */
                if (!isExternal)
                {
                    let numFilesAdded = 0;
                    log.write(`   adding new directory to '${providerName}' file cache`, 2, logPad);
                    try
                    {   let maxFiles = Infinity;
                        log.write(`      Start folder scan for ${providerName} tasks`, 3, logPad);
                        if (licMgr && !licMgr.isLicensed())
                        {
                            const cachedFileCount = getTaskFileCount();
                            maxFiles = licMgr.getMaxNumberOfTaskFiles() - cachedFileCount;
                            if (maxFiles <= 0)
                            {
                                util.showMaxTasksReachedMessage(licMgr);
                                log.write(`      Max files limit (${licMgr.getMaxNumberOfTaskFiles()}) already reached (no license)`, 2, logPad);
                                await finishBuild();
                                return numFilesFound;
                            }
                            log.write(`      Set max files to scan at ${maxFiles} files (no license)`, 2, logPad);
                        }
                        const paths = await findFiles(glob, { nocase: true, ignore: getExcludesPatternGlob(), cwd: folder.fsPath  });
                        for (const fPath of paths)
                        {
                            const uriFile = Uri.file(join(folder.fsPath, fPath));
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
        await finishBuild();
    }

    log.methodDone("add folder to cache", 1, logPad, [[ "# of files in directory", numFiles ], [ "# of files matched", numFiles ]]);
    return numFilesFound;
}


async function addWsFolder(folder: WorkspaceFolder, taskType: string, logPad: string)
{
    let numFilesFound = 0;
    log.methodStart(`scan workspace project folder for ${taskType} tasks`, 1, logPad, logPad === "", [[ "folder", folder.name ]]);

    const externalProvider = providers[taskType]  && providers[taskType].isExternal;
    if (!cancel && (externalProvider || util.isTaskTypeEnabled(taskType)))
    {
        log.value(`   building workspace project ${taskType} task file cache`, taskType, 3, logPad);
        numFilesFound += await buildTaskTypeCache(taskType, folder, false, logPad + "   ");
        log.value(`   completed building project ${taskType} task file cache`, taskType, 3, logPad);
    }

    if (cancel) {
        log.write("   add workspace project folder to cache cancelled", 3, logPad);
    }
    log.methodDone(`scan workspace project folder for ${taskType} tasks`, 1, logPad, [[ "# of files matched", numFilesFound ]]);
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
            const taskProviders = ([ ...Object.keys(providers), ...taskTypeUtils.getWatchTaskTypes() ]).sort((a, b) => {
                return taskTypeUtils.getTaskTypeFriendlyName(a).localeCompare(taskTypeUtils.getTaskTypeFriendlyName(b));
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
        await finishBuild();
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

    log.methodDone("add item to mappings", 4, logPad);
    return added.c1;
}


async function buildFolderCache(folder: WorkspaceFolder, taskType: string, fileGlob: string, logPad: string)
{
    let numFilesFound = 0;
    const licMgr = getLicenseManager();
    const logMsg = "Scan project " + folder.name + " for " + taskType + " tasks",
          dspTaskType = taskTypeUtils.getTaskTypeFriendlyName(taskType);

    log.methodStart(logMsg, 1, logPad);
    statusBarItem.update(`Scanning for ${dspTaskType} tasks in project ${folder.name}`);

    initMaps(taskType, folder.name);

    const isExternal = providers[taskType] && providers[taskType].isExternal,
          fsChanged = isFsChanged(taskType, folder.name),
          globChanged = isGlobChanged(taskType, fileGlob);

    log.value("   glob changed", globChanged, 3, logPad);
    log.value("   fIlesystem changed", fsChanged, 3, logPad);
    log.value("   is external", isExternal, 3, logPad);

    if (!isExternal && (globChanged || fsChanged))
    {
        try
        {   let maxFiles = Infinity;
            log.write(`   Start workspace folder scan for ${taskType} files`, 3, logPad);
            if (licMgr && !licMgr.isLicensed())
            {
                const cachedFileCount = getTaskFileCount();
                maxFiles = licMgr.getMaxNumberOfTaskFiles() - cachedFileCount;
                if (maxFiles <= 0) {
                    log.write(`   Max files limit (${licMgr.getMaxNumberOfTaskFiles()}) already reached (no license)`, 2, logPad);
                    util.showMaxTasksReachedMessage(licMgr);
                    return numFilesFound;
                }
                log.write(`   Set max files to scan at ${maxFiles} files (no license)`, 3, logPad);
            }
            const relativePattern = new RelativePattern(folder, fileGlob),
                  paths = await workspace.findFiles(relativePattern, getExcludesPatternVsc(folder), maxFiles); // ,
                  // USE_GLOB: paths = await globAsync(fileGlob, { cwd: folder.uri.fsPath, ignore: getExcludesPatternsGlob() });
            for (const fPath of paths)
            {
                // USE_GLOB: const uriFile = Uri.file(join(folder.uri.fsPath, fPath));
                addToMappings(taskType, { uri: fPath /* USE_GLOB:uriFile */, project: folder.name }, logPad + "   ");
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
    }
    else /* istanbul ignore next */if (isExternal) {
        await util.timeout(150);
    }

    log.methodDone(logMsg, 1, logPad);
    return numFilesFound;
}


export async function buildTaskTypeCache(taskType: string, wsFolder: WorkspaceFolder | undefined, setCacheBuilding: boolean, logPad: string)
{
    let numFilesFound = 0;
    const providerType = taskTypeUtils.isScriptType(taskType) ? "script" : taskType;
    log.methodStart("build file cache", 1, logPad, false, [
        [ "folder", !wsFolder ? "entire workspace" : wsFolder.name ], [ "task type", taskType ],
        [ "task provider type", providerType ], [ "setCacheBuilding", setCacheBuilding.toString() ]
    ]);

    if (setCacheBuilding) {
        await startBuild();
    }

    // const glob = util.getGlobPattern(taskType);
    let glob;
    if (!taskTypeUtils.isWatchTask(taskType))
    {
        glob = providers[taskType].getGlobPattern();
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

    if (setCacheBuilding) {
        await finishBuild();
    }

    log.methodDone("build file cache", 1, logPad);
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


/**
 * @method clearMaps
 * @since 3.0.0
 */
const clearMaps = () =>
{
    taskFilesMap = {};
    projectFilesMap = {};
    projectToFileCountMap = {};
    taskGlobs = {};
};


const finishBuild = async(skipPersist?: boolean) =>
{
    const taskFiles: string[] = [];
          // taskTypes: string[] = [];
    if (skipPersist !== true) {
        persistCache();
    }
    for (const taskType of Object.keys(taskFilesMap))
    {
        // taskTypes.push(taskType);
        for (const cacheItem of taskFilesMap[taskType]) {
            taskFiles.push(cacheItem.uri.fsPath);
        }
    }
    taskFiles.sort();
    await commands.executeCommand("setContext", "vscodeTaskExplorer.taskFiles", taskFiles);
    // await commands.executeCommand("setContext", "vscodeTaskExplorer.taskTypes", taskTypes);
    statusBarItem.hide();
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


export const getTaskFiles = (taskType: string) => taskFilesMap[taskType];


/**
 * @method getTaskFileCount
 * @since 3.0.0
 */
export const getTaskFileCount = () =>
{
    let count = 0;
    Object.values(taskFilesMap).forEach((v) =>
    {
        count += v.length;
    });
    return count;
};


/**
 * @method initMaps
 * @since 3.0.0
 */
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


/**
 * @method isFsChanged
 * @since 3.0.0
 */
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


/**
 * @method isGlobChanged
 * @since 3.0.0
 */
function isGlobChanged(taskType: string, fileGlob: string)
{
    let globChanged = !taskGlobs[taskType];
    if (taskGlobs[taskType] && taskGlobs[taskType] !== fileGlob) {
        globChanged = true;
    }
    taskGlobs[taskType] = fileGlob;
    return globChanged;
}


/**
 * @method persistCache
 * @since 3.0.0
 */
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
        const text = statusBarItem.get();
        statusBarItem.update("Persisting file cache...");
        storage.update2Sync("fileCacheTaskFilesMap", taskFilesMap);
        storage.update2Sync("fileCacheProjectFilesMap", projectFilesMap);
        storage.update2Sync("fileCacheProjectFileToFileCountMap", projectToFileCountMap);
        statusBarItem.update(text);
    }
    else if (clear === true)
    {
        storage.update2Sync("fileCacheTaskFilesMap", undefined);
        storage.update2Sync("fileCacheProjectFilesMap", undefined);
        storage.update2Sync("fileCacheProjectFileToFileCountMap", undefined);
    }
};


/**
 * @method registerFileCache
 * Called on extension initialization only.
 * @since 3.0.0
 */
export const registerFileCache = async(context: ExtensionContext) =>
{
    await commands.executeCommand("setContext", "vscodeTaskExplorer.parsedFiles", []);
};


/**
 * @method registerFileCache
 * Clears the file cache, and either performs the workspace file scan to build/rebuild it,
 * or loads it from storage.
 */
export async function rebuildCache(logPad: string, forceForTests?: boolean)
{
    let numFilesFound = 0;

    log.methodStart("rebuild cache", 1, logPad, logPad === "");
    //
    // Set 'cache busy' flag used in isBusy()
    //
    cacheBusy = true;
    //
    // Clear the cache maps.  This sets all 3 IDictionary map objects and the task glob
    // mapping to empty objects {}
    //
    clearMaps();

    //
    // Load from storage maybe.  Storage-2 functions are used for persistence in the
    // development environment and the tests.
    //
    if (firstRun || forceForTests)
    {
        if (configuration.get<boolean>("enablePersistentFileCaching"))
        {
            await addFromStorage();
            numFilesFound = getTaskFileCount();
        }
        firstRun = false;
    }

    //
    // If we didn't load from storage, then start the scan to build to file cache
    //
    if (numFilesFound === 0) {
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
                    taskFilesMap[taskType].splice(object.length - 1 - index, 1);
                    ++removed.c2;
                }
            }
        });
    }

    log.values(4, logPad + "   ", [[ "cache1 rmv count", removed.c1 ], [ "cache2 rmv count", removed.c2 ]]);

    /* istanbul ignore else */
    if (uri === undefined && taskFilesMap[taskType])
    {
        log.write("   clear task files map", 4, logPad);
        taskFilesMap[taskType] = [];
    }
    else if (folderUri && removed.c2 > 0)
    {
        log.value("   removed from cache", folderUri.fsPath, 4, logPad);
    }
    else if (folderUri) {
        log.write("   doesnt exist in cache", 4, logPad);
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
            const taskFilesRemoved = removeFromMappings(taskType, f, true, logPad + "      ");
            numFilesRemoved += taskFilesRemoved;
            log.write(`   removed ${taskFilesRemoved} ${taskType} files`, 2, logPad);
        });
        delete projectToFileCountMap[f.name];
        delete projectFilesMap[f.name];
        log.write(`   removed ${numFilesRemoved} total files`, 1, logPad);
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
    statusBarItem.show();
}
