/* eslint-disable prefer-arrow/prefer-arrow-functions */

import { RelativePattern, WorkspaceFolder, Uri, workspace } from "vscode";
import * as fs from "fs";
import * as minimatch from "minimatch";
import { configuration } from "./configuration";
import constants from "./constants";
import * as path from "path";
import * as os from "os";
import * as log from "./log";
import TaskItem from "../tree/item";


/**
 * Camel case a string
 *
 * @param name The string to manipulate
 * @param indexUpper The index of the string to upper case
 */
export function camelCase(name: string | undefined, indexUpper: number)
{
    if (!name || indexUpper <= 0 || indexUpper >= name.length) {
      return name;
    }

    return name
        .replace(/(?:^\w|[A-Za-z]|\b\w)/g, (letter, index) => {
            return index !== indexUpper ? letter.toLowerCase() : letter.toUpperCase();
        })
        .replace(/[\s\-]+/g, "");
}


/**
 * Checks if a value exists in the given array
 *
 * * **IMPORTANT**  This function will return 0 on success if the item is the 1st in the array,
 * always check for a return value of false, and not just using a !existsInArray to determine if
 * the item exists
 *
 * @param arr The array to check
 * @param item The value to check in the given array for
 * @returns The index of the item in the array if the value exists in the arrray, `false` otherwise
 */
export function existsInArray(arr: any[], item: any): boolean | number
{
    for (let i = 0; i < arr.length; i++) {
        if (item === arr[i]) {
            return i;
        }
    }
    return false;
}


export async function forEachAsync(array: any, callback: any)
{
    for (let index = 0; index < array.length; index++) {
        const result = await callback(array[index], index, array);
        if (result === false) {
            break;
        }
    }
}


export function getCombinedGlobPattern(defaultPattern: string, globs: string[]): string
{
    let multiFilePattern = defaultPattern ? "{" + defaultPattern : "{";
    if (globs && globs.length > 0)
    {
        for (const i of globs) {
            multiFilePattern += ",";
            multiFilePattern += i;
        }
    }
    multiFilePattern += "}";
    return multiFilePattern;
}


export function getCwd(uri: Uri): string
{
    return uri.fsPath.substring(0, uri.fsPath.lastIndexOf(path.sep) + 1);
}


export function getGroupSeparator()
{
    return configuration.get<string>("groupSeparator", constants.DEFAULT_SEPARATOR);
}


export function getPackageManager(): string
{
    let pkgMgr = workspace.getConfiguration("npm").get<string>("packageManager") || "npm";
    if (pkgMgr.match(/(npm|auto)/)) { // pnpm/auto?  only other option is yarn
        pkgMgr = "npm";
    }
    return pkgMgr;
}


export function getGlobPattern(taskType: string): string
{
    if (taskType) {
        taskType = taskType.replace(/\W*\-/, "");
        if (taskType === "ant") {
            return getCombinedGlobPattern(constants.GLOB_ANT,
                   [...configuration.get<string[]>("includeAnt", []), ...configuration.get<string[]>("globPatternsAnt", [])]);
        }
        else if (taskType === "bash") {
            return getCombinedGlobPattern(constants.GLOB_BASH, configuration.get<string[]>("globPatternsBash", []));
        }
        else {
            return constants["GLOB_" + taskType.toUpperCase()];
        }
    }
    return "*/**";
}


export function getPortableDataPath(padding = "")
{
    if (process.env.VSCODE_PORTABLE)
    {
        const uri = Uri.parse(process.env.VSCODE_PORTABLE);
        if (uri)
        {
            if (fs.existsSync(uri.fsPath))
            {
                try {
                    const fullPath = path.join(uri.fsPath, "user-data", "User");
                    log.value(padding + "found portable user data path", fullPath, 1);
                    return fullPath;
                }
                catch (e) {
                    log.write(e.toString());
                    return;
                }
            }
        }
    }
    return;
}


export function getRelativePath(folder: WorkspaceFolder, uri: Uri): string
{
    let rtn = "";
    if (folder) {
        const rootUri = folder.uri;
        const absolutePath = uri.path.substring(0, uri.path.lastIndexOf("/") + 1);
        rtn = absolutePath.substring(rootUri.path.length + 1);
    }
    return rtn;
}


export function getScriptTaskTypes(): string[]
{
    return [
        "bash", "batch", "nsis", "perl", "powershell", "python", "ruby"
    ];
}


export function getTaskItemId(taskItem: TaskItem)
{
    return taskItem.id.replace(constants.LAST_TASKS_LABEL + ":", "")
                      .replace(constants.FAV_TASKS_LABEL + ":", "")
                      .replace(constants.USER_TASKS_LABEL + ":", "");
}


export function getTaskTypeSettingName(taskType: string, settingPart: string)
{
    return settingPart + (taskType !== "app-publisher" ? properCase(taskType) : "AppPublisher");
}


export function getTaskTypeEnabledSettingName(taskType: string)
{
    return getTaskTypeSettingName(taskType, "enable");
}


export function getTaskProviderType(source: string): string
{
    if (isScriptType(source)) {
        return "script";
    }
    return source;
}


export function getTaskTypes(): string[]
{
    return [
        "ant", "app-publisher", "bash", "batch", "composer",  "gradle", "grunt", "gulp", "make",
        "maven", "npm", "nsis", "perl", "powershell", "python", "pipenv", "ruby", "tsc",  "workspace"
    ];
}


export function getUserDataPath(platform?: string, padding = "")
{
    let userPath: string | undefined = "";

    log.write(padding + "get user data path", 1);
    logUserDataEnv(padding + "   ");
    //
    // Check if data path was passed on the command line
    //
    if (process.argv)
    {
        let argvIdx = existsInArray(process.argv, "--user-data-dir");
        if (argvIdx !== false && typeof argvIdx === "number" && argvIdx >= 0 && argvIdx < process.argv.length) {
            userPath = path.resolve(process.argv[++argvIdx]);
            log.value(padding + "user path is", userPath, 1);
            return userPath;
        }
    }
    //
    // If this is a portable install (zip install), then VSCODE_PORTABLE will be defined in the
    // environment this process is running in
    //
    userPath = getPortableDataPath(padding + "   ");
    if (!userPath)
    {   //
        // Use system user data path
        //
        userPath = getDefaultUserDataPath(platform);
    }
    userPath = path.resolve(userPath);
    log.value(padding + "user path is", userPath, 1);
    return userPath;
}


function getDefaultUserDataPath(platform?: string)
{   //
    // Support global VSCODE_APPDATA environment variable
    //
    let appDataPath = process.env.VSCODE_APPDATA;
    //
    // Otherwise check per platform
    //
    if (!appDataPath) {
        switch (platform || process.platform) {
            case "win32":
                appDataPath = process.env.APPDATA;
                if (!appDataPath) {
                    const userProfile = process.env.USERPROFILE || "";
                    appDataPath = path.join(userProfile, "AppData", "Roaming");
                }
                break;
            case "darwin":
                appDataPath = path.join(os.homedir(), "Library", "Application Support");
                break;
            case "linux":
                appDataPath = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), ".config");
                break;
            default:
                return ".";
        }
    }
    return path.join(appDataPath, "vscode");
}


export function isExcluded(uriPath: string, logPad = "")
{
    function testForExclusionPattern(path: string, pattern: string): boolean
    {
        return minimatch(path, pattern, { dot: true, nocase: true });
    }

    const exclude = configuration.get<string[]>("exclude", []);

    log.blank(4);
    log.write(logPad + "Check exclusion", 4);
    log.value(logPad + "   path", uriPath, 4);


    for (const pattern of exclude) {
        log.value(logPad + "   checking pattern", pattern, 5);
        if (testForExclusionPattern(uriPath, pattern)) {
            log.write(logPad + "   Excluded!", 4);
            return true;
        }
    }

    log.write(logPad + "   Not excluded", 4);
    return false;
}


export function isScriptType(source: string)
{
    return getScriptTaskTypes().includes(source);
}


export function isSpecial(taskItem: TaskItem)
{
    return taskItem && taskItem.id &&
           (taskItem.id.includes(constants.LAST_TASKS_LABEL + ":") ||
           taskItem.id.includes(constants.FAV_TASKS_LABEL + ":") ||
           taskItem.id.includes(constants.USER_TASKS_LABEL + ":"));
}


export function isWatchTask(source: string)
{
    return [ "npm", "tsc", "workspace", "Workspace" ].includes(source);
}


function logUserDataEnv(padding = "")
{
    if (log.isLoggingEnabled())
    {
        log.value(padding + "os", process.platform, 1);
        log.value(padding + "portable", process.env.VSCODE_PORTABLE, 1);
        log.value(padding + "env:VSCODE_APPDATA", process.env.VSCODE_APPDATA, 1);
        log.value(padding + "env:VSCODE_APPDATA", process.env.APPDATA, 1);
        log.value(padding + "env:VSCODE_APPDATA", process.env.USERPROFILE, 1);
        if (process.platform === "linux") {
            log.value("env:XDG_CONFIG_HOME", process.env.XDG_CONFIG_HOME, 1);
        }
    }
}


export function pathExists(pathToCheck: string)
{
    try {
        fs.accessSync(path.resolve(process.cwd(), pathToCheck));
    } catch (err) {
        return false;
    }
    return true;
}


export function pushIfNotExists(arr: any[], item: any)
{
    if (existsInArray(arr, item) === false) {
        arr.push(item);
    }
}


export function properCase(name: string | undefined)
{
    if (!name) {
      return name;
    }

    return name
        .replace(/(?:^\w|[A-Z]|\b\w)/g, (letter, index) => {
            return index !== 0 ? letter.toLowerCase() : letter.toUpperCase();
        })
        .replace(/[\s]+/g, "");
}


export function readFileSync(file: string)
{
    const buf = fs.readFileSync(path.resolve(process.cwd(), file));
    return (buf ? buf.toString() : "");
}


export function removeFromArray(arr: any[], item: any)
{
    let idx = -1;
    let idx2 = -1;

    for (const each of arr)
    {
        idx++;
        if (item === each) {
            idx2 = idx;
            break;
        }
    }

    if (idx2 !== -1 && idx2 < arr.length) {
        arr.splice(idx2, 1);
    }
}


export async function removeFromArrayAsync(arr: any[], item: any)
{
    let idx = -1;
    let idx2 = -1;

    await forEachAsync(arr, (each: any) => {
        idx++;
        if (item === each) {
            idx2 = idx;
            return false;
        }
    });

    if (idx2 !== -1 && idx2 < arr.length) {
        arr.splice(idx2, 1);
    }
}


export function timeout(ms: number)
{
    return new Promise(resolve => setTimeout(resolve, ms));
}
