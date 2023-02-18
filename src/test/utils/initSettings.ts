/* eslint-disable import/no-extraneous-dependencies */

import { testControl as tc } from "../control";
import { ConfigurationTarget, workspace } from "vscode";
import { IDictionary } from "@spmeesseman/vscode-taskexplorer-types";

const isArray = <T>(value: any): value is T[] => !!value && Array.isArray(value);
const isObject = (value: any): value is { [key: string]: any } => !!value && (value instanceof Object || typeof value === "object") && !isArray(value);

const withColor = (msg: string, color: LogColor) =>
{
    return "\x1B[" + color[0] + "m" + msg + "\x1B[" + color[1] + "m";
};

type LogColor = [ number, number ];

class LogColors
{
    grey: LogColor = [ 90, 39 ];
    magenta: LogColor = [ 35, 39 ];
};

const colors = new LogColors();

const color =
{
    info: withColor("ℹ", colors.magenta)
};


export const initSettings = async () =>
{
    const config = workspace.getConfiguration("taskexplorer");
    console.log(`    ${color.info} ${withColor("Initializing settings", colors.grey)}`);
    //
    // This function runs BEFORE the extension is initialized, so any updates have no immediate
    // effect.  All settings set here will get read on on extension activation, coming up next.
    //
    // Update- Actually - VSCode reads the default settings from package.json b4 the extension is
    // even activated.  Now creating a default config file in runTest.js, before VSCode is started.
    //
    // Create .vscode directory if it doesn't exist, so the we have perms to
    // remove it after tests are done
    //
    // 1/5/23 - Removed and added to runTest.ts, before VSCoe is launched. leaving here
    //          commented in case i realize i need it again, 'cause that never happens
    //
    // const dirNameCode = getWsPath(".vscode"),
    //       settingsFile = path.join(dirNameCode, "settings.json");
    //
    // if (await pathExists(settingsFile)) {
    //     settingsJsonOrig = await readFileAsync(settingsFile);
    // }
    // await writeFile(settingsFile, "{}");

    tc.user.logLevel = config.get<number>("logging.level", 1);
    if (!tc.log.enabled){
        tc.log.file = false;
        tc.log.output = false;
    }
    else if (!tc.log.output && !tc.log.file && !tc.log.console) {
        tc.log.output = true;
    }
    await config.update("logging.enable", tc.log.enabled, ConfigurationTarget.Workspace);
    await config.update("logging.level", tc.log.level, ConfigurationTarget.Workspace);
    await config.update("logging.enableFile", tc.log.file, ConfigurationTarget.Workspace);
    await config.update("logging.enableFileSymbols", tc.log.fileSymbols, ConfigurationTarget.Workspace);
    await config.update("logging.enableOutputWindow", tc.log.output, ConfigurationTarget.Workspace);

    //
    // Grunt / Gulp VSCode internal task providers. Gulp suite will disable when done.
    //
    await workspace.getConfiguration("grunt").update("autoDetect", "on", ConfigurationTarget.Global);
    await workspace.getConfiguration("gulp").update("autoDetect", "on", ConfigurationTarget.Global);

    if (tc.log.enabled)
    {
        const slowTimes = tc.slowTime as IDictionary<any>;
        // const waitTimes = tc.waitTime as IDictionary<number>;
        let factor = 1.01;
        if (tc.log.output) {
            factor += 0.026;
        }
        if (tc.log.file) {
            factor += 0.035;
        }
        if (tc.log.console) {
            factor += 0.051;
        }
        // Object.keys(waitTimes).forEach((k) =>
        // {
        //     waitTimes[k] = Math.round(waitTimes[k] * factor);
        // });
        Object.keys(slowTimes).forEach((k) =>
        {
            if (!isObject(slowTimes[k])) {
                slowTimes[k] = Math.round(slowTimes[k] * factor);
            }
            else {
                Object.keys(slowTimes[k]).forEach((k2) =>
                {
                    slowTimes[k][k2] = Math.round(slowTimes[k][k2] * factor);
                });
            }
        });

        const msg = `Logging is enabled (level ${tc.log.level}) [ File: ${tc.log.file} | Output Window: ${tc.log.output} | console: ${tc.log.console} ]`;
        console.log(`    ${color.info} ${withColor(msg, colors.grey)}`);
    }

    if (workspace.workspaceFolders && workspace.workspaceFolders.length > 1)
    {
        tc.isMultiRootWorkspace = true;
        tc.slowTime.wsFolder.add = 2000;
        tc.slowTime.wsFolder.reorder = 690;
    }

    const msg = `The test environment is a '${tc.isMultiRootWorkspace ? "multi-root" : "single-root"}' workspace`;
    console.log(`    ${color.info} ${withColor(msg, colors.grey)}`);
    console.log(`    ${color.info} ${withColor("Settings initialization completed", colors.grey)}`);
};


export const cleanupSettings = async() =>
{   //
    // Grunt / Gulp VSCode internal task providers. Gulp suite will disable when done.
    //
    await workspace.getConfiguration("grunt").update("autoDetect", "off", ConfigurationTarget.Global);
    await workspace.getConfiguration("gulp").update("autoDetect", "on", ConfigurationTarget.Global);
};
