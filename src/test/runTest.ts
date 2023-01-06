import { execSync, exec } from "child_process";
import * as path from "path";
// eslint-disable-next-line import/no-extraneous-dependencies
import { runTests } from "@vscode/test-electron";
import { pathExists, readFileAsync, writeFile } from "../lib/utils/fs";
import { testsControl } from "./helper";
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
        if (settingsJsonOrig && !testsControl.keepSettingsFileChanges) {
            await writeFile(settingsFile, settingsJsonOrig);
        }
    }
    catch (err: any) {
        console.error(`Failed to run tests: ${err}\n${err.stack ?? "No call stack details found"}`);
        console.log("restore package.json activation event after error");
        execSync("enable-full-coverage.sh --off", { cwd: "tools" });
        process.exit(1);
    }
}

main(process.argv.slice(2));
