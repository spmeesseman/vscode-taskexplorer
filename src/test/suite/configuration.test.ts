/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* tslint:disable */

import * as assert from "assert";
import * as util from "../../lib/utils/utils";
import { configuration } from "../../lib/utils/configuration";
import { teApi } from "../../extension";
import { enableConfigWatcher } from "../../lib/configWatcher";
import { activate, executeSettingsUpdate, sleep, suiteFinished, testControl } from "../utils/utils";

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
        suiteFinished(this);
    });


    test("Multi-Dot", async function()
    {
        this.slow(testControl.slowTime.configEventFast * 10);
        //
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
        this.slow((testControl.slowTime.configGlobEvent * 2) + testControl.slowTime.configReadEvent + testControl.waitTime.min);
        globPatterns = configuration.get<string[]>("globPatternsAnt");
        await configuration.updateWs("enabledTasks.ant", false);
        globPatterns.push("**/dummy.xml");
        await executeSettingsUpdate("globPatternsAnt", globPatterns, 50, 100);
        await teApi.waitForIdle(testControl.waitTime.min);
    });


    test("Ant Glob", async function()
    {
        this.slow(testControl.slowTime.configEnableEvent + testControl.slowTime.configGlobEvent+ testControl.waitTime.min);
        await executeSettingsUpdate("enabledTasks.ant", true);
        globPatterns.pop();
        await executeSettingsUpdate("globPatternsAnt", globPatterns);
        await teApi.waitForIdle(testControl.waitTime.min);
    });


    test("Bash Glob", async function()
    {
        this.slow(testControl.slowTime.configEnableEvent + testControl.slowTime.configGlobEvent + testControl.slowTime.configReadEvent + testControl.waitTime.min);
        globPatterns = configuration.get<string[]>("globPatternsBash");
        await configuration.updateWs("enabledTasks.bash", false);
        globPatterns.push("**/extensionless/**");
        await executeSettingsUpdate("globPatternsBash", globPatterns);
        await teApi.waitForIdle(testControl.waitTime.min);
    });


    test("Bash Glob", async function()
    {
        this.slow(testControl.slowTime.configEnableEvent + testControl.slowTime.configGlobEvent + testControl.waitTime.min);
        await executeSettingsUpdate("enabledTasks.bash", true);
        globPatterns.pop();
        await executeSettingsUpdate("globPatternsBash", globPatterns);
        await teApi.waitForIdle(testControl.waitTime.min);
    });


    test("Package Manager - Yarn", async function()
    {
        this.slow(testControl.slowTime.configEvent + testControl.slowTime.configReadEvent);
        pkgMgr = configuration.getVs<string>("npm.packageManager");
        await configuration.updateVsWs("npm.packageManager", "yarn");
        assert(util.getPackageManager() === "yarn");
    });


    test("Package Manager - NPM Explicit", async function()
    {
        this.slow(testControl.slowTime.configEvent);
        await configuration.updateVsWs("npm.packageManager", "npm");
        assert(util.getPackageManager() === "npm");
    });


    test("Package Manager - NPM Implicit", async function()
    {
        this.slow(testControl.slowTime.configEvent);
        await configuration.updateVsWs("npm.packageManager", "");
        assert(util.getPackageManager() === "npm");
    });


    test("Package Manager - Auto", async function()
    {
        this.slow(testControl.slowTime.configEvent);
        await configuration.updateVsWs("npm.packageManager", "auto");
        assert(util.getPackageManager() === "npm");
    });


    test("Package Manager - Reset", async function()
    {
        this.slow(testControl.slowTime.configEvent);
        await configuration.updateVsWs("npm.packageManager", pkgMgr);
        await configuration.updateVs("npm.packageManager", pkgMgr); // cover global
        assert(util.getPackageManager() === (pkgMgr === "auto" ? "npm" : pkgMgr));
    });


    test("Change Default Shell - OSX", async function()
    {
        this.slow(testControl.slowTime.configEvent + testControl.waitTime.min);
        await configuration.updateVsWs("terminal.integrated.shell.osx", "/usr/bin/sh");
        await sleep(testControl.waitTime.min);
    });


    test("Change Default Shell - Linux", async function()
    {
        this.slow(testControl.slowTime.configEvent + testControl.waitTime.min);
        await configuration.updateVsWs("terminal.integrated.shell.linux", "/bin/sh");
        await sleep(testControl.waitTime.min);
    });


    test("Change Default Shell - Windows", async function()
    {
        this.slow(testControl.slowTime.configEvent + testControl.waitTime.min);
        await configuration.updateVsWs("terminal.integrated.shell.windows", "C:\\Windows\\System32\\cmd.exe");
        await sleep(testControl.waitTime.min);
    });


    test("Reset Default Shell - OSX", async function()
    {
        this.slow(testControl.slowTime.configEvent + testControl.waitTime.min);
        await configuration.updateVsWs("terminal.integrated.shell.osx", shellOsx);
        await sleep(testControl.waitTime.min);
    });


    test("Reset Default Shell - Linux", async function()
    {
        this.slow(testControl.slowTime.configEvent + testControl.waitTime.min);
        await configuration.updateVsWs("terminal.integrated.shell.linux", shellLnx);
        await sleep(testControl.waitTime.min);
    });


    test("Reset Default Shell - Coverage Hit", async function()
    {
        this.slow((testControl.slowTime.configEnableEvent * 2) + testControl.waitTime.min);
        await executeSettingsUpdate("enabledTasks", Object.assign(enabledTasks, {
            bash: false,
            batch: false,
            nsis: false,
            perl: false,
            powershell: false,
            python: false,
            ruby: false
        }), 25, 50);
        await executeSettingsUpdate("enabledTasks.nsis", true, testControl.waitTime.min, testControl.waitTime.min * 2); // last of an or'd if() extension.ts ~line 363 processConfigChanges()
    });


    test("Reset Default Shell - Windows", async function()
    {
        this.slow(testControl.slowTime.configEvent + testControl.waitTime.min);
        await configuration.updateVsWs("terminal.integrated.shell.windows", shellW32);
        await sleep(testControl.waitTime.min);
    });


    test("Reset Coverage Hit", async function()
    {
        this.slow(testControl.slowTime.configEnableEvent);
        await executeSettingsUpdate("enabledTasks", Object.assign(enabledTasks, {
            bash: true,
            batch: true,
            nsis: false,
            perl: false,
            powershell: false,
            python: false,
            ruby: false
        }), testControl.waitTime.min, testControl.waitTime.min * 2);
    });


    test("Path to Programs Set Bash", async function()
    {
        this.slow(testControl.slowTime.configEvent + testControl.waitTime.min);
        await executeSettingsUpdate("pathToPrograms.bash", "c:\\unix\\sh.exe", testControl.waitTime.min, testControl.waitTime.min * 2);
    });


    test("Path to Programs Set Composer", async function()
    {
        this.slow(testControl.slowTime.configEvent + testControl.waitTime.min);
        await executeSettingsUpdate("pathToPrograms.composer", "c:\\php5\\composer.exe", testControl.waitTime.min, testControl.waitTime.min * 2);
    });


    test("Path to Programs Clear Bash", async function()
    {
        this.slow(testControl.slowTime.configEvent + testControl.waitTime.min);
        await executeSettingsUpdate("pathToPrograms.bash", undefined, testControl.waitTime.min, testControl.waitTime.min * 2);
    });


    test("Path to Programs Clear Composer", async function()
    {
        this.slow(testControl.slowTime.configEvent + testControl.waitTime.min);
        await executeSettingsUpdate("pathToPrograms.composer", undefined, testControl.waitTime.min, testControl.waitTime.min * 2);
    });


    test("Path to Programs Restore Bash", async function()
    {
        this.slow(testControl.slowTime.configEvent + testControl.waitTime.min);
        await executeSettingsUpdate("pathToPrograms.bash", pathToPrograms.bash, testControl.waitTime.min, testControl.waitTime.min * 2);
    });


    test("Path to Programs Restore Composer", async function()
    {
        this.slow(testControl.slowTime.configEvent + testControl.waitTime.min);
        await executeSettingsUpdate("pathToPrograms.composer", pathToPrograms.composer, testControl.waitTime.min, testControl.waitTime.min * 2);
    });


    test("User Level Setting Update", async function()
    {
        this.slow(testControl.slowTime.configEvent * 2 + 50);
        enableConfigWatcher(false);
        const logLevel = configuration.get<number>("logging.level");
        const pathToPrograms = configuration.get<object>("pathToPrograms");
        const pathToAnt = configuration.get<object>("pathToPrograms.ant");
        await configuration.update("logging.level", logLevel);
        await configuration.update("pathToPrograms.ant", pathToAnt);
        await configuration.update("pathToPrograms", pathToPrograms);
        enableConfigWatcher(true);
        await configuration.update("logging.level", logLevel !== 3 ? 3 : 2);
        teApi.waitForIdle(testControl.waitTime.configEvent);
        await configuration.update("logging.level", logLevel);
        teApi.waitForIdle(testControl.waitTime.configEvent);
    });

});
