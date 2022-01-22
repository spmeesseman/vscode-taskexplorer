/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* tslint:disable */

import * as assert from "assert";
import * as vscode from "vscode";
import { configuration } from "../../common/configuration";
import { TaskExplorerApi } from "../../extension";
import { activate, initSettings, isReady } from "../helper";


let teApi: TaskExplorerApi;


suite("API Init and Tests", () =>
{
    suiteSetup(async () =>
    {
        teApi = await activate();
        assert(isReady() === true, "Setup failed");
    });


    test("Show log", async function()
    {
        await vscode.commands.executeCommand("taskExplorer.showOutput", false);
        await vscode.commands.executeCommand("taskExplorer.showOutput", true);
    });


    test("Cover pre-init cases", async function()
    {
        await initSettings(false);
        teApi.explorerProvider?.showSpecialTasks(true);
        teApi.explorerProvider?.showSpecialTasks(true, true);
        await teApi.explorerProvider?.refresh("tests");
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


    test("Cover getItems on empty workspace", async function()
    {
        if (!teApi?.explorerProvider) {
            assert.fail("        ✘ Workspace folder does not exist");
        }
        // Cover getitems before tree is built
        await teApi.explorerProvider.getTaskItems(undefined, "         ", true);
    });

});
