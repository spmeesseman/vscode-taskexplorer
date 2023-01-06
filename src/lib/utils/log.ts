/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */

import { appendFileSync } from "fs";
import { dirname, join } from "path";
import { createDir } from "./fs";
import { colors, LogColor } from "../../interface/logApi";
import { configuration } from "./configuration";
import { isArray, isError, isFunction, isObject, isString } from "./utils";
import { OutputChannel, ExtensionContext, commands, window, workspace, ConfigurationChangeEvent } from "vscode";
import figures from "../figures";

export interface IMsgQueueItem
{
    fn: any;
    args: any[];
    scope: any;
}

const logValueWhiteSpace = 45;
const msgQueue: { [queueId: string]:  IMsgQueueItem[] } = {};

let enable = false;
let enableFile = false;
let enableOutputWindow = false;
let fileName = "";
let isTests = false;
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
        write(figures.color.error, 0, "", queueId);
        const _writeErr = (err: any) =>
        {
            if (isString(err))
            {
                write(figures.color.error + " " + err, 0, "", queueId);
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
                else if (isFunction(err.toString)) {
                    write(figures.color.error + " " + err.toString(), 0, "", queueId);
                }
            }
            else if (isFunction(err.toString)) {
                write(figures.color.error + " " + err.toString(), 0, "", queueId);
            }
        };
        _writeErr(msg);
        if (params)
        {
            for (const [ n, v, l ] of params) {
                value(figures.color.error + "   " + n, v, 0, "", queueId);
            }
        }
        write(figures.color.error, 0, "", queueId);
    }
}


export async function initLog(settingGrpName: string, dispName: string, context: ExtensionContext, testsRunning: boolean)
{
    function showLogOutput(show: boolean)
    {
        if (logOutputChannel && show) {
            logOutputChannel.show();
        }
    }

    isTests = testsRunning;
    enable = configuration.get<boolean>("logging.enable", false);
    logLevel = configuration.get<number>("logging.level", 1);
    enableOutputWindow = configuration.get<boolean>("logging.enableOutputWindow", true);
    enableFile = configuration.get<boolean>("logging.enableFile", false);
    fileName = join(context.logUri.fsPath, getFileName());
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
    // showLogOutput(showLog || false);

    write("Log has been initialized", 1);
    logLogFileLocation();
}


function getFileName()
{
    const tzOffset = (new Date()).getTimezoneOffset() * 60000,
          locISOTime = (new Date(Date.now() - tzOffset)).toISOString().slice(0, -1).split("T")[0].replace(/[\-]/g, "");
    return `taskexplorer-${locISOTime}.log`;
}


export const getLogFileName = () => fileName;


export const isLoggingEnabled = () => enable;


function logLogFileLocation()
{
    if (enable && enableFile)
    {
        const writeToConsoleOrig = writeToConsole;
        const writeToOutputOrig = enableOutputWindow;
        enableOutputWindow = true;
        writeToConsole = false;
        write("*************************************************************************************", 1);
        write(" Log File: " + fileName);
        write("*************************************************************************************", 1);
        /* istanbul ignore else */
        if (isTests)
        {
            console.log(`    ${figures.color.pointer} ${withColor("*************************************************************************************", colors.grey)}`);
            console.log(`    ${figures.color.pointer} ${withColor(" Log File: " + fileName, colors.grey)}`);
            console.log(`    ${figures.color.pointer} ${withColor("*************************************************************************************", colors.grey)}`);
        }
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


export const withColor = (str: string, color: LogColor) =>
{
    return "\x1B[" + color[0] + "m" + str + "\x1B[" + color[1] + "m";
};


export function write(msg: string, level?: number, logPad = "", queueId?: string) // , color?: LogColor)
{
    if (msg === null || msg === undefined || (lastWriteWasBlank && msg === "")) {
        return;
    }

    if (enable)
    {
        const ts = new Date().toISOString().replace(/[TZ]/g, " ");

        const _write = (fn: (...fnArgs: any) => void, scope: any, isFile: boolean, ...args: any) =>
        {
            const msgs = msg.split("\n");
            for (const m of msgs)
            {
                const _msg = ts + logPad + m.trimEnd() + (isFile ? "\n" : "");
                if (args && args.length > 0) {
                    if (!queueId) {
                        fn.call(scope || window, ...args, _msg);
                    }
                    else {
                        if (!msgQueue[queueId]) msgQueue[queueId] = [];
                        msgQueue[queueId].push({
                            fn,
                            scope: scope || window,
                            args: [ ...args, _msg ]
                        });
                    }
                }
                else {
                    if (!queueId) {
                        fn.call(scope || window, _msg);
                    }
                    else {
                        if (!msgQueue[queueId]) msgQueue[queueId] = [];
                        msgQueue[queueId].push({
                            fn,
                            scope: scope || window,
                            args: [ _msg ]
                        });
                    }
                }
            }
        };

        if (enableOutputWindow && logOutputChannel && (!level || level <= (logLevel))) {
            _write(logOutputChannel.appendLine, logOutputChannel, false);
        }
        if (writeToConsole) {
            if (!level || level <= writeToConsoleLevel) {
                msg = withColor(msg, colors.grey);
                _write(console.log, console, false);
            }
        }
        if (enableFile) {
            if (!level || level <= logLevel) {
                _write(appendFileSync, null, true, fileName);
            }
        }
        lastWriteWasBlank = msg === "";
    }
}


function writeError(e: Error, queueId?: string)
{
    const currentWriteToConsole = writeToConsole;
    writeToConsole = true;
    write(figures.color.error + " " + e.name, 0, "", queueId);
    write(figures.color.error + " " + e.message, 0, "", queueId);
    if (e.stack) {
        const stackFmt = e.stack.replace(/\n/g, `\n${figures.color.error} `);
        write(figures.color.error + " " + stackFmt, 0, "", queueId);
    }
    writeToConsole = currentWriteToConsole;
}
