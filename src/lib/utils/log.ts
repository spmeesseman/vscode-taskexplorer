/* eslint-disable prefer-arrow/prefer-arrow-functions */

import { configuration } from "./configuration";
import { OutputChannel, ExtensionContext, commands, window, workspace, ConfigurationChangeEvent } from "vscode";
import { appendFileSync } from "fs";
import { isArray, isError, isObject, isString } from "./utils";
import { dirname, join } from "path";
import { createDir } from "./fs";


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

export interface IMsgQueueItem
{
    fn: any;
    args: any[];
    scope: any;
}

const logValueWhiteSpace = 45;
const msgQueue: { [queueId: string]:  IMsgQueueItem[] } = {};

let enable= false;
let enableFile= false;
let enableOutputWindow= false;
let fileName= "";
let logLevel = -1;
let writeToConsole = false;
let writeToConsoleLevel = 2;
let lastWriteWasBlank = false;
let logOutputChannel: OutputChannel | undefined;


export function blank(level?: number, queueId?: string)
{
    write("", level, "", queueId);
}


export function dequeue(queueId: string)
{
    if (msgQueue[queueId])
    {
        msgQueue[queueId].forEach((l) =>
        {
            l.fn.call(l.scope, ...l.args);
        });
        delete msgQueue[queueId];
    }
}


export function error(msg: any, params?: (string|any)[][], queueId?: string)
{
    if (msg)
    {
        write("✘", 0, "", queueId);
        const _writeErr = (err: any) =>
        {
            if (isString(err))
            {
                write("✘ " + err, 0, "", queueId);
            }
            else if (isError(err))
            {
                writeError(err, queueId);
            }
            else if (isArray(err))
            {
                err.forEach((m: any) => _writeErr(m));
            }
            else if (isObject(err))
            {
                if (err.messageX) {
                    writeError(err.messageX, queueId);
                }
                else if (err.message) {
                    writeError(err.message, queueId);
                }
                else {
                    writeError(err.toString(), queueId);
                }
            }
            else {
                writeError(err.toString(), queueId);
            }
        };
        _writeErr(msg);
        if (params)
        {
            for (const [ n, v, l ] of params) {
                value("✘   " + n, v, 0, "", queueId);
            }
        }
        write("✘", 0, "", queueId);
    }
}


export async function initLog(settingGrpName: string, dispName: string, context: ExtensionContext, showLog?: boolean)
{
    function showLogOutput(show: boolean)
    {
        if (logOutputChannel && show) {
            logOutputChannel.show();
        }
    }

    enable = configuration.get<boolean>("logging.enable", false);
    logLevel = configuration.get<number>("logging.level", 1);
    enableOutputWindow = configuration.get<boolean>("logging.enableOutputWindow", true);
    enableFile = configuration.get<boolean>("logging.enableFile", false);
    fileName = join(context.logUri.fsPath, getLogFileName());
    await createDir(dirname(fileName));

    //
    // Set up a log in the Output window (even if enableOutputWindow is off)
    //
    logOutputChannel = window.createOutputChannel(dispName);
    context.subscriptions.push(logOutputChannel);
    context.subscriptions.push(
        commands.registerCommand(settingGrpName + ".showOutput", showLogOutput)
    );
    const d = workspace.onDidChangeConfiguration(async e => {
        await processConfigChanges(context, e);
    });
    context.subscriptions.push(d);
    showLogOutput(showLog || false);

    write("Log has beeninitialized", 1);
    logLogFileLocation();
}


// export function getAbsLogFilePath()
// {
//     return fileName;
// }


function getLogFileName()
{
    const tzOffset = (new Date()).getTimezoneOffset() * 60000, //offset in milliseconds
          locISOTime = (new Date(Date.now() - tzOffset)).toISOString().slice(0, -1).split("T")[0].replace(/[\-]/g, "");
    return `taskexplorer-${locISOTime}.log`;
}


export function isLoggingEnabled()
{
    return enable;
}


function logLogFileLocation()
{
    if (enable && enableFile)
    {
        const writeToConsoleOrig = writeToConsole;
        const writeToOutputOrig = enableOutputWindow;
        enableOutputWindow = true;
        writeToConsole = true;
        write("*************************************************************************************", 1);
        write(" Log File: " + fileName);
        write("*************************************************************************************", 1);
        enableOutputWindow = writeToOutputOrig;
        writeToConsole = writeToConsoleOrig;
    }
}


export function methodStart(msg: string, level?: number, logPad = "", doLogBlank?: boolean, params?: (string|any)[][], queueId?: string) // , color?: LogColor)
{
    if (enable)
    {
        const lLevel = level || 1;
        if (doLogBlank === true) {
            blank(lLevel, queueId);
        }
        write("*start* " + msg, lLevel, logPad, queueId); // , color);
        values(lLevel, logPad + "   ", params, false, queueId);
    }
}


export function methodDone(msg: string, level?: number, logPad = "", doLogBlank?: boolean, params?: (string|any)[][], queueId?: string)
{
    if (enable)
    {
        const lLevel = level || 1;
        values(lLevel, logPad + "   ", params, doLogBlank, queueId);
        write("*done* " + msg, lLevel, logPad, queueId); // , LogColor.cyan);
    }
}


async function processConfigChanges(ctx: ExtensionContext, e: ConfigurationChangeEvent)
{
    if (e.affectsConfiguration("taskExplorer.logging.enable"))
    {
        enable = configuration.get<boolean>("logging.enable", false);
    }
    if (e.affectsConfiguration("taskExplorer.logging.enableOutputWindow"))
    {
        enableOutputWindow = configuration.get<boolean>("logging.enableOutputWindow", true);
    }
    if (e.affectsConfiguration("taskExplorer.logging.enableFile"))
    {
        enableFile = configuration.get<boolean>("logging.enableFile", false);
        logLogFileLocation();
        if (enableFile) {
            window.showInformationMessage("Log file location: " + fileName);
        }
    }
    if (e.affectsConfiguration("taskExplorer.logging.level"))
    {
        logLevel = configuration.get<number>("logging.level", -1);
    }
}


export function setWriteToConsole(set: boolean, level = 2)
{
    writeToConsole = set;
    writeToConsoleLevel = level;
}


export function value(msg: string, value: any, level?: number, logPad = "", queueId?: string)
{
    if (enable)
    {
        let logMsg = msg,
            valuePad = "";
        const spaces = msg && msg.length ? msg.length + logPad.length : (value === undefined ? 9 : 4);
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
        write(logMsg, level, logPad, queueId);
    }
}


export function values(level: number, logPad: string, params: any | (string|any)[][], doLogBlank?: boolean, queueId?: string)
{
    if (enable)
    {
        if (doLogBlank === true) {
            blank(level, queueId);
        }
        if (params) {
            for (const [ n, v ] of params) {
                value(n, v, level, logPad, queueId);
            }
        }
    }
}


export function write(msg: string, level?: number, logPad = "", queueId?: string) // , color?: LogColor)
{
    if (msg === null || msg === undefined || (lastWriteWasBlank && msg === "")) {
        return;
    }

    if (enable)
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
                    if (!queueId) {
                        fn.call(scope || window, ...args, ts + logPad + m.trimEnd());
                    }
                    else {
                        if (!msgQueue[queueId]) msgQueue[queueId] = [];
                        msgQueue[queueId].push({
                            fn,
                            scope: scope || window,
                            args: [ ...args, ts + logPad + m.trimEnd() ]
                        });
                    }
                }
                else {
                    if (!queueId) {
                        fn.call(scope || window, ts + logPad + m.trimEnd());
                    }
                    else {
                        if (!msgQueue[queueId]) msgQueue[queueId] = [];
                        msgQueue[queueId].push({
                            fn,
                            scope: scope || window,
                            args: [ ts + logPad + m.trimEnd() ]
                        });
                    }
                }
            }
        };

        if (enableOutputWindow && logOutputChannel && (!level || level <= (logLevel))) {
            _write(logOutputChannel.appendLine, logOutputChannel);
        }
        if (writeToConsole) {
            if (!level || level <= writeToConsoleLevel) {
                _write(console.log, console);
            }
        }
        if (enableFile) {
            if (!level || level <= logLevel) {
                _write(appendFileSync, null, fileName);
            }
        }
        lastWriteWasBlank = msg === "";
    }
}


function writeError(e: Error, queueId?: string)
{
    const currentWriteToConsole = writeToConsole;
    writeToConsole = true;
    write("✘ " + e.name, 0, "", queueId);
    write("✘ " + e.message, 0, "", queueId);
    if (e.stack) {
        const stackFmt = e.stack.replace(/\n/g, "\n✘ ");
        write("✘ " + stackFmt, 0, "", queueId);
    }
    writeToConsole = currentWriteToConsole;
}
