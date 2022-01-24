/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* tslint:disable */

import * as assert from "assert";
import * as vscode from "vscode";
import { ConfigurationTarget, workspace } from "vscode";
import { TaskExplorerApi } from "../../extension";
import { activate, initSettings, isReady, sleep } from "../helper";
import { configuration } from "../../common/configuration";


let teApi: TaskExplorerApi;


suite("Configuration / Settings Tests", () =>
{
    suiteSetup(async function()
    {
        teApi = await activate(this);
        assert(isReady() === true, "Setup failed");
    });


    test("Auto-Refresh", async function()
    {
        const autoRefresh = configuration.get<boolean>("autoRefresh");
        await configuration.updateWs("autoRefresh", false);
        await vscode.commands.executeCommand("taskExplorer.showOutput", false);
        await configuration.updateWs("autoRefresh", true);
        await vscode.commands.executeCommand("taskExplorer.showOutput", true);
        await configuration.updateWs("autoRefresh", autoRefresh);
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
        const wsGlobalConfig= workspace.getConfiguration(),
              pkgMgr = wsGlobalConfig.get<string>("npm.packageManager");
        await wsGlobalConfig.update("npm.packageManager", "yarn", ConfigurationTarget.Workspace);
        await sleep(100);
        await wsGlobalConfig.update("npm.packageManager", "npm", ConfigurationTarget.Workspace);
        await sleep(100);
        await wsGlobalConfig.update("npm.packageManager", pkgMgr, ConfigurationTarget.Workspace);
        await sleep(100);
    });


    test("Default shell", async function()
    {
        const wsGlobalConfig= workspace.getConfiguration(),
              shellW32 = wsGlobalConfig.get<string>("npm.packageManager"),
              shellLnx = wsGlobalConfig.get<string>("npm.packageManager"),
              shellOsx = wsGlobalConfig.get<string>("npm.packageManager");
        await sleep(100);
        await wsGlobalConfig.update("terminal.integrated.shell.osx", "/usr/bin/sh", ConfigurationTarget.Workspace);
        await sleep(100);
        await wsGlobalConfig.update("terminal.integrated.shell.linux", "/bin/sh", ConfigurationTarget.Workspace);
        await sleep(100);
        await wsGlobalConfig.update("terminal.integrated.shell.windows", "C:\\Windows\\System32\\cmd.exe", ConfigurationTarget.Workspace);
        await sleep(100);
        await initSettings(false);
        await sleep(100);
        await wsGlobalConfig.update("terminal.integrated.shell.linux", shellLnx, ConfigurationTarget.Workspace);
        await sleep(100);
        await wsGlobalConfig.update("terminal.integrated.shell.osx", shellOsx, ConfigurationTarget.Workspace);
        configuration.updateWs("enableNsis", true); // last of an or'd if() extension.ts ~line 363 processConfigChanges()
        await sleep(100);
        await wsGlobalConfig.update("terminal.integrated.shell.windows", shellW32, ConfigurationTarget.Workspace);
        await sleep(100);
        await initSettings();
    });

});
