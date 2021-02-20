/* eslint-disable prefer-arrow/prefer-arrow-functions */

import {
    RelativePattern, WorkspaceFolder, OutputChannel, ExtensionContext,
    commands, window, Uri, workspace
} from "vscode";
import * as fs from "fs";
import * as minimatch from "minimatch";
import { configuration } from "./common/configuration";
import * as constants from "./common/constants";
import * as path from "path";
import * as os from "os";


const logValueWhiteSpace = 40;
let writeToConsole = false;
let writeToConsoleLevel = 2;
let logOutputChannel: OutputChannel | undefined;


export enum LogColor
{
    black = "\\u001b[30m",
    red = "\\u001b[31",
    green = "\\u001b[32m",
    yellow = "\\u001b[33m",
    blue = "\\u001b[34m", // "<span style=\"color:blue\">"  "</style>"
    magenta = "\\u001b[35",
    cyan = "\\u001b[36m",
    white = "\\u001b[37m"
}


/**
 * Camel case a string
 *
 * @param name The string to manipulate
 * @param indexUpper The index of the string to upper case
 */
export function camelCase(name: string, indexUpper: number)
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
    if (arr) {
        for (let i = 0; i < arr.length; i++) {
            if (item === arr[i]) {
                return i;
            }
        }
    }
    return false;
}


export function initLog(settingGrpName: string, dispName: string, context?: ExtensionContext, showLog?: boolean)
{
    function showLogOutput(show: boolean)
    {
        if (logOutputChannel && show) {
            logOutputChannel.show();
        }
    }
    //
    // Set up a log in the Output window
    //
    logOutputChannel = window.createOutputChannel(dispName);
    if (context)
    {
        context.subscriptions.push(logOutputChannel);
        context.subscriptions.push(
            commands.registerCommand(settingGrpName + ".showOutput", showLogOutput)
        );
    }
    showLogOutput(showLog);
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


export async function forEachMapAsync(map: any, callback: any)
{
    for (const entry of map.entries()) {
        const result = await callback(entry[1], entry[0], map);
        if (result === false) {
            break;
        }
    }
}


export function getCwd(uri: Uri): string
{
    let dir = uri.fsPath.substring(0, uri.fsPath.lastIndexOf("\\") + 1);
    if (process.platform !== "win32") {
        dir = uri.fsPath.substring(0, uri.fsPath.lastIndexOf("/") + 1);
    }
    return dir;
}


export function getGroupSeparator()
{
    return configuration.get<string>("groupSeparator") || constants.DEFAULT_SEPARATOR;
}


export function getAntGlobPattern(): string
{
    let multiFilePattern = constants.GLOB_ANT;
    const includes: string[] = configuration.get("includeAnt");
    if (includes && includes.length > 0)
    {
        multiFilePattern = "{" + constants.GLOB_ANT;
        if (Array.isArray(includes))
        {
            for (const i of includes) {
                multiFilePattern += ",";
                multiFilePattern += i;
            }
        }
        else {
            multiFilePattern += ",";
            multiFilePattern += includes;
        }
        multiFilePattern += "}";
    }
    return multiFilePattern;
}


export function getExcludesGlob(folder: string | WorkspaceFolder): RelativePattern
{
    let relativePattern = new RelativePattern(folder, "**/node_modules/**");
    const excludes: string[] = configuration.get("exclude");

    if (excludes && excludes.length > 0)
    {
        let multiFilePattern = "{**/node_modules/**";
        if (Array.isArray(excludes))
        {
            for (const e of excludes) {
                multiFilePattern += ",";
                multiFilePattern += e;
            }
        }
        else {
            multiFilePattern += ",";
            multiFilePattern += excludes;
        }
        multiFilePattern += "}";
        relativePattern = new RelativePattern(folder, multiFilePattern);
    }

    return relativePattern;
}


export function getPackageManager(): string
{
    let pkgMgr = workspace.getConfiguration("npm").get<string>("packageManager") || "npm";
    if (pkgMgr.match(/(npm|auto)/)) { // pnpm/auto?  only other option is yarn
        pkgMgr = "npm";
    }
    return pkgMgr;
}


export function getScriptTaskTypes(): string[]
{
    return [
        "bash", "batch", "nsis", "perl", "powershell", "python", "ruby"
    ];
}


export function getTaskTypes(): string[]
{
    return [
        "ant", "app-publisher", "bash", "batch", "gradle", "grunt", "gulp", "make", "npm",
        "nsis", "perl", "powershell", "python", "ruby", "workspace"
    ];
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
                    logValue(padding + "found portable user data path", fullPath, 1);
                    return fullPath;
                }
                catch (e) {
                    log(e.toString());
                    return null;
                }
            }
        }
    }
    return null;
}


export function getUserDataPath(padding = "")
{
    let userPath = "";

    log(padding + "get user data path", 1);
    logUserDataEnv(padding + "   ");
    //
    // Check if data path was passed on the command line
    //
    if (process.argv)
    {
        let argvIdx = existsInArray(process.argv, "--user-data-dir");
        if (argvIdx !== false && typeof argvIdx === "number" && argvIdx >= 0 && argvIdx < process.argv.length) {
            userPath = path.resolve(process.argv[++argvIdx]);
            logValue(padding + "user path is", userPath, 1);
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
        userPath = getDefaultUserDataPath();
    }
    userPath = path.resolve(userPath);
    logValue(padding + "user path is", userPath, 1);
    return userPath;
}


function getDefaultUserDataPath()
{   //
    // Support global VSCODE_APPDATA environment variable
    //
    let appDataPath = process.env.VSCODE_APPDATA;
    //
    // Otherwise check per platform
    //
    if (!appDataPath) {
        switch (process.platform) {
            case "win32":
                appDataPath = process.env.APPDATA;
                if (!appDataPath) {
                    const userProfile = process.env.USERPROFILE;
                    if (typeof userProfile !== "string") {
                        throw new Error("Windows: Unexpected undefined %USERPROFILE% environment variable");
                    }
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
                throw new Error("Platform not supported");
        }
    }
    return path.join(appDataPath, "vscode");
}


export function getGlobPattern(taskType: string)
{
    if (taskType) {
        taskType = taskType.replace(/\W*\-/, "");
        if (taskType === "ant") {
            return getAntGlobPattern();
        }
        else {
            return constants["GLOB_" + taskType.toUpperCase()];
        }
    }
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


export function getScriptProviderType(source: string): string
{
    if (isScriptType(source)) {
        return "script";
    }
    return source;
}


export function isExcluded(uriPath: string, logPad = "")
{
    function testForExclusionPattern(path: string, pattern: string): boolean
    {
        return minimatch(path, pattern, { dot: true, nocase: true });
    }

    const exclude = configuration.get<string | string[]>("exclude");

    logBlank(4);
    log(logPad + "Check exclusion", 4);
    logValue(logPad + "   path", uriPath, 4);

    if (exclude)
    {
        if (Array.isArray(exclude))
        {
            for (const pattern of exclude) {
                logValue(logPad + "   checking pattern", pattern, 5);
                if (testForExclusionPattern(uriPath, pattern)) {
                    log(logPad + "   Excluded!", 4);
                    return true;
                }
            }
        }
        else {
            logValue(logPad + "   checking pattern", exclude, 5);
            if (testForExclusionPattern(uriPath, exclude)) {
              log(logPad + "   Excluded!", 4);
              return true;
            }
        }
    }

    log(logPad + "   Not excluded", 4);
    return false;
}


export function isLoggingEnabled()
{
    return configuration.get("debug") === true;
}


export function isScriptType(source: string)
{
    return source === "bash" || source === "batch" || source === "nsis" || source === "perl" ||
           source === "powershell" || source === "python" || source === "ruby";
}


export function logMethodStart(msg: string, level?: number, logPad = "", params?: [string, any][], color?: LogColor)
{
    if (msg === null || msg === undefined) {
        return;
    }

    if (isLoggingEnabled())
    {
        const lLevel = level || 1;
        logBlank(lLevel);
        log(logPad + "*start* " + msg, lLevel, color);
        if (params) {
            for (const [ n, v] of params) {
                logValue(logPad + "   " + n, v, lLevel + 1);
            }
        }
    }
}


export function logMethodDone(msg: string, level?: number, logPad = "")
{
    if (msg === null || msg === undefined) {
        return;
    }

    if (isLoggingEnabled())
    {
        logBlank(level || 1);
        log(logPad + "*done* " + msg, level || 1, LogColor.cyan);
    }
}


export function log(msg: string, level?: number, logPad = "", color?: LogColor)
{
    if (msg === null || msg === undefined) {
        return;
    }

    if (isLoggingEnabled())
    {
        // if (color) {
        //     msg = color + msg + LogColor.white;
        // }
        const tsMsg = new Date().toISOString().replace(/[TZ]/g, " ") + logPad + msg;
        if (logOutputChannel && (!level || level <= configuration.get<number>("debugLevel"))) {
            logOutputChannel.appendLine(tsMsg);
        }
        if (writeToConsole === true) {
            if (!level || level <= writeToConsoleLevel) {
                console.log(tsMsg);
            }
        }
    }
}


export function logBlank(level?: number)
{
    log("", level);
}


export function logError(msg: string | string[])
{
    if (!msg === null || msg === undefined) {
        return;
    }

    if (isLoggingEnabled())
    {
        log("***");
        if (typeof msg === "string") {
            log("*** " + msg);
        }
        else {
            for (const m of msg) {
                log("*** " + m);
            }
        }
        log("***");
    }
}


function logUserDataEnv(padding = "")
{
    if (isLoggingEnabled())
    {
        logValue(padding + "os", process.platform, 1);
        logValue(padding + "portable", process.env.VSCODE_PORTABLE, 1);
        logValue(padding + "env:VSCODE_APPDATA", process.env.VSCODE_APPDATA, 1);
        logValue(padding + "env:VSCODE_APPDATA", process.env.APPDATA, 1);
        logValue(padding + "env:VSCODE_APPDATA", process.env.USERPROFILE, 1);
        if (process.platform === "linux") {
            logValue("env:XDG_CONFIG_HOME", process.env.XDG_CONFIG_HOME, 1);
        }
    }
}


export function logValue(msg: string, value: any, level?: number, logPad = "")
{
    if (isLoggingEnabled())
    {
        let logMsg = msg;
        const spaces = msg && msg.length ? msg.length : (value === undefined ? 9 : 4);
        for (let i = spaces; i < logValueWhiteSpace; i++) {
            logMsg += " ";
        }

        if (value || value === 0 || value === "" || value === false) {
            logMsg += ": ";
            logMsg += value.toString();
        }
        else if (value === undefined) {
            logMsg += ": undefined";
        }
        else if (value === null) {
            logMsg += ": null";
        }

        log(logMsg, level, logPad);
    }
}


export function logValues(level: number, logPad: string, params: any | [string, any][])
{
    if (params === null || params === undefined || params.length === 0) {
        return;
    }

    if (isLoggingEnabled())
    {
        for (const [ n, v] of params) {
            logValue(n, v, level, logPad);
        }
    }
}


export function pathExists(path: string)
{
    try {
        fs.accessSync(path);
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


export function properCase(name: string)
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


export async function readFile(file: string): Promise<string>
{
    return new Promise<string>((resolve, reject) => {
        fs.readFile(file, (err, data) => {
            if (err) {
                reject(err);
            }
            resolve(data ? data.toString() : "");
        });
    });
}


export function readFileSync(file: string)
{
    const buf = fs.readFileSync(file);
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


export function setWriteToConsole(set: boolean, level = 2)
{
    writeToConsole = set;
    writeToConsoleLevel = level;
}


export function sortMapByKey(map: Map<string, any>)
{
    map = new Map([...map].sort((a: [ string, any], b: [ string, any]) =>
    {
        return a[0]?.localeCompare(b[0].toString());
    }));
}


export function timeout(ms: number)
{
    return new Promise(resolve => setTimeout(resolve, ms));
}
