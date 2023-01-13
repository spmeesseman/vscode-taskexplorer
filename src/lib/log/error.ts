
import figures from "../figures";
import write from "./write";
import { value } from "./value";
import { logControl } from "./log";
import { isArray, isError, isFunction, isObject, isObjectEmpty, isString } from "../utils/utils";

const colors = figures.colors;
let lastWriteMsg: string | undefined;


const error = (msg: any, params?: (string|any)[][], queueId?: string) => _error(msg, params, queueId);


const errorConsole = (msg: string, symbols: [ string, string ], queueId?: string) =>
{
    logControl.writeToConsole = true;
    logControl.enableFile = false;
    logControl.enableOutputWindow = false;
    if (!logControl.isTestsBlockScaryColors) {
        write(symbols[0] + " " + msg, 0, "", queueId, false, true);
    }
    else {
        write(figures.withColor(symbols[0] + " " + msg, colors.grey), 0, "", queueId, false, true);
    }
};


const errorFile = (msg: string, symbols: [ string, string ]) =>
{
    logControl.writeToConsole = false;
    logControl.enableFile = true;
    logControl.enableOutputWindow = false;
    if (logControl.enableFileSymbols) {
        write(symbols[1] + " " + msg, 0, "", undefined, false, true);
    }
    else if (msg) {
        write(msg, 0, "", undefined, false, true);
    }
};


const errorOutputWindow = (msg: string, symbols: [ string, string ]) =>
{
    logControl.writeToConsole = false;
    logControl.enableFile = false;
    logControl.enableOutputWindow = true;
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


const shouldSkip = (msg: string) =>
{
    let should = !msg;
    if (!should && isString(msg) && msg.replace(/\[[0-9]{1,2}m/g, "").trim().length <= 3)
    {   // skip double '!!! ' and "*** " writes
        should = msg === lastWriteMsg;
        lastWriteMsg = msg;
    }
    return should;
};


export const _error = (msg: any, params?: (string|any)[][], queueId?: string, symbols: [ string, string ] = [ "", "" ]) =>
{
    if (shouldSkip(msg)) {
        return;
    }
    const currentWriteToConsole = logControl.writeToConsole;
    const currentWriteToFile = logControl.enableFile;
    const currentWriteToOutputWindow = logControl.enableOutputWindow;
    const errMsgs = errorParse(msg, symbols, queueId);
    if (!symbols || !symbols[0]) symbols = [ !logControl.isTests || !logControl.isTestsBlockScaryColors ? figures.color.error : figures.color.errorTests, figures.error ];

    if (logControl.lastErrorMesage[0] === errMsgs[0])
    {
        if (!isArray(msg)) {
            return;
        }
        if (errMsgs[1] === logControl.lastErrorMesage[1] && errMsgs.length === logControl.lastErrorMesage.length) {
            return;
        }
    }
    logControl.lastErrorMesage = errMsgs;

    if (!logControl.lastWriteWasBlankError && !logControl.lastWriteToConsoleWasBlank)
    {
        errorWriteLogs("", currentWriteToFile, currentWriteToOutputWindow, symbols, queueId);
    }

    errMsgs.forEach((m) => errorWriteLogs(m, currentWriteToFile, currentWriteToOutputWindow, symbols, queueId));

    if (params)
    {
        for (const [ n, v, l ] of params)
        {
            logControl.enableFile = false;
            logControl.writeToConsole = true;
            logControl.enableOutputWindow = false;
            value(symbols[0] + "   " + n, v, 0, "", queueId);
            if (currentWriteToFile)
            {
                logControl.enableFile = true;
                logControl.writeToConsole = false;
                logControl.enableOutputWindow = false;
                if (logControl.enableFileSymbols) {
                    value(symbols[1] + "   " + n, v, 0, "", queueId);
                }
                else {
                    value("   " + n, v, 0, "", queueId);
                }
            }
            if (currentWriteToOutputWindow)
            {
                logControl.enableFile = false;
                logControl.writeToConsole = false;
                logControl.enableOutputWindow = true;
                value(symbols[1] + "   " + n, v, 0, "", queueId);
            }
        }
    }

    errorWriteLogs("", currentWriteToFile, currentWriteToOutputWindow, symbols, queueId);

    logControl.writeToConsole = currentWriteToConsole;
    logControl.enableFile = currentWriteToFile;
    logControl.enableOutputWindow = currentWriteToOutputWindow;

    logControl.lastWriteWasBlank = true;
    logControl.lastWriteWasBlankError = true;
    logControl.lastWriteToConsoleWasBlank = true;
};

export default error;
