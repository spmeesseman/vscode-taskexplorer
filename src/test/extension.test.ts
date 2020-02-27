/* tslint:disable */

import * as assert from 'assert';
import * as vscode from "vscode";
import { configuration } from "../common/configuration";
import { setWriteToConsole, timeout } from '../util';
import { TaskExplorerApi } from '../extension';


export let teApi: TaskExplorerApi;


suite("Extension Tests", () => 
{
    setup(async () => 
    {
    });


    teardown(() =>
    {
    });


    test("Enable required testing options", async function()
    {
        this.timeout(10 * 1000);
        assert.ok(vscode.extensions.getExtension("spmeesseman.vscode-taskexplorer"));
        await initSettings();
        await vscode.workspace.getConfiguration().update('terminal.integrated.shell.windows', 
                                                         'C:\\Windows\\System32\\cmd.exe',
                                                         vscode.ConfigurationTarget.Workspace);
        setWriteToConsole(false); // FOR DEBUGGING - write debug logging from exiension to console
    });


    test("Get active extension", async function()
    {
        let wait = 0;
        const maxWait = 15;  // seconds

        this.timeout(20 * 1000);

        let ext = vscode.extensions.getExtension("spmeesseman.vscode-taskexplorer");
        assert(ext, "Could not find extension");

        //
        // For coverage, we remove activationEvents "*" in package.json, we should
        // not be active at this point
        //
        if (!ext.isActive) 
        {
            console.log('        Manually activating extension for full coverage');
            try {
                teApi = await ext.activate();
            }
            catch(e) {
                assert.fail("Failed to activate extension");
            }
            console.log("         ✔ Extension activated");
        } 
        else {
            console.log('         ℹ Extension is already activated, coverage will not occur');
            console.log('         ℹ Remove the activation event from package.json before running tests');
            //
            // Wait for extension to activate
            //
            while (!ext.isActive && wait < maxWait * 10) {
                wait += 1;
                await timeout(100);
            }
            assert(!ext.isActive || wait < maxWait * 10, "Extension did not finish activation within " + maxWait + " seconds");
            //
            // If we could somehow deactivate and reactivate the extension here possibly coverage would work?
            //
            // ext.deactivate();
            //
            // Set extension api exports
            //
            teApi = ext.exports;
        }

        assert(teApi, "Exported API is empty");

        vscode.commands.executeCommand("taskExplorer.showOutput", false);
        vscode.commands.executeCommand("taskExplorer.showOutput", true);
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


    test("Cover pre-init cases", async function() 
    {
        await initSettings(false);
        teApi.explorerProvider.showLastTasks(true);
        await teApi.explorerProvider.refresh("tests");
        await initSettings();
    });


    test("Check settings", function(done) 
    {
        //
        // On Insiders tests, for whareve reason all settings are OFF, and the run produces
        // near 0% coverage, check to see if there are some enabled* options turned ON, since
        // they should ALL be on
        //
        if (configuration.get<boolean>("enableAnt") === false)
        {
            console.log("THE SETTINGS DID NOT TAKE!!!")
        }

        done();
    });


    async function initSettings(enable = true)
    {
        //
        // Enable views, use workspace level so that running this test from Code itself
        // in development doesnt trigger the TaskExplorer instance installed in the dev IDE
        //
        await configuration.updateWs('enableExplorerView', true);
        await configuration.updateWs('enableSideBar', true);
        //
        // Set misc settings, use workspace level so that running this test from Code itself
        // in development doesnt trigger the TaskExplorer instance installed in the dev IDE
        //
        await configuration.updateWs('includeAnt', ["**/test.xml", "**/emptytarget.xml", "**/emtyproject.xml"]);
        await configuration.updateWs('debug', true);
        await configuration.updateWs('debugLevel', 3);
        //
        // Enabled all options, use workspace level so that running this test from Code itself
        // in development doesnt trigger the TaskExplorer instance installed in the dev IDE
        //
        await configuration.updateWs('enableAnt', enable);
        await configuration.updateWs('enableAppPublisher', enable);
        await configuration.updateWs('enableBash', enable);
        await configuration.updateWs('enableBatch', enable);
        await configuration.updateWs('enableGradle', enable);
        await configuration.updateWs('enableGrunt', enable);
        await configuration.updateWs('enableGulp', enable);
        await configuration.updateWs('enableMake', enable);
        await configuration.updateWs('enableNpm', enable);
        await configuration.updateWs('enableNsis', enable);
        await configuration.updateWs('enablePowershell', enable);
        await configuration.updateWs('enablePerl', enable);
        await configuration.updateWs('enablePython', enable);
        await configuration.updateWs('enableRuby', enable);
        await configuration.updateWs('enableTsc', enable);
        await configuration.updateWs('enableWorkspace', enable);
        await configuration.updateWs('groupDashed', false);
        await configuration.updateWs('showLastTasks', false);
    }

});
