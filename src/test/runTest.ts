import { execSync } from "child_process";
import * as path from "path";
// import  runConfig from "./runConfig";
// eslint-disable-next-line import/no-extraneous-dependencies
import { runTests } from "@vscode/test-electron";
import { testControl } from "./control";
import { copyFile, deleteDir, readFileAsync, writeFile } from "../lib/utils/fs";
import { getWsPath } from "./utils/sharedUtils";
import { getTaskTypeRealName, getTaskTypes } from "../lib/utils/taskTypeUtils";

const VSCODE_TEST_VERSION = "1.63.0";

interface IDictionary<TValue>
{
    [id: string]: TValue;
}

const main = async(args: string[]) =>
{
    let failed = false;
    let multiRoot = false;
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
    const testWorkspaceSingleRoot = path.resolve(__dirname, path.join("..", "..", "test-fixture", "project1"));
    const testWorkspaceMultiRoot = path.resolve(__dirname, path.join("..", "..", "test-fixture"));
    const vscodeTestUserDataPath = path.join(extensionDevelopmentPath, ".vscode-test", "user-data");
    //
    // Setting file to clear and restore
    //
    const project1Path = testWorkspaceSingleRoot;
    // const project2Path = path.join(testWorkspaceMultiRoot, "project2");
    const projectSettingsFile = path.join(project1Path, ".vscode", "settings.json");
    const multiRootWsFile = path.join(testWorkspaceMultiRoot, "tests.code-workspace");

    const defaultSettings = await createDefaultSettings();
    const mwsConfig: IDictionary<any> = {
        folders: [
        {
            name: "project1",
            path: "project1"
        },
        {
            name: "project2",
            path: "project2"
        }],
        settings: defaultSettings
    };

    try
    {
        const xArgs: string[] = [],
              testsArgs: string[] = [];
        if (args && args.length > 0)
        {
            console.log("Arguments: " + args.toString());
            args.forEach((a) =>
            {
                if (a.startsWith("-"))
                {
                    xArgs.push(a);
                    if (a === "--multi-root") {
                        multiRoot = true;
                    }
                }
                else {
                    testsArgs.push(a);
                }
            });
        }
        else {
            console.log("Arguments: None");
        }

        console.log("clear package.json activation event");
        execSync("enable-full-coverage.sh", { cwd: "script" });

        //
        // Clear workspace settings file if it exists
        //
        // let settingsJsonOrig: string | undefined;
        if (!multiRoot) {
            await writeFile(projectSettingsFile, JSON.stringify(defaultSettings));
        }
        else {
            await writeFile(multiRootWsFile, JSON.stringify(mwsConfig, null, 4));
        }

        //
        // Copy a "User Tasks" file
        //
        await copyFile(path.join(testWorkspaceMultiRoot, "user-tasks.json"), path.join(vscodeTestUserDataPath, "User", "tasks.json"));

        //
        // const runCfg = await runConfig();

        // //
        // // Install ExtJS extension
        // //
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

        //
        // Download VS Code, unzip it and run the integration test
        //
        const testsWorkspace = !multiRoot ? testWorkspaceSingleRoot : multiRootWsFile;
        await runTests(
        {
            version: VSCODE_TEST_VERSION,
            extensionDevelopmentPath,
            extensionTestsPath,
            launchArgs: [ testsWorkspace, "--disable-extensions", "--disable-workspace-trust" ],
            extensionTestsEnv: { xArgs: JSON.stringify(xArgs), testArgs: JSON.stringify(testsArgs), vsCodeTestVersion: VSCODE_TEST_VERSION }
        }); // --upload-logs could be interesting (for prod).  look at it sometime.
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
            //         const code = path.join(process.env.CODE_HOME || "c:\\Code", "Code.exe");
            //         // execSync(`cmd /c ${code} "${logFile}" --reuse-window`, { cwd: extensionDevelopmentPath, stdio: "ignore" });//.unref();
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
                if (!multiRoot)
                {
                    await writeFile(projectSettingsFile, JSON.stringify(
                    {
                        "taskExplorer.exclude": [
                            "**/tasks_test_ignore_/**",
                        ],
                        "taskExplorer.globPatternsAnt": [
                            "**/hello.xml"
                        ]
                    }, null, 4));
                }
                else
                {
                    mwsConfig.settings = {
                        "taskExplorer.exclude": [
                            "**/tasks_test_ignore_/**",
                        ],
                        "taskExplorer.globPatternsAnt": [
                            "**/hello.xml"
                        ]
                    };
                    await writeFile(multiRootWsFile, JSON.stringify(mwsConfig, null, 4));
                }
            }
            console.log("delete any leftover temporary files and/or directories");
            await deleteDir(path.join(project1Path, "tasks_test_"));
            await deleteDir(path.join(project1Path, "tasks_test_ignore_"));
        }
        catch {}

        if (failed) {
            process.exit(1);
        }
    }
};

const createDefaultSettings = async() =>
{   //
    // Enabled / disabled task defaults
    //
    const packageJson = JSON.parse(await readFileAsync(getWsPath("../../package.json")));
    const enabledTasks: IDictionary<boolean> = {};
    getTaskTypes().map(t => getTaskTypeRealName(t)).forEach(t => {
        enabledTasks[t] = packageJson.contributes.configuration.properties["taskExplorer.enabledTasks"].default[t];
    });

    return {
        "terminal.integrated.shell.windows": undefined,
        "taskExplorer.enableExplorerView": true,
        "taskExplorer.enableSideBar": true,
        "taskExplorer.enablePersistentFileCaching": false,
        "taskExplorer.enabledTasks": enabledTasks,
        "taskExplorer.pathToPrograms":
        {
            ant: getWsPath("..\\tools\\ant\\bin\\ant.bat"),
            ansicon: getWsPath("..\\tools\\ansicon\\x64\\ansicon.exe"),
            bash: "bash",
            composer: "composer",
            curl: "curl",
            gradle: "c:\\Code\\gradle\\bin\\gradle.bat",
            jenkins: "",
            make: "C:\\Code\\compilers\\c_c++\\9.0\\VC\\bin\\nmake.exe",
            maven: "mvn",
            nsis: "c:\\Code\\nsis\\makensis.exe",
            perl: "perl",
            pipenv: "pipenv",
            powershell: "powershell",
            python: "c:\\Code\\python\\python.exe",
            ruby: "ruby"
        },
        "taskExplorer.logging.enable": false,
        "taskExplorer.logging.level": 1,
        "taskExplorer.logging.enableFile": false,
        "taskExplorer.logging.enableFileSymbols": false,
        "taskExplorer.logging.enableOutputWindow": false,
        "taskExplorer.specialFolders.numLastTasks": 10,
        "taskExplorer.specialFolders.showFavorites": true,
        "taskExplorer.specialFolders.showLastTasks": true,
        "taskExplorer.specialFolders.showUserTasks": true,
        "taskExplorer.specialFolders.expanded": {
            favorites: true,
            lastTasks: true,
            userTasks: true
        },
        "taskExplorer.taskButtons.clickAction": "Open",
        "taskExplorer.taskButtons.showFavoritesButton": true,
        "taskExplorer.taskButtons.showExecuteWithArgumentsButton": false,
        "taskExplorer.taskButtons.showExecuteWithNoTerminalButton": false,
        "taskExplorer.visual.disableAnimatedIcons": true,
        "taskExplorer.visual.enableAnsiconForAnt": false,
        "taskExplorer.groupMaxLevel": 1,
        "taskExplorer.groupSeparator": "-",
        "taskExplorer.groupWithSeparator": true,
        "taskExplorer.groupStripTaskLabel": true,
        "taskExplorer.exclude": [],
        "taskExplorer.includeAnt": [], // Deprecated, use `globPatternsAnt`
        "taskExplorer.globPatternsAnt": [ "**/test.xml", "**/emptytarget.xml", "**/emptyproject.xml", "**/hello.xml" ],
        "taskExplorer.keepTermOnStop": false,
        "taskExplorer.showHiddenWsTasks": true,
        "taskExplorer.showRunningTask": true,
        "taskExplorer.useGulp": false,
        "taskExplorer.useAnt": false,
    };
};

main(process.argv.slice(2));
