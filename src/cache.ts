/* eslint-disable prefer-arrow/prefer-arrow-functions */

import * as util from "./common/utils";
import * as log from "./common/log";
import { configuration } from "./common/configuration";
import { providers, providersExternal } from "./extension";
import {
    workspace, window, RelativePattern, WorkspaceFolder, Uri, StatusBarAlignment, StatusBarItem
} from "vscode";
import * as glob from "glob";
import { join } from "path";


let statusBarSpace: StatusBarItem;
let cacheBuilding = false;
let folderCaching = false;
let cancel = false;
let taskGlobs: any = {};
const filesCache: Map<string, Set<ICacheItem>> = new Map();
// const projectFilesMap: { [project: string]:  { [taskType: string]: { [uri: Uri]: string | undefined }}} = {};
// const projectToTasksMapping: { [project: string]:  { [projectPath: string]: Task[] }} = {};
let projectFilesMap: { [project: string]:  { [taskType: string]: Uri[] }} = {};
let projectToFileCountMap: any = {};

export interface ICacheItem
{
    uri: Uri;
    folder: WorkspaceFolder;
}

export const getFilesCache = () => filesCache;


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
            const fCache = filesCache.get(providerName) as Set<ICacheItem>;

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
                        const v = { uri: fPath, folder: wsFolder };
                        if (!fCache.has(v))
                        {
                            if (!util.isExcluded(fPath.path, "   "))
                            {
                                fCache.add(v);
                                addItemToMappings(providerName, v);
                                log.value("   Added to cache", fPath.fsPath, 3, logPad);
                            }
                        }
                        else {
                            log.write("   Already exists in cache", 3, logPad);
                        }
                    }
                    log.write(`   Folder scan complete, found '${paths.length}' files`, 2, logPad);
                    projectToFileCountMap[wsFolder.name] += paths.length;
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


function addItemToMappings(taskType: string, item: ICacheItem)
{
    if (!projectFilesMap[item.folder.name]) {
        projectFilesMap[item.folder.name] = {};
    }
    if (!projectFilesMap[item.folder.name][taskType]) {
        projectFilesMap[item.folder.name][taskType] = [];
    }
    projectFilesMap[item.folder.name][taskType].push(item.uri);
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

    if (!filesCache.get(taskType)) {
        filesCache.set(taskType, new Set());
    }
    const fCache = filesCache.get(taskType) as Set<ICacheItem>;

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
    let fsChanged = false;
    if (folder && projectToFileCountMap[folder.name]  && projectFilesMap[folder.name] && projectFilesMap[folder.name][taskType])
    {
        fsChanged = projectToFileCountMap[folder.name] !== projectFilesMap[folder.name][taskType].length;
    }
    else {
        fsChanged = true;
    }

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
                const v = { uri: fPath, folder };
                if (!fCache.has(v))
                {
                    if (!util.isExcluded(fPath.path, "   "))
                    {
                        fCache.add(v);
                        addItemToMappings(taskType, v);
                        log.value("   Added to cache", fPath.fsPath, 3, logPad);
                    }
                }
                else {
                    log.write("   Already exists in cache", 3, logPad);
                }
            }
            log.write(`   Workspace scan complete, found '${paths.length}' files`, 3, logPad);
            projectToFileCountMap[folder.name] = paths.length;
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


export async function addFileToCache(taskType: string, uri: Uri)
{
    if (!filesCache.get(taskType)) {
        filesCache.set(taskType, new Set());
    }
    const taskCache = filesCache.get(taskType),
          wsf = workspace.getWorkspaceFolder(uri);
    if (taskCache && wsf)
    {
        const item = { uri, folder: wsf };
        taskCache.add(item);
        addItemToMappings(taskType, item);
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


export function globAsync(pattern: string, options: any): Promise<string[]>
{
    return new Promise(function (resolve, reject)
    {
        glob(pattern, options, function (err, files)
        {
            if (!err) {
                resolve(files);
            }
            else {
                reject(err);
            }
        });
    });
}


export function isCachingBusy()
{
    return cacheBuilding === true || folderCaching === true;
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
    else {
        filesCache.forEach((c) =>
        {
            c.forEach(p => {
                if (p.folder.name === folder.name && p.folder.uri.fsPath.includes(folder.uri.fsPath))  {
                    c.delete(p);
                }
                projectFilesMap[p.folder.name] = {};
            });
        });
    }
    await addWsFolderToCache(folder, true, logPad);
}


export async function removeFileFromCache(taskType: string, uri: Uri, logPad: string)
{
    const wsf = workspace.getWorkspaceFolder(uri),
          itemCache = filesCache.get(taskType),
          toRemove = [];

    log.write("remove file from cache", 1, logPad);
    log.value("   task type", taskType, 2, logPad);
    log.value("   file", uri.fsPath, 2, logPad);

    if (itemCache)
    {
        log.value("   cache size", itemCache.size, 2, logPad);

        for (const item of itemCache)
        {
            if (item.uri.fsPath === uri.fsPath)
            {
                toRemove.push(item);
                break;
            }
        }
        for (const tr of toRemove)
        {
            itemCache.delete(tr);
            if (wsf && projectFilesMap[wsf.name] && projectFilesMap[wsf.name][taskType] && projectToFileCountMap[wsf.name])
            {
                const cIdx = projectFilesMap[wsf.name][taskType].findIndex(c => c.fsPath === uri.fsPath);
                if (cIdx !== -1) {
                    projectFilesMap[wsf.name][taskType].splice(cIdx, 1);
                    --projectToFileCountMap[wsf.name];
                }
            }
        }
    }
}


export async function removeFolderFromCache(uri: Uri, logPad: string)
{
    log.methodStart("remove folder from cache", 1, logPad, false, [[ "folder", uri.fsPath ]]);

    for (const itemCache of filesCache.entries())
    {
        const toRemove = [],
        cache = itemCache[1],
              taskType = itemCache[0];

        log.write(`   Processing files cached for ${taskType} tasks`, 2, logPad);

        for (const item of cache)
        {
            if (item.uri.fsPath.startsWith(uri.fsPath))
            {
                toRemove.push(item);
            }
        }
        for (const tr of toRemove)
        {
            cache.delete(tr);
            const wsf = workspace.getWorkspaceFolder(uri);
            if (wsf && projectFilesMap[wsf.name] && projectFilesMap[wsf.name][taskType] && projectToFileCountMap[wsf.name])
            {
                const mappings = projectFilesMap[wsf.name][taskType].filter(c => c.fsPath.startsWith(uri.fsPath));
                for (const m of mappings)
                {
                    const cIdx = projectFilesMap[wsf.name][taskType].findIndex(c => c.fsPath === m.fsPath);
                    log.value(`      remove file index ${cIdx}`, m.fsPath, 2, logPad);
                    projectFilesMap[wsf.name][taskType].splice(cIdx, 1);
                    --projectToFileCountMap[wsf.name];
                }
            }
        }
    }

    log.methodDone("remove folder from cache", 1, logPad);
}


export async function removeWsFolders(wsf: readonly WorkspaceFolder[], logPad = "")
{
    log.methodStart("process remove workspace folder", 1, logPad, true);

    for (const f of wsf)
    {   /* istanbul ignore next */
        log.value("      folder", f.name, 1, logPad);
        // window.setStatusBarMessage("$(loading) Task Explorer - Removing projects...");
        /* istanbul ignore next */
        for (const c of filesCache)
        {   /* istanbul ignore next */
            const files = c[1], provider = c[0],
                  toRemove: ICacheItem[] = [];
            /* istanbul ignore next */
            log.value("      start remove task files from cache", provider, 2, logPad);
            /* istanbul ignore next */
            for (const file of files)
            {   /* istanbul ignore next */
                log.value("         checking cache file", file.uri.fsPath, 4, logPad);
                /* istanbul ignore next */
                if (file.folder.uri.fsPath === f.uri.fsPath)
                {   /* istanbul ignore next */
                    log.write("            added for removal",  4, logPad);
                    /* istanbul ignore next */
                    toRemove.push(file);
                }
            }
            /* istanbul ignore next */
            if (toRemove.length > 0)
            {   /* istanbul ignore next */
                for (const tr of toRemove)
                {   /* istanbul ignore next */
                    log.value("         remove file", tr.uri.fsPath, 2, logPad);
                    /* istanbul ignore next */
                    files.delete(tr);
                    /* istanbul ignore next */
                    delete projectToFileCountMap[f.name];
                    /* istanbul ignore next */
                    if (f && projectFilesMap[f.name])
                    {   /* istanbul ignore next */
                        delete projectFilesMap[f.name];
                    }
                }
            }
            /* istanbul ignore next */
            log.value("      completed remove files from cache", provider, 2, logPad);
        }
        /* istanbul ignore next */
        log.write("   folder removed", 1, logPad);
    }
    log.methodDone("process remove workspace folder", 1, logPad, true);
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

