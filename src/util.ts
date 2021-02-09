/* eslint-disable prefer-arrow/prefer-arrow-functions */

import {
    RelativePattern, WorkspaceFolder, OutputChannel, ExtensionContext,
    commands, window, Uri
} from "vscode";
import * as fs from "fs";
import * as minimatch from "minimatch";
import { configuration } from "./common/configuration";
import * as constants from "./common/constants";


const logValueWhiteSpace = 40;
let writeToConsole = false;
let writeToConsoleLevel = 2;
let logOutputChannel: OutputChannel | undefined;


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


export function existsInArray(arr: any[], item: any)
{
    let exists = false;
    if (arr) {
        arr.forEach(each => {
            if (item === each) {
                exists = true;
                return false;
            }
        });
    }

    return exists;
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
    let multiFilePattern = "";
    const includes: string[] = configuration.get("includeAnt");
    if (includes && includes.length > 0)
    {
        multiFilePattern = "{" + constants.GLOB_ANT;
        if (Array.isArray(includes))
        {
            for (const i in includes) {
                multiFilePattern += ",";
                multiFilePattern += includes[i];
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
            for (const i in excludes) {
                multiFilePattern += ",";
                multiFilePattern += excludes[i];
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


export function isExcluded(uriPath: string, logPad = "")
{
    function testForExclusionPattern(path: string, pattern: string): boolean
    {
        return minimatch(path, pattern, { dot: true, nocase: true });
    }

    const exclude = configuration.get<string | string[]>("exclude");

    log("", 2);
    log(logPad + "Check exclusion", 2);
    logValue(logPad + "   path", uriPath, 2);

    if (exclude)
    {
        if (Array.isArray(exclude))
        {
            for (const pattern of exclude) {
                logValue(logPad + "   checking pattern", pattern, 3);
                if (testForExclusionPattern(uriPath, pattern)) {
                    log(logPad + "   Excluded!", 2);
                    return true;
                }
            }
        }
        else {
            logValue(logPad + "   checking pattern", exclude, 3);
            if (testForExclusionPattern(uriPath, exclude)) {
              log(logPad + "   Excluded!", 2);
              return true;
            }
        }
    }

    log(logPad + "   Not excluded", 2);
    return false;
}


export function isScriptType(source: string)
{
    return source === "bash" || source === "batch" || source === "nsis" || source === "perl" ||
           source === "powershell" || source === "python" || source === "ruby";
}


export function log(msg: string, level?: number)
{
    if (msg === null || msg === undefined) {
        return;
    }

    if (configuration.get("debug") === true)
    {
        if (logOutputChannel && (!level || level <= configuration.get<number>("debugLevel"))) {
            logOutputChannel.appendLine(msg);
        }
        if (writeToConsole === true) {
            if (!level || level <= writeToConsoleLevel) {
                console.log(msg);
            }
        }
    }
}


export function logBlank(level?: number)
{
    log("", level);
}


export async function logError(msg: string | string[])
{
    if (!msg === null || msg === undefined) {
        return;
    }
    log("***");
    if (msg instanceof String) {
        log("*** " + msg);
    }
    else {
        await forEachAsync(msg, (m: string) => {
            log("*** " + m);
        });
    }
    log("***");
}


export function logValue(msg: string, value: any, level?: number)
{
    let logMsg = msg;
    const spaces = msg && msg.length ? msg.length : (value === undefined ? 9 : 4);
    for (let i = spaces; i < logValueWhiteSpace; i++) {
        logMsg += " ";
    }

    if (value || value === 0 || value === "") {
        logMsg += ": ";
        logMsg += value.toString();
    }
    else if (value === undefined) {
        logMsg += ": undefined";
    }
    else if (value === null) {
        logMsg += ": null";
    }

    if (configuration.get("debug") === true) {
        if (logOutputChannel && (!level || level <= configuration.get<number>("debugLevel"))) {
            logOutputChannel.appendLine(logMsg);
        }
        if (writeToConsole === true) {
            if (!level || level <= writeToConsoleLevel) {
                console.log(logMsg);
            }
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

    arr.forEach(each => {
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


export function timeout(ms: number)
{
    return new Promise(resolve => setTimeout(resolve, ms));
}
