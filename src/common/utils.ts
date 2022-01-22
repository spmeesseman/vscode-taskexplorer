/* eslint-disable prefer-arrow/prefer-arrow-functions */

import { RelativePattern, WorkspaceFolder, Uri, workspace } from "vscode";
import * as fs from "fs";
import * as minimatch from "minimatch";
import { configuration } from "./configuration";
import constants from "./constants";
import * as path from "path";
import * as os from "os";
import * as log from "./log";


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


export function getCwd(uri: Uri): string
{
    return uri.fsPath.substring(0, uri.fsPath.lastIndexOf(path.sep) + 1);
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
    let multiFilePattern = "{**/node_modules/**,**/work/**";
    const excludes: string[] = configuration.get("exclude");

    if (excludes && excludes.length > 0)
    {
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
    }
    multiFilePattern += "}";

    return new RelativePattern(folder, multiFilePattern);
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
        "ant", "app-publisher", "bash", "batch", "gradle", "grunt", "gulp", "make",
        "maven", "npm", "nsis", "perl", "powershell", "python", "pipenv", "ruby", "workspace"
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


export function getUserDataPath(padding = "")
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
        userPath = getDefaultUserDataPath();
    }
    userPath = path.resolve(userPath);
    log.value(padding + "user path is", userPath, 1);
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


export function getGlobPattern(taskType: string): string
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
    return "*/**";
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
