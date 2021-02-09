/* eslint-disable prefer-arrow/prefer-arrow-functions */

import { workspace, window, RelativePattern, WorkspaceFolder, Uri, StatusBarAlignment } from "vscode";
import { log, logValue, timeout, getExcludesGlob, isExcluded, properCase, isScriptType } from "./util";
import { configuration } from "./common/configuration";
import * as constants from "./common/constants";


export const filesCache: Map<string, Set<any>> = new Map();
export let cacheBuilding = false;
let folderCaching = false;
let cancel = false;


export async function cancelBuildCache(wait?: boolean)
{
    let waitCount = 20;
    if (!cacheBuilding) {
        return;
    }
    cancel = true;
    while (wait && cacheBuilding && waitCount > 0) {
        waitCount--;
        await timeout(500);
    }
}


export async function waitForCache()
{
    while (cacheBuilding === true || folderCaching === true) {
        await timeout(100);
    }
}


export async function rebuildCache()
{
    filesCache.clear();
    await addFolderToCache();
}


export async function buildCache(taskType: string, fileBlob: string, wsfolder?: WorkspaceFolder | undefined, setCacheBuilding = true, aliasOverride: string = null)
{
    const taskAlias = !aliasOverride ? (!isScriptType(taskType) ? taskType : "script") : aliasOverride;

    log("Start cache building", 2);
    logValue("   folder", !wsfolder ? "entire workspace" : wsfolder.name, 2);
    logValue("   task type", taskType, 3);
    logValue("   task alias", taskAlias, 3);
    logValue("   blob", fileBlob, 3);
    logValue("   setCacheBuilding", setCacheBuilding.toString(), 3);

    if (setCacheBuilding) {
        //
        // If buildCache is already running in another scope, then cancel and wait
        //
        await waitForCache();
        cacheBuilding = true;
    }

    if (!filesCache.get(taskAlias)) {
        filesCache.set(taskAlias, new Set());
    }
    const fCache = filesCache.get(taskAlias);
    let dispTaskType = properCase(taskType);
    if (dispTaskType.indexOf("Ant") !== -1) {
        dispTaskType = "Ant";
    }

    function statusString(msg: string, statusLength = 0)
    {
        if (msg)
        {
            if (statusLength > 0)
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
            }
            return "$(loading~spin) " + msg;
        }

        return "";
    }

    const statusBarSpace = window.createStatusBarItem(StatusBarAlignment.Left, -10000);
    statusBarSpace.tooltip = "Task Explorer is building the task cache";
    statusBarSpace.show();

    if (!wsfolder)
    {
        log("Build cache - Scan all projects for taskType '" + taskType + "' (" + dispTaskType + ")", 1);

        if (workspace.workspaceFolders)
        {
            try {
                for (const folder of workspace.workspaceFolders)
                {
                    if (cancel) {
                        if (setCacheBuilding) {
                            cacheBuilding = false;
                            cancel = false;
                        }
                        statusBarSpace.hide();
                        statusBarSpace.dispose();
                        log("Cache building cancelled", 1);
                        return;
                    }

                    log("   Scan project " + folder.name + " for " + dispTaskType + " tasks", 1);
                    statusBarSpace.text = statusString("Scanning for " + dispTaskType + " tasks in project " + folder.name, 65);
                    const relativePattern = new RelativePattern(folder, fileBlob);
                    const paths = await workspace.findFiles(relativePattern, getExcludesGlob(folder));
                    for (const fpath of paths)
                    {
                        if (cancel) {
                            if (setCacheBuilding) {
                                cacheBuilding = false;
                                cancel = false;
                            }
                            statusBarSpace.hide();
                            statusBarSpace.dispose();
                            log("Cache building cancelled", 1);
                            return;
                        }
                        if (!isExcluded(fpath.path)) {
                            fCache.add({
                                uri: fpath,
                                folder
                            });
                            logValue("   Added to cache", fpath.fsPath, 3);
                        }
                    }
                }
            // tslint:disable-next-line: no-empty
            } catch (error) {}
        }
    }
    else
    {
        log("Build cache - Scan project '" + wsfolder.name + "' for taskType '" + taskType + "'", 1);
        statusBarSpace.text = statusString("Scanning for tasks in project " + wsfolder.name);

        const relativePattern = new RelativePattern(wsfolder, fileBlob);
        const paths = await workspace.findFiles(relativePattern, getExcludesGlob(wsfolder));
        for (const fpath of paths)
        {
            if (cancel) {
                if (setCacheBuilding) {
                    cacheBuilding = false;
                    cancel = false;
                }
                statusBarSpace.hide();
                statusBarSpace.dispose();
                log("Cache building cancelled", 1);
                return;
            }
            if (!isExcluded(fpath.path)) {
            // if (!isExcluded(fpath.path) && !fCache.has(fpath)) {
                fCache.add({
                    uri: fpath,
                    folder: wsfolder
                });
                logValue("   Added to cache", fpath.fsPath, 3);
            }
        }
    }

    statusBarSpace.hide();
    statusBarSpace.dispose();
    log("Cache building complete", 1);

    if (setCacheBuilding) {
        cancel = false;
        cacheBuilding = false;
    }
}


export async function addFileToCache(taskAlias: string, uri: Uri)
{
    if (!filesCache.get(taskAlias)) {
        filesCache.set(taskAlias, new Set());
    }
    const taskCache = filesCache.get(taskAlias);
    taskCache.add({
        uri,
        folder: workspace.getWorkspaceFolder(uri)
    });
}


export async function removeFileFromCache(taskAlias: string, uri: Uri)
{
    if (!filesCache.get(taskAlias)) {
        return;
    }
    const taskCache = filesCache.get(taskAlias);
    const toRemove = [];
    taskCache.forEach((item) =>
    {
        if (item.uri.fsPath === uri.fsPath) {
            toRemove.push(item);
        }
    });
    if (toRemove.length > 0) {
        for (const tr in toRemove) {
            if (toRemove.hasOwnProperty(tr)) { // skip over properties inherited by prototype
                taskCache.delete(toRemove[tr]);
            }
        }
    }

}


async function waitForFolderCaching()
{
    while (folderCaching === true) {
        await timeout(100);
    }
}


export async function addFolderToCache(folder?: WorkspaceFolder | undefined)
{
    log("Add folder to cache", 3);
    logValue("   folder", !folder ? "entire workspace" : folder.name, 3);

    await waitForCache();
    await waitForFolderCaching();

    folderCaching = true;
    cacheBuilding = true;

    if (!cancel && configuration.get<boolean>("enableAnt")) {
        await buildCache("ant", "**/[Bb]uild.xml", folder, false);
        const includeAnt: string[] = configuration.get("includeAnt");
        if (includeAnt && includeAnt.length > 0) {
            for (let i = 0; i < includeAnt.length; i++) {
                await buildCache("ant", includeAnt[i], folder, false, "ant-" + includeAnt[i]);
            }
        }
    }

    if (!cancel && configuration.get<boolean>("enableAppPublisher")) {
        await buildCache("app-publisher", constants.GLOB_APPPUBLISHER, folder, false);
    }

    if (!cancel && configuration.get<boolean>("enableBash")) {
        await buildCache("bash", constants.GLOB_BASH, folder, false);
    }

    if (!cancel && configuration.get<boolean>("enableBatch")) {
        await buildCache("batch", constants.GLOB_BATCH, folder, false);
    }

    if (!cancel && configuration.get<boolean>("enableGradle")) {
        await buildCache("gradle", constants.GLOB_GRADLE, folder, false);
    }

    if (!cancel && configuration.get<boolean>("enableGrunt")) {
        await buildCache("grunt", constants.GLOB_GRUNT, folder, false);
    }

    if (!cancel && configuration.get<boolean>("enableGulp")) {
        await buildCache("gulp", constants.GLOB_GULP, folder, false);
    }

    if (!cancel && configuration.get<boolean>("enableMake")) {
        await buildCache("make", constants.GLOB_MAKEFILE, folder, false);
    }

    if (!cancel && configuration.get<boolean>("enableNpm")) {
        await buildCache("npm", constants.GLOB_NPM, folder, false);
    }

    if (!cancel && configuration.get<boolean>("enableNsis")) {
        await buildCache("nsis", constants.GLOB_NSIS, folder, false);
    }

    if (!cancel && configuration.get<boolean>("enablePerl")) {
        await buildCache("perl", "**/*.[Pp][Ll]", folder, false);
    }

    if (!cancel && configuration.get<boolean>("enablePowershell")) {
        await buildCache("powershell", "**/*.[Pp][Ss]1", folder, false);
    }

    if (!cancel && configuration.get<boolean>("enablePython")) {
        await buildCache("python", "**/[Ss][Ee][Tt][Uu][Pp].[Pp][Yy]", folder, false);
    }

    if (!cancel && configuration.get<boolean>("enableRuby")) {
        await buildCache("ruby", "**/*.[Rr][Bb]", folder, false);
    }

    if (!cancel && configuration.get<boolean>("enableTsc")) {
        await buildCache("tsc", "**/tsconfig.json", folder, false);
    }

    if (!cancel && configuration.get<boolean>("enableWorkspace")) {
        await buildCache("workspace", "**/.vscode/tasks.json", folder, false);
    }

    cacheBuilding = false;
    folderCaching = false;
    if (cancel) {
        log("Add folder to cache cancelled", 3);
    }
    else {
        log("Add folder to cache complete", 3);
    }
    cancel = false;
}

