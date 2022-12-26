/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* tslint:disable */

import * as assert from "assert";
import * as vscode from "vscode";
import * as util from "../../common/utils";
import { activate, executeSettingsUpdate, isReady, sleep } from "../helper";
import { configuration } from "../../common/configuration";

let enabledTasks: any;
let pathToPrograms: any;
let shellW32: string, shellLnx: string, shellOsx: string, pkgMgr: string;


suite("Configuration / Settings Tests", () =>
{

    suiteSetup(async function()
    {
        await activate(this);
        assert(isReady() === true, "    ✘ TeApi not ready");
        enabledTasks = configuration.get<object>("enabledTasks");
        pathToPrograms = configuration.get<object>("pathToPrograms");
        shellW32 = configuration.getVs<string>("terminal.integrated.shell.windows");
        shellLnx = configuration.getVs<string>("terminal.integrated.shell.linux");
        shellOsx = configuration.getVs<string>("terminal.integrated.shell.osx");
    });


    suiteTeardown(async function()
    {
        configuration.updateWs("pathToPrograms", pathToPrograms);
    });


    test("Auto Refresh", async function()
    {
        const autoRefresh = configuration.get<boolean>("autoRefresh");
        await configuration.updateWs("autoRefresh", false);
        await vscode.commands.executeCommand("taskExplorer.showOutput", false);
        await configuration.updateWs("autoRefresh", true);
        await vscode.commands.executeCommand("taskExplorer.showOutput", true);
        await configuration.updateWs("autoRefresh", autoRefresh);
        await configuration.update("autoRefresh", autoRefresh); // cover global
    });


    test("Ant Glob", async function()
    {
        const globPatterns = configuration.get<string[]>("globPatternsAnt");
        await configuration.updateWs("enabledTasks.ant", false);
        globPatterns.push("**/dummy.xml");
        await executeSettingsUpdate("globPatternsAnt", globPatterns, 50, 100);
        await executeSettingsUpdate("enabledTasks.ant", true, 50, 100);
        globPatterns.pop();
        await executeSettingsUpdate("globPatternsAnt", globPatterns, 50, 100);
    });


    test("Bash Glob", async function()
    {
        const globPatterns = configuration.get<string[]>("globPatternsBash");
        await configuration.updateWs("enabledTasks.bash", false);
        globPatterns.push("**/extensionless/**");
        await executeSettingsUpdate("globPatternsBash", globPatterns, 50, 100);
        await executeSettingsUpdate("enabledTasks.bash", true, 50, 100);
        globPatterns.pop();
        await executeSettingsUpdate("globPatternsBash", globPatterns, 50, 100);
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
            perl: true,
            powershell: true,
            python: true,
            ruby: true
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

});
