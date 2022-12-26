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


let cacheBuilding = false;
let folderCaching = false;
let cancel = false;
let taskGlobs: any = {};
const filesCache: Map<string, Set<ICacheItem>> = new Map();


export interface ICacheItem
{
    uri: Uri;
    folder: WorkspaceFolder;
}

export const getFilesCache = () => filesCache;


export async function addFolderToCache(folder: WorkspaceFolder | undefined, logPad: string)
{
    log.methodStart("add folder to cache", 3, logPad, false, [[ "folder", !folder ? "entire workspace" : folder.name ]]);

    //
    // Wait for caches to get done building before proceeding
    //
    await waitForCache();            // If the global cache is still building, wait
    await waitForFolderCaching();    // If the folder cache is still building, wait

    folderCaching = true;  // set flag
    cacheBuilding = true;  // set flag

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

            log.value("   building cache for provider", providerName, 3, logPad);
            await buildCache(providerName, glob, folder, false, logPad + "   ");
        }
    }

    cacheBuilding = false;   // un-set flag
    folderCaching = false;   // un-set flag

    if (cancel) {
        log.write("Add folder to cache cancelled", 3, logPad);
    }
    else {
        log.write("Add folder to cache complete", 3, logPad);
    }
    cancel = false;          // un-set flag

    log.methodDone("add folder to cache", 3, logPad);
}


export async function buildCache(taskType: string, fileGlob: string, wsFolder: WorkspaceFolder | undefined, setCacheBuilding: boolean, logPad: string)
{
    const taskProviderType = util.getTaskProviderType(taskType);

    log.methodStart("build file cache", 2, logPad, true, [
        [ "folder", !wsFolder ? "entire workspace" : wsFolder.name ], [ "task type", taskType ],
        [ "task provider type", taskProviderType ], [ "glob", fileGlob ], [ "setCacheBuilding", setCacheBuilding.toString() ]
    ]);

    if (!filesCache.get(taskProviderType)) {
        filesCache.set(taskProviderType, new Set());
    }
    const fCache = filesCache.get(taskProviderType) as Set<ICacheItem>;

    if (setCacheBuilding) {
        //
        // If buildCache is already running in another scope, then wait before proceeding
        //
        await waitForCache();
        cacheBuilding = true;
    }

    //
    // Status bar
    //
    const statusBarSpace = window.createStatusBarItem(StatusBarAlignment.Left, -10000);
    statusBarSpace.tooltip = "Task Explorer is building the task cache";
    statusBarSpace.show();

    //
    // Handle glob changes
    // For 'script' alias, to support this, we'd need to keep separate cache maps for each
    // script type (batch, powershell, python, etc)
    // The `fileGlob` parameter will be undefined for external task providers
    //
    let globChanged = !taskGlobs[taskType] || taskProviderType === "script";
    if (taskGlobs[taskType] && taskProviderType !== "script")
    {   //
        // As of v1.31, Ant globs will be the only task types whose blobs may change
        //
        if (taskGlobs[taskType] !== fileGlob)
        {
            globChanged = true;
            fCache.clear();
        }
    }
    taskGlobs[taskType] = fileGlob;

    //
    // *** IMPORTANT NOTE ***
    // TODO - Check the need for a cache clear on a task type
    // We do it above for Ant and Bash tasks when the file glob changes in settings (this is most
    // definitely needed for Ant/Bash tasks, but other tasks' globs can't change).
    // I believe we should be doing a fCache.clear() here, I don't think the buildTaskFolder/s()
    // function check object existence in the Set before inserting them.  Note calling clear()
    // on the 'script' task alias won't work unless we have a unique set for each script type
    // e.g. batch, bash, etc.
    //

    //
    // If 'wsFolder' if falsey, build the entire cache.  If truthy, build the cache for the
    // specified folder only
    //
    if (globChanged)
    {
        if (!wsFolder)
        {
            log.blank(1);
            log.write("   Build cache - Scan all projects for taskType '" + taskType + "' (" + taskType + ")", 1, logPad);
            await buildFolderCaches(fCache, taskType, fileGlob, statusBarSpace, setCacheBuilding, logPad + "   ");
        }
        else {
            await buildFolderCache(fCache, wsFolder, taskType, fileGlob, statusBarSpace, setCacheBuilding, logPad + "   ");
        }
    }

    //
    // Release status bar reserved space
    //
    disposeStatusBarSpace(statusBarSpace);

    if (setCacheBuilding) {
        cancel = false;           // reset flag
        cacheBuilding = false;    // reset flag
    }

    log.methodDone("build file cache", 2, logPad, true);
}


async function buildFolderCache(fCache: Set<any>, folder: WorkspaceFolder, taskType: string, fileGlob: string, statusBarSpace: StatusBarItem, setCacheBuilding: boolean, logPad: string)
{
    const logMsg = "Scan project " + folder.name + " for " + taskType + " tasks",
          dspTaskType = taskType !== "tsc" ? util.properCase(taskType) : "Typescript";
    log.methodStart(logMsg, 1, logPad, true);
    statusBarSpace.text = getStatusString(`Scanning for ${dspTaskType} tasks in project ${folder.name}`, 65);

    if (!providersExternal.get(taskType))
    {
        const paths = glob.sync(fileGlob, { cwd: folder.uri.fsPath, ignore: getExcludesPattern() });
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
    }
    else {
        await util.timeout(150);
    }

    log.methodDone(logMsg, 1, logPad, true);
}


async function buildFolderCaches(fCache: Set<any>, taskType: string, fileGlob: string, statusBarSpace: StatusBarItem, setCacheBuilding: boolean, logPad: string)
{
    if (workspace.workspaceFolders) // ensure workspace folders exist
    {
        for (const folder of workspace.workspaceFolders)
        {
            await buildFolderCache(fCache, folder, taskType, fileGlob, statusBarSpace, setCacheBuilding, logPad);
        }
    }
}


export async function addFileToCache(taskType: string, uri: Uri)
{
    const taskProviderType = util.getTaskProviderType(taskType);
    if (!filesCache.get(taskProviderType)) {
        filesCache.set(taskProviderType, new Set());
    }
    const taskCache = filesCache.get(taskProviderType),
          wsf = workspace.getWorkspaceFolder(uri);
    if (taskCache && wsf) {
        taskCache.add({
            uri,
            folder: wsf
        });
    }
}


function cancelInternal(setCacheBuilding: boolean, statusBarSpace: StatusBarItem)
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


function getExcludesPattern()
{
    const excludes: string[] = configuration.get("exclude");
    return util.getCombinedGlobPattern("**/node_modules/**,**/work/**", excludes);
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
    }
    else {
        filesCache.forEach(c => {
            c.forEach(p => {
                if (p.folder.name === folder.name && p.folder.uri.fsPath.includes(folder.uri.fsPath))  {
                    c.delete(p);
                }
            });
        });
    }
    taskGlobs = {};
    await addFolderToCache(folder, logPad);
}


export async function removeFileFromCache(taskType: string, uri: Uri, logPad: string)
{
    const taskProviderType = util.getTaskProviderType(taskType);
    const itemCache = filesCache.get(taskProviderType),
          toRemove = [];

    log.write("remove file from cache", 1, logPad);
    log.value("   task type", taskProviderType, 2, logPad);
    log.value("   file", uri.fsPath, 2, logPad);

    if (itemCache)
    {
        log.value("   cache size", itemCache.size, 2, logPad);

        for (const item of itemCache)
        {
            if (item.uri.fsPath === uri.fsPath) // || !util.pathExists(item.uri.path)) // <- why does this break shit?!?!
            {
                toRemove.push(item);
            }
        }
        for (const tr of toRemove) {
            itemCache.delete(tr);
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

