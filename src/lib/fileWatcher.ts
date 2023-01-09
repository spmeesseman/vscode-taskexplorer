/* eslint-disable prefer-arrow/prefer-arrow-functions */

import * as cache from "./cache";
import * as util from "./utils/utils";
import log from "./utils/log";
import { refreshTree } from "./refreshTree";
import { isDirectory, numFilesInDirectory } from "./utils/fs";
import { extname } from "path";
import { ITaskExplorerApi } from "../interface";
import { isString } from "./utils/utils";
import { Disposable, ExtensionContext, FileSystemWatcher, workspace, WorkspaceFolder, Uri } from "vscode";

let teApi: ITaskExplorerApi;
let processingFsEvent = false;
const eventQueue: any[] = [];
const watchers: { [taskType: string]: FileSystemWatcher } = {};
const watcherDisposables: { [taskType: string]: Disposable } = {};
let workspaceWatcher: Disposable | undefined;
const dirWatcher: {
    watcher?: FileSystemWatcher;
    onDidCreate?: Disposable;
    onDidDelete?: Disposable;
} = {};


export function disposeFileWatchers()
{
    Object.values(watcherDisposables).forEach((d) => {
        d.dispose();
    });
    Object.values(watchers).filter(w => !!w).forEach((w) => {
        w.dispose();
    });
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

    /* istanbul ignore else */
    if (workspace.workspaceFolders) {
        if (enabled !== false){
            await cache.buildCache(taskType, fileBlob, undefined, true, logPad + "   ");
        }
        else {
            cache.removeTaskTypeFromCache(taskType, logPad + "   ");
        }
    }

    let watcher = watchers[taskType];
    if (watcher)
    {
        const watcherDisposable = watcherDisposables[taskType];
        if (watcherDisposable)
        {
            watcherDisposable.dispose();
            delete watcherDisposables[taskType];
        }
    }

    if (enabled !== false)
    {   //
        // Ignore modification events for some task types (script type, e.g. 'bash', 'python' etc)
        // app-publisher and maven only get watched for invalid syntax.  they always have same # of tasks for a file.
        //
        const ignoreModify = util.isScriptType(taskType) || taskType === "apppublisher" || taskType === "maven" || taskType === "tsc";

        if (!watcher) {
            watcher = workspace.createFileSystemWatcher(fileBlob);
            watchers[taskType] = watcher;
            context.subscriptions.push(watcher);
        }

        if (!ignoreModify)
        {
            watcherDisposables[taskType] = watcher.onDidChange(async uri =>
            {
                if (!util.isExcluded(uri.fsPath))
                {
                    if (!processingFsEvent) {
                        processingFsEvent = true;
                        await _procFileChangeEvent(taskType, uri);
                    }
                    else {
                        eventQueue.push({ fn: _procFileChangeEvent, args: [ taskType, uri, "   " ], event: "modify file" });
                    }
                }
            });
        }

        watcherDisposables[taskType] = watcher.onDidDelete(async uri =>
        {
            if (!util.isExcluded(uri.fsPath))
            {
                if (!processingFsEvent) {
                    processingFsEvent = true;
                    await _procFileDeleteEvent(taskType, uri);
                }
                else {
                    eventQueue.push({ fn: _procFileDeleteEvent, args: [ taskType, uri, "   " ], event: "delete file" });
                }
            }
        });

        watcherDisposables[taskType] = watcher.onDidCreate(async uri =>
        {
            if (!util.isExcluded(uri.fsPath))
            {
                if (!processingFsEvent) {
                    processingFsEvent = true;
                    await _procFileCreateEvent(taskType, uri);
                }
                else {
                    eventQueue.push({ fn: _procFileCreateEvent, args: [ taskType, uri, "   " ], event: "create file" });
                }
            }
        });
    }

    log.methodDone("Register file watcher for task type '" + taskType + "'", 1, logPad);
}


const _procDirCreateEvent = async(uri: Uri, logPad = "") =>
{
    try
    {   log.methodStart("directory 'create' event", 1, logPad, true, [[ "dir", uri.fsPath ]]);
        await cache.addFolderToCache(uri, logPad + "   ");
        await refreshTree(teApi, undefined, uri, logPad + "   ");
        log.methodDone("directory 'create' event", 1, logPad);
    }
    catch (e) {}
    finally { processingFsEvent = false; processQueue(); }
};


const _procDirDeleteEvent = async(uri: Uri, logPad = "") =>
{
    try
    {   log.methodStart("directory 'delete' event", 1, logPad, true, [[ "dir", uri.fsPath ]]);
        cache.removeFolderFromCache(uri, logPad + "   ");
        await refreshTree(teApi, undefined, uri, logPad + "   ");
        log.methodDone("directory 'delete' delete", 1, logPad);
    }
    catch (e) { /* istanbul ignore next */ log.error([ "Filesystem watcher 'change' event error", e ]); }
    finally { processingFsEvent = false; processQueue(); }
};


const _procFileChangeEvent = async(taskType: string, uri: Uri, logPad = "") =>
{
    try
    {   log.methodStart("file 'change' event", 1, logPad, true, [[ "file", uri.fsPath ]]);
        await refreshTree(teApi, taskType, uri, logPad + "   ");
        log.methodDone("file 'change' event", 1, logPad);
    }
    catch (e) { /* istanbul ignore next */ log.error([ "Filesystem watcher 'change' event error", e ]); }
    finally { processingFsEvent = false; processQueue(); }
};


const _procFileCreateEvent = async(taskType: string, uri: Uri, logPad = "") =>
{
    try
    {   log.methodStart("file 'create' event", 1, logPad, true, [[ "file", uri.fsPath ]]);
        cache.addFileToCache(taskType, uri, logPad + "   ");
        await refreshTree(teApi, taskType, uri, logPad + "   ");
        log.methodDone("file 'create' event", 1, logPad);
    }
    catch (e) { /* istanbul ignore next */ log.error([ "Filesystem watcher 'create' event error", e ]); }
    finally { processingFsEvent = false; processQueue(); }
};


const _procFileDeleteEvent = async(taskType: string, uri: Uri, logPad = "") =>
{
    try
    {   log.methodStart("file 'delete' event", 1, logPad, true, [[ "file", uri.fsPath ]]);
        cache.removeFileFromCache(taskType, uri, logPad + "   ");
        await refreshTree(teApi, taskType, uri, logPad + "   ");
        log.methodDone("file 'delete' event", 1, logPad);
    }
    catch (e) { /* istanbul ignore next */ log.error([ "Filesystem watcher 'delete' event error", e ]); }
    finally { processingFsEvent = false; processQueue(); }
};


function createDirWatcher(context: ExtensionContext)
{
    /* istanbul ignore next */
    dirWatcher.onDidCreate?.dispose();
    /* istanbul ignore next */
    dirWatcher.onDidDelete?.dispose();
    /* istanbul ignore next */
    dirWatcher.watcher?.dispose();
    /* istanbul ignore else */
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
{   //
    // TODO - remove ignore tags when tests for adding/removing workspace is implemented
    //
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
            /* istanbul ignore else */
            if (!wsf || wsf.uri.fsPath !== uri.fsPath)
            {
                if (processingFsEvent) {
                    eventQueue.push({ fn: _procDirCreateEvent, args: [ uri, "   " ] });
                }
                else {
                    processingFsEvent = true;
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
        /* istanbul ignore else */
        if (wsf && wsf.uri.fsPath !== uri.fsPath)
        {
            if (processingFsEvent) {
                eventQueue.push({ fn: _procDirDeleteEvent, args: [ uri, "   " ] });
            }
            else {
                processingFsEvent = true;
                await _procDirDeleteEvent(uri);
            }
        }
    }
}


const processQueue = async () =>
{
    if (eventQueue.length > 0)
    {
        const next = eventQueue.shift();
        log.methodStart("file watcher event queue", 1, "", true, [
            [ "event", next.event ], [ "arg1", isString(next.args[0]) ? next.args[0] : next.args[0].fsPath ],
            [ "arg2", next.args[1] instanceof Uri ? next.args[1].fsPath : "none (log padding)" ],
            [ "# of events still pending", eventQueue.length ]
        ]);
        processingFsEvent = true;
        await next.fn(...next.args);
        log.methodDone("file watcher event queue", 1, "");
    }
};
