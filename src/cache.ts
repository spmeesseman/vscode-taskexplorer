
import {
    workspace, window, RelativePattern, WorkspaceFolder
} from "vscode";
import { log, getExcludesGlob, isExcluded, properCase } from "./util";
import { configuration } from "./common/configuration";

export let filesCache: Map<string, Set<any>> = new Map();


export async function buildCache(taskAlias: string, taskType: string, fileBlob: string, wsfolder?: WorkspaceFolder | undefined)
{
    if (!filesCache.get(taskAlias)) {
        filesCache.set(taskAlias, new Set());
    }
    const fCache = filesCache.get(taskAlias);
    let dispTaskType = properCase(taskType);
    if (dispTaskType.indexOf("Ant") !== -1) {
        dispTaskType = "Ant";
    }
    if (!wsfolder)
    {
        log("Scan all projects");
        window.setStatusBarMessage("$(loading) Task Explorer - Scanning projects...");

        if (workspace.workspaceFolders)
        {
            try {
                for (const folder of workspace.workspaceFolders)
                {
                    log("   Scan project " + folder.name + " for " + dispTaskType + " tasks");
                    window.setStatusBarMessage("$(loading~spin) Scanning for " + dispTaskType + " tasks in project " + folder.name + "...");
                    const relativePattern = new RelativePattern(folder, fileBlob);
                    const paths = await workspace.findFiles(relativePattern, getExcludesGlob(folder));
                    for (const fpath of paths)
                    {
                        if (!isExcluded(fpath.path)) {
                        // if (!isExcluded(fpath.path) && !fCache.has(fpath)) {
                            fCache.add({
                                uri: fpath,
                                folder
                            });
                        }
                    }
                }
            // tslint:disable-next-line: no-empty
            } catch (error) {}
        }
    }
    else
    {
        log("Scan project: " + wsfolder.name);
        window.setStatusBarMessage("$(loading~spin) Scanning for tasks in project " + wsfolder.name + "...");

        const relativePattern = new RelativePattern(wsfolder, fileBlob);
        const paths = await workspace.findFiles(relativePattern, getExcludesGlob(wsfolder));
        for (const fpath of paths)
        {
            if (!isExcluded(fpath.path)) {
            // if (!isExcluded(fpath.path) && !fCache.has(fpath)) {
                fCache.add({
                    uri: fpath,
                    folder: wsfolder
                });
            }
        }
    }

    window.setStatusBarMessage("");
}


export async function addFolderToCache(folder?: WorkspaceFolder | undefined)
{
    if (configuration.get<boolean>("enableAnt")) {
        await buildCache("ant", "ant", "**/[Bb]uild.xml", folder);
    }

    if (configuration.get<boolean>("enableAppPublisher")) {
        await buildCache("app-publisher", "app-publisher", "**/.publishrc*", folder);
    }

    if (configuration.get<boolean>("enableBash")) {
        await buildCache("script", "bash", "**/*.[Ss][Hh]", folder);
    }

    if (configuration.get<boolean>("enableBatch")) {
        await buildCache("script", "batch", "**/*.[Bb][Aa][Tt]", folder);
        await buildCache("script", "batch", "**/*.[Cc][Mm][Dd]", folder);
    }

    if (configuration.get<boolean>("enableGradle")) {
        await buildCache("gradle", "gradle", "**/*.[Gg][Rr][Aa][Dd][Ll][Ee]", folder);
    }

    if (configuration.get<boolean>("enableGrunt")) {
        await buildCache("grunt", "grunt", "**/[Gg][Rr][Uu][Nn][Tt][Ff][Ii][Ll][Ee].[Jj][Ss]", folder);
    }

    if (configuration.get<boolean>("enableGulp")) {
        await buildCache("gulp", "gulp", "**/[Gg][Uu][Ll][Pp][Ff][Ii][Ll][Ee].[Jj][Ss]", folder);
    }

    if (configuration.get<boolean>("enableMake")) {
        await buildCache("make", "make", "**/[Mm]akefile", folder);
    }

    if (configuration.get<boolean>("enableNpm")) {
        await buildCache("npm", "npm", "**/package.json", folder);
    }

    if (configuration.get<boolean>("enableNsis")) {
        await buildCache("script", "nsis", "**/*.[Nn][Ss][Ii]", folder);
    }

    if (configuration.get<boolean>("enablePerl")) {
        await buildCache("script", "perl", "**/*.[Pp][Ll]", folder);
    }

    if (configuration.get<boolean>("enablePowershell")) {
        await buildCache("script", "powershell", "**/*.[Pp][Ss]1", folder);
    }

    if (configuration.get<boolean>("enablePython")) {
        await buildCache("script", "python", "**/[Ss][Ee][Tt][Uu][Pp].[Pp][Yy]", folder);
    }

    if (configuration.get<boolean>("enableRuby")) {
        await buildCache("script", "ruby", "**/*.[Rr][Bb]", folder);
    }

    if (configuration.get<boolean>("enableTsc")) {
        await buildCache("tsc", "tsc", "**/tsconfig.json", folder);
    }

    if (configuration.get<boolean>("enableWorkspace")) {
        await buildCache("workspace", "workspace", "**/.vscode/tasks.json", folder);
    }
}

