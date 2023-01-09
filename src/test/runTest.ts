import { execSync } from "child_process";
import * as path from "path";
// import  runConfig from "./runConfig";
// eslint-disable-next-line import/no-extraneous-dependencies
import { ConsoleReporter, runTests } from "@vscode/test-electron";
import { testControl } from "./control";
import { findFiles, getDateModified, pathExists, readFileAsync, writeFile } from "../lib/utils/fs";
// eslint-disable-next-line import/no-extraneous-dependencies
// import { runTests } from "vscode-test";

// eslint-disable-next-line prefer-arrow/prefer-arrow-functions
async function main(args: string[])
{
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
    // Setting file to clear and restore
    //
    const settingsFile = path.join(extensionTestsWsPath, ".vscode", "settings.json");

    try
    {   console.log("Arguments: " + (args && args.length > 0 ? args.toString() : "None"));
        console.log("clear package.json activation event");
        execSync("enable-full-coverage.sh", { cwd: "tools" });
        //
        // Clear workspace settings file if it exists
        //
        // let settingsJsonOrig: string | undefined;
        if (await pathExists(settingsFile)) {
            // settingsJsonOrig = await readFileAsync(settingsFile) || "{}";
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
            launchArgs: [ extensionTestsWsPath, "--disable-extensions", "--disable-workspace-trust" ],
            // launchArgs: [ "--add " + extensionTestsWsPath, "--disable-extensions", "--disable-workspace-trust" ],
            extensionTestsEnv: { testArgs: args && args.length > 0 ? args.toString() : "" }
        });
    }
    catch (err: any) {
        console.error(`Failed to run tests: ${err}\n${err.stack ?? "No call stack details found"}`);
        process.exit(1);
    }
    finally
    {   try //
        {   // Log file - whats a good way to open it in the active vscode instance???
            //
            let logFile: string | undefined;
            if (testControl.logEnabled && testControl.logToFile && testControl.logOpenFileOnFinish)
            {
                let lastDateModified: Date | undefined;
                const tzOffset = (new Date()).getTimezoneOffset() * 60000,
                    dateTag = (new Date(Date.now() - tzOffset)).toISOString().slice(0, -1).split("T")[0].replace(/[\-]/g, ""),
                    vscodeLogPath = path.join(extensionDevelopmentPath, ".vscode-test", "user-data", "logs");
                const paths = await findFiles(`**/spmeesseman.vscode-taskexplorer/taskexplorer-${dateTag}.log`,
                {
                    nocase: false,
                    ignore: "**/node_modules/**",
                    cwd: vscodeLogPath
                });
                for (const relPath of paths)
                {
                    const fullPath = path.join(vscodeLogPath, relPath),
                        dateModified = await getDateModified(fullPath);
                    if (dateModified && (!lastDateModified || dateModified.getTime() > lastDateModified.getTime()))
                    {
                        logFile = fullPath;
                        lastDateModified = dateModified;
                    }
                }
                if (logFile) {

                }
            }
            //
            // Restore
            //
            console.log("restore package.json activation event");
            execSync(`enable-full-coverage.sh --off${logFile ? ` --logfile "${logFile}` : ""}"`, { cwd: "tools" });
            // if (settingsJsonOrig && !testControl.keepSettingsFileChanges) {
            if (!testControl.keepSettingsFileChanges)
            {   //
                // await writeFile(settingsFile, settingsJsonOrig);
                await writeFile(settingsFile, "{\n    " +
                                              "    \"taskExplorer.exclude\": [\n" +
                                              "        \"**/tasks_test_ignore_/**\"\n" +
                                              "    ]\n" +
                                              "    \"taskExplorer.globPatternsAnt\": [\n" +
                                              "        \"**/hello.xml\"\n" +
                                              "    ]\n" +
                                              "}");
            }
        } catch {}
    }
}

main(process.argv.slice(2));
