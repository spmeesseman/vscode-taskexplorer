/* tslint:disable */

//
// Documentation on https://mochajs.org/ for help.
//

import * as assert from 'assert';
import * as vscode from "vscode";
//import { waitForActiveExtension } from './testUtil';
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
        await configuration.updateWs('enableAnt', true);
        await configuration.updateWs('enableAppPublisher', true);
        await configuration.updateWs('enableBash', true);
        await configuration.updateWs('enableBatch', true);
        await configuration.updateWs('enableGradle', true);
        await configuration.updateWs('enableGrunt', true);
        await configuration.updateWs('enableGulp', true);
        await configuration.updateWs('enableMake', true);
        await configuration.updateWs('enableNpm', true);
        await configuration.updateWs('enableNsis', true);
        await configuration.updateWs('enablePowershell', true);
        await configuration.updateWs('enablePerl', true);
        await configuration.updateWs('enablePython', true);
        await configuration.updateWs('enableRuby', true);
        await configuration.updateWs('enableTsc', true);
        await configuration.updateWs('enableWorkspace', true);
        await configuration.updateWs('groupDashed', false);
        await configuration.updateWs('pathToAnt', 'ant.bat');
        await configuration.updateWs('pathToGradle', 'gradle.bat');
        //await configuration.updateWs('pathToGrunt', 'grunt.bat');
        //await configuration.updateWs('pathToGulp', 'gulp.bat');
        await configuration.updateWs('pathToMake', 'nmake');
        await configuration.updateWs('pathToPerl', 'perl');
        await configuration.updateWs('pathToPython', 'python');
        await configuration.updateWs('pathToPowershell', 'powershell');

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
                assert(vscode.commands.executeCommand("taskExplorer.showOutput"));
            }
            catch(e) {
                assert.fail("Failed to activate extension");
            }
            console.log("         ✔ Extension activated");
        } 
        else {
            //
            // Wait for extension to activate
            //
            while (!ext.isActive && wait < maxWait * 10) {
                wait += 1;
                await timeout(100);
            }
            assert(!ext.isActive || wait < maxWait * 10, "Extension did not finish activation within " + maxWait + " seconds");
            //
            // Set extension api exports
            //
            teApi = ext.exports;
            assert(vscode.commands.executeCommand("taskExplorer.showOutput"));
        }

        //assert(treeDataProvider2);
        assert(teApi, "Exported API is empty");
        assert(vscode.commands.executeCommand("taskExplorer.showOutput"));
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

});
