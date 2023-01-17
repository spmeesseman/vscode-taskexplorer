/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* tslint:disable */

import { expect } from "chai";
import { IDictionary, ITaskExplorerApi, ITestsApi } from "@spmeesseman/vscode-taskexplorer-types";
import {
    activate, executeSettingsUpdate, exitRollingCount, sleep, suiteFinished, testControl as tc, waitForTeIdle
} from "../utils/utils";

let teApi: ITaskExplorerApi;
let testsApi: ITestsApi;
let globPatterns: string[];
let globPatternsAnt: string[];
let globPatternsBash: string[];
let enabledTasks: IDictionary<boolean>;
let pathToPrograms: IDictionary<string>;
let shellW32: string, shellLnx: string, shellOsx: string, pkgMgr: string;
let successCount = -1;


suite("Configuration / Settings Tests", () =>
{

    suiteSetup(async function()
    {
        ({ teApi, testsApi } = await activate(this));
        testsApi = teApi.testsApi;
        enabledTasks = teApi.config.get<IDictionary<boolean>>("enabledTasks");
        pathToPrograms = teApi.config.get<IDictionary<string>>("pathToPrograms");
        shellW32 = teApi.config.getVs<string>("terminal.integrated.shell.windows");
        shellLnx = teApi.config.getVs<string>("terminal.integrated.shell.linux");
        shellOsx = teApi.config.getVs<string>("terminal.integrated.shell.osx");
        globPatternsAnt = teApi.config.get<string[]>("globPatternsAnt");
        globPatternsBash = teApi.config.get<string[]>("globPatternsBash");
        successCount++;
    });


    suiteTeardown(async function()
    {
        testsApi.enableConfigWatcher(false);
        try {
            if (successCount < 3) {
                await executeSettingsUpdate("globPatternsAnt", globPatternsAnt);
                await executeSettingsUpdate("globPatternsBash", globPatternsBash);
            }
            if(successCount >= 13) {
                await teApi.config.updateVsWs("terminal.integrated.shell.windows", shellW32);
                await teApi.config.updateVsWs("terminal.integrated.shell.linux", shellLnx);
                await teApi.config.updateVsWs("terminal.integrated.shell.osx", shellOsx);
                if(successCount >= 16) {
                    await executeSettingsUpdate("enabledTasks", enabledTasks);
                    await executeSettingsUpdate("pathToPrograms", pathToPrograms);
                }
            }
        }
        catch {}
        finally { testsApi.enableConfigWatcher(true); }
        suiteFinished(this);
    });


    test("Multi-Dot", async function()
    {
        if (exitRollingCount(0, successCount)) return;
        this.slow((tc.slowTime.configEventFast * 10) + (tc.slowTime.configReadEvent * 14));
        //
        // Multi-part settings updates (behavior differs when value is an object)
        // Disable config watcher
        //
        testsApi.enableConfigWatcher(false);
        //
        // 3-part i.e. taskExplorer.pathToPrograms.ant
        //
        let v = teApi.config.get<any>("pathToPrograms.ant");
        expect(teApi.utilities.isString(v)).to.equal(true);
        v = teApi.config.get<any>("pathToPrograms");
        expect(teApi.utilities.isObject(v)).to.equal(true);
        let cv = v.ant;
        await teApi.config.updateWs("pathToPrograms.ant", "/my/path/to/ant");
        v = teApi.config.get<any>("pathToPrograms");
        expect(teApi.utilities.isObject(v) && v.ant === "/my/path/to/ant").to.equal(true);
        await teApi.config.updateWs("pathToPrograms.ant", cv);
        v = teApi.config.get<any>("pathToPrograms");
        expect(teApi.utilities.isObject(v) && v.ant === cv).to.equal(true);
        cv = teApi.config.get<any>("visual.disableAnimatedIcons");
        expect(teApi.utilities.isBoolean(cv)).to.equal(true);
        await teApi.config.updateWs("visual.disableAnimatedIcons", false);
        v = teApi.config.get<any>("visual.disableAnimatedIcons");
        expect(teApi.utilities.isBoolean(v) && v === false).to.equal(true);
        await teApi.config.updateWs("visual.disableAnimatedIcons", cv);
        v = teApi.config.get<any>("visual.disableAnimatedIcons");
        expect(teApi.utilities.isBoolean(v) && v === cv).to.equal(true);
        //
        // 4-part i.e. taskExplorer.specialFolders.expanded.lastTasks
        //
        const cv2 = cv = teApi.config.get<any>("specialFolders.expanded.lastTasks");
        expect(teApi.utilities.isBoolean(cv) && teApi.utilities.isBoolean(cv2)).to.equal(true);
        await teApi.config.updateWs("specialFolders.expanded.lastTasks", false);
        v = teApi.config.get<any>("specialFolders.expanded.lastTasks");
        expect(teApi.utilities.isBoolean(v) && v === false).to.equal(true);
        await teApi.config.updateWs("specialFolders.expanded.lastTasks", true);
        v = teApi.config.get<any>("specialFolders.expanded.lastTasks");
        expect(teApi.utilities.isBoolean(v) && v === true).to.equal(true);
        await teApi.config.updateWs("specialFolders.expanded.lastTasks", cv);
        v = teApi.config.get<any>("specialFolders.expanded.lastTasks");
        expect(teApi.utilities.isBoolean(v) && v === cv).to.equal(true);
        cv = teApi.config.get<any>("specialFolders.expanded");
        expect(teApi.utilities.isObject(cv)).to.equal(true);
        cv.lastTasks = false;
        await teApi.config.updateWs("specialFolders.expanded", cv);
        v = teApi.config.get<any>("specialFolders.expanded.lastTasks");
        expect(teApi.utilities.isBoolean(v) && v === false).to.equal(true);
        expect(teApi.utilities.isObject(cv)).to.equal(true);
        cv.lastTasks = true;
        await teApi.config.updateWs("specialFolders.expanded", cv);
        v = teApi.config.get<any>("specialFolders.expanded.lastTasks");
        expect(teApi.utilities.isBoolean(v) && v === true).to.equal(true);
        cv.lastTasks = cv2;
        await teApi.config.updateWs("specialFolders.expanded.lastTasks", cv2);
        v = teApi.config.get<any>("specialFolders.expanded.lastTasks");
        expect(teApi.utilities.isBoolean(v) && v === cv2).to.equal(true);
        //
        // Re-enable config watcher
        //
        testsApi.enableConfigWatcher(true);
        successCount++;
    });


    test("Ant Glob", async function()
    {
        if (exitRollingCount(1, successCount)) return;
        this.slow(tc.slowTime.configEnableEvent + tc.waitTime.configEnableEvent + tc.slowTime.configGlobEvent + tc.slowTime.configReadEvent +
                  tc.waitTime.configGlobEvent + tc.slowTime.configReadEvent + tc.waitTime.min);
        globPatterns = teApi.config.get<string[]>("globPatternsAnt");
        await executeSettingsUpdate("enabledTasks.ant", false, tc.waitTime.configEnableEvent);
        globPatterns.push("**/dummy.xml");
        await executeSettingsUpdate("globPatternsAnt", globPatterns, tc.waitTime.configGlobEvent);
        await waitForTeIdle(tc.waitTime.min);
        successCount++;
    });


    test("Reset Ant Glob", async function()
    {
        if (exitRollingCount(2, successCount)) return;
        this.slow(tc.slowTime.configEnableEvent + tc.waitTime.configEnableEvent + tc.slowTime.configGlobEvent + tc.waitTime.configGlobEvent + tc.waitTime.min);
        await executeSettingsUpdate("enabledTasks.ant", true, tc.waitTime.configEnableEvent);
        globPatterns.pop();
        await executeSettingsUpdate("globPatternsAnt", globPatterns, tc.waitTime.configGlobEvent);
        await waitForTeIdle(tc.waitTime.min);
        successCount++;
    });


    test("Bash Glob", async function()
    {
        if (exitRollingCount(3, successCount)) return;
        this.slow(tc.slowTime.configEnableEvent + tc.waitTime.configEnableEvent + tc.slowTime.configGlobEvent + tc.slowTime.configReadEvent + tc.waitTime.min);
        globPatterns = teApi.config.get<string[]>("globPatternsBash");
        await executeSettingsUpdate("enabledTasks.bash", false, tc.waitTime.configEnableEvent);
        globPatterns.push("**/extensionless/**");
        await executeSettingsUpdate("globPatternsBash", globPatterns);
        await waitForTeIdle(tc.waitTime.min);
        successCount++;
    });


    test("Reset Bash Glob", async function()
    {
        if (exitRollingCount(4, successCount)) return;
        this.slow(tc.slowTime.configEnableEvent + tc.waitTime.configEnableEvent + tc.slowTime.configGlobEvent + tc.waitTime.min);
        await executeSettingsUpdate("enabledTasks.bash", true, tc.waitTime.configEnableEvent);
        globPatterns.pop();
        await executeSettingsUpdate("globPatternsBash", globPatterns);
        await waitForTeIdle(tc.waitTime.min);
        successCount++;
    });


    test("Package Manager - Yarn", async function()
    {
        if (exitRollingCount(5, successCount)) return;
        this.slow(tc.slowTime.configEvent + tc.slowTime.configReadEvent);
        pkgMgr = teApi.config.getVs<string>("npm.packageManager");
        await teApi.config.updateVsWs("npm.packageManager", "yarn");
        expect(teApi.utilities.getPackageManager() === "yarn");
        successCount++;
    });


    test("Package Manager - NPM Explicit", async function()
    {
        if (exitRollingCount(6, successCount)) return;
        this.slow(tc.slowTime.configEvent);
        await teApi.config.updateVsWs("npm.packageManager", "npm");
        expect(teApi.utilities.getPackageManager()).to.equal("npm");
        successCount++;
    });


    test("Package Manager - NPM Implicit", async function()
    {
        if (exitRollingCount(7, successCount)) return;
        this.slow(tc.slowTime.configEvent);
        await teApi.config.updateVsWs("npm.packageManager", "");
        expect(teApi.utilities.getPackageManager()).to.equal("npm");
        successCount++;
    });


    test("Package Manager - Auto", async function()
    {
        if (exitRollingCount(8, successCount)) return;
        this.slow(tc.slowTime.configEvent);
        await teApi.config.updateVsWs("npm.packageManager", "auto");
        expect(teApi.utilities.getPackageManager()).to.equal("npm");
        successCount++;
    });


    test("Package Manager - Reset", async function()
    {
        if (exitRollingCount(9, successCount)) return;
        this.slow(tc.slowTime.configEvent);
        await teApi.config.updateVsWs("npm.packageManager", pkgMgr);
        await teApi.config.updateVs("npm.packageManager", pkgMgr); // cover global
        expect(teApi.utilities.getPackageManager()).to.equal(pkgMgr === "auto" ? "npm" : pkgMgr);
        successCount++;
    });


    test("Change Default Shell - OSX", async function()
    {
        if (exitRollingCount(10, successCount)) return;
        this.slow(tc.slowTime.configEvent + tc.waitTime.min);
        await teApi.config.updateVsWs("terminal.integrated.shell.osx", "/usr/bin/sh");
        await sleep(tc.waitTime.min);
        successCount++;
    });


    test("Change Default Shell - Linux", async function()
    {
        if (exitRollingCount(11, successCount)) return;
        this.slow(tc.slowTime.configEvent + tc.waitTime.min);
        await teApi.config.updateVsWs("terminal.integrated.shell.linux", "/bin/sh");
        await sleep(tc.waitTime.min);
        successCount++;
    });


    test("Change Default Shell - Windows", async function()
    {
        if (exitRollingCount(12, successCount)) return;
        this.slow(tc.slowTime.configEvent + (tc.waitTime.refreshCommand * 2));
        await teApi.config.updateVsWs("terminal.integrated.shell.windows", "C:\\Windows\\System32\\cmd.exe");
        await waitForTeIdle(tc.waitTime.refreshCommand);
        successCount++;
    });


    test("Reset Default Shell - OSX", async function()
    {
        if (exitRollingCount(13, successCount)) return;
        this.slow(tc.slowTime.configEvent + tc.waitTime.configEvent);
        // Set up coverage on if() statement in configWatcher ~ ln 240
        testsApi.enableConfigWatcher(false);
        await executeSettingsUpdate("enabledTasks", {
            bash: false,
            batch: false,
            nsis: false,
            perl: false,
            powershell: false,
            python: false,
            ruby: false
        });
        testsApi.enableConfigWatcher(true);
        await teApi.config.updateVsWs("terminal.integrated.shell.osx", shellOsx);
        await waitForTeIdle(tc.waitTime.configEvent);
        successCount++;
    });


    test("Reset Default Shell - Linux", async function()
    {
        if (exitRollingCount(14, successCount)) return;
        this.slow(tc.slowTime.configEvent + tc.slowTime.refreshCommandNoChanges + tc.slowTime.refreshCommandNoChanges);
        // Set up coverage on if() statement in configWatcher ~ ln 240
        testsApi.enableConfigWatcher(false);
        await executeSettingsUpdate("enabledTasks.nsis", true); // last of an or'd if() extension.ts ~line 240 processConfigChanges()
        testsApi.enableConfigWatcher(true);
        await teApi.config.updateVsWs("terminal.integrated.shell.linux", shellLnx);
        await waitForTeIdle(tc.waitTime.refreshCommandNoChanges);
        successCount++;
    });


    test("Reset Default Shell - Windows", async function()
    {
        if (exitRollingCount(15, successCount)) return;
        this.slow(tc.slowTime.configEvent + tc.waitTime.refreshCommandNoChanges + tc.slowTime.refreshCommandNoChanges);
        // Set up coverage on if() statement in configWatcher ~ ln 240
        testsApi.enableConfigWatcher(false);
        await executeSettingsUpdate("enabledTasks", enabledTasks); // reset back to default enabled tasks
        testsApi.enableConfigWatcher(true);
        await teApi.config.updateVsWs("terminal.integrated.shell.windows", shellW32);
        await waitForTeIdle(tc.waitTime.refreshCommandNoChanges); // setting with current enabled tasks will trigger a refresh
        successCount++;                                  // but since no glob/file changes it'll be noticed by fcache and quick
    });


    test("Path to Programs Set Bash", async function()
    {
        if (exitRollingCount(16, successCount)) return;
        this.slow(tc.slowTime.configEvent + tc.waitTime.min);
        await executeSettingsUpdate("pathToPrograms.bash", "c:\\unix\\sh.exe", tc.waitTime.min, tc.waitTime.min * 2);
        successCount++;
    });


    test("Path to Programs Set Composer", async function()
    {
        if (exitRollingCount(17, successCount)) return;
        this.slow(tc.slowTime.configEvent + tc.waitTime.min);
        await executeSettingsUpdate("pathToPrograms.composer", "c:\\php5\\composer.exe", tc.waitTime.min, tc.waitTime.min * 2);
        successCount++;
    });


    test("Path to Programs Clear Bash", async function()
    {
        if (exitRollingCount(18, successCount)) return;
        this.slow(tc.slowTime.configEvent + tc.waitTime.min);
        await executeSettingsUpdate("pathToPrograms.bash", undefined, tc.waitTime.min, tc.waitTime.min * 2);
        successCount++;
    });


    test("Path to Programs Clear Composer", async function()
    {
        if (exitRollingCount(19, successCount)) return;
        this.slow(tc.slowTime.configEvent + tc.waitTime.min);
        await executeSettingsUpdate("pathToPrograms.composer", undefined, tc.waitTime.min, tc.waitTime.min * 2);
        successCount++;
    });


    test("Path to Programs Restore Bash", async function()
    {
        if (exitRollingCount(20, successCount)) return;
        this.slow(tc.slowTime.configEvent + tc.waitTime.min);
        await executeSettingsUpdate("pathToPrograms.bash", pathToPrograms.bash, tc.waitTime.min, tc.waitTime.min * 2);
        successCount++;
    });


    test("Path to Programs Restore Composer", async function()
    {
        if (exitRollingCount(21, successCount)) return;
        this.slow(tc.slowTime.configEvent + tc.waitTime.min);
        await executeSettingsUpdate("pathToPrograms.composer", pathToPrograms.composer, tc.waitTime.min, tc.waitTime.min * 2);
        successCount++;
    });


    test("User Level Setting Update", async function()
    {
        if (exitRollingCount(22, successCount)) return;
        this.slow(tc.slowTime.configEvent * 2 + 50);
        testsApi.enableConfigWatcher(false);
        const logLevel = teApi.config.get<number>("logging.level");
        const pathToPrograms = teApi.config.get<object>("pathToPrograms");
        const pathToAnt = teApi.config.get<object>("pathToPrograms.ant");
        await teApi.config.update("logging.level", logLevel);
        await teApi.config.update("pathToPrograms.ant", pathToAnt);
        await teApi.config.update("pathToPrograms", pathToPrograms);
        testsApi.enableConfigWatcher(true);
        await teApi.config.update("logging.level", logLevel !== 3 ? 3 : 2);
        waitForTeIdle(tc.waitTime.configEvent);
        await teApi.config.update("logging.level", logLevel);
        waitForTeIdle(tc.waitTime.configEvent);
        successCount++;
    });

});
