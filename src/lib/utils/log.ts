/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */

import * as json5 from "json5";
import figures from "../figures";
import { appendFileSync } from "fs";
import { dirname, join } from "path";
import { createDir } from "./fs";
import { configuration } from "./configuration";
import { isArray, isBoolean, isError, isFunction, isObject, isObjectEmpty, isString } from "./utils";
import { OutputChannel, ExtensionContext, commands, window, workspace, ConfigurationChangeEvent } from "vscode";
import { LogColor, LogColors } from "../../interface";

export interface IMsgQueueItem
{
    fn: any;
    args: any[];
    scope: any;
}

const colors = figures.colors;

const tzOffset = (new Date()).getTimezoneOffset() * 60000;
const logValueWhiteSpace = 45;
const msgQueue: { [queueId: string]:  IMsgQueueItem[] } = {};

let enable = false;
let enableFile = false;
let enableFileSymbols = false;
let enableOutputWindow = false;
let fileName = "";
let isTests = false;
let isTestsBlockScaryColors = false;
let lastErrorMesage: string[] = [];
let lastWriteWasBlank = false;
let lastWriteWasBlankError = false;
let lastWriteToConsoleWasBlank = false;
let logLevel = 1;
let logOutputChannel: OutputChannel | undefined;
let writeToConsole = false;
let writeToConsoleLevel = 2;


const blank = (level?: number, queueId?: string) =>
{
    write("", level, "", queueId);
};




const dequeue = (queueId: string) =>
{
    if (msgQueue[queueId])
    {
        msgQueue[queueId].forEach((l) =>
        {
            l.fn.call(l.scope, ...l.args);
        });
        delete msgQueue[queueId];
    }
};


/**
 * @param enable If `false`, set all log function to empty functions.  If `true`, apply all log functions
 */
const enableLog = (enable: boolean) =>
{
    Object.assign(logFunctions,
    {
        blank: enable ? blank : () => {},
        dequeue: enable ? dequeue : () => {},
        error: enable ? error : () => {},
        methodStart: enable ? methodStart : () => {},
        methodDone: enable ? methodDone : () => {},
        value: enable ? value : () => {},
        values: enable ? values : () => {},
        warn: enable ? warn : () => {},
        withColor: enable ? withColor : () => {},
        write: enable ? write : () => {}
    });
};


const error = (msg: any, params?: (string|any)[][], queueId?: string) => _error(msg, params, queueId);


const errorConsole = (msg: string, symbols: [ string, string ], queueId?: string) =>
{
    writeToConsole = true;
    enableFile = false;
    enableOutputWindow = false;
    write(symbols[0] + " " + msg, 0, "", queueId, false, true);
};


const errorFile = (msg: string, symbols: [ string, string ]) =>
{
    writeToConsole = false;
    enableFile = true;
    enableOutputWindow = false;
    if (enableFileSymbols) {
        write(symbols[1] + " " + msg, 0, "", undefined, false, true);
    }
    else if (msg) {
        write(msg, 0, "", undefined, false, true);
    }
};


const errorOutputWindow = (msg: string, symbols: [ string, string ]) =>
{
    writeToConsole = false;
    enableFile = false;
    enableOutputWindow = true;
    write(symbols[1] + " " + msg, 0, "", undefined, false, true);
};


const errorWriteLogs = (lMsg: string, fileOn: boolean, outWinOn: boolean, symbols: [ string, string ], queueId?: string) =>
{
    errorConsole(lMsg, symbols, queueId);
    if (fileOn) errorFile(lMsg, symbols);
    if (outWinOn) errorOutputWindow(lMsg, symbols);
};


const errorParse = (err: any, symbols: [ string, string ], queueId?: string, callCount = 0, accumulated: string[] = []) =>
{
    let eMsg: string | undefined;
    if (!err) {
        return accumulated;
    }
    /* istanbul ignore else */
    if (isString(err))
    {
        eMsg = err;
    }
    else if (isError(err))
    {
        /* istanbul ignore else */
        if (err.stack) {
            eMsg = err.stack;
        }
        else { eMsg = err.message; }
    }
    else if (isArray(err))
    {
        err.forEach((m: any) => errorParse(m, symbols, queueId, ++callCount, accumulated));
        return accumulated;
    }
    else if (isObject(err))
    {
        /* istanbul ignore else */
        if (err.messageX) {
            eMsg = err.messageX;
        }
        else if (err.message) {
            eMsg = err.message;
        }
        else if (isObjectEmpty(err)) {
            eMsg = "{} (empty object)";
        }
        else if (isFunction(err.toString)) {
            eMsg = err.toString();
        }
    }
    else if (err && isFunction(err.toString)) {
        eMsg = err.toString();
    }
    /* istanbul ignore else */
    if (eMsg)
    {
        accumulated.push(eMsg);
    }
    return accumulated;
};


const _error = (msg: any, params?: (string|any)[][], queueId?: string, symbols: [ string, string ] = [ "", "" ]) =>
{
    if (!msg) {
        return;
    }
    const currentWriteToConsole = writeToConsole;
    const currentWriteToFile = enableFile;
    const currentWriteToOutputWindow = enableOutputWindow;
    const errMsgs = errorParse(msg, symbols, queueId);
    if (!symbols || !symbols[0]) symbols = [ !isTests || !isTestsBlockScaryColors ? figures.color.error : figures.color.errorTests, figures.error ];

    if (lastErrorMesage[0] === errMsgs[0])
    {
        if (!isArray(msg)) {
            return;
        }
        if (errMsgs[1] === lastErrorMesage[1] && errMsgs.length === lastErrorMesage.length) {
            return;
        }
    }
    lastErrorMesage = errMsgs;

    if (!lastWriteWasBlankError && !lastWriteToConsoleWasBlank)
    {
        errorWriteLogs("", currentWriteToFile, currentWriteToOutputWindow, symbols, queueId);
    }

    errMsgs.forEach((m) => errorWriteLogs(m, currentWriteToFile, currentWriteToOutputWindow, symbols, queueId));

    if (params)
    {
        for (const [ n, v, l ] of params)
        {
            enableFile = false;
            writeToConsole = true;
            enableOutputWindow = false;
            value(symbols[0] + "   " + n, v, 0, "", queueId);
            if (currentWriteToFile)
            {
                enableFile = true;
                writeToConsole = false;
                enableOutputWindow = false;
                if (enableFileSymbols) {
                    value(symbols[1] + "   " + n, v, 0, "", queueId);
                }
                else {
                    value("   " + n, v, 0, "", queueId);
                }
            }
            if (currentWriteToOutputWindow)
            {
                enableFile = false;
                writeToConsole = false;
                enableOutputWindow = true;
                value(symbols[1] + "   " + n, v, 0, "", queueId);
            }
        }
    }

    errorWriteLogs("", currentWriteToFile, currentWriteToOutputWindow, symbols, queueId);

    writeToConsole = currentWriteToConsole;
    enableFile = currentWriteToFile;
    enableOutputWindow = currentWriteToOutputWindow;

    lastWriteWasBlank = true;
    lastWriteWasBlankError = true;
    lastWriteToConsoleWasBlank = true;
};


const initLog = async(context: ExtensionContext, testsRunning: number) =>
{
    function showLogOutput(show: boolean)
    {
        if (logOutputChannel && show) {
            logOutputChannel.show();
        }
    }

    isTests = testsRunning > 0;
    isTestsBlockScaryColors = testsRunning > 1;
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
    logOutputChannel = window.createOutputChannel("Task Explorer");
    context.subscriptions.push(logOutputChannel);
    context.subscriptions.push(
        commands.registerCommand("taskExplorer.showOutput", showLogOutput)
    );
    const d = workspace.onDidChangeConfiguration(async e => {
        await processConfigChanges(context, e);
    });
    context.subscriptions.push(d);
    // showLogOutput(showLog || false);

    //
    // If logging isn't enabled,then set all log function to empty functions
    //
    /* istanbul ignore else */
    if (!enable){
        enableLog(enable);
    }
    //
    // This function should only be called once, so blank it in the export
    //
    Object.assign(logFunctions,
    {
        initLog: /* istanbul ignore next */() => {},
    });

    write("Log has been initialized", 1);
    logLogFileLocation();
};


const getFileName = () =>
{
    const locISOTime = (new Date(Date.now() - tzOffset)).toISOString().slice(0, -1).split("T")[0].replace(/[\-]/g, "");
    return `taskexplorer-${locISOTime}.log`;
};


const getLogFileName = () => fileName;


const isLoggingEnabled = () => enable;


const logLogFileLocation = () =>
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
};


const methodStart = (msg: string, level?: number, logPad = "", doLogBlank?: boolean, params?: (string|any)[][], queueId?: string) =>
{
    const lLevel = level || 1;
    if (doLogBlank === true) {
        blank(lLevel, queueId);
    }
    write("*start* " + msg, lLevel, logPad, queueId); // , color);
    values(lLevel, logPad + "   ", params, queueId);
};


const methodDone = (msg: string, level?: number, logPad = "", params?: (string|any)[][], queueId?: string) =>
{
    const lLevel = level || 1;
    values(lLevel, logPad + "   ", params, queueId);
    write("*done* " + msg, lLevel, logPad, queueId); // , LogColor.cyan);
};


const processConfigChanges = (ctx: ExtensionContext, e: ConfigurationChangeEvent) =>
{
    if (e.affectsConfiguration("taskExplorer.logging.enable"))
    {
        enable = configuration.get<boolean>("logging.enable", false);
        enableLog(enable);
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
        logLevel = configuration.get<number>("logging.level", 1);
    }
};


const setWriteToConsole = (set: boolean, level = 2) =>
{
    writeToConsole = set;
    writeToConsoleLevel = level;
};


const value = (msg: string, value: any, level?: number, logPad = "", queueId?: string) =>
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
        logMsg += `[ ${value.join(", ")} ]`;
    }
    else if (isObject(value))
    {
        try {
            logMsg += json5.stringify(value, null, 3);
        }
        catch {
            /* istanbul ignore next */
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
};


const values = (level: number, logPad: string, params: any | (string|any)[][], queueId?: string) =>
{
    if (enable && params)
    {
        for (const [ n, v ] of params) {
            value(n, v, level, logPad, queueId);
        }
    }
};


const warn = (msg: any, params?: (string|any)[][], queueId?: string) =>
    _error(msg, params, queueId, [ !isTests || !isTestsBlockScaryColors ? figures.color.warning : figures.color.warningTests, figures.warning ]);


const withColor = figures.withColor;


const write = (msg: string, level?: number, logPad = "", queueId?: string, isValue?: boolean, isError?: boolean) =>
{
    if (msg === null || msg === undefined || (lastWriteWasBlank && msg === "")) {
        return;
    }

    const _write = (fn: (...fnArgs: any) => void, scope: any,  ts: string, isFile: boolean, ...args: any) =>
    {
        const msgs = msg.split("\n").filter(m => !!m.trim());
        let firstLineDone = false,
            valuePad = "";
        if (msgs.length > 1)
        {
            if (isValue)  {
                for (let i = 0; i < logValueWhiteSpace + 2; i++) {
                    valuePad += " ";
                }
            }
            else if (isError && /\[[0-9]{1,2}m/.test(msg))
            {   // \[[0-9]{1,2}m[\W]{1}\[[0-9]{1,2}m/.test(msg)
                for (let m = 1; m < msgs.length; m++) {
                    msgs[m] = (!isTests || !isTestsBlockScaryColors ? figures.color.error : figures.color.errorTests) + " " + msgs[m];
                }
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
                    fn.call(scope || /* istanbul ignore next */window, _msg);
                }
                else {
                    if (!msgQueue[queueId]) msgQueue[queueId] = [];
                    msgQueue[queueId].push({
                        fn,
                        scope: scope || /* istanbul ignore next */window,
                        args: [ _msg ]
                    });
                }
            }
            firstLineDone = true;
        }
    };

    const timeTags = (new Date(Date.now() - tzOffset)).toISOString().slice(0, -1).split("T");

    if (enableOutputWindow && logOutputChannel)
    {
        if (!level || level <= logLevel)
        {
            const ts = timeTags.join(" ") + " ";
            _write(logOutputChannel.appendLine, logOutputChannel, ts, false);
        }
    }
    if (writeToConsole)
    {
        if (!level || level <= writeToConsoleLevel || isError)
        {
            const ts = !isTests ? /* istanbul ignore next */timeTags[1] + " " + figures.pointer + " " : "    ";
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
                ts = timeTags[1]  + " " + figures.pointer + " ";
            }
            else {
                ts = timeTags[1]  + " ";
            }
            _write(appendFileSync, null, ts, true, fileName);
        }
    }

    lastWriteWasBlank = (msg === "");
    if (!isError) {
        lastErrorMesage = [];
        lastWriteWasBlankError = false;
        /* istanbul ignore else */
        if (isTests) {
            lastWriteToConsoleWasBlank = false;
        }
    }

};


const logFunctions =
{
    blank,
    colors,
    dequeue,
    enableLog,
    error,
    initLog,
    getLogFileName,
    isLoggingEnabled,
    methodStart,
    methodDone,
    setWriteToConsole,
    value,
    values,
    warn,
    withColor,
    write
};

export default logFunctions;
