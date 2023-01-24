/* eslint-disable prefer-arrow/prefer-arrow-functions */

import log from "../log/log";
import * as minimatch from "minimatch";
import constants from "../constants";
import TaskItem from "../../tree/item";
import { homedir } from "os";
import { configuration } from "./configuration";
import { pathExists, pathExistsSync } from "./fs";
import { basename, dirname, extname, join, resolve, sep } from "path";
import { WorkspaceFolder, Uri, workspace, window, commands } from "vscode";
import TaskFile from "../../tree/file";
import { ILicenseManager } from "../../interface/ILicenseManager";


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


export function getCombinedGlobPattern(defaultPattern: string, globs: string[]): string
{
    if (globs && globs.length > 0)
    {
        let multiFilePattern = "{" + defaultPattern;
        for (const i of globs) {
            multiFilePattern += ",";
            multiFilePattern += i;
        }
        multiFilePattern += "}";
        return multiFilePattern;
    }
    return defaultPattern;
}


export function getCwd(uri: Uri): string
{
    return uri.fsPath.substring(0, uri.fsPath.lastIndexOf(sep) + 1);
}


export function getGroupSeparator()
{
    return configuration.get<string>("groupSeparator", constants.DEFAULT_SEPARATOR);
}


export function getPackageManager(): string
{
    let pkgMgr = workspace.getConfiguration("npm", null).get<string>("packageManager") || "npm";
    if (pkgMgr.match(/(npm|auto)/)) { // pnpm/auto?  only other option is yarn
        pkgMgr = "npm";
    }
    return pkgMgr;
}


export function getGlobPattern(taskType: string): string
{
    taskType = taskType.replace(/\W*\-/, "");
    if (taskType === "ant") {
        return getCombinedGlobPattern(constants.GLOB_ANT,
                [ ...configuration.get<string[]>("includeAnt", []), ...configuration.get<string[]>("globPatternsAnt", []) ]);
    }
    else if (taskType === "bash") {
        return getCombinedGlobPattern(constants.GLOB_BASH, configuration.get<string[]>("globPatternsBash", []));
    }
    else {
        return constants["GLOB_" + taskType.toUpperCase()];
    }
}


/**
 * Gets the base/root/install path of the extension
 */
export async function getInstallPath()
{
    let dir = __dirname;
    while (dir.length > 3 && !(await pathExists(join(dir, "package.json")))) {
        dir = dirname(dir);
    }
    return dir;
}


export function getPortableDataPath(padding = "")
{
    /* istanbul ignore else */
    if (process.env.VSCODE_PORTABLE)
    {
        const uri = Uri.parse(process.env.VSCODE_PORTABLE);
        /* istanbul ignore else */
        if (uri)
        {
            if (pathExistsSync(uri.fsPath))
            {
                try {
                    const fullPath = join(uri.fsPath, "user-data", "User");
                    log.value(padding + "found portable user data path", fullPath, 4);
                    return fullPath;
                }
                catch (e: any)
                {   /* istanbul ignore next */
                    log.error(e);
                }
            }
        }
    }
    return;
}


export function getRelativePath(folder: WorkspaceFolder, uri: Uri): string
{
    const rootUri = folder.uri;
    const absolutePath = uri.path.substring(0, uri.path.lastIndexOf("/") + 1);
    return absolutePath.substring(rootUri.path.length + 1);
}


export function getScriptTaskTypes(): string[]
{
    return [
        "bash", "batch", "nsis", "perl", "powershell", "python", "ruby"
    ];
}


/**
 * @deprecated Use `isTaskTypeEnabled` and `getPathToProgram`
 * To be removed after the temp extension.tempRemapSettingsToNewLayout() method is removed.
 * @param taskType Task type, e.g. `npm`, `apppublisher`, `grunt`, `bash`, etc
 * @param settingPart String prependature for  commonly named setting name
 * @returns The task type's unique setting name
 */
/* istanbul ignore next */
export function getTaskTypeSettingName(taskType: string, settingPart: string)
{   /* istanbul ignore next */
    return settingPart + (!settingPart.endsWith(".") ? properCase(taskType) : taskType.toLowerCase());
}


/**
 * @deprecated Use `isTaskTypeEnabled`
 * To be removed after the temp extension.tempRemapSettingsToNewLayout() method is removed.
 * @param taskType Task type, e.g. `npm`, `apppublisher`, `grunt`, `bash`, etc
 * @returns The task type's unique setting name
 */
/* istanbul ignore next */
export function getTaskTypeEnabledSettingName(taskType: string)
{   /* istanbul ignore next */
    return getTaskTypeSettingName(taskType, "enabledTasks.");
}


export function getTaskTypes()
{
    return [
        "ant", "apppublisher", "bash", "batch", "composer",  "gradle", "grunt", "gulp", "make",
        "maven", "npm", "nsis", "perl", "powershell", "python", "pipenv", "ruby", "tsc",  "Workspace"
    ];
}


export function getTaskTypeFriendlyName(taskType: string, lowerCase = false)
{
    taskType = taskType.toLowerCase();
    if (taskType === "workspace") {
        return lowerCase ? "vscode" : "VSCode";
    }
    else if (taskType === "apppublisher") {
        return lowerCase ? "app-publisher" : "App-Publisher";
    }
    else if (taskType === "tsc") {
        return lowerCase ? "typescript" : "Typescript";
    }
    return lowerCase ? taskType : properCase(taskType);
}


export function getTaskTypeRealName(taskType: string)
{
    taskType = taskType.toLowerCase();
    if (taskType === "workspace") {
        return "Workspace";
    }
    return taskType;
}


export function getUserDataPath(platform?: string, padding = "")
{
    let userPath: string | undefined = "";

    log.write(padding + "get user data path", 4);
    logUserDataEnv(padding + "   ");
    //
    // Check if data path was passed on the command line
    //
    /* istanbul ignore else */
    if (process.argv)
    {
        let argvIdx = process.argv.includes("--user-data-dir");
        /* istanbul ignore next */
        if (argvIdx !== false && typeof argvIdx === "number" && argvIdx >= 0 && argvIdx < process.argv.length) {
            userPath = resolve(process.argv[++argvIdx]);
            log.value(padding + "user path is", userPath, 4);
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
    userPath = resolve(userPath);
    log.value(padding + "user path is", userPath, 4);
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
    if (!appDataPath)
    {
        /* istanbul ignore next */
        switch (platform || process.platform)
        {
            case "win32":
                appDataPath = process.env.APPDATA;
                if (!appDataPath) {
                    const userProfile = process.env.USERPROFILE || "";
                    appDataPath = join(userProfile, "AppData", "Roaming");
                }
                break;
            case "darwin":
                appDataPath = join(homedir(), "Library", "Application Support");
                break;
            case "linux":
                appDataPath = process.env.XDG_CONFIG_HOME || join(homedir(), ".config");
                break;
            default:
                return ".";
        }
    }
    return join(appDataPath, "vscode");
}


export function getWorkspaceProjectName(fsPath: string)
{
    let project = basename(fsPath);
    const wsf = workspace.getWorkspaceFolder(Uri.file(fsPath));
    /* istanbul ignore else */
    if (wsf) {
        project = basename(wsf.uri.fsPath);
    }
    return project;
}


export function isArray<T>(value: any): value is T[]
{
    return !!value && Array.isArray(value);
}


export function isBoolean(value: any): value is boolean
{
    return (value === false || value === true) && typeof value === "boolean";
}


export function isError(e: any): e is Error
{
    return e instanceof Error;
}


export function isExcluded(uriPath: string, logPad = "")
{
    function testForExclusionPattern(path: string, pattern: string): boolean
    {
        return minimatch(path, pattern, { dot: true, nocase: true });
    }

    const exclude = configuration.get<string[]>("exclude", []);

    log.methodStart("Check exclusion", 4, logPad, false, [[ "path", uriPath ]]);

    for (const pattern of exclude)
    {
        log.value("   checking pattern", pattern, 5);
        if (testForExclusionPattern(uriPath, pattern))
        {
            log.methodDone("Check exclusion", 4, logPad, [[ "excluded", "yes" ]]);
            return true;
        }
        if (!extname(uriPath) && !uriPath.endsWith(sep))
        {
            if (testForExclusionPattern(uriPath + sep, pattern))
            {
                log.methodDone("Check exclusion", 4, logPad, [[ "excluded", "yes" ]]);
                return true;
            }
        }
    }

    log.methodDone("Check exclusion", 4, logPad, [[ "excluded", "no" ]]);
    return false;
}


export function isFunction(value: any)
{
    return !!value && typeof value === "function";
}


export const isNumber = (n: any): n is number => (n || n === 0) && typeof n === "number" && isFinite(n);


export function isObject(value: any): value is { [key: string]: any }
{
    return !!value && (value instanceof Object || typeof value === "object") && !isArray(value);
}


export const isObjectEmpty = (value: any) =>
{
    if (value)
    {
        for (const key in value)
        {
            if ({}.hasOwnProperty.call(value, key)) {
                return false;
            }
        }
    }
    return true;
};


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


export function isString(value: any, notEmpty = false): value is string
{
    return (!!value || (value === "" && !notEmpty)) && (value instanceof String || typeof value === "string");
}


export const isTaskFile = (t: any): t is TaskFile => t instanceof TaskFile;


/**
 * @param taskType Task type, e.g. `npm`, `apppublisher`, `grunt`, `bash`, etc
 * @returns `true` if enabled, `false` if disabled
 */
export function isTaskTypeEnabled(taskType: string)
{
    const settingName = "enabledTasks." + taskType.replace(/\-/g, "").toLowerCase();
    return configuration.get<boolean>(settingName, false);
}


export function isWatchTask(source: string)
{
    return [ "npm", "tsc", "Workspace" ].includes(source);
}


export function isWorkspaceFolder(value: any): value is WorkspaceFolder
{
    return value && typeof value !== "number";
}


function logUserDataEnv(padding: string)
{
    /* istanbul ignore else */
    if (log.isLoggingEnabled())
    {
        log.value(padding + "os", process.platform, 4);
        log.value(padding + "portable", process.env.VSCODE_PORTABLE, 4);
        log.value(padding + "env:VSCODE_APPDATA", process.env.VSCODE_APPDATA, 4);
        log.value(padding + "env:VSCODE_APPDATA", process.env.APPDATA, 4);
        log.value(padding + "env:VSCODE_APPDATA", process.env.USERPROFILE, 4);
        /* istanbul ignore if */
        if (process.platform === "linux") {
            log.value("env:XDG_CONFIG_HOME", process.env.XDG_CONFIG_HOME, 4);
        }
    }
}


export function lowerCaseFirstChar(s: string, removeSpaces: boolean)
{
    let fs = "";
    /* istanbul ignore else */
    if (s)
    {
        fs = s[0].toString().toLowerCase();
        if (s.length > 1) {
            fs += s.substring(1);
        }
        if (removeSpaces) {
            fs = fs.replace(/ /g, "");
        }
    }
    return fs;
}


export function pushIfNotExists(arr: any[], item: any)
{
    if (!arr.includes(item)) { arr.push(item); }
}


export function properCase(name: string | undefined, removeSpaces?: boolean)
{
    if (!name) {
      return "";
    }
    return name.replace(/(?:^\w|[A-Z]|\b\w)/g, (ltr) => ltr.toUpperCase()).replace(/[ ]+/g, !removeSpaces ? " " : "");
}


// export const removeFromArray = <T>(arr: T[], cb: (value: any, index: number, array: T[]) => void)
// {
//     const shallowReverse = arr.slice().reverse();
//     for (const item of shallowReverse)
//     {
//         fn(item, index, object);
//     }
//     shallowReverse.forEach((item, index, object) =>
//     {
//         fn(item, index, object);
//     });
// };

export function removeFromArray(arr: any[], item: any)
{
    let idx = -1;
    let idx2 = -1;

    if (!arr.includes(item)) {
        return;
    }

    for (const each of arr)
    {
        idx++;
        if (item === each) {
            idx2 = idx;
            break;
        }
    }

    /* istanbul ignore else */
    if (idx2 !== -1 && idx2 < arr.length) {
        arr.splice(idx2, 1);
    }
}


let maxTasksMessageShown = false;
const maxTaskTypeMessageShown: any = {};
export function showMaxTasksReachedMessage(licMgr: ILicenseManager, taskType?: string)
{
    if ((!maxTasksMessageShown && !taskType) || (taskType && !maxTaskTypeMessageShown[taskType] && Object.keys(maxTaskTypeMessageShown).length < 3))
    {
        const msg = `The max # of parsed ${taskType ?? ""} tasks in un-licensed mode has been reached`;
        window.showInformationMessage(msg, "Enter License Key", "Info", "Not Now")
		.then(async (action) =>
		{
			if (action === "Enter License Key")
			{
				await commands.executeCommand("taskExplorer.enterLicense");
			}
			else if (action === "Info")
			{
				await commands.executeCommand("taskExplorer.viewLicense");
			}
		});
        if (taskType) {
            maxTaskTypeMessageShown[taskType] = true;
        }
    }
    maxTasksMessageShown = true;
    licMgr.setMaxTasksReached(true);
}


export function timeout(ms: number)
{
    return new Promise(resolve => setTimeout(resolve, ms));
}
