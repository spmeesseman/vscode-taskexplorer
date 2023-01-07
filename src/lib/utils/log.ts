/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */

import figures from "../figures";
import { appendFileSync } from "fs";
import { dirname, join } from "path";
import { createDir } from "./fs";
import { configuration } from "./configuration";
import { isArray, isError, isFunction, isObject, isObjectEmpty, isString } from "./utils";
import { OutputChannel, ExtensionContext, commands, window, workspace, ConfigurationChangeEvent } from "vscode";

export interface IMsgQueueItem
{
    fn: any;
    args: any[];
    scope: any;
}

const tzOffset = (new Date()).getTimezoneOffset() * 60000;
const logValueWhiteSpace = 45;
const msgQueue: { [queueId: string]:  IMsgQueueItem[] } = {};

let enable = false;
let enableFile = false;
let enableFileSymbols = false;
let enableOutputWindow = false;
let fileName = "";
let isTests = false;
let logLevel = -1;
let writeToConsole = false;
let writeToConsoleLevel = 2;
let lastErrorMesage = "";
let lastWriteWasBlank = false;
let lastWriteWasBlankError = false;
let lastWriteToConsoleWasBlank = false;
let logOutputChannel: OutputChannel | undefined;


export function blank(level?: number, queueId?: string)
{
    write("", level, "", queueId);
}


export const colors = figures.colors;


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
    _error(msg, params, queueId);
}


function _error(msg: any, params?: (string|any)[][], queueId?: string, symbols: [ string, string ] = [ "", "" ])
{
    if (msg)
    {
        const sym = symbols[0] || figures.color.error;
        const sym2 = symbols[1] || figures.error;
        const _writeErr = (e: Error | undefined, figure: string, queueId?: string) =>
        {
            if (e) {
                if (e.stack) {
                    const stackFmt = e.stack.replace(/\n\n/g, "\n").replace(/\n/g, `\n${figure} `);
                    write((figure ? figure + " " : "") + stackFmt, 0, "", queueId, false, true);
                }
                else if (e.message) {
                    write((figure ? figure + " " : "") + e.message.trimEnd(), 0, "", queueId, false, true);
                }
            }
        };
        const _write = (err: any, wto: boolean, wtf: boolean) =>
        {
            if (err !== "" || !isTests) {
                writeToConsole = true;
                enableFile = false;
                enableOutputWindow = false;
                write(sym + (err ? " " : "") + (err || ""), 0, "", undefined, false, true);
            }
            writeToConsole = false;
            enableFile = wtf;
            if (enableFile && !enableFileSymbols) {
                write(err, 0, "", undefined, false, true);
                enableFile = false;
            }
            enableOutputWindow = wto;
            write(sym2 + (err ? " " : "") + (err || ""), 0, "", queueId, false, true);
        };
        const _write2 = (err: any, wto: boolean, wtf: boolean) =>
        {
            writeToConsole = true;
            enableFile = false;
            enableOutputWindow = false;
            _writeErr(err, sym);
            writeToConsole = false;
            enableOutputWindow = wto;
            if (enableFileSymbols) {
                enableFile = wtf;
            }
            _writeErr(err, sym2, queueId);
            if (!enableFileSymbols) {
                enableFile = wtf;
                _writeErr(err, "");
            }
        };
        const _writeError = (err: any, wto: boolean, wtf: boolean) =>
        {
            if (!err) {
                return;
            }
            if (isString(err))
            {
                _write(err, wto, wtf);
                lastErrorMesage = err;
            }
            else if (isError(err))
            {
                _write2(err, wto, wtf);
            }
            else if (isArray(err))
            {
                err.forEach((m: any) => _writeError(m, wto, wtf));
            }
            else if (isObject(err))
            {
                if (err.messageX) {
                    _write2(err.messageX, wto, wtf);
                }
                else if (err.message) {
                    _write2(err.message, wto, wtf);
                }
                else if (isObjectEmpty(err)) {
                    _write(sym + "{} (empty object)", wto, wtf);
                }
                else if (isFunction(err.toString)) {
                    _write(err.toString(), wto, wtf);
                    lastErrorMesage = err.toString();
                }
            }
            else if (err && isFunction(err.toString)) {
                _write(err.toString(), wto, wtf);
                lastErrorMesage = err.toString();
            }
        };
        if (lastErrorMesage !== msg)
        {
            const currentWriteToConsole = writeToConsole;
            const currentWriteToFile = enableFile;
            const currentWriteToOutputWindow = enableOutputWindow;
            writeToConsole = true;
            if (!lastWriteWasBlankError && !lastWriteToConsoleWasBlank) {
                _write("", currentWriteToOutputWindow, currentWriteToFile);
            }
            _writeError(msg, currentWriteToOutputWindow, currentWriteToFile);
            if (params) {
                for (const [ n, v, l ] of params) {
                    value(sym + "   " + n, v, 0, "", queueId);
                }
            }
            _write("", currentWriteToOutputWindow, currentWriteToFile);
            // const isBlankError = /\[[0-9]{1,2}m[\W]{1}\[[0-9]{1,2}m/.test(msg);
            lastWriteWasBlank = true;
            lastWriteWasBlankError = true;
            lastWriteToConsoleWasBlank = true;
            writeToConsole = currentWriteToConsole;
            enableFile = currentWriteToFile;
            enableOutputWindow = currentWriteToOutputWindow;
        }
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
    enableFileSymbols = configuration.get<boolean>("logging.enableFileSymbols", true);
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
    const locISOTime = (new Date(Date.now() - tzOffset)).toISOString().slice(0, -1).split("T")[0].replace(/[\-]/g, "");
    return `taskexplorer-${locISOTime}.log`;
}


export const getLogFileName = () => fileName;


export const isLoggingEnabled = () => enable;


function logLogFileLocation()
{
    if (enable && enableFile)
    {
        /* istanbul ignore else */
        if (logOutputChannel)
        {
            logOutputChannel.appendLine("***********************************************************************************************");
            logOutputChannel.appendLine(" Log File: " + fileName);
            logOutputChannel.appendLine("***********************************************************************************************");
        }
        /* istanbul ignore else */
        if (isTests)
        {
            console.log(`    ${figures.color.info} ${withColor("*************************************************************************************", colors.grey)}`);
            console.log(`    ${figures.color.info} ${withColor(" Log File: " + fileName, colors.grey)}`);
            console.log(`    ${figures.color.info} ${withColor("*************************************************************************************", colors.grey)}`);
        }
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
    if (e.affectsConfiguration("taskExplorer.logging.enableFileSymbols"))
    {
        enableFileSymbols = configuration.get<boolean>("logging.enableFileSymbols", true);
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
            try {
                logMsg += JSON.stringify(value, null, 3);
            }
            catch {
                logMsg += value.toString();
            }
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

        write(logMsg, level, logPad, queueId, true);
    }
}


export function values(level: number, logPad: string, params: any | (string|any)[][], doLogBlank?: boolean, queueId?: string)
{
    if (enable && params)
    {
        if (doLogBlank === true) {
            blank(level, queueId);
        }
        for (const [ n, v ] of params) {
            value(n, v, level, logPad, queueId);
        }
    }
}


export const warn = (msg: any, params?: (string|any)[][], queueId?: string) => _error(msg, params, queueId, [ figures.color.warning, figures.warning ]);


export const withColor = figures.withColor;


export function write(msg: string, level?: number, logPad = "", queueId?: string, isValue?: boolean, isError?: boolean) // , color?: LogColor)
{
    if (msg === null || msg === undefined || (lastWriteWasBlank && msg === "")) {
        return;
    }

    if (enable)
    {
        const _write = (fn: (...fnArgs: any) => void, scope: any,  ts: string, isFile: boolean, ...args: any) =>
        {
            const msgs = msg.split("\n").filter(m => !!m.trim());
            let firstLineDone = false,
                valuePad = "";
            if (isValue && msgs.length > 1)  {
                for (let i = 0; i < logValueWhiteSpace + 2; i++) {
                    valuePad += " ";
                }
            }
            for (const m of msgs)
            {
                const _logPad = isValue && firstLineDone ? valuePad : logPad;
                const _msg = ts + _logPad + m.trimEnd() + (isFile ? "\n" : "");
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
                firstLineDone = true;
            }
        };

        const timeTags = (new Date(Date.now() - tzOffset)).toISOString().slice(0, -1).split("T");
        if (enableOutputWindow && logOutputChannel && (!level || level <= (logLevel)))
        {
            const ts = !isError || !isTests ? timeTags.join(" ") + " " : "    ";
            _write(logOutputChannel.appendLine, logOutputChannel, ts, false);
        }
        if (writeToConsole)
        {
            if (!level || level <= writeToConsoleLevel)
            {
                const ts = !isError || !isTests ? timeTags[1] + " " + figures.pointer + " " : "    ";
                msg = withColor(msg, colors.grey);
                _write(console.log, console, ts, false);
                lastWriteToConsoleWasBlank = false;
            }
        }
        if (enableFile)
        {
            if (!level || level <= logLevel)
            {
                let ts;
                if (enableFileSymbols) {
                    ts = !isError || !isTests ? timeTags[1]  + " " + figures.pointer + " " : "    ";
                }
                else {
                    ts = !isError || !isTests ? timeTags[1]  + " " : "    ";
                }
                _write(appendFileSync, null, ts, true, fileName);
            }
        }

        lastWriteWasBlank = (msg === "");
        lastWriteToConsoleWasBlank = lastWriteWasBlank;
        if (!isError) {
            lastErrorMesage = "";
            lastWriteWasBlankError = false;
        }
    }
}
