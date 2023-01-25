import { execSync } from "child_process";
import * as path from "path";
// import  runConfig from "./runConfig";
// eslint-disable-next-line import/no-extraneous-dependencies
import { runTests } from "@vscode/test-electron";
import { testControl } from "./control";
import { copyFile, deleteDir, writeFile } from "../lib/utils/fs";
// eslint-disable-next-line import/no-extraneous-dependencies
// import { runTests } from "vscode-test";

// eslint-disable-next-line prefer-arrow/prefer-arrow-functions
async function main(args: string[])
{
    let failed = false;
    //
    // The folder containing the Extension Manifest package.json
    // Passed to '--extensionDevelopmentPath'
    //
    const extensionDevelopmentPath = path.resolve(__dirname, "../../");
    //
    // The path to test runner
    // Passed to --extensionTestsPath
    //
    const extensionTestsPath = path.resolve(__dirname, "./suite");
    const testWorkspace = path.resolve(__dirname, "../../test-fixture/project1");
    const testWorkspaceMultiRoot = path.resolve(__dirname, "../../test-fixture");
    const vscodeTestUserDataPath = path.join(extensionDevelopmentPath, ".vscode-test", "user-data");
    //
    // Setting file to clear and restore
    //
    const projectSettingsFile = path.join(testWorkspace, ".vscode", "settings.json");
    const wsSettingsFile = path.join(testWorkspaceMultiRoot, "tests.code-workspace");

    const wsConfig = {
        folders: [
            {
                name: "project1",
                path: "project1"
            },
            {
                name: "project2",
                path: "project2"
            }
        ],
        settings: {}
    };

    try
    {
        console.log("Arguments: " + (args && args.length > 0 ? args.toString() : "None"));
        console.log("clear package.json activation event");
        execSync("enable-full-coverage.sh", { cwd: "script" });

        //
        // Clear workspace settings file if it exists
        //
        // let settingsJsonOrig: string | undefined;
        await writeFile(projectSettingsFile, "{}");
        await writeFile(wsSettingsFile, JSON.stringify(wsConfig, null, 4));

        //
        // Copy a "User Tasks" file
        //
        await copyFile(path.join(testWorkspaceMultiRoot, "user-tasks.json"), path.join(vscodeTestUserDataPath, "User", "tasks.json"));

        //
        // const runCfg = await runConfig();

        //
        // Download VS Code, unzip it and run the integration test
        //
        await runTests({
            // version: process.env.CODE_VERSION,
            version: "1.60.1",
            extensionDevelopmentPath,
            extensionTestsPath,
            launchArgs: [ testWorkspace, "--disable-extensions", "--disable-workspace-trust" ],
            // launchArgs: [ "--add " + extensionTestsWsPath, "--disable-extensions", "--disable-workspace-trust" ],
            extensionTestsEnv: { testArgs: args && args.length > 0 ? args.toString() : "" }
        });

        // /**
        //  * Install ExtJS extension
        //  */
        // const vscodeExecutablePath = await downloadAndUnzipVSCode("1.35.0")
		// const [ cli, ...args ] = resolveCliArgsFromVSCodeExecutablePath(vscodeExecutablePath);
		// spawnSync(cli, [ ...args, "--install-extension", "spmeesseman.vscode-extjs" ], {
		// 	encoding: "utf-8",
		// 	stdio: "inherit"
		// });

        // if (process.platform === "win32") {
		// 	await runTests({
		// 		extensionDevelopmentPath,
		// 		extensionTestsPath,
		// 		version: "1.40.0",
		// 		platform: "win32-x64-archive"
		// 	});
		// }
    }
    catch (err: any) {
        console.error(`Failed to run tests: ${err}\n${err.stack ?? "No call stack details found"}`);
        failed = true;
    }
    finally
    {   try //
        {   // Log file - whats a good way to open it in the active vscode instance???
            //
            // let logFile: string | undefined;
            // if (testControl.log.enabled && testControl.log.file && testControl.log.openFileOnFinish)
            // {
            //     let lastDateModified: Date | undefined;
            //     const tzOffset = (new Date()).getTimezoneOffset() * 60000,
            //         dateTag = (new Date(Date.now() - tzOffset)).toISOString().slice(0, -1).split("T")[0].replace(/[\-]/g, ""),
            //         vscodeLogPath = path.join(vscodeTestUserDataPath, "logs");
            //     const paths = await findFiles(`**/spmeesseman.vscode-taskexplorer/taskexplorer-${dateTag}.log`,
            //     {
            //         nocase: false,
            //         ignore: "**/node_modules/**",
            //         cwd: vscodeLogPath
            //     });
            //     for (const relPath of paths)
            //     {
            //         const fullPath = path.join(vscodeLogPath, relPath),
            //             dateModified = await getDateModified(fullPath);
            //         if (dateModified && (!lastDateModified || dateModified.getTime() > lastDateModified.getTime()))
            //         {
            //             logFile = fullPath;
            //             lastDateModified = dateModified;
            //         }
            //     }
            //     if (logFile) {
            //
            //     }
            // }
            //
            // Restore
            //
            console.log("restore package.json activation event");
            // execSync(`enable-full-coverage.sh --off${logFile ? ` --logfile "${logFile}` : ""}"`, { cwd: "script" });
            execSync("enable-full-coverage.sh --off", { cwd: "script" });
            // if (settingsJsonOrig && !testControl.keepSettingsFileChanges) {
            if (!testControl.keepSettingsFileChanges)
            {
                console.log("restore tests workspace settings file settings.json");
                await writeFile(projectSettingsFile, JSON.stringify(
                {
                    "taskExplorer.exclude": [
                        "**/tasks_test_ignore_/**",
                    ],
                    "taskExplorer.globPatternsAnt": [
                        "**/hello.xml"
                    ]
                }, null, 4));
                wsConfig.settings = {
                    "taskExplorer.exclude": [
                        "**/tasks_test_ignore_/**",
                    ],
                    "taskExplorer.globPatternsAnt": [
                        "**/hello.xml"
                    ]
                };
                await writeFile(wsSettingsFile, JSON.stringify(wsConfig, null, 4));
            }
            console.log("delete any leftover temporary files and/or directories");
            await deleteDir(path.join(testWorkspace, "tasks_test_"));
            await deleteDir(path.join(testWorkspace, "tasks_test_ignore_"));
        } catch {}

        if (failed) {
            process.exit(1);
        }
    }
}

main(process.argv.slice(2));
