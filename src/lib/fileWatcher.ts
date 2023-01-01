/* eslint-disable prefer-arrow/prefer-arrow-functions */

import * as util from "./utils/utils";
import * as cache from "../cache";
import * as log from "./utils/log";
import { Disposable, ExtensionContext, FileSystemWatcher, workspace, WorkspaceFolder, Uri } from "vscode";
import { refreshTree } from "./refreshTree";
import { isDirectory, numFilesInDirectory } from "./utils/fs";
import { extname } from "path";
import { TaskExplorerApi } from "../interface";

let teApi: TaskExplorerApi;
let processingFsEvent = false;
const watchers: Map<string, FileSystemWatcher> = new Map();
const watcherDisposables: Map<string, Disposable> = new Map();
let workspaceWatcher: Disposable | undefined;
const dirWatcher: {
    watcher?: FileSystemWatcher | undefined;
    onDidCreate?: Disposable;
    onDidDelete?: Disposable;
} = {};
let createTaskTimerId: NodeJS.Timeout | undefined;
let deleteTaskTimerId: NodeJS.Timeout | undefined;
let pendingCreateFolders: Uri[] = [];
let pendingDeleteFolders: Uri[] = [];


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


function logFileWatcherEvent(uri: Uri, type: string)
{
    log.write("file change event", 1);
    log.value("   type", type, 1);
    log.value("   file", uri.fsPath, 1);
}


export async function registerFileWatchers(context: ExtensionContext, api: TaskExplorerApi)
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
    //
    // TaskTreeDataProvider fires event for engine to make tree provider to refresh on setEnabled()
    //
    teApi.explorer?.setEnabled(!!teApi.explorer);
    teApi.sidebar?.setEnabled(!!teApi.sidebar);
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
            await cache.removeTaskTypeFromCache(taskType, logPad + "   ");
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
            watcherDisposables.set(taskType, watcher.onDidChange(async _e =>
            {
                processingFsEvent = true;
                try
                {   logFileWatcherEvent(_e, "change");
                    await refreshTree(teApi, taskType, _e, "   ");
                    log.write("file 'change' event complete", 1);
                }
                catch (e) {}
                finally { processingFsEvent = false; }
            }));
        }

        watcherDisposables.set(taskType, watcher.onDidDelete(async _e =>
        {
            processingFsEvent = true;
            try
            {   logFileWatcherEvent(_e, "delete");
                await cache.removeFileFromCache(taskType, _e, "   ");
                await refreshTree(teApi, taskType, _e, "   ");
                log.write("file 'delete' event complete", 1);
            }
            catch (e) {}
            finally { processingFsEvent = false; }
        }));

        watcherDisposables.set(taskType, watcher.onDidCreate(async _e =>
        {
            processingFsEvent = true;
            try
            {   logFileWatcherEvent(_e, "create");
                await cache.addFileToCache(taskType, _e, "   ");
                await refreshTree(teApi, taskType, _e, "   ");
                log.write("file 'create' event complete", 1);
            }
            catch (e) {}
            finally { processingFsEvent = false; }
        }));
    }

    log.methodDone("Register file watcher for task type '" + taskType + "'", 1, logPad);
}



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
        await cache.removeWsFolders(_e.removed);
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
    if (isDirectory(uri.fsPath) && (await numFilesInDirectory(uri.fsPath)) > 0)
    {
        const wsf = workspace.getWorkspaceFolder(uri);
        if (!wsf || wsf.uri.fsPath !== uri.fsPath)
        {
            if (createTaskTimerId) {
                clearTimeout(createTaskTimerId);
            }
            pendingCreateFolders.push(uri);
            createTaskTimerId = setTimeout(async () => processDirCreated(), 50, uri);
        }
    }
}


async function onDirDelete(uri: Uri)
{
    if (!extname(uri.fsPath)) // ouch
    //if (isDirectory(uri.fsPath)) // it's gone, so we can't lstat it
    {
        processingFsEvent = true;
        try
        {   const wsf = workspace.getWorkspaceFolder(uri);
            if (wsf && wsf.uri.fsPath !== uri.fsPath)
            {
                if (createTaskTimerId) {
                    clearTimeout(createTaskTimerId);
                    createTaskTimerId = setTimeout(async () => processDirCreated(), 50, uri);
                }
                if (deleteTaskTimerId) {
                    clearTimeout(deleteTaskTimerId);
                }
                pendingDeleteFolders.push(uri);
                deleteTaskTimerId = setTimeout(async () =>
                {
                    log.methodStart("dirwatcher delete", 1, "", true, [[ "dir", uri.fsPath ]]);
                    const wfs: WorkspaceFolder[] = [];
                    for (const u of pendingDeleteFolders)
                    {
                        const wf = workspace.getWorkspaceFolder(u) as WorkspaceFolder;
                        if (!wfs.find(w => w.uri.fsPath === u.fsPath)) {
                            wfs.push(wf);
                        }
                        await cache.removeFolderFromCache(u, "   ");
                    }
                    if (wfs.length === 1) {
                        await refreshTree(teApi, undefined, pendingDeleteFolders.length > 1 ? wfs[0].uri: uri);
                    }
                    else {
                        await refreshTree(teApi, undefined, undefined);
                    }
                    pendingDeleteFolders = [];
                    deleteTaskTimerId = undefined;
                    log.methodDone("dirwatcher delete", 1, "");
                }, 20);
            }
        }
        catch (e) {}
        finally { processingFsEvent = false; }
    }
}


async function processDirCreated()
{
    if (pendingCreateFolders.length > 0)
    {
        log.methodStart("dirwatcher create", 1, "", true, [[ "dir count", pendingCreateFolders.length ]]);
        for (const processingDirUri of pendingCreateFolders)
        {
            log.value("   dir", processingDirUri.fsPath, 1, "");
            processingFsEvent = true;
            try
            {   await cache.addFolderToCache(processingDirUri, "   ");
                await refreshTree(teApi, undefined, processingDirUri);
            }
            catch (e) {}
            finally {
                processingFsEvent = false;
            }
        }
        pendingCreateFolders = [];
        createTaskTimerId = undefined;
        log.methodDone("dirwatcher create", 1, "");
    }
}

