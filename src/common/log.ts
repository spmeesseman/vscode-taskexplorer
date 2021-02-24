/* eslint-disable prefer-arrow/prefer-arrow-functions */

import { configuration } from "./configuration";
import { OutputChannel, ExtensionContext, commands, window } from "vscode";



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


const logValueWhiteSpace = 40;
let writeToConsole = false;
let writeToConsoleLevel = 2;
let logOutputChannel: OutputChannel | undefined;


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


export function isLoggingEnabled()
{
    return configuration.get("debug") === true;
}


export function methodStart(msg: string, level?: number, logPad = "", doLogBlank?: boolean, params?: [string, any][], color?: LogColor)
{
    if (msg === null || msg === undefined) {
        return;
    }

    if (isLoggingEnabled())
    {
        const lLevel = level || 1;
        if (doLogBlank === true) {
            blank(lLevel);
        }
        write(logPad + "*start* " + msg, lLevel, color);
        if (params) {
            for (const [ n, v] of params) {
                value(logPad + "   " + n, v, lLevel + 1);
            }
        }
    }
}


export function methodDone(msg: string, level?: number, logPad = "", doLogBlank?: boolean)
{
    if (msg === null || msg === undefined) {
        return;
    }

    if (isLoggingEnabled())
    {
        if (doLogBlank === true) {
            blank(level || 1);
        }
        write("*done* " + msg, level || 1, logPad, LogColor.cyan);
    }
}


export function write(msg: string, level?: number, logPad = "", color?: LogColor)
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
        if (writeToConsole) {
            if (!level || level <= writeToConsoleLevel) {
                console.log(tsMsg);
            }
        }
    }
}


export function blank(level?: number)
{
    write("", level);
}


export function error(msg: string | string[])
{
    if (!msg === null || msg === undefined) {
        return;
    }

    if (isLoggingEnabled())
    {
        write("***");
        if (typeof msg === "string") {
            write("*** " + msg);
        }
        else {
            for (const m of msg) {
                write("*** " + m);
            }
        }
        write("***");
    }
}


export function value(msg: string, value: any, level?: number, logPad = "")
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

        write(logMsg, level, logPad);
    }
}


export function values(level: number, logPad: string, params: any | (string|any)[][], doLogBlank?: boolean)
{
    if (params === null || params === undefined || params.length === 0) {
        return;
    }

    if (isLoggingEnabled())
    {
        if (doLogBlank === true) {
            blank(level);
        }
        for (const [ n, v] of params) {
            value(n, v, level, logPad);
        }
    }
}


export function setWriteToConsole(set: boolean, level = 2)
{
    writeToConsole = set;
    writeToConsoleLevel = level;
}
