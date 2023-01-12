
import * as json5 from "json5";
import write from "./write";
import { logControl } from "./log";
import { isArray, isObject, isString } from "../utils/utils";


export const value = (msg: string, value: any, level?: number, logPad = "", queueId?: string) =>
{
    let logMsg = msg,
        valuePad = "";
    const spaces = msg && msg.length ? msg.length + logPad.length : (value === undefined ? 9 : 4);
    for (let i = spaces; i < logControl.logValueWhiteSpace; i++) {
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


export const values = (level: number, logPad: string, params: any | (string|any)[][], queueId?: string) =>
{
    if (logControl.enable && params)
    {
        for (const [ n, v ] of params) {
            value(n, v, level, logPad, queueId);
        }
    }
};
