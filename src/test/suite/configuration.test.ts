/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* tslint:disable */

import * as assert from "assert";
import * as util from "../../lib/utils/utils";
import { configuration } from "../../lib/utils/configuration";
import { teApi } from "../../extension";
import { enableConfigWatcher } from "../../lib/configWatcher";
import {
    activate, executeSettingsUpdate, exitRollingCount, sleep, suiteFinished, testControl as tc, waitForTeIdle
} from "../utils/utils";

let enabledTasks: any;
let globPatterns: string[];
let pathToPrograms: any;
let shellW32: string, shellLnx: string, shellOsx: string, pkgMgr: string;
let successCount = -1;


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
        successCount++;
    });


    suiteTeardown(async function()
    {
        await executeSettingsUpdate("pathToPrograms", pathToPrograms);
        // await executeSettingsUpdate("terminal.integrated.shell.windows", shellW32);
        // await executeSettingsUpdate("terminal.integrated.shell.linux", shellLnx);
        // await executeSettingsUpdate("terminal.integrated.shell.osx", shellOsx);
        await configuration.updateVsWs("terminal.integrated.shell.windows", undefined);
        await waitForTeIdle(tc.waitTime.refreshCommand);
        suiteFinished(this);
    });


    test("Multi-Dot", async function()
    {
        if (exitRollingCount(0, successCount)) return;
        this.slow(tc.slowTime.configEventFast * 10);
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
        successCount++;
    });


    test("Ant Glob", async function()
    {
        if (exitRollingCount(1, successCount)) return;
        this.slow((tc.slowTime.configGlobEvent * 2) + tc.slowTime.configReadEvent + tc.waitTime.min);
        globPatterns = configuration.get<string[]>("globPatternsAnt");
        await configuration.updateWs("enabledTasks.ant", false);
        globPatterns.push("**/dummy.xml");
        await executeSettingsUpdate("globPatternsAnt", globPatterns, 50, 100);
        await waitForTeIdle(tc.waitTime.min);
        successCount++;
    });


    test("Ant Glob", async function()
    {
        if (exitRollingCount(2, successCount)) return;
        this.slow(tc.slowTime.configEnableEvent + tc.slowTime.configGlobEvent+ tc.waitTime.min);
        await executeSettingsUpdate("enabledTasks.ant", true);
        globPatterns.pop();
        await executeSettingsUpdate("globPatternsAnt", globPatterns);
        await waitForTeIdle(tc.waitTime.min);
        successCount++;
    });


    test("Bash Glob", async function()
    {
        if (exitRollingCount(3, successCount)) return;
        this.slow(tc.slowTime.configEnableEvent + tc.slowTime.configGlobEvent + tc.slowTime.configReadEvent + tc.waitTime.min);
        globPatterns = configuration.get<string[]>("globPatternsBash");
        await configuration.updateWs("enabledTasks.bash", false);
        globPatterns.push("**/extensionless/**");
        await executeSettingsUpdate("globPatternsBash", globPatterns);
        await waitForTeIdle(tc.waitTime.min);
        successCount++;
    });


    test("Bash Glob", async function()
    {
        if (exitRollingCount(4, successCount)) return;
        this.slow(tc.slowTime.configEnableEvent + tc.slowTime.configGlobEvent + tc.waitTime.min);
        await executeSettingsUpdate("enabledTasks.bash", true);
        globPatterns.pop();
        await executeSettingsUpdate("globPatternsBash", globPatterns);
        await waitForTeIdle(tc.waitTime.min);
        successCount++;
    });


    test("Package Manager - Yarn", async function()
    {
        if (exitRollingCount(5, successCount)) return;
        this.slow(tc.slowTime.configEvent + tc.slowTime.configReadEvent);
        pkgMgr = configuration.getVs<string>("npm.packageManager");
        await configuration.updateVsWs("npm.packageManager", "yarn");
        assert(util.getPackageManager() === "yarn");
        successCount++;
    });


    test("Package Manager - NPM Explicit", async function()
    {
        if (exitRollingCount(6, successCount)) return;
        this.slow(tc.slowTime.configEvent);
        await configuration.updateVsWs("npm.packageManager", "npm");
        assert(util.getPackageManager() === "npm");
        successCount++;
    });


    test("Package Manager - NPM Implicit", async function()
    {
        if (exitRollingCount(7, successCount)) return;
        this.slow(tc.slowTime.configEvent);
        await configuration.updateVsWs("npm.packageManager", "");
        assert(util.getPackageManager() === "npm");
        successCount++;
    });


    test("Package Manager - Auto", async function()
    {
        if (exitRollingCount(8, successCount)) return;
        this.slow(tc.slowTime.configEvent);
        await configuration.updateVsWs("npm.packageManager", "auto");
        assert(util.getPackageManager() === "npm");
        successCount++;
    });


    test("Package Manager - Reset", async function()
    {
        if (exitRollingCount(9, successCount)) return;
        this.slow(tc.slowTime.configEvent);
        await configuration.updateVsWs("npm.packageManager", pkgMgr);
        await configuration.updateVs("npm.packageManager", pkgMgr); // cover global
        assert(util.getPackageManager() === (pkgMgr === "auto" ? "npm" : pkgMgr));
        successCount++;
    });


    test("Change Default Shell - OSX", async function()
    {
        if (exitRollingCount(10, successCount)) return;
        this.slow(tc.slowTime.configEvent + tc.waitTime.min);
        await configuration.updateVsWs("terminal.integrated.shell.osx", "/usr/bin/sh");
        await sleep(tc.waitTime.min);
        successCount++;
    });


    test("Change Default Shell - Linux", async function()
    {
        if (exitRollingCount(11, successCount)) return;
        this.slow(tc.slowTime.configEvent + tc.waitTime.min);
        await configuration.updateVsWs("terminal.integrated.shell.linux", "/bin/sh");
        await sleep(tc.waitTime.min);
        successCount++;
    });


    test("Change Default Shell - Windows", async function()
    {
        if (exitRollingCount(12, successCount)) return;
        this.slow(tc.slowTime.configEvent + tc.waitTime.refreshCommand);
        await configuration.updateVsWs("terminal.integrated.shell.windows", "C:\\Windows\\System32\\cmd.exe");
        await waitForTeIdle(tc.waitTime.refreshCommand);
        successCount++;
    });


    test("Reset Default Shell - OSX", async function()
    {
        if (exitRollingCount(13, successCount)) return;
        this.slow(tc.slowTime.configEvent + tc.waitTime.min);
        await configuration.updateVsWs("terminal.integrated.shell.osx", shellOsx);
        await sleep(tc.waitTime.min);
        successCount++;
    });


    test("Reset Default Shell - Linux", async function()
    {
        if (exitRollingCount(14, successCount)) return;
        this.slow(tc.slowTime.configEvent + tc.waitTime.min);
        await configuration.updateVsWs("terminal.integrated.shell.linux", shellLnx);
        await sleep(tc.waitTime.min);
        successCount++;
    });


    test("Reset Default Shell - Coverage Hit", async function()
    {
        if (exitRollingCount(15, successCount)) return;
        this.slow((tc.slowTime.configEnableEvent * 2) + tc.waitTime.min + tc.waitTime.refreshCommand);
        await executeSettingsUpdate("enabledTasks", Object.assign(enabledTasks, {
            bash: false,
            batch: false,
            nsis: false,
            perl: false,
            powershell: false,
            python: false,
            ruby: false
        }), 25, 50);
        await executeSettingsUpdate("enabledTasks.nsis", true, tc.waitTime.min, tc.waitTime.min * 2); // last of an or'd if() extension.ts ~line 363 processConfigChanges()
        await waitForTeIdle(tc.waitTime.refreshCommand);
        successCount++;
    });


    test("Reset Default Shell - Windows", async function()
    {
        if (exitRollingCount(16, successCount)) return;
        this.slow(tc.slowTime.configEvent + tc.waitTime.refreshCommand);
        await configuration.updateVsWs("terminal.integrated.shell.windows", shellW32);
        await waitForTeIdle(tc.waitTime.refreshCommand);
        successCount++;
    });


    test("Reset Coverage Hit", async function()
    {
        if (exitRollingCount(17, successCount)) return;
        this.slow(tc.waitTime.refreshCommand + tc.slowTime.configEnableEvent);
        await executeSettingsUpdate("enabledTasks", Object.assign(enabledTasks, {
            bash: true,
            batch: true,
            nsis: false,
            perl: false,
            powershell: false,
            python: false,
            ruby: false
        }), tc.waitTime.min, tc.waitTime.min * 2);
        await waitForTeIdle(tc.waitTime.refreshCommand);
        successCount++;
    });


    test("Path to Programs Set Bash", async function()
    {
        if (exitRollingCount(18, successCount)) return;
        this.slow(tc.slowTime.configEvent + tc.waitTime.min);
        await executeSettingsUpdate("pathToPrograms.bash", "c:\\unix\\sh.exe", tc.waitTime.min, tc.waitTime.min * 2);
        successCount++;
    });


    test("Path to Programs Set Composer", async function()
    {
        if (exitRollingCount(19, successCount)) return;
        this.slow(tc.slowTime.configEvent + tc.waitTime.min);
        await executeSettingsUpdate("pathToPrograms.composer", "c:\\php5\\composer.exe", tc.waitTime.min, tc.waitTime.min * 2);
        successCount++;
    });


    test("Path to Programs Clear Bash", async function()
    {
        if (exitRollingCount(20, successCount)) return;
        this.slow(tc.slowTime.configEvent + tc.waitTime.min);
        await executeSettingsUpdate("pathToPrograms.bash", undefined, tc.waitTime.min, tc.waitTime.min * 2);
        successCount++;
    });


    test("Path to Programs Clear Composer", async function()
    {
        if (exitRollingCount(21, successCount)) return;
        this.slow(tc.slowTime.configEvent + tc.waitTime.min);
        await executeSettingsUpdate("pathToPrograms.composer", undefined, tc.waitTime.min, tc.waitTime.min * 2);
        successCount++;
    });


    test("Path to Programs Restore Bash", async function()
    {
        if (exitRollingCount(22, successCount)) return;
        this.slow(tc.slowTime.configEvent + tc.waitTime.min);
        await executeSettingsUpdate("pathToPrograms.bash", pathToPrograms.bash, tc.waitTime.min, tc.waitTime.min * 2);
        successCount++;
    });


    test("Path to Programs Restore Composer", async function()
    {
        if (exitRollingCount(23, successCount)) return;
        this.slow(tc.slowTime.configEvent + tc.waitTime.min);
        await executeSettingsUpdate("pathToPrograms.composer", pathToPrograms.composer, tc.waitTime.min, tc.waitTime.min * 2);
        successCount++;
    });


    test("User Level Setting Update", async function()
    {
        if (exitRollingCount(24, successCount)) return;
        this.slow(tc.slowTime.configEvent * 2 + 50);
        enableConfigWatcher(false);
        const logLevel = configuration.get<number>("logging.level");
        const pathToPrograms = configuration.get<object>("pathToPrograms");
        const pathToAnt = configuration.get<object>("pathToPrograms.ant");
        await configuration.update("logging.level", logLevel);
        await configuration.update("pathToPrograms.ant", pathToAnt);
        await configuration.update("pathToPrograms", pathToPrograms);
        enableConfigWatcher(true);
        await configuration.update("logging.level", logLevel !== 3 ? 3 : 2);
        waitForTeIdle(tc.waitTime.configEvent);
        await configuration.update("logging.level", logLevel);
        waitForTeIdle(tc.waitTime.configEvent);
        successCount++;
    });

});
