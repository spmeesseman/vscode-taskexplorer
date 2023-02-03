/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* tslint:disable */

import { expect } from "chai";
import { executeSettingsUpdate } from "../utils/commandUtils";
import { IDictionary, ITaskExplorerApi, ITestsApi } from "@spmeesseman/vscode-taskexplorer-types";
import {
    activate, endRollingCount, exitRollingCount, getSuccessCount, sleep,
    suiteFinished, testControl as tc, waitForTeIdle
} from "../utils/utils";

let teApi: ITaskExplorerApi;
let testsApi: ITestsApi;
let globPatterns: string[];
let globPatternsAnt: string[];
let globPatternsBash: string[];
let enabledTasks: IDictionary<boolean>;
let pathToPrograms: IDictionary<string>;
let shellW32: string, shellLnx: string, shellOsx: string, pkgMgr: string;


suite("Configuration / Settings Tests", () =>
{

    suiteSetup(async function()
    {
        if (exitRollingCount(this, true)) return;
        ({ teApi, testsApi } = await activate(this));
        testsApi = teApi.testsApi;
        enabledTasks = teApi.testsApi.config.get<IDictionary<boolean>>("enabledTasks");
        pathToPrograms = teApi.testsApi.config.get<IDictionary<string>>("pathToPrograms");
        shellW32 = teApi.testsApi.config.getVs<string>("terminal.integrated.shell.windows");
        shellLnx = teApi.testsApi.config.getVs<string>("terminal.integrated.shell.linux");
        shellOsx = teApi.testsApi.config.getVs<string>("terminal.integrated.shell.osx");
        globPatternsAnt = teApi.testsApi.config.get<string[]>("globPatternsAnt");
        globPatternsBash = teApi.testsApi.config.get<string[]>("globPatternsBash");
        pkgMgr = teApi.testsApi.config.getVs<string>("npm.packageManager");
        endRollingCount(this, true);
    });


    suiteTeardown(async function()
    {
        if (exitRollingCount(this, false, true)) return;
        testsApi.enableConfigWatcher(false);
        try {
            const successCount = getSuccessCount(this);
            if (successCount < 3)
            {
                await executeSettingsUpdate("globPatternsAnt", globPatternsAnt);
                await executeSettingsUpdate("globPatternsBash", globPatternsBash);
            }
            if (successCount >= 5 && successCount <  11)
            {
                await teApi.testsApi.config.updateVsWs("npm.packageManager", pkgMgr);
            }
            if(successCount >= 13)
            {
                await teApi.testsApi.config.updateVsWs("terminal.integrated.shell.windows", shellW32);
                await teApi.testsApi.config.updateVsWs("terminal.integrated.shell.linux", shellLnx);
                await teApi.testsApi.config.updateVsWs("terminal.integrated.shell.osx", shellOsx);
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
        if (exitRollingCount(this)) return;
        this.slow((tc.slowTime.config.eventFast * 10) + (tc.slowTime.config.readEvent * 14));
        //
        // Multi-part settings updates (behavior differs when value is an object)
        // Disable config watcher
        //
        testsApi.enableConfigWatcher(false);
        //
        // 3-part i.e. taskExplorer.pathToPrograms.ant
        //
        let v = teApi.testsApi.config.get<any>("pathToPrograms.ant");
        expect(teApi.testsApi.utilities.isString(v)).to.equal(true);
        v = teApi.testsApi.config.get<any>("pathToPrograms");
        expect(teApi.testsApi.utilities.isObject(v)).to.equal(true);
        let cv = v.ant;
        await teApi.testsApi.config.updateWs("pathToPrograms.ant", "/my/path/to/ant");
        v = teApi.testsApi.config.get<any>("pathToPrograms");
        expect(teApi.testsApi.utilities.isObject(v) && v.ant === "/my/path/to/ant").to.equal(true);
        await teApi.testsApi.config.updateWs("pathToPrograms.ant", cv);
        v = teApi.testsApi.config.get<any>("pathToPrograms");
        expect(teApi.testsApi.utilities.isObject(v) && v.ant === cv).to.equal(true);
        cv = teApi.testsApi.config.get<any>("visual.disableAnimatedIcons");
        expect(teApi.testsApi.utilities.isBoolean(cv)).to.equal(true);
        await teApi.testsApi.config.updateWs("visual.disableAnimatedIcons", false);
        v = teApi.testsApi.config.get<any>("visual.disableAnimatedIcons");
        expect(teApi.testsApi.utilities.isBoolean(v) && v === false).to.equal(true);
        await teApi.testsApi.config.updateWs("visual.disableAnimatedIcons", cv);
        v = teApi.testsApi.config.get<any>("visual.disableAnimatedIcons");
        expect(teApi.testsApi.utilities.isBoolean(v) && v === cv).to.equal(true);
        //
        // 4-part i.e. taskExplorer.specialFolders.expanded.lastTasks
        //
        const cv2 = cv = teApi.testsApi.config.get<any>("specialFolders.expanded.lastTasks");
        expect(teApi.testsApi.utilities.isBoolean(cv) && teApi.testsApi.utilities.isBoolean(cv2)).to.equal(true);
        await teApi.testsApi.config.updateWs("specialFolders.expanded.lastTasks", false);
        v = teApi.testsApi.config.get<any>("specialFolders.expanded.lastTasks");
        expect(teApi.testsApi.utilities.isBoolean(v) && v === false).to.equal(true);
        await teApi.testsApi.config.updateWs("specialFolders.expanded.lastTasks", true);
        v = teApi.testsApi.config.get<any>("specialFolders.expanded.lastTasks");
        expect(teApi.testsApi.utilities.isBoolean(v) && v === true).to.equal(true);
        await teApi.testsApi.config.updateWs("specialFolders.expanded.lastTasks", cv);
        v = teApi.testsApi.config.get<any>("specialFolders.expanded.lastTasks");
        expect(teApi.testsApi.utilities.isBoolean(v) && v === cv).to.equal(true);
        cv = teApi.testsApi.config.get<any>("specialFolders.expanded");
        expect(teApi.testsApi.utilities.isObject(cv)).to.equal(true);
        cv.lastTasks = false;
        await teApi.testsApi.config.updateWs("specialFolders.expanded", cv);
        v = teApi.testsApi.config.get<any>("specialFolders.expanded.lastTasks");
        expect(teApi.testsApi.utilities.isBoolean(v) && v === false).to.equal(true);
        expect(teApi.testsApi.utilities.isObject(cv)).to.equal(true);
        cv.lastTasks = true;
        await teApi.testsApi.config.updateWs("specialFolders.expanded", cv);
        v = teApi.testsApi.config.get<any>("specialFolders.expanded.lastTasks");
        expect(teApi.testsApi.utilities.isBoolean(v) && v === true).to.equal(true);
        cv.lastTasks = cv2;
        await teApi.testsApi.config.updateWs("specialFolders.expanded.lastTasks", cv2);
        v = teApi.testsApi.config.get<any>("specialFolders.expanded.lastTasks");
        expect(teApi.testsApi.utilities.isBoolean(v) && v === cv2).to.equal(true);
        //
        // Re-enable config watcher
        //
        testsApi.enableConfigWatcher(true);
        endRollingCount(this);
    });


    test("Ant Glob", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.config.enableEvent + tc.slowTime.config.globEvent + tc.slowTime.config.readEvent +
                  tc.waitTime.config.globEvent + tc.slowTime.config.readEvent);
        globPatterns = teApi.testsApi.config.get<string[]>("globPatternsAnt");
        await executeSettingsUpdate("enabledTasks.ant", false, tc.waitTime.config.enableEvent);
        globPatterns.push("**/dummy.xml");
        await executeSettingsUpdate("globPatternsAnt", globPatterns, tc.waitTime.config.globEvent);
        endRollingCount(this);
    });


    test("Reset Ant Glob", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.config.enableEvent + tc.slowTime.config.globEvent);
        await executeSettingsUpdate("enabledTasks.ant", true, tc.waitTime.config.enableEvent);
        globPatterns.pop();
        await executeSettingsUpdate("globPatternsAnt", globPatterns, tc.waitTime.config.globEvent);
        endRollingCount(this);
    });


    test("Bash Glob", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.config.enableEvent + tc.slowTime.config.globEvent + tc.slowTime.config.readEvent);
        globPatterns = teApi.testsApi.config.get<string[]>("globPatternsBash");
        await executeSettingsUpdate("enabledTasks.bash", false, tc.waitTime.config.enableEvent);
        globPatterns.push("**/extensionless/**");
        await executeSettingsUpdate("globPatternsBash", globPatterns);
        endRollingCount(this);
    });


    test("Reset Bash Glob", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.config.enableEvent + tc.slowTime.config.globEvent);
        await executeSettingsUpdate("enabledTasks.bash", true, tc.waitTime.config.enableEvent);
        globPatterns.pop();
        await executeSettingsUpdate("globPatternsBash", globPatterns);
        endRollingCount(this);
    });


    test("Package Manager - Yarn", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.config.event + tc.slowTime.config.readEvent);
        await teApi.testsApi.config.updateVsWs("npm.packageManager", "yarn");
        expect(teApi.testsApi.utilities.getPackageManager() === "yarn");
        endRollingCount(this);
    });


    test("Package Manager - NPM Explicit", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.config.event);
        await teApi.testsApi.config.updateVsWs("npm.packageManager", "npm");
        expect(teApi.testsApi.utilities.getPackageManager()).to.equal("npm");
        endRollingCount(this);
    });


    test("Package Manager - NPM Implicit", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.config.event);
        await teApi.testsApi.config.updateVsWs("npm.packageManager", "");
        expect(teApi.testsApi.utilities.getPackageManager()).to.equal("npm");
        endRollingCount(this);
    });


    test("Package Manager - Auto", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.config.event);
        await teApi.testsApi.config.updateVsWs("npm.packageManager", "auto");
        expect(teApi.testsApi.utilities.getPackageManager()).to.equal("npm");
        endRollingCount(this);
    });


    test("Package Manager - Reset", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.config.event);
        await teApi.testsApi.config.updateVsWs("npm.packageManager", pkgMgr);
        // await teApi.testsApi.config.updateVs("npm.packageManager", pkgMgr); // cover global
        expect(teApi.testsApi.utilities.getPackageManager()).to.equal(pkgMgr === "auto" ? "npm" : pkgMgr);
        endRollingCount(this);
    });


    test("Change Default Shell - OSX", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.config.shellChange);
        await teApi.testsApi.config.updateVsWs("terminal.integrated.shell.osx", "/usr/bin/sh");
        await waitForTeIdle(tc.waitTime.config.shellChange);
        endRollingCount(this);
    });


    test("Change Default Shell - Linux", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.config.shellChange);
        await teApi.testsApi.config.updateVsWs("terminal.integrated.shell.linux", "/bin/sh");
        await waitForTeIdle(tc.waitTime.config.shellChange);
        endRollingCount(this);
    });


    test("Change Default Shell - Windows", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.config.shellChange);
        await teApi.testsApi.config.updateVsWs("terminal.integrated.shell.windows", "C:\\Windows\\System32\\cmd.exe");
        await waitForTeIdle(tc.waitTime.config.shellChange);
        endRollingCount(this);
    });


    test("Reset Default Shell - OSX", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.config.shellChange);
        // Set up coverage on if() statement in configWatcher ~ ln 260
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
        await teApi.testsApi.config.updateVsWs("terminal.integrated.shell.osx", shellOsx);
        await waitForTeIdle(tc.waitTime.config.shellChange);
        endRollingCount(this);
    });


    test("Reset Default Shell - Linux", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.config.shellChange);
        testsApi.enableConfigWatcher(false);
        await executeSettingsUpdate("enabledTasks.nsis", true);
        testsApi.enableConfigWatcher(true);
        await teApi.testsApi.config.updateVsWs("terminal.integrated.shell.linux", shellLnx);
        await waitForTeIdle(tc.waitTime.config.shellChange);
        endRollingCount(this);
    });


    test("Reset Default Shell - Windows", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.config.shellChange);
        // Set up coverage on if() statement in configWatcher ~ ln 240
        testsApi.enableConfigWatcher(false);
        await executeSettingsUpdate("enabledTasks", enabledTasks); // reset back to default enabled tasks
        testsApi.enableConfigWatcher(true);
        await teApi.testsApi.config.updateVsWs("terminal.integrated.shell.windows", shellW32);
        await waitForTeIdle(tc.waitTime.config.shellChange);
        endRollingCount(this);
    });


    test("Path to Programs Set Composer", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.config.pathToProgramsEvent);
        await executeSettingsUpdate("pathToPrograms.composer", "c:\\php5\\composer.exe");
        endRollingCount(this);
    });


    test("Path to Programs Clear Composer", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.config.pathToProgramsEvent);
        await executeSettingsUpdate("pathToPrograms.composer", undefined);
        endRollingCount(this);
    });


    test("Path to Programs Restore Composer", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.config.pathToProgramsEvent);
        await executeSettingsUpdate("pathToPrograms.composer", pathToPrograms.composer);
        endRollingCount(this);
    });


    test("User Level Setting Update", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.config.event * 2 + 50);
        testsApi.enableConfigWatcher(false);
        const logLevel = teApi.testsApi.config.get<number>("logging.level");
        const pathToPrograms = teApi.testsApi.config.get<object>("pathToPrograms");
        const pathToAnt = teApi.testsApi.config.get<object>("pathToPrograms.ant");
        await teApi.testsApi.config.update("logging.level", logLevel);
        await teApi.testsApi.config.update("pathToPrograms.ant", pathToAnt);
        await teApi.testsApi.config.update("pathToPrograms", pathToPrograms);
        testsApi.enableConfigWatcher(true);
        await teApi.testsApi.config.update("logging.level", logLevel !== 3 ? 3 : 2);
        waitForTeIdle(tc.waitTime.config.event);
        await teApi.testsApi.config.update("logging.level", logLevel);
        waitForTeIdle(tc.waitTime.config.event);
        endRollingCount(this);
    });

});
