/* eslint-disable import/no-extraneous-dependencies */

import { workspace } from "vscode";
import figures from "../../lib/figures";
import { getWsPath } from "./sharedUtils";
import { testControl as tc } from "../control";
import { isObject } from "../../lib/utils/utils";
import { configuration } from "../../lib/utils/configuration";
import { IDictionary } from "@spmeesseman/vscode-taskexplorer-types";


const initSettings = async () =>
{
    console.log(`    ${figures.color.info} ${figures.withColor("Initializing settings", figures.colors.grey)}`);
    //
    // This function runs BEFORE the extension is initialized, so any updates have no immediate
    // effect.  All settings set here will get read on on extension activation, coming up next.
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


    tc.user.logLevel = configuration.get<number>("logging.level");
    await configuration.updateVsWs("terminal.integrated.shell.windows", tc.defaultWindowsShell);
    //
    // Grunt / Gulp VSCode internal task providers. Gulp suite will disable when done.
    //
    tc.vsCodeAutoDetectGrunt = configuration.getVs<string>("grunt.autoDetect", "off") as "on" | "off";
    tc.vsCodeAutoDetectGulp = configuration.getVs<string>("gulp.autoDetect", "off") as "on" | "off";
    await configuration.updateVs("grunt.autoDetect", "on");
    await configuration.updateVs("gulp.autoDetect", "on");
    // await workspace.getConfiguration("grunt").update("autoDetect", "on", ConfigurationTarget.Global);
    // await workspace.getConfiguration("gulp").update("autoDetect", "on", ConfigurationTarget.Global);
    //
    // Enable views, use workspace level so that running this test from Code itself
    // in development doesn't trigger the TaskExplorer instance installed in the dev IDE
    //
    await configuration.updateWs("enableExplorerView", true);
    await configuration.updateWs("enableSideBar", false);
    //
    // Persistent file caching off.  Pretty intensive when enabled in tests.  Adds 1+
    // minute to overall tests completion time if set `true`.  Default is `false`.
    //
    await configuration.updateWs("enablePersistentFileCaching", false);
    //
    // Set misc settings, use workspace level so that running this test from Code itself
    // in development doesn't trigger the TaskExplorer instance installed in the dev IDE
    //
    await configuration.updateWs("enabledTasks",
    {
        ant: true,
        apppublisher: false,
        bash: true,
        batch: true,
        composer: false,
        gradle: false,
        grunt: true,
        gulp: true,
        jenkins: false,
        make: true,
        maven: false,
        npm: true,
        nsis: false,
        perl: false,
        pipenv: false,
        powershell: false,
        python: true,
        ruby: false,
        tsc: true,
        webpack: false,
        workspace: true
    });

    await configuration.updateWs("pathToPrograms",
    {
        ant: getWsPath("..\\tools\\ant\\bin\\ant.bat"), // "c:\\Code\\ant\\bin\\ant.bat",
        ansicon: getWsPath("..\\tools\\ansicon\\x64\\ansicon.exe"), // "c:\\Code\\ansicon\\x64\\ansicon.exe",
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
    });
    // await configuration.updateWs("pathToPrograms.ant", tc.userPathToAnt);
    // await configuration.updateWs("pathToPrograms.ansicon", tc.userPathToAnsicon);

    await configuration.updateWs("logging.enable", tc.log.enabled);
    if (!tc.log.enabled){
        tc.log.file = false;
        tc.log.output = false;
    }
    else if (!tc.log.output && !tc.log.file && !tc.log.console) {
        tc.log.output = true;
    }
    await configuration.updateWs("logging.level", tc.log.level);
    await configuration.updateWs("logging.enableFile", tc.log.file);
    await configuration.updateWs("logging.enableFileSymbols", tc.log.fileSymbols);
    await configuration.updateWs("logging.enableOutputWindow", tc.log.output);

    await configuration.updateWs("specialFolders.numLastTasks", 10);
    await configuration.updateWs("specialFolders.showFavorites", true);
    await configuration.updateWs("specialFolders.showLastTasks", true);
    await configuration.updateWs("specialFolders.showUserTasks", true);
    // await configuration.updateWs("specialFolders.expanded", configuration.get<object>("specialFolders.expanded"));
    await configuration.updateWs("specialFolders.expanded", {
        favorites: true,
        lastTasks: true,
        userTasks: true
    });

    await configuration.updateWs("taskButtons.clickAction", "Open");
    await configuration.updateWs("taskButtons.showFavoritesButton", true);
    await configuration.updateWs("taskButtons.showExecuteWithArgumentsButton", false);
    await configuration.updateWs("taskButtons.showExecuteWithNoTerminalButton", false);

    await configuration.updateWs("visual.disableAnimatedIcons", true);
    await configuration.updateWs("visual.enableAnsiconForAnt", false);

    await configuration.updateWs("groupMaxLevel", 1);
    await configuration.updateWs("groupSeparator", "-");
    await configuration.updateWs("groupWithSeparator", true);
    await configuration.updateWs("groupStripTaskLabel", true);

    await configuration.updateWs("exclude", []);
    await configuration.updateWs("includeAnt", []); // Deprecated, use `globPatternsAnt`
    await configuration.updateWs("globPatternsAnt", [ "**/test.xml", "**/emptytarget.xml", "**/emptyproject.xml", "**/hello.xml" ]);
    await configuration.updateWs("keepTermOnStop", false);
    await configuration.updateWs("showHiddenWsTasks", true);
    await configuration.updateWs("showRunningTask", true);
    await configuration.updateWs("useGulp", false);
    await configuration.updateWs("useAnt", false);

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
        console.log(`    ${figures.color.info} ${figures.withColor(msg, figures.colors.grey)}`);
    }

    if (workspace.workspaceFolders && workspace.workspaceFolders.length > 1)
    {
        tc.isMultiRootWorkspace = true;
        Object.assign(tc.slowTime as IDictionary<any>, tc.slowTimeMultiRoot);
        Object.assign(tc.waitTime as IDictionary<any>, tc.waitTimeMultiRoot);
    }

    const msg = `The test environment is a '${tc.isMultiRootWorkspace ? "multi-root" : "single-root"}' workspace`;
    console.log(`    ${figures.color.info} ${figures.withColor(msg, figures.colors.grey)}`);
    console.log(`    ${figures.color.info} ${figures.withColor("Settings initialization completed", figures.colors.grey)}`);
};

export default initSettings;
