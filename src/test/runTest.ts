import { execSync } from "child_process";
import * as path from "path";
// import  runConfig from "./runConfig";
// eslint-disable-next-line import/no-extraneous-dependencies
import { runTests } from "@vscode/test-electron";
import { testControl } from "./control";
import { pathExists, readFileAsync, writeFile } from "../lib/utils/fs";
// eslint-disable-next-line import/no-extraneous-dependencies
// import { runTests } from "vscode-test";

// eslint-disable-next-line prefer-arrow/prefer-arrow-functions
async function main(args: string[])
{
    try {
        console.log("Arguments: " + (args && args.length > 0 ? args.toString() : "None"));
        console.log("clear package.json activation event");
        execSync("enable-full-coverage.sh", { cwd: "tools" });
        //
        // The folder containing the Extension Manifest package.json
        // Passed to '--extensionDevelopmentPath'
        //
        const extensionDevelopmentPath = path.resolve(__dirname, "../../");
        //
        // The path to test runner
        // Passed to --extensionTestsPath
        //
        const extensionTestsPath = path.resolve(__dirname, "./suite/index");
        const extensionTestsWsPath = path.resolve(__dirname, "../../test-files");
        //
        // Clear workspace settings file if it exists
        //
        let settingsJsonOrig: string | undefined;
        const settingsFile = path.join(extensionTestsWsPath, ".vscode", "settings.json");
        if (await pathExists(settingsFile)) {
            settingsJsonOrig = await readFileAsync(settingsFile);
            await writeFile(settingsFile, "{}");
        }
        // const runCfg = await runConfig();
        //
        // Download VS Code, unzip it and run the integration test
        //
        await runTests({
            // version: process.env.CODE_VERSION,
            version: "1.60.1",
            extensionDevelopmentPath,
            extensionTestsPath,
            launchArgs: [ "--disable-extensions", "--disable-workspace-trust", extensionTestsWsPath ],
            extensionTestsEnv: { testArgs: args && args.length > 0 ? args.toString() : "" }
        });
        //
        // Restore
        //
        console.log("restore package.json activation event");
        execSync("enable-full-coverage.sh --off", { cwd: "tools" });
        if (settingsJsonOrig && !testControl.keepSettingsFileChanges) {
            await writeFile(settingsFile, settingsJsonOrig);
        }
        //
        // Open log file
        //
        // if (testControl.logEnabled && testControl.logToFile && testControl.logOpenFileOnFinish)
        // {
        //     if (await pathExists(settingsFile))
        //     {
        //         try {
        //             const settings = await readJsonAsync<any>(settingsFile);
        //             if (settings.logFilePath) {
        //                 try {
        //                     const doc = await workspace.openTextDocument(Uri.file(logFilePath));
        //                     await window.showTextDocument(doc);
        //                 } catch (e) { console.error(e); }
        //             }
        //         }
        //         catch {}
        //         await writeFile(settingsFile, "{}");
        //     }
        // }
    }
    catch (err: any) {
        console.error(`Failed to run tests: ${err}\n${err.stack ?? "No call stack details found"}`);
        console.log("restore package.json activation event after error");
        execSync("enable-full-coverage.sh --off", { cwd: "tools" });
        process.exit(1);
    }
}

main(process.argv.slice(2));
