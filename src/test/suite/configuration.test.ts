/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* tslint:disable */

import * as assert from "assert";
import * as vscode from "vscode";
import * as util from "../../common/utils";
import { TaskExplorerApi } from "@spmeesseman/vscode-taskexplorer-types";
import { activate, initSettings, isReady, sleep } from "../helper";
import { configuration } from "../../common/configuration";


let teApi: TaskExplorerApi;


suite("Configuration / Settings Tests", () =>
{
    suiteSetup(async function()
    {
        teApi = await activate(this);
        assert(isReady() === true, "    ✘ TeApi not ready");
    });


    test("Auto-Refresh", async function()
    {
        const autoRefresh = configuration.get<boolean>("autoRefresh");
        await configuration.updateWs("autoRefresh", false);
        await vscode.commands.executeCommand("taskExplorer.showOutput", false);
        await configuration.updateWs("autoRefresh", true);
        await vscode.commands.executeCommand("taskExplorer.showOutput", true);
        await configuration.updateWs("autoRefresh", autoRefresh);
        await configuration.update("autoRefresh", autoRefresh); // cover global
    });


    test("Ant glob", async function()
    {
        const globPatterns = configuration.get<string[]>("globPatternsAnt");
        await configuration.updateWs("enableAnt", false);
        globPatterns.push("**/dummy.xml");
        await configuration.updateWs("globPatternsAnt", globPatterns);
        await sleep(100);
        await configuration.updateWs("enableAnt", true);
        globPatterns.pop();
        await configuration.updateWs("globPatternsAnt", globPatterns);
        await sleep(100);
    });


    test("Bash glob", async function()
    {
        const globPatterns = configuration.get<string[]>("globPatternsBash");
        await configuration.updateWs("enableBash", false);
        globPatterns.push("**/extensionless/**");
        await configuration.updateWs("globPatternsBash", globPatterns);
        await sleep(100);
        await configuration.updateWs("enableBash", true);
        globPatterns.pop();
        await configuration.updateWs("globPatternsBash", globPatterns);
        await sleep(100);
    });


    test("Package manager", async function()
    {
        const pkgMgr = configuration.getVs<string>("npm.packageManager");
        await configuration.updateVsWs("npm.packageManager", "yarn");
        assert(util.getPackageManager() === "yarn");
        await configuration.updateVsWs("npm.packageManager", "npm");
        assert(util.getPackageManager() === "npm");
        await configuration.updateVsWs("npm.packageManager", "");
        assert(util.getPackageManager() === "npm");
        await configuration.updateVsWs("npm.packageManager", "auto");
        assert(util.getPackageManager() === "npm");
        await configuration.updateVsWs("npm.packageManager", pkgMgr);
        await configuration.updateVs("npm.packageManager", pkgMgr); // cover global
        assert(util.getPackageManager() === pkgMgr);
    });


    test("Default shell", async function()
    {
        const shellW32 = configuration.getVs<string>("terminal.integrated.shell.windows"),
              shellLnx = configuration.getVs<string>("terminal.integrated.shell.linux"),
              shellOsx = configuration.getVs<string>("terminal.integrated.shell.osx");
        await sleep(100);
        await configuration.updateVsWs("terminal.integrated.shell.osx", "/usr/bin/sh");
        await sleep(100);
        await configuration.updateVsWs("terminal.integrated.shell.linux", "/bin/sh");
        await sleep(100);
        await configuration.updateVsWs("terminal.integrated.shell.windows", "C:\\Windows\\System32\\cmd.exe");
        await sleep(100);
        await initSettings(false);
        await sleep(100);
        await configuration.updateVsWs("terminal.integrated.shell.linux", shellLnx);
        await sleep(100);
        await configuration.updateVsWs("terminal.integrated.shell.osx", shellOsx);
        await configuration.updateWs("enableNsis", true); // last of an or'd if() extension.ts ~line 363 processConfigChanges()
        await sleep(100);
        await configuration.updateVsWs("terminal.integrated.shell.windows", shellW32);
        await sleep(100);
        await initSettings();
    });

});
