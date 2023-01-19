/* eslint-disable prefer-arrow/prefer-arrow-functions */

import * as cache from "./fileCache";
import * as util from "./utils/utils";
import log from "./log/log";
import { extname } from "path";
import { storage } from "./utils/storage";
import { isDirectory } from "./utils/fs";
import { isString } from "./utils/utils";
import { refreshTree } from "./refreshTree";
import { ITaskExplorerApi } from "../interface";
import {
    Disposable, ExtensionContext, FileSystemWatcher, workspace, WorkspaceFolder, Uri, WorkspaceFoldersChangeEvent
} from "vscode";
import { configuration } from "./utils/configuration";

let extContext: ExtensionContext;
let teApi: ITaskExplorerApi;
let processingFsEvent = false;
let rootPath: string | undefined;
let currentNumWorkspaceFolders: number | undefined;
const eventQueue: any[] = [];
const watchers: { [taskType: string]: FileSystemWatcher } = {};
const watcherDisposables: { [taskType: string]: Disposable } = {};
let workspaceWatcher: Disposable | undefined;
const dirWatcher: {
    watcher?: FileSystemWatcher;
    onDidCreate?: Disposable;
    onDidDelete?: Disposable;
} = {};


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


async function createFileWatchers(context: ExtensionContext, logPad: string)
{
    log.methodStart("create file watchers", 1, logPad);
    const taskTypes = util.getTaskTypes();
    for (const taskType of taskTypes)
    {
        log.write(`   create file watchers for task type '${taskType}'`, 1, logPad);
        if (util.isTaskTypeEnabled(taskType))
        {
            await registerFileWatcher(context, taskType, true, true, logPad + "   ");
        }
        else {
            log.write(`   skip for task type '${taskType}' (disabled in settings)`, 1, logPad);
        }
    }
    log.methodDone("create file watchers", 1, logPad);
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
    workspaceWatcher = workspace.onDidChangeWorkspaceFolders(/* istanbul ignore next */(e) => onWsFoldersChange(e));
    context.subscriptions.push(workspaceWatcher);
}


export function disposeFileWatchers()
{
    Object.values(watcherDisposables).forEach((d) => {
        d.dispose();
    });
    Object.values(watchers).filter(w => !!w).forEach((w) => {
        w.dispose();
    });
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


export const isProcessingFsEvent = () => processingFsEvent;


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
                await _procDirCreateEvent(uri, "");
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
                await _procDirDeleteEvent(uri, "");
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
{
    log.methodStart("[event] workspace folder change", 1);

    //
    // TODO - remove ignore tags when tests for adding/removing workspace is implemented
    //
    // Detect when a folder move occurs and the ext is about to deactivate/re-activate.  A
    // folder move that changes the first workspace folder will restart the extension
    // unfortunately.  Changing the first workspace folder modifies the deprecated `rootPath`
    // and I think that's why the reload is needed or happens.  The only reason the `update2Sync`
    // function exists is right here.  If we do any async op when the root is changing, we lose
    // the context, even the async storage op is not completed.  So we needed a sync op here to
    // record the timestamp.  The timesptamp is used on extension activation to determine if it
    // is being activated because of this scenario, in which case we'll load from a stored file
    // cache so that the tree reload is much quicker, especially in large workspaces.  We'll do
    // it regardless of the 'enablePersistentFileCaching' settings.
    //
    /* istanbul ignore if */
    if (rootPath !== workspace.rootPath)
    {
        log.write("   workspace deprecated 'root path' has changed", 1);
        log.values(1, "   ", [[ "new root path", workspace.rootPath ], [ "previous root path", rootPath ]]);
        if (rootPath === undefined) {
            log.write("   changing to a multi-root workspace");
        }
        log.write("   vscode will deactivate and re-activate the extension", 1);
        rootPath = workspace.rootPath;
        storage.update2Sync("lastWsRootPathChange", Date.now());
    }

    //
    // If not a standard folder move not involving the 1st folder (in which case the `added`
    // and `removed` count will be 0),and a folder was actually added or removed.
    //
    else if (e.removed.length > 0 || e.added.length > 0)
    {
        log.write("   workspace folder has been added or removed, process/queue event", 1);
        /* istanbul ignore next */
        if (processingFsEvent) {
            eventQueue.push({ fn: _procWsDirAddRemoveEvent, args: [ e, "   " ] });
        }
        else {
            processingFsEvent = true;
            await _procWsDirAddRemoveEvent(e, "   ");
        }
    }

    //
    // Folders were moved/re-ordered but the 1st folder `rootPath` did not change
    //
    else {
        log.write("   workspace folder order has changed", 1);
        if (!configuration.get<boolean>("sortProjectFoldersAlpha"))
        {   //
            // Refresh tree only, leave file cache and provider invalidation alone.  Setting
            // the 2nd param in refreshTree() to `false` accomplishes just that.
            //
            log.write("   refresh tree order", 1);
            await refreshTree(teApi, false, undefined, "   ");
        }
        else {
            log.write("   nothing to do", 1);
        }
    }

    currentNumWorkspaceFolders = workspace.workspaceFolders?.length;
    log.methodDone("[event] workspace folder change", 1, "", [[ "current # of workspace folders", currentNumWorkspaceFolders ]]);
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
export const registerFileWatcher = async(context: ExtensionContext, taskType: string, firstRun: boolean, enabled: boolean, logPad: string) =>
{
    log.methodStart("register file watcher for task type '" + taskType + "'", 1, logPad, false, [[ "enabled", enabled ]]);

    if (!firstRun && workspace.workspaceFolders)
    {
        if (enabled !== false) {
            const numFilesFound  = await cache.buildTaskTypeCache(taskType, undefined, true, logPad + "   ");
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
            watcher = workspace.createFileSystemWatcher(util.getGlobPattern(taskType));
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
                        await _procFileChangeEvent(taskType, uri, "");
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
                    await _procFileDeleteEvent(taskType, uri, "");
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
                    await _procFileCreateEvent(taskType, uri, "");
                }
                else {
                    eventQueue.push({ fn: _procFileCreateEvent, args: [ taskType, uri, "   " ], event: "create file" });
                }
            }
        });
    }

    log.methodDone("register file watcher for task type '" + taskType + "'", 1, logPad);
};


export const registerFileWatchers = async(context: ExtensionContext, api: ITaskExplorerApi, logPad: string) =>
{
    teApi = api;
    extContext = context;
    log.methodStart("register file watchers", 1, logPad);
    //
    // Record ws folder count and `rootPath` (which is deprecated but still causes the dumb extension
    // restart when changed?) so that we can detect when a workspace is opened/closed, when a single
    // project workspace changes to multi-root, or when the aforementioned `rootPath` changes and the
    // extension is about  to get deactivated and then re-activated.
    //
    rootPath = workspace.rootPath;
    currentNumWorkspaceFolders = workspace.workspaceFolders?.length;
    log.values(1, "   ", [
        [ "workspace root path (deprecated)", workspace.rootPath ],
        [ "workspace root folder[0] name", workspace.workspaceFolders ? workspace.workspaceFolders[0].name : "undefined" ],
        [ "workspace root folder[0] path", workspace.workspaceFolders ? workspace.workspaceFolders[0].uri.fsPath : "undefined" ],
        [ "current # of workspace folders", currentNumWorkspaceFolders ]
    ]);
    //
    // Watch individual task type files within the project folder
    //
    await createFileWatchers(context, logPad + "   ");
    //
    // Watch for folder adds and deletes within the project folder
    //
    createDirWatcher(context);
    //
    // Refresh tree when folders/projects are added/removed from the workspace, in a multi-root ws
    //
    createWorkspaceWatcher(context);
    log.methodDone("register file watchers", 1, logPad);
};


const _procDirCreateEvent = async(uri: Uri, logPad: string) =>
{
    try
    {   log.methodStart("[event] directory 'create'", 1, logPad, true, [[ "dir", uri.fsPath ]]);
        const numFilesFound = await cache.addFolder(uri, logPad + "   ");
        if (numFilesFound > 0) {
            await refreshTree(teApi, undefined, uri, logPad + "   ");
        }
        log.methodDone("[event] directory 'create'", 1, logPad);
    }
    catch (e) {}
    finally { processQueue(); }
};


const _procDirDeleteEvent = async(uri: Uri, logPad: string) =>
{
    try
    {   log.methodStart("[event] directory 'delete'", 1, logPad, true, [[ "dir", uri.fsPath ]]);
        const numFilesRemoved = cache.removeFolderFromCache(uri, logPad + "   ");
        if (numFilesRemoved > 0) {
            await refreshTree(teApi, undefined, uri, logPad + "   ");
        }
        log.methodDone("[event] directory 'delete'", 1, logPad);
    }
    catch (e) { /* istanbul ignore next */ log.error([ "Filesystem watcher 'dir change' event error", e ]); }
    finally { processQueue(); }
};


const _procFileChangeEvent = async(taskType: string, uri: Uri, logPad: string) =>
{
    try
    {   log.methodStart("[event] file 'change'", 1, logPad, true, [[ "file", uri.fsPath ]]);
        await refreshTree(teApi, taskType, uri, logPad + "   ");
        log.methodDone("[event] file 'change'", 1, logPad);
    }
    catch (e) { /* istanbul ignore next */ log.error([ "Filesystem watcher 'file change' event error", e ]); }
    finally { processQueue(); }
};


const _procFileCreateEvent = async(taskType: string, uri: Uri, logPad: string) =>
{
    try
    {   log.methodStart("[event] file 'create'", 1, logPad, true, [[ "file", uri.fsPath ]]);
        cache.addFileToCache(taskType, uri, logPad + "   ");
        await refreshTree(teApi, taskType, uri, logPad + "   ");
        log.methodDone("[event] file 'create'", 1, logPad);
    }
    catch (e) { /* istanbul ignore next */ log.error([ "Filesystem watcher 'file create' event error", e ]); }
    finally { processQueue(); }
};


const _procFileDeleteEvent = async(taskType: string, uri: Uri, logPad: string) =>
{
    try
    {   log.methodStart("[event] file 'delete'", 1, logPad, true, [[ "file", uri.fsPath ]]);
        cache.removeFileFromCache(taskType, uri, logPad + "   ");
        await refreshTree(teApi, taskType, uri, logPad + "   ");
        log.methodDone("[event] file 'delete'", 1, logPad);
    }
    catch (e) { /* istanbul ignore next */ log.error([ "Filesystem watcher 'file delete' event error", e ]); }
    finally { processQueue(); }
};


const _procWsDirAddRemoveEvent = async(e: WorkspaceFoldersChangeEvent, logPad: string) =>
{
    try
    {   log.methodStart("workspace folder 'add/remove'", 1, logPad, true, [
            [ "# added", e.added.length ], [ "# removed", e.removed.length ]
        ]);
        const numFilesFound = await cache.addWsFolders(e.added, logPad + "   ");
        const numFilesRemoved = cache.removeWsFolders(e.removed, logPad + "   ");
        createDirWatcher(extContext);
        if (numFilesFound > 0 || numFilesRemoved > 0) {
            await refreshTree(teApi, undefined, undefined, logPad + "   ");
        }
        log.methodDone("workspace folder 'add/remove'", 1, logPad, [
            [ "# of files found", numFilesFound ], [ "# of files removed", numFilesRemoved ]
        ]);
    }
    catch (e) {}
    finally { processQueue(); }
};
