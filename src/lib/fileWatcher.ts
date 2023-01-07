/* eslint-disable prefer-arrow/prefer-arrow-functions */

import * as util from "./utils/utils";
import * as cache from "../cache";
import * as log from "./utils/log";
import { Disposable, ExtensionContext, FileSystemWatcher, workspace, WorkspaceFolder, Uri } from "vscode";
import { refreshTree } from "./refreshTree";
import { isDirectory, numFilesInDirectory } from "./utils/fs";
import { extname } from "path";
import { ITaskExplorerApi } from "../interface";

let teApi: ITaskExplorerApi;
let processingFsEvent = false;
const eventQueue: any[] = [];
const watchers: Map<string, FileSystemWatcher> = new Map();
const watcherDisposables: Map<string, Disposable> = new Map();
let workspaceWatcher: Disposable | undefined;
const dirWatcher: {
    watcher?: FileSystemWatcher | undefined;
    onDidCreate?: Disposable;
    onDidDelete?: Disposable;
} = {};


export function disposeFileWatchers()
{
    for (const [ k, d ] of watcherDisposables) {
        d.dispose();
    }
    for (const [ k, w ] of watchers) {
        w.dispose();
    }
}


export const isProcessingFsEvent = () => processingFsEvent;


export async function registerFileWatchers(context: ExtensionContext, api: ITaskExplorerApi)
{
    teApi = api;
    //
    // Watch individual task type files within the project folder
    //
    await createFileWatchers(context);
    //
    // Watch for folder adds and deletes within the project folder
    //
    createDirWatcher(context);
    //
    // Refresh tree when folders/projects are added/removed from the workspace, in a multi-root ws
    //
    createWorkspaceWatcher(context);
}


export async function registerFileWatcher(context: ExtensionContext, taskType: string, fileBlob: string, enabled?: boolean, logPad = "")
{
    log.methodStart("Register file watcher for task type '" + taskType + "'", 1, logPad);

    let watcher = watchers.get(taskType);
    //
    // Ignore modification events for some task types (script type, e.g. 'bash', 'python' etc)
    // app-publisher and maven only get watched for invalid syntax.  they always have same # of tasks for a file.
    //
    const ignoreModify = util.isScriptType(taskType); // || taskType === "apppublisher" || taskType === "maven";

    /* istanbul ignore else */
    if (workspace.workspaceFolders) {
        if (enabled !== false){
            await cache.buildCache(taskType, fileBlob, undefined, true, "   ");
        }
        else {
            cache.removeTaskTypeFromCache(taskType, logPad + "   ");
        }
    }

    if (watcher)
    {
        const watcherDisposable = watcherDisposables.get(taskType);
        if (watcherDisposable)
        {
            watcherDisposable.dispose();
            watcherDisposables.delete(taskType);
        }
    }

    if (enabled !== false)
    {
        if (!watcher) {
            watcher = workspace.createFileSystemWatcher(fileBlob);
            watchers.set(taskType, watcher);
            context.subscriptions.push(watcher);
        }

        if (!ignoreModify)
        {
            watcherDisposables.set(taskType, watcher.onDidChange(async uri =>
            {
                if (!util.isExcluded(uri.fsPath))
                {
                    if (!processingFsEvent) {
                        await _procFileChangeEvent(taskType, uri);
                    }
                    else {
                        eventQueue.push({ fn: _procFileChangeEvent, args: [ taskType, uri, "   " ], event: "modify file" });
                    }
                }
            }));
        }

        watcherDisposables.set(taskType, watcher.onDidDelete(async uri =>
        {
            if (!util.isExcluded(uri.fsPath))
            {
                if (!processingFsEvent) {
                    await _procFileDeleteEvent(taskType, uri);
                }
                else {
                    eventQueue.push({ fn: _procFileDeleteEvent, args: [ taskType, uri, "   " ], event: "delete file" });
                }
            }
        }));

        watcherDisposables.set(taskType, watcher.onDidCreate(async uri =>
        {
            if (!util.isExcluded(uri.fsPath))
            {
                if (!processingFsEvent) {
                    await _procFileCreateEvent(taskType, uri);
                }
                else {
                    eventQueue.push({ fn: _procFileCreateEvent, args: [ taskType, uri, "   " ], event: "create file" });
                }
            }
        }));
    }

    log.methodDone("Register file watcher for task type '" + taskType + "'", 1, logPad);
}


const _procDirCreateEvent = async(uri: Uri, logPad = "") =>
{
    processingFsEvent = true;
    log.value("   dir", uri.fsPath, 1, "");
    try
    {   log.methodStart("directory 'create' event", 1, "", true, [[ "dir", uri.fsPath ]]);
        await cache.addFolderToCache(uri, "   ");
        await refreshTree(teApi, undefined, uri);
        log.methodDone("directory 'create' event", 1, "");
    }
    catch (e) {}
    finally { processingFsEvent = false; await processQueue(); }
};


const _procDirDeleteEvent = async(uri: Uri, logPad = "") =>
{
    processingFsEvent = true;
    try
    {   log.methodStart("directory 'delete' event", 1, "", true, [[ "dir", uri.fsPath ]]);
        cache.removeFolderFromCache(uri, "   ");
        await refreshTree(teApi, undefined, uri);
        log.methodDone("directory 'delete' delete", 1, "");
    }
    catch (e) { /* istanbul ignore next */ log.error([ "Filesystem watcher 'change' event error", e ]); }
    finally { processingFsEvent = false; await processQueue(); }
};


const _procFileChangeEvent = async(taskType: string, uri: Uri, logPad = "") =>
{
    processingFsEvent = true;
    try
    {   log.methodStart("file 'change' event", 1, "", true, [[ "file", uri.fsPath ]]);
        await refreshTree(teApi, taskType, uri, "   ");
        log.methodDone("file 'change' event", 1);
    }
    catch (e) { /* istanbul ignore next */ log.error([ "Filesystem watcher 'change' event error", e ]); }
    finally { processingFsEvent = false; await processQueue(); }
};


const _procFileCreateEvent = async(taskType: string, uri: Uri, logPad = "") =>
{
    processingFsEvent = true;
    try
    {   log.methodStart("file 'create' event", 1, "", true, [[ "file", uri.fsPath ]]);
        cache.addFileToCache(taskType, uri, "   ");
        await refreshTree(teApi, taskType, uri, "   ");
        log.methodDone("file 'create' event", 1);
    }
    catch (e) { /* istanbul ignore next */ log.error([ "Filesystem watcher 'create' event error", e ]); }
    finally { processingFsEvent = false; await processQueue(); }
};


const _procFileDeleteEvent = async(taskType: string, uri: Uri, logPad = "") =>
{
    processingFsEvent = true;
    try
    {   log.methodStart("file 'delete' event", 1, "", true, [[ "file", uri.fsPath ]]);
        cache.removeFileFromCache(taskType, uri, "   ");
        await refreshTree(teApi, taskType, uri, "   ");
        log.methodDone("file 'delete' event", 1);
    }
    catch (e) { /* istanbul ignore next */ log.error([ "Filesystem watcher 'delete' event error", e ]); }
    finally { processingFsEvent = false; await processQueue(); }
};


function createDirWatcher(context: ExtensionContext)
{
    /* istanbul ignore next */
    dirWatcher.onDidCreate?.dispose();
    /* istanbul ignore next */
    dirWatcher.onDidDelete?.dispose();
    /* istanbul ignore next */
    dirWatcher.watcher?.dispose();

    if (workspace.workspaceFolders)
    {
        dirWatcher.watcher = workspace.createFileSystemWatcher(getDirWatchGlob(workspace.workspaceFolders));
        dirWatcher.onDidCreate = dirWatcher.watcher.onDidCreate(async (e) => { await onDirCreate(e); }, null);
        dirWatcher.onDidDelete = dirWatcher.watcher.onDidDelete(async (e) => { await onDirDelete(e); }, null);

        context.subscriptions.push(dirWatcher.onDidCreate);
        context.subscriptions.push(dirWatcher.onDidDelete);
        context.subscriptions.push(dirWatcher.watcher);
    }
}


async function createFileWatchers(context: ExtensionContext)
{
    log.methodStart("Create file watchers", 1, "   ");
    const taskTypes = util.getTaskTypes();
    for (const taskType of taskTypes)
    {
        log.write(`   create file watchers for task type '${taskType}'`, 1, "   ");
        if (util.isTaskTypeEnabled(taskType))
        {
            await registerFileWatcher(context, taskType, util.getGlobPattern(taskType), true, "      ");
        }
        else {
            log.write(`   skip for task type '${taskType}' (disabled in settings)`, 1, "   ");
        }
    }
    log.methodDone("Create file watchers", 1, "   ");
}


function createWorkspaceWatcher(context: ExtensionContext)
{
    // workspaceWatcher?.dispose(); // should only get called once
    /* istanbul ignore next */
    workspaceWatcher = workspace.onDidChangeWorkspaceFolders(/* istanbul ignore next */ async(_e) =>
    {   /* istanbul ignore next */
        await cache.addWsFolders(_e.added);
        /* istanbul ignore next */
        cache.removeWsFolders(_e.removed);
        /* istanbul ignore next */
        createDirWatcher(context);
        /* istanbul ignore next */
        await refreshTree(teApi);
    });
    context.subscriptions.push(workspaceWatcher);
}


function getDirWatchGlob(wsFolders: readonly WorkspaceFolder[])
{
    log.write("   Build file watcher glob", 2);
    const watchPaths: string[] = [];
    wsFolders.forEach((wsf) =>
    {
        watchPaths.push(wsf.name);
    });
    const clsPathGlob = `**/{${watchPaths.join(",")}}/**/*`.replace("//**", "/");
    log.write("   file watcher glob:", 2);
    log.write(`   ${clsPathGlob}`, 2);
    return clsPathGlob;
}


async function onDirCreate(uri: Uri)
{
    if (!util.isExcluded(uri.fsPath))
    {
        if (isDirectory(uri.fsPath) && (await numFilesInDirectory(uri.fsPath)) > 0)
        {
            const wsf = workspace.getWorkspaceFolder(uri);
            if (!wsf || wsf.uri.fsPath !== uri.fsPath)
            {
                if (processingFsEvent) {
                    eventQueue.push({ fn: _procDirCreateEvent, args: [ uri, "   " ] });
                }
                else {
                    await _procDirCreateEvent(uri);
                }
            }
        }
    }
}


async function onDirDelete(uri: Uri)
{
    if (!extname(uri.fsPath) && !util.isExcluded(uri.fsPath)) // ouch
    // if (isDirectory(uri.fsPath)) // it's gone, so we can't lstat it
    {
        const wsf = workspace.getWorkspaceFolder(uri);
        if (wsf && wsf.uri.fsPath !== uri.fsPath)
        {
            if (processingFsEvent) {
                eventQueue.push({ fn: _procDirDeleteEvent, args: [ uri, "   " ] });
            }
            else {
                await _procDirDeleteEvent(uri);
            }
        }
    }
}


const processQueue = async () =>
{
    if (eventQueue.length > 0) {
        const next = eventQueue.shift();
        log.methodStart("file watcher event queue", 1, "", true, [[ "event", next.event ], [ "path", next.uri.fsPath ]]);
        await next.fn(...next.args);
        log.methodDone("file watcher event queue", 1, "");
    }
};
