/* eslint-disable prefer-arrow/prefer-arrow-functions */

//
// TODO - Localize a disposables[] array and make only one push to context.subscriptions
//

import { extname } from "path";
import { log } from "../log/log";
import * as cache from "../fileCache";
import * as util from "../utils/utils";
import { isDirectory } from "../utils/fs";
import { isString } from "../utils/utils";
import { storage } from "../utils/storage";
import { Commands, executeCommand } from "../command";
import { configuration } from "../utils/configuration";
import { getTaskTypes, isScriptType } from "../utils/taskTypeUtils";
import {
    Disposable, ExtensionContext, FileSystemWatcher, workspace, WorkspaceFolder, Uri, WorkspaceFoldersChangeEvent
} from "vscode";

let currentEvent: any;
let extContext: ExtensionContext;
let rootPath: string | undefined;
let workspaceWatcher: Disposable | undefined;
let currentNumWorkspaceFolders: number | undefined;
const eventQueue: any[] = [];
const watchers: { [taskType: string]: FileSystemWatcher } = {};
const watcherDisposables: { [taskType: string]: Disposable } = {};
const dirWatcher: { watcher?: FileSystemWatcher; onDidCreate?: Disposable; onDidDelete?: Disposable } = {};


function createDirWatcher(context: ExtensionContext)
{
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
    const taskTypes = getTaskTypes();
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
{
    workspaceWatcher = workspace.onDidChangeWorkspaceFolders(onWsFoldersChange);
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


const eventNeedsToBeQueued = (eventKind: string, uri: Uri) =>
{
    let needs = true;
    if (eventKind === "modify file") // only check the queue for 'modify', not the current event
    {
        needs = !isSameEvent(eventQueue, eventKind, uri);
    }
    else if (eventKind === "create file")
    {
        const events = [ currentEvent, ...eventQueue ];
        needs = !events.find(e => e.event === "create directory" && uri.fsPath.startsWith(e.fsPath)) &&
                !isSameEvent(events, eventKind, uri);
    }
    //
    // VSCode doesn't trigger file delete event when a dir is deleted
    //
    // else if (eventKind === "delete file") {
    //     const events = [ currentEvent, ...eventQueue ];
    //     needs = !events.find(e => e.event === "delete directory" && uri.fsPath.startsWith(e.fsPath)) &&
    //             !events.find(e => e.event === eventKind && uri.fsPath === e.fsPath);
    // }
    else {
        const events = [ currentEvent, ...eventQueue ];
        needs = !isSameEvent(events, eventKind, uri);
    }
    return needs;
};


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


export const isProcessingFsEvent = () => !!currentEvent;


const isSameEvent = (q: any[], kind: string, uri: Uri) => q.find(e => e.event === kind && e.fsPath === uri.fsPath);


async function onDirCreate(uri: Uri)
{
    if (isDirectory(uri.fsPath) && !util.isExcluded(uri.fsPath))
    {
        const e = {
            fn: _procDirCreateEvent,
            args: [ uri, "   " ],
            event: "create directory",
            fsPath: uri.fsPath
        };
        if (currentEvent) {
            eventQueue.push(e);
        }
        else {
            currentEvent = e;
            await _procDirCreateEvent(uri, "");
        }
    }
}


async function onDirDelete(uri: Uri)
{   //
    // The dir is gone already, so can't lstat it to see if it was a directory or file
    // Rely on the fact if it has no extension, then it's a directory.  I supposed we
    // can track existing directories, ut ugh.  Maybe someday.
    //
    if (!extname(uri.fsPath) && !util.isExcluded(uri.fsPath)) // ouch
    {
        const e = {
            fn: _procDirDeleteEvent,
            args: [ uri, "   " ],
            event: "delete directory",
            fsPath: uri.fsPath
        };
        if (currentEvent) {
            eventQueue.push(e);
        }
        else {
            currentEvent = e;
            await _procDirDeleteEvent(uri, "");
        }
    }
}


const onFileChange = async(taskType: string, uri: Uri) =>
{
    if (!util.isExcluded(uri.fsPath))
    {
        const e = {
            fn: _procFileChangeEvent,
            args: [ taskType, uri, "   " ],
            event: "modify file",
            fsPath: uri.fsPath
        };
        if (!currentEvent)
        {
            currentEvent = e;
            await _procFileChangeEvent(taskType, uri, "");
        }
        else { queueEventIfNeeded(e, uri); }
    }
};


const onFileCreate = async(taskType: string, uri: Uri) =>
{
    if (!util.isExcluded(uri.fsPath))
    {
        const e = {
            fn: _procFileCreateEvent,
            args: [ taskType, uri, "   " ],
            event: "create file",
            fsPath: uri.fsPath
        };
        if (!currentEvent)
        {
            currentEvent = e;
            await _procFileCreateEvent(taskType, uri, "");
        }
        else { queueEventIfNeeded(e, uri); }
    }
};


const onFileDelete = async(taskType: string, uri: Uri) =>
{
    if (!util.isExcluded(uri.fsPath))
    {
        const e = {
            fn: _procFileDeleteEvent,
            args: [ taskType, uri, "   " ],
            event: "delete file",
            fsPath: uri.fsPath
        };
        if (!currentEvent)
        {
            currentEvent = e;
            await _procFileDeleteEvent(taskType, uri, "");
        }
        else { queueEventIfNeeded(e, uri); }
    }
};


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
    /* istanbul ignore if */  // program flow can never fall here during tests as the ext reloads
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
    // and `removed` count will be 0) then a workspace folder was actually added or removed,
    // and the 'removed' or 'added' count will be > 0.
    //
    else if (e.removed.length > 0 || e.added.length > 0)
    {
        const fwEvent = {
            fn: _procWsDirAddRemoveEvent,
            args: [ e, "   " ],
            event: "workspace change"
        };
        log.write("   workspace folder has been added or removed, process/queue event", 1);
        //
        // Technically, there should never be a current event when program flow falls here, since
        // VSCode documentation states directly that updateWorkspaceFolders() cannot be called
        // consecutive times without waiting for the onDidChangeWorkspaceFolders event to fire,
        // which this function is a listener of.  Even so, leaving the check here, with a handy
        // dandy cheap istanbul ignore tag for coverage ignorance.
        //
        /* istanbul ignore if */
        if (currentEvent) {
            eventQueue.push(fwEvent);
        }
        else {
            currentEvent = fwEvent;
            await _procWsDirAddRemoveEvent(e, "   ");
        }
    }

    //
    // The 'removed' and 'added' counts are both === 0, so folders were moved/re-ordered,
    // and  the 1st folder `rootPath` did not change
    //
    else {
        log.write("   workspace folder order has changed", 1);
        if (!configuration.get<boolean>("sortProjectFoldersAlpha"))
        {   //
            // Refresh tree only, leave file cache and provider invalidation alone.  Setting
            // the 2nd param in refresh cmd to `false` accomplishes just that.
            //
            log.write("   refresh tree order", 1);
            await executeCommand(Commands.Refresh, false, undefined, "   ");
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
        const next = currentEvent = eventQueue.shift();
        log.methodStart("file watcher event queue", 1, "", true, [
            [ "event", next.event ], [ "arg1", isString(next.args[0]) ? next.args[0] : next.args[0].fsPath ],
            [ "arg2", util.isUri(next.args[1]) ? next.args[1].fsPath : "none (log padding)" ],
            [ "# of events still pending", eventQueue.length ]
        ]);
        await next.fn(...next.args);
        log.methodDone("file watcher event queue", 1, "");
    }
    else {
        currentEvent = undefined;
    }
};


const queueEventIfNeeded = (e: any, uri: Uri) =>
{
    if (eventNeedsToBeQueued(e.event, uri))
    {
        eventQueue.push(e);
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
        const ignoreModify = isScriptType(taskType) || taskType === "apppublisher" || taskType === "maven" ||
                             taskType === "tsc" || taskType === "jenkins" || taskType === "webpack";
        if (!watcher) {
            watcher = workspace.createFileSystemWatcher(util.getGlobPattern(taskType));
            watchers[taskType] = watcher;
            context.subscriptions.push(watcher);
        }
        watcherDisposables[taskType] = watcher.onDidDelete(async uri => onFileDelete(taskType, uri));
        watcherDisposables[taskType] = watcher.onDidCreate(async uri => onFileCreate(taskType, uri));
        if (!ignoreModify) {
            watcherDisposables[taskType] = watcher.onDidChange(async uri => onFileChange(taskType, uri));
        }
    }

    log.methodDone("register file watcher for task type '" + taskType + "'", 1, logPad);
};


export const registerFileWatchers = async(context: ExtensionContext, logPad: string) =>
{
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
        [ "workspace root folder[0] name", workspace.workspaceFolders ? workspace.workspaceFolders[0].name : /* istanbul ignore next */"undefined" ],
        [ "workspace root folder[0] path", workspace.workspaceFolders ? workspace.workspaceFolders[0].uri.fsPath : /* istanbul ignore next */"undefined" ],
        [ "current # of workspace folders", currentNumWorkspaceFolders ]
    ]);
    //
    // Watch for folder adds and deletes within the project folder
    //
    createDirWatcher(context);
    //
    // Watch individual task type files within the project folder
    //
    await createFileWatchers(context, logPad + "   ");
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
            await executeCommand(Commands.Refresh, undefined, uri, logPad + "   ");
        }
        log.methodDone("[event] directory 'create'", 1, logPad);
    }
    catch (e) {}
    finally { /* don't await */ processQueue(); }
};


const _procDirDeleteEvent = async(uri: Uri, logPad: string) =>
{
    try
    {   log.methodStart("[event] directory 'delete'", 1, logPad, true, [[ "dir", uri.fsPath ]]);
        const numFilesRemoved = cache.removeFolderFromCache(uri, logPad + "   ");
        if (numFilesRemoved > 0) {
            await executeCommand(Commands.Refresh, undefined, uri, logPad + "   ");
        }
        log.methodDone("[event] directory 'delete'", 1, logPad);
    }
    catch (e) { /* istanbul ignore next */ log.error([ "Filesystem watcher 'dir change' event error", e ]); }
    finally { /* don't await */ processQueue(); }
};


const _procFileChangeEvent = async(taskType: string, uri: Uri, logPad: string) =>
{
    try
    {   log.methodStart("[event] file 'change'", 1, logPad, true, [[ "file", uri.fsPath ]]);
        await executeCommand(Commands.Refresh, taskType, uri, logPad + "   ");
        log.methodDone("[event] file 'change'", 1, logPad);
    }
    catch (e) { /* istanbul ignore next */ log.error([ "Filesystem watcher 'file change' event error", e ]); }
    finally { /* don't await */ processQueue(); }
};


const _procFileCreateEvent = async(taskType: string, uri: Uri, logPad: string) =>
{
    try
    {   log.methodStart("[event] file 'create'", 1, logPad, true, [[ "file", uri.fsPath ]]);
        cache.addFileToCache(taskType, uri, logPad + "   ");
        await executeCommand(Commands.Refresh, taskType, uri, logPad + "   ");
        log.methodDone("[event] file 'create'", 1, logPad);
    }
    catch (e) { /* istanbul ignore next */ log.error([ "Filesystem watcher 'file create' event error", e ]); }
    finally { /* don't await */ processQueue(); }
};


const _procFileDeleteEvent = async(taskType: string, uri: Uri, logPad: string) =>
{
    try
    {   log.methodStart("[event] file 'delete'", 1, logPad, true, [[ "file", uri.fsPath ]]);
        cache.removeFileFromCache(taskType, uri, logPad + "   ");
        await executeCommand(Commands.Refresh, taskType, uri, logPad + "   ");
        log.methodDone("[event] file 'delete'", 1, logPad);
    }
    catch (e) { /* istanbul ignore next */ log.error([ "Filesystem watcher 'file delete' event error", e ]); }
    finally { /* don't await */ processQueue(); }
};


const _procWsDirAddRemoveEvent = async(e: WorkspaceFoldersChangeEvent, logPad: string) =>
{
    try
    {   log.methodStart("workspace folder 'add/remove'", 1, logPad, true, [
            [ "# added", e.added.length ], [ "# removed", e.removed.length ]
        ]);
        const numFilesFound = await cache.addWsFolders(e.added, logPad + "   "),
              numFilesRemoved = cache.removeWsFolders(e.removed, logPad + "   ");
        createDirWatcher(extContext);
        if (numFilesFound > 0 || numFilesRemoved > 0)
        {
            const all =  [ ...e.added, ...e.removed ];
            await executeCommand(Commands.Refresh, undefined, all.length === 1 ? all[0].uri : undefined, logPad + "   ");
        }
        log.methodDone("workspace folder 'add/remove'", 1, logPad, [
            [ "# of files found", numFilesFound ], [ "# of files removed", numFilesRemoved ]
        ]);
    }
    catch (e) {}
    finally { /* don't await */ processQueue(); }
};
