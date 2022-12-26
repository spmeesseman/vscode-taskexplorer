/* eslint-disable prefer-arrow/prefer-arrow-functions */

import * as util from "../common/utils";
import * as cache from "../cache";
import * as log from "../common/log";
import { Disposable, ExtensionContext, FileSystemWatcher, workspace, Uri } from "vscode";
import { refreshTree } from "./refreshTree";
import { isDirectory, numFilesInDirectory } from "./utils/fs";
import { extname } from "path";
import path = require("path");


let processingDirUri: Uri | undefined;
let processingFsEvent = false;
const watchers: Map<string, FileSystemWatcher> = new Map();
const watcherDisposables: Map<string, Disposable> = new Map();
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


function logFileWatcherEvent(uri: Uri, type: string)
{
    log.write("file change event", 1);
    log.value("   type", type, 1);
    log.value("   file", uri.fsPath, 1);
}


export async function registerFileWatchers(context: ExtensionContext)
{
    const taskTypes = util.getTaskTypes();
    for (const taskType of taskTypes)
    {
        if (util.isTaskTypeEnabled(taskType))
        {
            await registerFileWatcher(context, taskType, util.getGlobPattern(taskType));
        }
    }
    createDirWatcher(context);
}


export async function registerFileWatcher(context: ExtensionContext, taskType: string, fileBlob: string, enabled?: boolean)
{
    log.write("Register file watcher for task type '" + taskType + "'");

    let watcher = watchers.get(taskType);
    const ignoreModify = util.isScriptType(taskType) || taskType === "apppublisher" || taskType === "maven";

    /* istanbul ignore else */
    if (workspace.workspaceFolders) {
        await cache.buildCache(taskType, fileBlob, undefined, true, "   ");
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
                    await refreshTree(taskType, _e);
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
                await cache.removeFileFromCache(taskType, _e, "");
                await refreshTree(taskType, _e);
            }
            catch (e) {}
            finally { processingFsEvent = false; }
        }));

        watcherDisposables.set(taskType, watcher.onDidCreate(async _e =>
        {
            processingFsEvent = true;
            try
            {   logFileWatcherEvent(_e, "create");
                await cache.addFileToCache(taskType, _e);
                await refreshTree(taskType, _e);
            }
            catch (e) {}
            finally { processingFsEvent = false; }
        }));
    }

}



function createDirWatcher(context: ExtensionContext)
{
    dirWatcher.onDidCreate?.dispose();
    dirWatcher.onDidDelete?.dispose();
    dirWatcher.watcher?.dispose();

    dirWatcher.watcher = workspace.createFileSystemWatcher(getDirWatchGlob());
    dirWatcher.onDidCreate = dirWatcher.watcher.onDidCreate(async (e) => { await onDirCreate(e); }, null);
    dirWatcher.onDidDelete = dirWatcher.watcher.onDidDelete(async (e) => { await onDirDelete(e); }, null);

    context.subscriptions.push(dirWatcher.onDidCreate);
    context.subscriptions.push(dirWatcher.onDidDelete);
    context.subscriptions.push(dirWatcher.watcher);
}


function getDirWatchGlob()
{
    log.write("   Build file watcher glob", 2);
    const watchPaths: string[] = [];
    workspace.workspaceFolders?.forEach((wsf) =>
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
            processingDirUri = uri;
            setTimeout(async () => processDirCreated(), 200, uri);
        }
    }
}


async function onDirDelete(uri: Uri)
{
    if (!extname(uri.fsPath)) // ouch
    //if (isDirectory(uri.fsPath)) // it's gone, so we can't lstat it
    {
        log.methodStart("dirwatcher delete", 1, "", true, [[ "dir", uri.fsPath ]]);
        processingFsEvent = true;
        processingDirUri = undefined;
        try
        {   const wsf = workspace.getWorkspaceFolder(uri);
            if (!wsf || wsf.uri.fsPath !== uri.fsPath)
            {
                await cache.rebuildCache(wsf, "   ");
                //if (!processingDirUri) {
                    await refreshTree(undefined, wsf?.uri);
                //}
                //else {
                //    await processDirCreated();
                //}
            }
        }
        catch (e) {}
        finally { processingFsEvent = false; processingDirUri = undefined; }
        log.methodDone("dirwatcher delete", 1, "");
    }
}


async function processDirCreated()
{
    if (processingDirUri)
    {
        log.methodStart("dirwatcher create", 1, "", true, [[ "dir", processingDirUri.fsPath ]]);
        processingFsEvent = true;
        try
        {   await cache.addFolderToCache(workspace.getWorkspaceFolder(processingDirUri), "   ");
            await refreshTree(undefined, processingDirUri);
        }
        catch (e) {}
        finally {
            processingFsEvent = false;
            processingDirUri = undefined;
        }
        log.methodDone("dirwatcher create", 1, "");
    }
}

