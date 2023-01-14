/* eslint-disable prefer-arrow/prefer-arrow-functions */

import * as cache from "./fileCache";
import * as util from "./utils/utils";
import log from "./log/log";
import { extname } from "path";
import { isDirectory } from "./utils/fs";
import { isString } from "./utils/utils";
import { refreshTree } from "./refreshTree";
import { ITaskExplorerApi } from "../interface";
import { Disposable, ExtensionContext, FileSystemWatcher, workspace, WorkspaceFolder, Uri, WorkspaceFoldersChangeEvent } from "vscode";

let extContext: ExtensionContext;
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
    extContext = context;
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


/**
 * Registers file watchers for a specific task type using the specified glob pattern.
 *
 * @param context Extension context
 * @param taskType Task type, i.e. 'ant', 'bash' 'python', etc...
 * @param fileBlob The file blob to use for the watchers, defined in constants module for each task type
 * @param firstRun Is first run (ins initializing)
 * @param enabled Is enabled.  `false` if task type was disabled.
 * @param logPad Log padding.
 */
export async function registerFileWatcher(context: ExtensionContext, taskType: string, fileBlob: string, firstRun: boolean, enabled?: boolean, logPad = "")
{
    log.methodStart("Register file watcher for task type '" + taskType + "'", 1, logPad, false, [[ "enabled", enabled ]]);

    if (!firstRun && workspace.workspaceFolders)
    {
        if (enabled !== false) {
            const numFilesFound  = await cache.buildTaskTypeCache(taskType, fileBlob, undefined, true, logPad + "   ");
            log.write(`   ${numFilesFound} files were added to the file cache`, 1, logPad);
        }
        else {
            const numFilesRemoved = cache.removeTaskTypeFromCache(taskType, logPad + "   ");
            log.write(`   ${numFilesRemoved} files were removed from file cache`, 1, logPad);
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
        const numFilesFound = await cache.addFolder(uri, logPad + "   ");
        if (numFilesFound > 0) {
            await refreshTree(teApi, undefined, uri, logPad + "   ");
        }
        log.methodDone("directory 'create' event", 1, logPad);
    }
    catch (e) {}
    finally { processQueue(); }
};


const _procDirDeleteEvent = async(uri: Uri, logPad = "") =>
{
    try
    {   log.methodStart("directory 'delete' event", 1, logPad, true, [[ "dir", uri.fsPath ]]);
        const numFilesRemoved = cache.removeFolderFromCache(uri, logPad + "   ");
        if (numFilesRemoved > 0) {
            await refreshTree(teApi, undefined, uri, logPad + "   ");
        }
        log.methodDone("directory 'delete' delete", 1, logPad);
    }
    catch (e) { /* istanbul ignore next */ log.error([ "Filesystem watcher 'dir change' event error", e ]); }
    finally { processQueue(); }
};


const _procFileChangeEvent = async(taskType: string, uri: Uri, logPad = "") =>
{
    try
    {   log.methodStart("file 'change' event", 1, logPad, true, [[ "file", uri.fsPath ]]);
        await refreshTree(teApi, taskType, uri, logPad + "   ");
        log.methodDone("file 'change' event", 1, logPad);
    }
    catch (e) { /* istanbul ignore next */ log.error([ "Filesystem watcher 'file change' event error", e ]); }
    finally { processQueue(); }
};


const _procFileCreateEvent = async(taskType: string, uri: Uri, logPad = "") =>
{
    try
    {   log.methodStart("file 'create' event", 1, logPad, true, [[ "file", uri.fsPath ]]);
        cache.addFileToCache(taskType, uri, logPad + "   ");
        await refreshTree(teApi, taskType, uri, logPad + "   ");
        log.methodDone("file 'create' event", 1, logPad);
    }
    catch (e) { /* istanbul ignore next */ log.error([ "Filesystem watcher 'file create' event error", e ]); }
    finally { processQueue(); }
};


const _procFileDeleteEvent = async(taskType: string, uri: Uri, logPad = "") =>
{
    try
    {   log.methodStart("file 'delete' event", 1, logPad, true, [[ "file", uri.fsPath ]]);
        cache.removeFileFromCache(taskType, uri, logPad + "   ");
        await refreshTree(teApi, taskType, uri, logPad + "   ");
        log.methodDone("file 'delete' event", 1, logPad);
    }
    catch (e) { /* istanbul ignore next */ log.error([ "Filesystem watcher 'file delete' event error", e ]); }
    finally { processQueue(); }
};


const _procWsDirCreateDeleteEvent = async(e: WorkspaceFoldersChangeEvent) =>
{
    try
    {   log.methodStart("workspace project directory 'create/remove' event", 1, "", true, [
            [ "# added", e.added.length ], [ "# removed", e.removed.length ]
        ]);
        const numFilesFound = await cache.addWsFolders(e.added);
        const numFilesRemoved = cache.removeWsFolders(e.removed);
        createDirWatcher(extContext);
        if (numFilesFound > 0 || numFilesRemoved > 0) {
            await refreshTree(teApi, undefined, undefined, "   ");
        }
        log.methodDone("workspace project directory 'create/remove' delete", 1, "");
    }
    catch (e) {}
    finally { processQueue(); }
};


function createDirWatcher(context: ExtensionContext)
{   //
    // TODO - remove ignore tags when tests for adding/removing workspace is implemented
    //
    dirWatcher.onDidCreate?.dispose();
    dirWatcher.onDidDelete?.dispose();
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
            await registerFileWatcher(context, taskType, util.getGlobPattern(taskType), true, true, "      ");
        }
        else {
            log.write(`   skip for task type '${taskType}' (disabled in settings)`, 1, "   ");
        }
    }
    log.methodDone("Create file watchers", 1, "   ");
}


function createWorkspaceWatcher(context: ExtensionContext)
{   //
    // TODO - Remove ignore tags when tests for adding/removing workspace is implemented
    //        Te updateWorkSpaceFolders() call does not work when running tests, the testing
    //        instance of VSCode even pops up an info message saying so.  So for now we mimic
    //        as best we can by exporting onWsFoldersChange() to be added to the ITestsApi so
    //        that the test suites can mimic the add ws folder event.  But...  When I first
    //        started messing with the updateWorkspaceFolders() function, it saved the state
    //        and on subsequent loads it was trying to load the ws folders that had "failed"
    //        to be added.  Loading because of cache data in /.vscode-test.  And when it did
    //        that, it opened as a multi-root ws, I could then keep that instance open (it also
    //        launched the normal test instance), and, the ws folder adds succeed.  Unfortunately
    //        i can;t figure out how to start tests using a multi-root workspace, doesn't seem
    //        like its supported :(  SO this is the best we can do...
    //
    workspaceWatcher = workspace.onDidChangeWorkspaceFolders(/* istanbul ignore next */async (e) => { await onWsFoldersChange(e); });
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
    if (isDirectory(uri.fsPath) && !util.isExcluded(uri.fsPath))
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

// Note:  Exported for testsApi
//        Te updateWorkSpaceFolders() call does not work when running tests, the testing
//        instance of VSCode even pops up an info message saying so.  So for now we mimic
//        as best we can by exporting onWsFoldersChange() to be added to the ITestsApi so
//        that the test suites can mimic the add ws folder event.  But...  When I first
//        started messing with the updateWorkspaceFolders() function, it saved the state
//        and on subsequent loads it was trying to load the ws folders that had "failed"
//        to be added.  Loading because of cache data in /.vscode-test.  And when it did
//        that, it opened as a multi-root ws, I could then keep that instance open (it also
//        launched the normal test instance), and, the ws folder adds succeed.  Unfortunately
//        i can;t figure out how to start tests using a multi-root workspace, doesn't seem
//        like its supported :(  SO this is the best we can do...
//
export const onWsFoldersChange = async(e: WorkspaceFoldersChangeEvent) =>
{   //
    // TODO - remove ignore tags when tests for adding/removing workspace is implemented
    //
    /* istanbul ignore next */
    if (processingFsEvent) {
        eventQueue.push({ fn: _procWsDirCreateDeleteEvent, args: [ e ] });
    }
    else {
        processingFsEvent = true;
        await _procWsDirCreateDeleteEvent(e);
    }
};


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
    else {
        processingFsEvent = false;
    }
};
