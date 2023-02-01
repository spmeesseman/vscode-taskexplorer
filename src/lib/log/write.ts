/* eslint-disable @typescript-eslint/naming-convention */

import figures from "../figures";
import { logControl } from "./log";
import { appendFileSync } from "fs";
import { window } from "vscode"; // TODO - this is used as scope but thought browser 'window' duh
import { IDictionary } from "../../interface";

const colors = figures.colors;
// let lastWriteMsg: string | undefined;


// const shouldSkip = (msg: string) =>
// {
//     let should = msg === null || msg === undefined || (logControl.lastWriteWasBlank && msg === "");
//     if (!should && (msg.includes("***") || msg.includes("!!!")))
//     // if (!should && msg.replace(/(?:\[[0-9]{1,2}m|\[[0-9]{1,2}m[\W]{1}\[[0-9]{1,2}m)/g, "").trim().length <= 3)
//     {   // skip double '!!! ' and "*** " writes
//         should = msg === lastWriteMsg;
//         lastWriteMsg = msg;
//     }
//     return should;
// };

const moduleMap: IDictionary<string> =
{
    TaskTreeDataProvider: "TREE"
};

const getStamp = () =>
{
    const timeTags = (new Date(Date.now() - logControl.tzOffset)).toISOString().slice(0, -1).split("T");

    const info = {
        tag: "",
        stamp: timeTags.join(" "),
        stampDate: timeTags[0],
        stampTime: timeTags[1]
    };

    if (logControl.useTags)
    {
        const err = new Error();
        /* istanbul ignore else*/
        if (err.stack)
        {
            let stackline = "";
            const errStackLines = err.stack.split("\n");
            for (const l in errStackLines)
            {
                if (!/(?:Error| (?:Object\.)?(?:write|_?error|warn(?:ing)?|values?|method[DS]) )/.test(errStackLines[l]))
                {
                    stackline = errStackLines[l];
                    break;
                }
            }
            //
            // Stackline at this point will be something like:
            //
            //     at <anonymous> refresh (c:\\....\tree.js:line:col) // Dev / TS
            //
            //     at TaskTreeDataProvider.runLastTask (c:\\....\extension.js:1:col) // Prod / Webpack
            //     at TaskTreeDataProvider.<anonymous> (c:\\....\extension.js:1:col) // Prod / Webpack
            //
            info.tag = moduleMap[stackline.substring(stackline.indexOf("at ") + 3, stackline.lastIndexOf(" "))];
        }
    }

    return info;
};


/**
 * The "_write" function is the  "end-all" log function.  All logging calls eventually make it here.
 *
 * @private
 * @since 3.0.0
 *
 * @param msg The log message to write
 * @param logPad Left-side logmessage padding
 * @param queueId A queue ID that can be used to delay immediate log writes and later write them at
 * the same time (useful for async ops). Use `log.dequeue` to write all queued messages of a specified ID.
 * @param isValue This call is from `log.value` or `log.values`.
 * @param isError This call is from `log.error` or `log.warn`.
 * @param fn The logging function to use, i.e. 'console.log', 'outputChannel.appendLine', 'file.write', etc
 * @param scope Scope to call the logging function on. If empty, `vscode.window` is used.
 * @param ts The message timestamp
 * @param isFile This call is a file write.
 * @param args The function arguments to use in the `fn` call.  As of v3.0, the only caller to use this args
 * parameter is write() when file logging is enabled, and 'args' is the filename to be written.
 */
const _write = (msg: string, logPad: string, queueId: string | undefined, isValue: boolean, isError: boolean,
                fn: (...fnArgs: any) => void, scope: any,  ts: string, isFile: boolean, ...args: any) =>
{
    const msgs = msg.split("\n").filter(m => !!m.trim());
    let firstLineDone = false,
        valuePad = "";

    if (msgs.length > 1)
    {
        if (isValue)  {
            for (let i = 0; i < logControl.logValueWhiteSpace + 2; i++) {
                valuePad += " ";
            }
        }
        else if (isError && /\[[0-9]{1,2}m/.test(msg))
        {   //
            // Replace red error colors with something nicer while running tests, so I can stop having
            // small 500ms bursts of heartbeat drop and temporary anger while red errors flash in
            // front of my eyes.
            //
            // / \[[0-9]{1,2}m[\W]{1}\[[0-9]{1,2}m/.test(msg) // keep this, matches full symbol and will need someday guarantee it
            for (let m = 1; m < msgs.length; m++) {
                msgs[m] = (!logControl.isTests || !logControl.isTestsBlockScaryColors ? figures.color.error : figures.color.errorTests) + " " + msgs[m];
            }
        }
    }

    for (const m of msgs)
    {
        const _logPad = isValue && firstLineDone ? valuePad : logPad;
        const _msg = ts + " " + _logPad + m.trimEnd() + (isFile ? "\n" : "");
        if (args && args.length > 0)
        {
            if (!queueId) {
                fn.call(scope || window, ...args, _msg);
            }
            else {
                if (!logControl.msgQueue[queueId]) logControl.msgQueue[queueId] = [];
                logControl.msgQueue[queueId].push({
                    fn,
                    scope: scope || window,
                    args: [ ...args, _msg ]
                });
            }
        }
        else
        {
            if (!queueId) {
                fn.call(scope || /* istanbul ignore next */window, _msg);
            }
            else {
                if (!logControl.msgQueue[queueId]) logControl.msgQueue[queueId] = [];
                logControl.msgQueue[queueId].push({
                    fn,
                    scope: scope || /* istanbul ignore next */window,
                    args: [ _msg ]
                });
            }
        }
        firstLineDone = true;
    }
};


const write = (msg: string, level?: number, logPad = "", queueId?: string, isValue?: boolean, isError?: boolean) =>
{
    // if (shouldSkip(msg)) {
    if (msg === null || msg === undefined || (logControl.lastWriteWasBlank && msg === "")) {
        return;
    }

    //
    // VSCODE OUTPUT WINDOW LOGGING
    //
    if (logControl.enableOutputWindow && logControl.logOutputChannel && (!level || level <= logControl.logLevel))
    {
        const ts = getStamp().stamp + " ";
        _write(msg, logPad, queueId, !!isValue, !!isError, logControl.logOutputChannel.appendLine, logControl.logOutputChannel, ts, false);
    }

    //
    // CONSOLE LOGGING
    //
    if (logControl.writeToConsole && (!level || level <= logControl.writeToConsoleLevel || isError))
    {
        const ts = !logControl.isTests ? /* istanbul ignore next */getStamp().stampTime + " " + figures.pointer : "   ";
        msg = figures.withColor(msg, colors.grey);
        _write(msg, logPad, queueId, !!isValue, !!isError, console.log, console, ts, false);
        logControl.lastWriteToConsoleWasBlank = false;
    }

    //
    // FILE LOGGING
    //
    if (logControl.enableFile && (!level || level <= logControl.logLevel))
    {
        const ts = getStamp().stampTime + (logControl.enableFileSymbols ? " " + figures.pointer : "");
        _write(msg, logPad, queueId, !!isValue, !!isError, appendFileSync, null, ts, true, logControl.fileName);
    }

    //
    // PREVENT DUPLICATE MESSAGES FROM EXPLORER AND SIDEBAR VIEWS
    //
    logControl.lastWriteWasBlank = (msg === "");
    if (!isError)
    {
        logControl.lastErrorMesage = [];
        logControl.lastWriteWasBlankError = false;
        /* istanbul ignore else */
        if (logControl.isTests) {
            logControl.lastWriteToConsoleWasBlank = false;
        }
    }

};

export default write;
