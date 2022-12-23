/* eslint-disable prefer-arrow/prefer-arrow-functions */

import { configuration } from "./configuration";
import { OutputChannel, ExtensionContext, commands, window } from "vscode";
import { writeFileSync } from "fs";
import { isArray, isObject, isString } from "./utils";
import G = require("glob");


// export enum LogColor
// {
//     black = "\\u001b[30m",
//     red = "\\u001b[31",
//     green = "\\u001b[32m",
//     yellow = "\\u001b[33m",
//     blue = "\\u001b[34m", // "<span style=\"color:blue\">"  "</style>"
//     magenta = "\\u001b[35",
//     cyan = "\\u001b[36m",
//     white = "\\u001b[37m"
// }


const logValueWhiteSpace = 40;
let writeToConsole = false;
let writeToConsoleLevel = 2;
let writeToFile = false;
let writeToFileLevel = 2;
let lastWriteWasBlank = false;
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


export function methodStart(msg: string, level?: number, logPad = "", doLogBlank?: boolean, params?: (string|any)[][]) // , color?: LogColor)
{
    if (isLoggingEnabled())
    {
        const lLevel = level || 1;
        if (doLogBlank === true) {
            blank(lLevel);
        }
        write(logPad + "*start* " + msg, lLevel); // , color);
        values(lLevel, logPad + "   ", params);
    }
}


export function methodDone(msg: string, level?: number, logPad = "", doLogBlank?: boolean, params?: (string|any)[][])
{
    if (isLoggingEnabled())
    {
        const lLevel = level || 1;
        values(lLevel, logPad + "   ", params, doLogBlank);
        write("*done* " + msg, lLevel, logPad); // , LogColor.cyan);
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
        let logMsg = msg,
            valuePad = "";
        const spaces = msg && msg.length ? msg.length : (value === undefined ? 9 : 4);
        for (let i = spaces; i < logValueWhiteSpace; i++) {
            valuePad += " ";
        }
        logMsg += (valuePad + ": ");

        if (isString(value))
        {
            logMsg += value;
        }
        else if (isArray(value))
        {
            logMsg += `: [ ${value.join(", ")} ]`;
        }
        else if (isObject(value))
        {
            let objectString;
            try {
                objectString = JSON.stringify(value, null, 3);
            }
            catch {
                objectString = value.toString();
            }
            logMsg += `\n${objectString}`;
        }
        else if (value || value === 0 || value === "" || value === false)
        {
            logMsg += value.toString();
        }
        else if (value === undefined)
        {
            logMsg += "undefined";
        }
        else {
            logMsg += "null";
        }

        if (logMsg.includes("\n")) {
            logMsg = logMsg.replace(/\n/g, `\n${valuePad}  ` + msg.replace(/\W\w/g, " "));
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
        if (params) {
            for (const [ n, v ] of params) {
                value(n, v, level, logPad);
            }
        }
    }
}


export function write(msg: string, level?: number, logPad = "") // , color?: LogColor)
{
    if (msg === null || msg === undefined || (lastWriteWasBlank && msg === "")) {
        return;
    }

    if (isLoggingEnabled())
    {
        // if (color) {
        //     msg = color + msg + LogColor.white;
        // }
        const ts = new Date().toISOString().replace(/[TZ]/g, " ");

        const _write = (fn: (...fnArgs: any) => void, scope: any, ...args: any) =>
        {
            const msgs = msg.split("\n");
            for (const m of msgs)
            {
                if (args && args.length > 0) {
                    fn.call(scope || window, ...args, ts + logPad + m.trimEnd());
                }
                else {
                    fn.call(scope || window, ts + logPad + m.trimEnd());
                }
            }
        };

        if (logOutputChannel && (!level || level <= (configuration.get<number>("debugLevel") || -1))) {
            _write(logOutputChannel.appendLine, logOutputChannel);
        }
        if (writeToConsole) {
            if (!level || level <= writeToConsoleLevel) {
                _write(console.log, console);
            }
        }
        if (writeToFile) {
            if (!level || level <= writeToFileLevel) {
                _write(writeFileSync, null, "taskexplorer.log");
            }
        }
        lastWriteWasBlank = msg === "";
    }
}
