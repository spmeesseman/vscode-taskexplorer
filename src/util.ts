
import {
    RelativePattern, WorkspaceFolder, OutputChannel, ExtensionContext,
    commands, window, Uri
} from "vscode";
import * as fs from "fs";
import * as minimatch from "minimatch";
import { configuration } from "./common/configuration";


const logValueWhiteSpace = 40;
let writeToConsole = false;
let writeToConsoleLevel = 2;
let logOutputChannel: OutputChannel | undefined;


export async function asyncForEach(array: any, callback: any)
{
    for (let index = 0; index < array.length; index++) {
        const result = await callback(array[index], index, array);
        if (result === false) {
            break;
        }
    }
}


export async function asyncMapForEach(map: any, callback: any)
{
    for (const entry of map.entries()) {
        const result = await callback(entry[1], entry[0], map);
        if (result === false) {
            break;
        }
    }
}


export function initLog(context: ExtensionContext, showOutput?: boolean)
{
    // Set up a log in the Output window
    //
    logOutputChannel = window.createOutputChannel("Task Explorer");
    context.subscriptions.push(logOutputChannel);
    context.subscriptions.push(commands.registerCommand("taskExplorer.showOutput", () => {
        if (logOutputChannel) { logOutputChannel.show();
    }}));
    const showOutputWin = showOutput || configuration.get<boolean>("showOutput");
    if (logOutputChannel && showOutputWin) {
        logOutputChannel.show();
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


export function getExcludesGlob(folder: string | WorkspaceFolder): RelativePattern
{
    let relativePattern = new RelativePattern(folder, "**/node_modules/**");
    const excludes: string[] = configuration.get("exclude");

    if (excludes && excludes.length > 0) {
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


export function timeout(ms: number)
{
    if (ms > 0) {
        return new Promise(resolve => setTimeout(resolve, ms));
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


export function setWriteToConsole(set: boolean, level = 2)
{
    writeToConsole = set;
    writeToConsoleLevel = level;
}


export async function log(msg: string, level?: number)
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


export async function logValue(msg: string, value: any, level?: number)
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
