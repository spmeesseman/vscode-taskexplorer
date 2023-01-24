
import * as readline from "readline";

let stdinInterface: readline.Interface | undefined;
let setFailed: () => void;


export const ctrlC = async(code: number|undefined) => onKey("", { name: "c", ctrl: true, code });


const onKey = async(str: string, key: any) =>
{
    if (key.meta) // alt
    {
        const k = key.name;
        if (k === "0" || k === "1" || k === "2" || k === "3" || k === "4" || k === "5")
        {
            // const lvl = parseInt(k, 10);
            // log.setLogLevel(lvl);
            // log.info(`Logging level set to level '${k}'`);
        }
    }
    else if (key.ctrl)
    {
        if (key.name === "c")
        {
            setFailed();
        }
    }
};


export const startInput = (setFailedFn: () => void) =>
{
    if (!stdinInterface && process.stdin.isTTY)
    {
        setFailed = setFailedFn;
        stdinInterface = readline.createInterface({ input: process.stdin, escapeCodeTimeout: 50 });
        process.stdin.setRawMode(true);
        readline.emitKeypressEvents(process.stdin, stdinInterface);
        process.stdin.on("keypress", onKey);
    }
};


export const stopInput = () =>
{
    if (stdinInterface)
    {
        process.stdin.off("keypress", onKey);
        stdinInterface.close();
        stdinInterface = undefined;
    }
};
