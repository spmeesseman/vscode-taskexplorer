/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* tslint:disable */

import * as assert from "assert";
import * as vscode from "vscode";
import { configuration } from "../../common/configuration";
import { TaskExplorerApi } from "../../extension";
import { activate } from "../helper";
import { commands } from "vscode";


let teApi: TaskExplorerApi;


suite("API Init and Tests", () =>
{
    setup(async () =>
    {
        await initSettings();
        await vscode.workspace.getConfiguration().update("terminal.integrated.shell.windows",
                                                         "C:\\Windows\\System32\\cmd.exe",
                                                         vscode.ConfigurationTarget.Workspace);

        //
        // Add some excludes, use both config update and task explorer addExclude command
        // for full coverage.  The 'addExclude' command will add the setting globally though,
        // so add it to the workspace setting as well
        //
        teApi = await activate();
        assert(teApi, "        ✘ TeApi null");
        await configuration.updateWs("exclude", ["**/tasks_test_ignore_/**", "**/ant/**"]);
        await commands.executeCommand("taskExplorer.addToExcludes", "**/tasks_test_ignore_/**", "**/ant/**");
    });


    teardown(() =>
    {
    });


    test("Check tree providers", function(done)
    {
        if (!teApi.explorerProvider) {
            assert.fail("        ✘ Task Explorer tree instance does not exist");
        }
        if (!teApi.sidebarProvider) {
            assert.fail("        ✘ Task Explorer sidebar tree instance does not exist");
        }
        done();
    });


    test("Show log", async function()
    {
        await vscode.commands.executeCommand("taskExplorer.showOutput", false);
        await vscode.commands.executeCommand("taskExplorer.showOutput", true);
    });


    test("Cover pre-init cases", async function()
    {
        if (!teApi || !teApi.explorerProvider) {
            assert.fail("        ✘ Task Explorer tree instance does not exist");
        }
        await initSettings(false);
        teApi.explorerProvider.showSpecialTasks(true);
        teApi.explorerProvider.showSpecialTasks(true, true);
        await teApi.explorerProvider.refresh("tests");
        await initSettings();
    });


    test("Check settings", function(done)
    {
        //
        // On Insiders tests, for whatever reason all settings are OFF, and the run produces
        // near 0% coverage, check to see if there are some enabled* options turned ON, since
        // they should ALL be on
        //
        if (configuration.get<boolean>("enableAnt") === false)
        {
            console.log("THE SETTINGS DID NOT TAKE!!!");
        }

        done();
    });


    async function initSettings(enable = true)
    {
        //
        // Enable views, use workspace level so that running this test from Code itself
        // in development doesn't trigger the TaskExplorer instance installed in the dev IDE
        //
        await configuration.updateWs("enableExplorerView", true);
        await configuration.updateWs("enableSideBar", true);
        //
        // Set misc settings, use workspace level so that running this test from Code itself
        // in development doesn't trigger the TaskExplorer instance installed in the dev IDE
        //
        await configuration.updateWs("includeAnt", ["**/test.xml", "**/emptytarget.xml", "**/emtyproject.xml", "**/hello.xml"]);
        // Use update() here for coverage, since these two settings wont trigger any processing
        await configuration.update("debug", true);
        await configuration.update("debugLevel", 3);
        await configuration.updateWs("debug", true);
        await configuration.updateWs("debugLevel", 3);

        await configuration.updateWs("useGulp", false);
        await configuration.updateWs("useAnt", false);
        await configuration.updateWs("groupSeparator", "-");
        await configuration.updateWs("numLastTasks", 10);
        await configuration.updateWs("groupMaxLevel", 1);
        await configuration.updateWs("clickAction", "Open");

        //
        // Enabled all options, use workspace level so that running this test from Code itself
        // in development doesnt trigger the TaskExplorer instance installed in the dev IDE
        //
        await configuration.updateWs("enableAnt", enable);
        await configuration.updateWs("enableAppPublisher", enable);
        await configuration.updateWs("enableBash", enable);
        await configuration.updateWs("enableBatch", enable);
        await configuration.updateWs("enableGradle", enable);
        await configuration.updateWs("enableGrunt", enable);
        await configuration.updateWs("enableGulp", enable);
        await configuration.updateWs("enableMake", enable);
        await configuration.updateWs("enableMaven", enable);
        await configuration.updateWs("enableNpm", enable);
        await configuration.updateWs("enableNsis", enable);
        await configuration.updateWs("enablePowershell", enable);
        await configuration.updateWs("enablePerl", enable);
        await configuration.updateWs("enablePython", enable);
        await configuration.updateWs("enablePipenv", enable);
        await configuration.updateWs("enableRuby", enable);
        await configuration.updateWs("enableTsc", enable);
        await configuration.updateWs("enableWorkspace", enable);
        await configuration.updateWs("groupWithSeparator", enable);
        await configuration.updateWs("groupSeparator", "-");
        await configuration.updateWs("showLastTasks", enable);
        await configuration.updateWs("keepTermOnStop", false);
        await configuration.updateWs("readUserTasks", enable);
        await configuration.updateWs("showFavoritesButton", enable);
        await configuration.updateWs("showRunningTask", enable);
    }
});
