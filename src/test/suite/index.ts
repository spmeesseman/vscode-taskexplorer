/* eslint-disable prefer-arrow/prefer-arrow-functions */

import runConfig from "../runConfig";

//
// Linux: prevent a weird NPE when mocha on Linux requires the window size from the TTY
// Since we are not running in a tty environment, we just implement he method statically
//
if (process.platform === "linux")
{
    const tty = require("tty");
    if (!tty.getWindowSize)
    {
        tty.getWindowSize = (): number[] =>
        {
            return [ 80, 75 ];
        };
    }
}

export async function run(): Promise<void>
{
    const runCfg = await runConfig();

    const failures: number = await new Promise(resolve => runCfg.mocha.run(resolve));

    try {
        await runCfg.nyc.writeCoverageFile();
        //
        // Capture text-summary reporter's output and log it in console
        //
        console.log(await captureStdout(runCfg.nyc.report.bind(runCfg.nyc)));
    }
    catch (e) {
        console.log("!!!");
        console.log("!!! Error writing coverage file:");
        try {
            console.log("!!!    " + (e as any).toString());
        }catch {}
        console.log("!!!");
    }

    if (failures > 0)
    {
        throw new Error(`${failures} tests failed.`);
    }
}

async function captureStdout(fn: any)
{
    // eslint-disable-next-line prefer-const
    let w = process.stdout.write, buffer = "";
    process.stdout.write = (s: string) => { buffer = buffer + s; return true; };
    await fn();
    process.stdout.write = w;
    return buffer;
}