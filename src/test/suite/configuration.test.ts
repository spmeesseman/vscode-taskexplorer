/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* tslint:disable */

import { expect } from "chai";
import { executeSettingsUpdate } from "../utils/commandUtils";
import { IDictionary, ITeWrapper } from "@spmeesseman/vscode-taskexplorer-types";
import {
    activate, endRollingCount, exitRollingCount, getSuccessCount, suiteFinished, testControl as tc, waitForTeIdle
} from "../utils/utils";

let teWrapper: ITeWrapper;
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
        ({ teWrapper } = await activate(this));
        enabledTasks = teWrapper.config.get<IDictionary<boolean>>("enabledTasks");
        pathToPrograms = teWrapper.config.get<IDictionary<string>>("pathToPrograms");
        shellW32 = teWrapper.config.getVs<string>("terminal.integrated.shell.windows");
        shellLnx = teWrapper.config.getVs<string>("terminal.integrated.shell.linux");
        shellOsx = teWrapper.config.getVs<string>("terminal.integrated.shell.osx");
        globPatternsAnt = teWrapper.config.get<string[]>("globPatternsAnt");
        globPatternsBash = teWrapper.config.get<string[]>("globPatternsBash");
        pkgMgr = teWrapper.config.getVs<string>("npm.packageManager");
        endRollingCount(this, true);
    });


    suiteTeardown(async function()
    {
        if (exitRollingCount(this, false, true)) return;
        teWrapper.configwatcher = false;
        try {
            const successCount = getSuccessCount(this);
            if (successCount < 3)
            {
                await executeSettingsUpdate("globPatternsAnt", globPatternsAnt);
                await executeSettingsUpdate("globPatternsBash", globPatternsBash);
            }
            if (successCount >= 5 && successCount <  11)
            {
                await teWrapper.config.updateVsWs("npm.packageManager", pkgMgr);
            }
            if(successCount >= 13)
            {
                await teWrapper.config.updateVsWs("terminal.integrated.shell.windows", shellW32);
                await teWrapper.config.updateVsWs("terminal.integrated.shell.linux", shellLnx);
                await teWrapper.config.updateVsWs("terminal.integrated.shell.osx", shellOsx);
                if(successCount >= 16) {
                    await executeSettingsUpdate("enabledTasks", enabledTasks);
                    await executeSettingsUpdate("pathToPrograms", pathToPrograms);
                }
            }
        }
        catch {}
        finally { teWrapper.configwatcher = true; }
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
        teWrapper.configwatcher = false;
        //
        // 3-part i.e. taskexplorer.pathToPrograms.ant
        //
        let v = teWrapper.config.get<any>("pathToPrograms.ant");
        expect(teWrapper.utils.isString(v)).to.equal(true);
        v = teWrapper.config.get<any>("pathToPrograms");
        expect(teWrapper.utils.isObject(v)).to.equal(true);
        let cv = v.ant;
        await teWrapper.config.updateWs("pathToPrograms.ant", "/my/path/to/ant");
        v = teWrapper.config.get<any>("pathToPrograms");
        expect(teWrapper.utils.isObject(v) && v.ant === "/my/path/to/ant").to.equal(true);
        await teWrapper.config.updateWs("pathToPrograms.ant", cv);
        v = teWrapper.config.get<any>("pathToPrograms");
        expect(teWrapper.utils.isObject(v) && v.ant === cv).to.equal(true);
        cv = teWrapper.config.get<any>("visual.disableAnimatedIcons");
        expect(teWrapper.utils.isBoolean(cv)).to.equal(true);
        await teWrapper.config.updateWs("visual.disableAnimatedIcons", false);
        v = teWrapper.config.get<any>("visual.disableAnimatedIcons");
        expect(teWrapper.utils.isBoolean(v) && v === false).to.equal(true);
        await teWrapper.config.updateWs("visual.disableAnimatedIcons", cv);
        v = teWrapper.config.get<any>("visual.disableAnimatedIcons");
        expect(teWrapper.utils.isBoolean(v) && v === cv).to.equal(true);
        //
        // 4-part i.e. taskexplorer.specialFolders.folderState.lastTasks
        //
        const cv2 = cv = teWrapper.config.get<any>("specialFolders.folderState.lastTasks");
        expect(teWrapper.utils.isString(cv) && teWrapper.utils.isString(cv2)).to.equal(true);
        await teWrapper.config.updateWs("specialFolders.folderState.lastTasks", "Collapsed");
        v = teWrapper.config.get<any>("specialFolders.folderState.lastTasks");
        expect(teWrapper.utils.isString(v) && v === "Collapsed").to.equal(true);
        await teWrapper.config.updateWs("specialFolders.folderState.lastTasks", "Expanded");
        v = teWrapper.config.get<any>("specialFolders.folderState.lastTasks");
        expect(teWrapper.utils.isString(v) && v === "Expanded").to.equal(true);
        await teWrapper.config.updateWs("specialFolders.folderState.lastTasks", cv);
        v = teWrapper.config.get<any>("specialFolders.folderState.lastTasks");
        expect(teWrapper.utils.isString(v) && v === cv).to.equal(true);
        cv = teWrapper.config.get<any>("specialFolders.folderState");
        expect(teWrapper.utils.isObject(cv)).to.equal(true);
        cv.lastTasks = "Collapsed";
        await teWrapper.config.updateWs("specialFolders.folderState", cv);
        v = teWrapper.config.get<any>("specialFolders.folderState.lastTasks");
        expect(teWrapper.utils.isString(v) && v === "Collapsed").to.equal(true);
        expect(teWrapper.utils.isObject(cv)).to.equal(true);
        cv.lastTasks = "Expanded";
        await teWrapper.config.updateWs("specialFolders.folderState", cv);
        v = teWrapper.config.get<any>("specialFolders.folderState.lastTasks");
        expect(teWrapper.utils.isString(v) && v === "Expanded").to.equal(true);
        cv.lastTasks = cv2;
        await teWrapper.config.updateWs("specialFolders.folderState.lastTasks", cv2);
        v = teWrapper.config.get<any>("specialFolders.folderState.lastTasks");
        expect(teWrapper.utils.isString(v) && v === cv2).to.equal(true);
        //
        // Re-enable config watcher
        //
        teWrapper.configwatcher = true;
        endRollingCount(this);
    });


    test("Ant Glob", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.config.enableEvent + tc.slowTime.config.globEvent + tc.slowTime.config.readEvent +
                  tc.waitTime.config.globEvent + tc.slowTime.config.readEvent);
        globPatterns = teWrapper.config.get<string[]>("globPatternsAnt");
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
        globPatterns = teWrapper.config.get<string[]>("globPatternsBash");
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
        await teWrapper.config.updateVsWs("npm.packageManager", "yarn");
        expect(teWrapper.utils.getPackageManager() === "yarn");
        endRollingCount(this);
    });


    test("Package Manager - NPM Explicit", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.config.event);
        await teWrapper.config.updateVsWs("npm.packageManager", "npm");
        expect(teWrapper.utils.getPackageManager()).to.equal("npm");
        endRollingCount(this);
    });


    test("Package Manager - NPM Implicit", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.config.event);
        await teWrapper.config.updateVsWs("npm.packageManager", "");
        expect(teWrapper.utils.getPackageManager()).to.equal("npm");
        endRollingCount(this);
    });


    test("Package Manager - Auto", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.config.event);
        await teWrapper.config.updateVsWs("npm.packageManager", "auto");
        expect(teWrapper.utils.getPackageManager()).to.equal("npm");
        endRollingCount(this);
    });


    test("Package Manager - Reset", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.config.event);
        await teWrapper.config.updateVsWs("npm.packageManager", pkgMgr);
        // await teWrapper.config.updateVs("npm.packageManager", pkgMgr); // cover global
        expect(teWrapper.utils.getPackageManager()).to.equal(pkgMgr === "auto" ? "npm" : pkgMgr);
        endRollingCount(this);
    });


    test("Change Default Shell - OSX", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.config.shellChange);
        await teWrapper.config.updateVsWs("terminal.integrated.shell.osx", "/usr/bin/sh");
        await waitForTeIdle(tc.waitTime.config.shellChange);
        endRollingCount(this);
    });


    test("Change Default Shell - Linux", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.config.shellChange);
        await teWrapper.config.updateVsWs("terminal.integrated.shell.linux", "/bin/sh");
        await waitForTeIdle(tc.waitTime.config.shellChange);
        endRollingCount(this);
    });


    test("Change Default Shell - Windows", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.config.shellChange);
        await teWrapper.config.updateVsWs("terminal.integrated.shell.windows", "C:\\Windows\\System32\\cmd.exe");
        await waitForTeIdle(tc.waitTime.config.shellChange);
        endRollingCount(this);
    });


    test("Reset Default Shell - OSX", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.config.shellChange);
        // Set up coverage on if() statement in configWatcher ~ ln 260
        teWrapper.configwatcher = false;
        await executeSettingsUpdate("enabledTasks", {
            bash: false,
            batch: false,
            nsis: false,
            perl: false,
            powershell: false,
            python: false,
            ruby: false
        });
        teWrapper.configwatcher = true;
        await teWrapper.config.updateVsWs("terminal.integrated.shell.osx", shellOsx);
        await waitForTeIdle(tc.waitTime.config.shellChange);
        endRollingCount(this);
    });


    test("Reset Default Shell - Linux", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.config.shellChange);
        teWrapper.configwatcher = false;
        await executeSettingsUpdate("enabledTasks.nsis", true);
        teWrapper.configwatcher = true;
        await teWrapper.config.updateVsWs("terminal.integrated.shell.linux", shellLnx);
        await waitForTeIdle(tc.waitTime.config.shellChange);
        endRollingCount(this);
    });


    test("Reset Default Shell - Windows", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.config.shellChange);
        // Set up coverage on if() statement in configWatcher ~ ln 240
        teWrapper.configwatcher = false;
        await executeSettingsUpdate("enabledTasks", enabledTasks); // reset back to default enabled tasks
        teWrapper.configwatcher = true;
        await teWrapper.config.updateVsWs("terminal.integrated.shell.windows", shellW32);
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
        teWrapper.configwatcher = false;
        const logLevel = teWrapper.config.get<number>("logging.level");
        const pathToPrograms = teWrapper.config.get<object>("pathToPrograms");
        const pathToAnt = teWrapper.config.get<object>("pathToPrograms.ant");
        await teWrapper.config.update("logging.level", logLevel);
        await teWrapper.config.update("pathToPrograms.ant", pathToAnt);
        await teWrapper.config.update("pathToPrograms", pathToPrograms);
        teWrapper.configwatcher = true;
        await teWrapper.config.update("logging.level", logLevel !== 3 ? 3 : 2);
        waitForTeIdle(tc.waitTime.config.event);
        await teWrapper.config.update("logging.level", logLevel);
        waitForTeIdle(tc.waitTime.config.event);
        endRollingCount(this);
    });

});
