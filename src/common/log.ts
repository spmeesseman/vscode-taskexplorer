/* eslint-disable prefer-arrow/prefer-arrow-functions */

import { configuration } from "./configuration";
import { OutputChannel, ExtensionContext, commands, window } from "vscode";
import { writeFileSync } from "fs";



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
let writeToFile = false;
let writeToFileLevel = 2;
let logOutputChannel: OutputChannel | undefined;


export function blank(level?: number)
{
    write("", level);
}


function writeError(e: Error)
{
    const currentWriteToConsole = writeToConsole;
    writeToConsole = true;
    write("✘ " + e.name);
    write("✘ " + e.message);
    if (e.stack) {
        const stackFmt = e.stack.replace(/\n/g, "\n                        ✘ ");
        write("✘ " + stackFmt);
    }
    writeToConsole = currentWriteToConsole;
}


export function error(msg: string | (string|Error)[] | Error, params?: (string|any)[][])
{
    write("✘");
    if (typeof msg === "string") {
        write("✘ " + msg);
    }
    else if (msg instanceof Error) {
        writeError(msg);
    }
    else {
        msg.forEach((m: string | Error) => {
            if (m instanceof Error) {
                writeError(m);
            }
            else {
                write("✘ " + m);
            }
        });
    }
    if (params)
    {
        for (const [ n, v, l ] of params) {
            value("✘   " + n, v);
        }
    }
    write("✘");
}


export function initLog(settingGrpName: string, dispName: string, context: ExtensionContext, showLog?: boolean)
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
    context.subscriptions.push(logOutputChannel);
    context.subscriptions.push(
        commands.registerCommand(settingGrpName + ".showOutput", showLogOutput)
    );
    showLogOutput(showLog || false);
}


export function isLoggingEnabled()
{
    return configuration.get("debug") === true;
}


export function methodStart(msg: string, level?: number, logPad = "", doLogBlank?: boolean, params?: (string|any)[][], color?: LogColor)
{
    if (isLoggingEnabled())
    {
        const lLevel = level || 1;
        if (doLogBlank === true) {
            blank(lLevel);
        }
        write(logPad + "*start* " + msg, lLevel, color);
        if (params)
        {
            for (const [ n, v] of params) {
                value(logPad + "   " + n, v, lLevel + 1);
            }
        }
    }
}


export function methodDone(msg: string, level?: number, logPad = "", doLogBlank?: boolean, params?: (string|any)[][])
{
    if (isLoggingEnabled())
    {
        const lLevel = level || 1;
        if (doLogBlank === true) {
            blank(lLevel);
        }
        if (params)
        {
            for (const [ n, v] of params) {
                value(logPad + "   " + n, v, lLevel + 1);
            }
        }
        write("*done* " + msg, lLevel, logPad, LogColor.cyan);
    }
}


export function setWriteToFile(set: boolean, level = 2)
{
    writeToFile = set;
    writeToFileLevel = level;
}

export function setWriteToConsole(set: boolean, level = 2)
{
    writeToConsole = set;
    writeToConsoleLevel = level;
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


export function write(msg: string, level?: number, logPad = "", color?: LogColor)
{
    if (isLoggingEnabled())
    {
        // if (color) {
        //     msg = color + msg + LogColor.white;
        // }
        const tsMsg = new Date().toISOString().replace(/[TZ]/g, " ") + logPad + msg;
        if (logOutputChannel && (!level || level <= (configuration.get<number>("debugLevel") || -1))) {
            logOutputChannel.appendLine(tsMsg);
        }
        if (writeToConsole) {
            if (!level || level <= writeToConsoleLevel) {
                console.log(tsMsg);
            }
        }
        if (writeToFile) {
            if (!level || level <= writeToFileLevel) {
                writeFileSync("taskexplorer.log", tsMsg);
            }
        }
    }
}
