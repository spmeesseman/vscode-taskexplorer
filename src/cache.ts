/* eslint-disable prefer-arrow/prefer-arrow-functions */

import * as util from "./common/utils";
import * as log from "./common/log";
import { configuration } from "./common/configuration";
import { providers, providersExternal } from "./extension";
import {
    workspace, window, RelativePattern, WorkspaceFolder, Uri, StatusBarAlignment, StatusBarItem
} from "vscode";
// import * as glob from "glob";
// import { join } from "path";

export interface ICacheItem
{
    uri: Uri;
    folder: WorkspaceFolder;
}


let statusBarSpace: StatusBarItem;
let cacheBuilding = false;
let folderCaching = false;
let cancel = false;
let projectFilesMap: { [project: string]:  { [taskType: string]: Uri[] }} = {};
let projectToFileCountMap: { [project: string]:  { [taskType: string]: number }} = {};
let taskGlobs: any = {};
const filesCache: Map<string, Set<ICacheItem>> = new Map<string, Set<ICacheItem>>();
const taskFilesMap: { [taskType: string]:  ICacheItem[] } = {};  // will replacefilesCache with this at some point


export async function addFileToCache(taskType: string, uri: Uri, logPad: string)
{
    log.methodStart("add file to cache", 1, logPad, true);
    const wsf = workspace.getWorkspaceFolder(uri);
    if (wsf) {
        const item = { uri, folder: wsf };
        addToMappings(taskType, item, logPad + "   ");
    }
    log.methodDone("add file to cache", 1, logPad, true);
}


export async function addFolderToCache(folder: Uri, logPad: string)
{
    const wsFolder = workspace.getWorkspaceFolder(folder);
    if (!wsFolder) {
        return;
    }

    log.methodStart("add folder to cache", 1, logPad, false, [[ "folder", folder.fsPath ]]);

    //
    // Wait for caches to get done building before proceeding
    //
    await waitForCache();            // If the global cache is still building, wait
    await waitForFolderCaching();    // If the folder cache is still building, wait

    folderCaching = true;  // set flag
    cacheBuilding = true;  // set flag

    //
    // Status bar
    //
    statusBarSpace = window.createStatusBarItem(StatusBarAlignment.Left, -10000);
    statusBarSpace.tooltip = "Task Explorer is building the task cache";
    statusBarSpace.show();

    const taskProviders = ([ ...util.getTaskTypes(), ...providersExternal.keys() ]).sort();
    for (const providerName of taskProviders)
    {
        const externalProvider = providersExternal.get(providerName),
              dspTaskType = providerName !== "tsc" && providerName !== "apppublisher" ?
                            util.properCase(providerName) : (providerName === "tsc" ? "Typescript" : "App-Publisher");

        if (!cancel && (externalProvider || util.isTaskTypeEnabled(providerName)))
        {
            if (!filesCache.get(providerName)) {
                throw new Error("Workspace project folder has not yet been scanned");
            }

            let glob;
            if (!util.isWatchTask(providerName))
            {
                const provider = providers.get(util.getTaskProviderType(providerName)) || externalProvider;
                glob = provider?.getGlobPattern(providerName);
            }
            if (!glob) {
                glob = util.getGlobPattern(providerName);
            }

            statusBarSpace.text = getStatusString(`Scanning for ${dspTaskType} tasks in project ${wsFolder.name}`, 65);
            log.value("   adding folder cache for provider", providerName, 3, logPad);

            if (!providersExternal.get(providerName))
            {
                try
                {
                    log.write("   Start folder scan", 2, logPad);
                    const relativePattern = new RelativePattern(folder, glob),
                          paths = await workspace.findFiles(relativePattern, getExcludesPatternVsc(folder.fsPath));
                    for (const fPath of paths)
                    {
                        if (cancel) {
                            cancelInternal(false);
                            break;
                        }
                        addToMappings(providerName, { uri: fPath, folder: wsFolder }, logPad + "      ");
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

    if (cancel) {
        log.write("Add folder to cache cancelled", 3, logPad);
    }
    else {
        log.write("Add folder to cache complete", 3, logPad);
    }

    cacheBuilding = false;   // un-set flag
    folderCaching = false;   // un-set flag
    cancel = false;          // un-set flag

    log.methodDone("add folder to cache", 1, logPad);
}


async function addWsFolderToCache(folder: WorkspaceFolder | undefined, setCacheBuilding: boolean, logPad: string)
{
    log.methodStart("add workspace project folder to cache", 3, logPad, false, [[ "folder", !folder ? "entire workspace" : folder.name ]]);

    if (setCacheBuilding)
    {   //
        // Wait for caches to get done building before proceeding
        //
        await waitForCache();            // If the global cache is still building, wait
        await waitForFolderCaching();    // If the folder cache is still building, wait

        folderCaching = true;  // set flag
        cacheBuilding = true;  // set flag
    }

    //
    // Status bar
    //
    statusBarSpace = window.createStatusBarItem(StatusBarAlignment.Left, -10000);
    statusBarSpace.tooltip = "Task Explorer is building the task cache";
    statusBarSpace.show();

    const taskProviders = ([ ...util.getTaskTypes(), ...providersExternal.keys() ]).sort();
    for (const providerName of taskProviders)
    {
        const externalProvider = providersExternal.get(providerName);
        if (!cancel && (externalProvider || util.isTaskTypeEnabled(providerName)))
        {
            let glob;
            if (!util.isWatchTask(providerName))
            {
                const provider = providers.get(util.getTaskProviderType(providerName)) || externalProvider;
                glob = provider?.getGlobPattern(providerName);
            }
            if (!glob) {
                glob = util.getGlobPattern(providerName);
            }

            log.value("   building workspace project cache for provider", providerName, 3, logPad);
            await buildCache(providerName, glob, folder, false, logPad + "   ");
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
        //
        // Release status bar reserved space
        //
        disposeStatusBarSpace(statusBarSpace);

        cacheBuilding = false;   // un-set flag
        folderCaching = false;   // un-set flag
    }

    cancel = false;          // un-set flag

    log.methodDone("add workspace project folder to cache", 3, logPad);
}


export async function addWsFolders(wsf: readonly WorkspaceFolder[] | undefined, logPad = "")
{
    /* istanbul ignore else */
    if (wsf)
    {
        //
        // Wait for caches to get done building before proceeding
        //
        await waitForCache();            // If the global cache is still building, wait
        await waitForFolderCaching();    // If the folder cache is still building, wait

        folderCaching = true;  // set flag
        cacheBuilding = true;  // set flag

        //
        // Status bar
        //
        statusBarSpace = window.createStatusBarItem(StatusBarAlignment.Left, -10000);
        statusBarSpace.tooltip = "Task Explorer is building the task cache";
        statusBarSpace.show();

        for (const f in wsf)
        {   /* istanbul ignore else */
            if ([].hasOwnProperty.call(wsf, f)) { // skip over properties inherited by prototype
                log.methodStart("add workspace project folder", 1, logPad, true, [[ "name", wsf[f].name ]]);
                await addWsFolderToCache(wsf[f], false, logPad + "   ");
                log.methodDone("add workspace project folder", 1, logPad);
            }
        }

        //
        // Release status bar reserved space
        //
        disposeStatusBarSpace(statusBarSpace);

        cacheBuilding = false;   // un-set flag
        folderCaching = false;   // un-set flag
    }
}


function addToMappings(taskType: string, item: ICacheItem, logPad: string)
{
    log.methodStart("add item to mappings", 4, logPad, false, [[ "task type", taskType ], [ "file", item.uri.fsPath ]]);

    if (!util.isExcluded(item.uri.path, "   "))
    {
        initMaps(taskType, item.folder.name);
        const added = {
            c1: 0, c2: 0, c3: 0
        };
        const fCache = filesCache.get(taskType) as Set<ICacheItem>;

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

        if (added.c1 > 0)
        {
            log.value("   added to cache", item.uri.fsPath, 4, logPad);
        }
        else {
            log.write("   already exists in cache", 4, logPad);
        }
    }
    else {
        log.write("   ignored by 'excludes'", 4, logPad);
    }

    log.methodDone("add item to mappings", 4, logPad);
}


export async function buildCache(taskType: string, fileGlob: string, wsFolder: WorkspaceFolder | undefined, setCacheBuilding: boolean, logPad: string)
{
    const taskProviderType = util.getTaskProviderType(taskType);

    log.methodStart("build file cache", 2, logPad, true, [
        [ "folder", !wsFolder ? "entire workspace" : wsFolder.name ], [ "task type", taskType ],
        [ "task provider type", taskProviderType ], [ "glob", fileGlob ], [ "setCacheBuilding", setCacheBuilding.toString() ]
    ]);

    if (setCacheBuilding) {
        //
        // If buildCache is already running in another scope, then wait before proceeding
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

    //
    // If 'wsFolder' if falsey, build the entire cache.  If truthy, build the cache for the
    // specified folder only
    //
    if (!wsFolder)
    {
        log.blank(1);
        log.write("   Build cache - Scan all projects for taskType '" + taskType + "' (" + taskType + ")", 1, logPad);
        await buildFolderCaches(taskType, fileGlob, setCacheBuilding, logPad + "   ");
    }
    else {
        await buildFolderCache(wsFolder, taskType, fileGlob, setCacheBuilding, logPad + "   ");
    }

    if (setCacheBuilding)
    {   //
        // Release status bar reserved space
        //
        disposeStatusBarSpace(statusBarSpace);
        cancel = false;           // reset flag
        cacheBuilding = false;    // reset flag
    }

    log.methodDone("build file cache", 2, logPad, true);
}


async function buildFolderCache(folder: WorkspaceFolder, taskType: string, fileGlob: string, setCacheBuilding: boolean, logPad: string)
{
    const logMsg = "Scan project " + folder.name + " for " + taskType + " tasks",
          dspTaskType = taskType !== "tsc" && taskType !== "apppublisher" ?
                        util.properCase(taskType) : (taskType === "tsc" ? "Typescript" : "App-Publisher");

    log.methodStart(logMsg, 1, logPad, true);
    statusBarSpace.text = getStatusString(`Scanning for ${dspTaskType} tasks in project ${folder.name}`, 65);

    //
    // Handle glob changes
    // For 'script' alias, to support this, we'd need to keep separate cache maps for each
    // script type (batch, powershell, python, etc)
    // The `fileGlob` parameter will be undefined for external task providers
    //
    let globChanged = !taskGlobs[taskType];
    if (taskGlobs[taskType] && taskGlobs[taskType] !== fileGlob)
    {
        globChanged = true;
        // fCache.clear();
    }
    taskGlobs[taskType] = fileGlob;

    //
    // Handle filesystem changes. Glob changes and fs changes are really the only reasons to
    // rescan the projects again for tasks.
    //
    initMaps(taskType, folder.name);
    const fsChanged = isFsChanged(taskType, folder.name);

    log.value("   glob changed", globChanged, 3, logPad);
    log.value("   fIlesystem changed", fsChanged, 3, logPad);

    if (!providersExternal.get(taskType) && (globChanged || fsChanged))
    {
        try {
            log.write("   Start workspace scan", 3, logPad);
            const relativePattern = new RelativePattern(folder, fileGlob),
                  paths = await workspace.findFiles(relativePattern, getExcludesPatternVsc(folder));
            for (const fPath of paths)
            {
                if (cancel) {
                    cancelInternal(setCacheBuilding);
                    return [];
                }
                addToMappings(taskType, { uri: fPath, folder }, logPad + "   ");
            }
            projectToFileCountMap[folder.name][taskType] = paths.length;
            log.write(`   Workspace scan complete, found '${paths.length}' files`, 3, logPad);
        }
        catch (e: any) { log.error(e); }
        /*
        const paths = await globAsync(fileGlob, { cwd: folder.uri.fsPath, ignore: getExcludesPattern() });
        for (const fPath of paths)
        {
            if (cancel)
            {
                cancelInternal(setCacheBuilding, statusBarSpace);
                return;
            }
            const uriFile = Uri.file(join(folder.uri.fsPath, fPath));
            if (!util.isExcluded(uriFile.path, "   "))
            {
                fCache.add({ uri: uriFile, folder });
                log.value("   Added to cache", uriFile.fsPath, 3, logPad);
                log.value("      Cache size (# of files)", fCache.size, 4, logPad);
            }
        }
        */
    }
    else {
        await util.timeout(250);
    }

    log.methodDone(logMsg, 1, logPad, true);
}


async function buildFolderCaches(taskType: string, fileGlob: string, setCacheBuilding: boolean, logPad: string)
{
    if (workspace.workspaceFolders) // ensure workspace folders exist
    {
        for (const folder of workspace.workspaceFolders)
        {
            await buildFolderCache(folder, taskType, fileGlob, setCacheBuilding, logPad);
        }
    }
}


function cancelInternal(setCacheBuilding: boolean)
{
    if (setCacheBuilding) {
        cacheBuilding = false;
        cancel = false;
    }
    disposeStatusBarSpace(statusBarSpace);
    log.write("   Cache building cancelled", 1);
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
    statusBarSpace.hide();
    statusBarSpace.dispose();
}


// function getExcludesPatternGlob()
// {
//     const excludes: string[] = configuration.get("exclude");
//     return [ "**/node_modules/**", "**/work/**", ...excludes ];
// }


function getExcludesPatternVsc(folder: string | WorkspaceFolder): RelativePattern
{
    const excludes: string[] = configuration.get("exclude"),
          multiFilePattern = util.getCombinedGlobPattern("**/node_modules/**,**/work/**", excludes);
    return new RelativePattern(folder, multiFilePattern);
}


function getStatusString(msg: string, statusLength: number)
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
    return "$(loading~spin) " + msg;
}


export const getTaskFiles = (taskType: string) =>
{
    return filesCache.get(taskType) || new Set();
};


// export function globAsync(pattern: string, options: any): Promise<string[]>
// {
//     return new Promise(function (resolve, reject)
//     {
//         glob(pattern, options, function (err, files)
//         {
//             if (!err) {
//                 resolve(files);
//             }
//             else {
//                 reject(err);
//             }
//         });
//     });
// }


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
    if (!projectToFileCountMap[project]) {
        projectToFileCountMap[project][taskType] = 0;
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
    return cacheBuilding === true || folderCaching === true;
}


function isFsChanged(taskType: string, project: string)
{
    let fsChanged = false;
    if (projectFilesMap[project] && projectFilesMap[project][taskType])
    {
        fsChanged = projectToFileCountMap[project][taskType] !== projectFilesMap[project][taskType].length;
    }
    else if (taskFilesMap[taskType])
    {
        fsChanged = projectToFileCountMap[project][taskType] !== taskFilesMap[taskType].filter(f => f.folder.name === project).length;
    }
    else {
        fsChanged = true;
    }
    return fsChanged;
}


export async function rebuildCache(folder: WorkspaceFolder | undefined, logPad = "")
{
    log.blank(1);
    log.write("rebuild cache", 1, logPad);
    if (!folder)
    {
        filesCache.clear();
        projectFilesMap = {};
        projectToFileCountMap = {};
        taskGlobs = {};
    }
    else
    {
        for (const item of filesCache.entries())
        {
            const taskType = item[0],
                  cache = item[1];
            cache.forEach(p =>
            {
                if (p.folder.name === folder.name)  {
                    cache.delete(p);
                }
            });
            taskFilesMap[taskType].slice().reverse().forEach((item, index, object) =>
            {
                if (item.folder.name === folder.name) {
                    taskFilesMap[taskType].splice(object.length - 1 - index, 1);
                }
            });
            projectFilesMap[folder.name] = {};
        }
    }
    await addWsFolderToCache(folder, true, logPad);
}


export async function removeFileFromCache(taskType: string, uri: Uri, logPad: string)
{
    log.methodStart("remove file from cache", 2, logPad, false, [[ "task type", taskType ], [ "path", uri.fsPath ]]);
    removeFromMappings(taskType, uri, false, logPad + "   ");
    log.methodDone("remove file from cache", 1, logPad);
}


export async function removeFolderFromCache(uri: Uri, logPad: string)
{
    log.methodStart("remove folder from cache", 1, logPad, false, [[ "folder", uri.fsPath ]]);
    for (const taskType of filesCache.keys())
    {
        log.write(`   Processing files cached for ${taskType} tasks`, 2, logPad);
        removeFromMappings(taskType, uri, true, logPad + "   ");
    }
    log.methodDone("remove folder from cache", 1, logPad);
}


function removeFromMappings(taskType: string, uri: Uri, isFolder: boolean, logPad: string)
{
    log.methodStart("remove item from mappings", 2, logPad, false, [[ "task type", taskType ], [ "path", uri.fsPath ]]);

    const wsf = workspace.getWorkspaceFolder(uri);
    if (!wsf) {
        return;
    }
    const removed = {
        c1: 0, c2: 0, c3: 0
    };

    initMaps(taskType, wsf.name);
    const fCache = filesCache.get(taskType) as Set<ICacheItem>;

    const toRemove = [];
    for (const item of fCache)
    {
        if (item.uri.fsPath === uri.fsPath || (isFolder && item.uri.fsPath.startsWith(uri.fsPath)))
        {
            toRemove.push(item);
            if (!isFolder) {
                break;
            }
        }
    }
    for (const tr of toRemove)
    {
        fCache.delete(tr);
        ++removed.c1;
    }

    if (projectFilesMap[wsf.name] && projectFilesMap[wsf.name][taskType])
    {
        projectFilesMap[wsf.name][taskType].slice().reverse().forEach((item, index, object) =>
        {
            if (item.fsPath === uri.fsPath || (isFolder && item.fsPath.startsWith(uri.fsPath)))
            {
                log.value(`      remove file index ${index}`, item.fsPath, 2, logPad);
                projectFilesMap[wsf.name][taskType].splice(object.length - 1 - index, 1);
                ++removed.c2;
            }
        });
    }

    if (taskFilesMap[taskType])
    {
        taskFilesMap[taskType].slice().reverse().forEach((item, index, object) =>
        {
            if (item.uri.fsPath === uri.fsPath || (isFolder && item.uri.fsPath.startsWith(uri.fsPath)))
            {
                taskFilesMap[taskType].splice(object.length - 1 - index, 1);
                ++removed.c3;
            }
        });
    }

    log.values(3, logPad + "      ", [
        [ "cache1 count", removed.c1 ], [ "cache2 count", removed.c2 ], [ "cache3 count", removed.c3 ]
    ]);

    log.methodDone("remove item from mappings", 2, logPad);
}


export async function removeWsFolders(wsf: readonly WorkspaceFolder[], logPad = "")
{
    log.methodStart("remove workspace folder", 1, logPad, true);
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
    log.methodDone("remove workspace folder", 1, logPad, true);
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

