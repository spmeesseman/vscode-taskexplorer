/* eslint-disable prefer-arrow/prefer-arrow-functions */

import * as util from "../common/utils";
import * as cache from "../cache";
import * as log from "../common/log";
import { Disposable, ExtensionContext, FileSystemWatcher, workspace, Uri } from "vscode";
import { refreshTree } from "./refreshTree";


const watchers: Map<string, FileSystemWatcher> = new Map();
const watcherDisposables: Map<string, Disposable> = new Map();


export function disposeFileWatchers()
{
    for (const [ k, d ] of watcherDisposables) {
        d.dispose();
    }
    for (const [ k, w ] of watchers) {
        w.dispose();
    }
}


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
            const watchModify = util.isScriptType(taskType) || taskType === "app-publisher";
            await registerFileWatcher(context, taskType, util.getGlobPattern(taskType), watchModify);
        }
    }
}


export async function registerFileWatcher(context: ExtensionContext, taskType: string, fileBlob: string, ignoreModify?: boolean, enabled?: boolean)
{
    log.write("Register file watcher for task type '" + taskType + "'");

    let watcher = watchers.get(taskType);

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
        if (!ignoreModify) {
            watcherDisposables.set(taskType, watcher.onDidChange(async _e => {
                logFileWatcherEvent(_e, "change");
                await refreshTree(taskType, _e);
            }));
        }
        watcherDisposables.set(taskType, watcher.onDidDelete(async _e => {
            logFileWatcherEvent(_e, "delete");
            await cache.removeFileFromCache(taskType, _e, "");
            await refreshTree(taskType, _e);
        }));
        watcherDisposables.set(taskType, watcher.onDidCreate(async _e => {
            logFileWatcherEvent(_e, "create");
            await cache.addFileToCache(taskType, _e);
            await refreshTree(taskType, _e);
        }));
    }
}

