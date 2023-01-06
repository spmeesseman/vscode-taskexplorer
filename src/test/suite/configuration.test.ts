/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* tslint:disable */

import * as assert from "assert";
import * as vscode from "vscode";
import * as util from "../../lib/utils/utils";
import { activate, executeSettingsUpdate, sleep, testControl } from "../helper";
import { configuration } from "../../lib/utils/configuration";
import { teApi } from "../../extension";
import { enableConfigWatcher } from "../../lib/configWatcher";

let enabledTasks: any;
let globPatterns: string[];
let pathToPrograms: any;
let shellW32: string, shellLnx: string, shellOsx: string, pkgMgr: string;


suite("Configuration / Settings Tests", () =>
{

    suiteSetup(async function()
    {
        await activate(this);
        enabledTasks = configuration.get<object>("enabledTasks");
        pathToPrograms = configuration.get<object>("pathToPrograms");
        shellW32 = configuration.getVs<string>("terminal.integrated.shell.windows");
        shellLnx = configuration.getVs<string>("terminal.integrated.shell.linux");
        shellOsx = configuration.getVs<string>("terminal.integrated.shell.osx");
    });


    suiteTeardown(async function()
    {
        await executeSettingsUpdate("pathToPrograms", pathToPrograms);
    });


    test("Multi-Part", async function()
    {   //
        // Multi-part settings updates (behavior differs when value is an object)
        // Disable config watcher
        //
        enableConfigWatcher(false);
        //
        // 3-part i.e. taskExplorer.pathToPrograms.ant
        //
        let v = teApi.config.get<any>("pathToPrograms.ant");
        assert(util.isString(v));
        v = teApi.config.get<any>("pathToPrograms");
        assert(util.isObject(v));
        let cv = v.ant;
        await teApi.config.updateWs("pathToPrograms.ant", "/my/path/to/ant");
        v = teApi.config.get<any>("pathToPrograms");
        assert(util.isObject(v) && v.ant === "/my/path/to/ant");
        await teApi.config.updateWs("pathToPrograms.ant", cv);
        v = teApi.config.get<any>("pathToPrograms");
        assert(util.isObject(v) && v.ant === cv);
        cv = teApi.config.get<any>("visual.disableAnimatedIcons");
        assert(util.isBoolean(cv));
        await teApi.config.updateWs("visual.disableAnimatedIcons", false);
        v = teApi.config.get<any>("visual.disableAnimatedIcons");
        assert(util.isBoolean(v) && v === false);
        await teApi.config.updateWs("visual.disableAnimatedIcons", cv);
        v = teApi.config.get<any>("visual.disableAnimatedIcons");
        assert(util.isBoolean(v) && v === cv);
        //
        // 4-part i.e. taskExplorer.specialFolders.expanded.lastTasks
        //
        const cv2 = cv = teApi.config.get<any>("specialFolders.expanded.lastTasks");
        assert(util.isBoolean(cv) && util.isBoolean(cv2));
        await teApi.config.updateWs("specialFolders.expanded.lastTasks", false);
        v = teApi.config.get<any>("specialFolders.expanded.lastTasks");
        assert(util.isBoolean(v) && v === false);
        await teApi.config.updateWs("specialFolders.expanded.lastTasks", true);
        v = teApi.config.get<any>("specialFolders.expanded.lastTasks");
        assert(util.isBoolean(v) && v === true);
        await teApi.config.updateWs("specialFolders.expanded.lastTasks", cv);
        v = teApi.config.get<any>("specialFolders.expanded.lastTasks");
        assert(util.isBoolean(v) && v === cv);
        cv = teApi.config.get<any>("specialFolders.expanded");
        assert(util.isObject(cv));
        cv.lastTasks = false;
        await teApi.config.updateWs("specialFolders.expanded", cv);
        v = teApi.config.get<any>("specialFolders.expanded.lastTasks");
        assert(util.isBoolean(v) && v === false);
        assert(util.isObject(cv));
        cv.lastTasks = true;
        await teApi.config.updateWs("specialFolders.expanded", cv);
        v = teApi.config.get<any>("specialFolders.expanded.lastTasks");
        assert(util.isBoolean(v) && v === true);
        cv.lastTasks = cv2;
        await teApi.config.updateWs("specialFolders.expanded.lastTasks", cv2);
        v = teApi.config.get<any>("specialFolders.expanded.lastTasks");
        assert(util.isBoolean(v) && v === cv2);
        //
        // Re-enable config watcher
        //
        enableConfigWatcher(true);
    });


    test("Ant Glob", async function()
    {
        globPatterns = configuration.get<string[]>("globPatternsAnt");
        await configuration.updateWs("enabledTasks.ant", false);
        globPatterns.push("**/dummy.xml");
        await executeSettingsUpdate("globPatternsAnt", globPatterns, 50, 100);
    });


    test("Ant Glob", async function()
    {
        await executeSettingsUpdate("enabledTasks.ant", true);
        globPatterns.pop();
        await executeSettingsUpdate("globPatternsAnt", globPatterns);
    });


    test("Bash Glob", async function()
    {
        globPatterns = configuration.get<string[]>("globPatternsBash");
        await configuration.updateWs("enabledTasks.bash", false);
        globPatterns.push("**/extensionless/**");
        await executeSettingsUpdate("globPatternsBash", globPatterns);
    });


    test("Bash Glob", async function()
    {
        await executeSettingsUpdate("enabledTasks.bash", true);
        globPatterns.pop();
        await executeSettingsUpdate("globPatternsBash", globPatterns);
    });


    test("Package Manager - Yarn", async function()
    {
        pkgMgr = configuration.getVs<string>("npm.packageManager");
        await configuration.updateVsWs("npm.packageManager", "yarn");
        assert(util.getPackageManager() === "yarn");
    });


    test("Package Manager - NPM Explicit", async function()
    {
        await configuration.updateVsWs("npm.packageManager", "npm");
        assert(util.getPackageManager() === "npm");
    });


    test("Package Manager - NPM Implicit", async function()
    {
        await configuration.updateVsWs("npm.packageManager", "");
        assert(util.getPackageManager() === "npm");
    });


    test("Package Manager - Auto", async function()
    {
        await configuration.updateVsWs("npm.packageManager", "auto");
        assert(util.getPackageManager() === "npm");
    });


    test("Package Manager - Reset", async function()
    {
        await configuration.updateVsWs("npm.packageManager", pkgMgr);
        await configuration.updateVs("npm.packageManager", pkgMgr); // cover global
        assert(util.getPackageManager() === (pkgMgr === "auto" ? "npm" : pkgMgr));
    });


    test("Change Default Shell - OSX", async function()
    {
        await configuration.updateVsWs("terminal.integrated.shell.osx", "/usr/bin/sh");
        await sleep(50);
    });


    test("Change Default Shell - Linux", async function()
    {
        await configuration.updateVsWs("terminal.integrated.shell.linux", "/bin/sh");
        await sleep(50);
    });


    test("Change Default Shell - Windows", async function()
    {
        await configuration.updateVsWs("terminal.integrated.shell.windows", "C:\\Windows\\System32\\cmd.exe");
        await sleep(50);
    });


    test("Reset Default Shell - OSX", async function()
    {
        await configuration.updateVsWs("terminal.integrated.shell.osx", shellOsx);
        await sleep(50);
    });


    test("Reset Default Shell - Linux", async function()
    {
        await configuration.updateVsWs("terminal.integrated.shell.linux", shellLnx);
        await sleep(50);
    });


    test("Reset Default Shell - Coverage Hit", async function()
    {
        await executeSettingsUpdate("enabledTasks", Object.assign(enabledTasks, {
            bash: false,
            batch: false,
            nsis: false,
            perl: false,
            powershell: false,
            python: false,
            ruby: false
        }), 25, 50);
        await executeSettingsUpdate("enabledTasks.nsis", true, 25, 50); // last of an or'd if() extension.ts ~line 363 processConfigChanges()
    });


    test("Reset Default Shell - Windows", async function()
    {
        await configuration.updateVsWs("terminal.integrated.shell.windows", shellW32);
        await sleep(50);
    });


    test("Reset Coverage Hit", async function()
    {
        await executeSettingsUpdate("enabledTasks", Object.assign(enabledTasks, {
            bash: true,
            batch: true,
            nsis: false,
            perl: false,
            powershell: false,
            python: false,
            ruby: false
        }), 25, 50);
    });


    test("Path to Programs Set Bash", async function()
    {
        await executeSettingsUpdate("pathToPrograms.bash", "c:\\unix\\sh.exe", 20, 50);
    });


    test("Path to Programs Set Composer", async function()
    {
        await executeSettingsUpdate("pathToPrograms.composer", "c:\\php5\\composer.exe", 20, 50);
    });


    test("Path to Programs Clear Bash", async function()
    {
        await executeSettingsUpdate("pathToPrograms.bash", undefined, 20, 50);
    });


    test("Path to Programs Clear Composer", async function()
    {
        await executeSettingsUpdate("pathToPrograms.composer", undefined, 20, 50);
    });


    test("Path to Programs Restore Bash", async function()
    {
        executeSettingsUpdate("pathToPrograms.bash", pathToPrograms.bash, 20, 50);
    });


    test("Path to Programs Restore Composer", async function()
    {
        executeSettingsUpdate("pathToPrograms.composer", pathToPrograms.composer, 20, 50);
    });


    test("User Level Setting Update", async function()
    {
        this.slow(testControl.slowTimeForConfigEvent * 4);
        await configuration.update("logging.level", testControl.userLogLevel !== 3 ? 3 : 2);
        await teApi.waitForIdle(testControl.waitTimeForConfigEvent);
        await configuration.update("logging.level", testControl.userLogLevel);
        await teApi.waitForIdle(testControl.waitTimeForConfigEvent);
        await configuration.update("pathToPrograms.ant", testControl.userPathToAnt !== "ant" ? "ant" : "ant.bat");
        await teApi.waitForIdle(testControl.waitTimeForConfigEvent);
        await configuration.update("pathToPrograms.ant", testControl.userPathToAnt);
        await teApi.waitForIdle(testControl.waitTimeForConfigEvent);
    });

});
