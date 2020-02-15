/* tslint:disable */

//
// Documentation on https://mochajs.org/ for help.
//

import * as assert from 'assert';
import * as vscode from "vscode";
//import { waitForActiveExtension } from './testUtil';
import { configuration } from "../common/configuration";
import { setWriteToConsole, timeout } from '../util';
import { treeDataProvider, treeDataProvider2 } from '../extension';


export let teApi: any;


suite("Extension Tests", () => 
{
    setup(async () => 
    { 
        setWriteToConsole(true, 2);
    });


    teardown(() =>
    {

    });


    test("Enable required testing options", async function()
    {
        this.timeout(10 * 1000);

        assert.ok(vscode.extensions.getExtension("spmeesseman.vscode-taskexplorer"));

        //
        // Enable views
        //
        await configuration.update('enableExplorerView', true);
        await configuration.update('enableSideBar', true);
        //
        // Set misc settings
        //
        await configuration.update('includeAnt', ["**/test.xml", "**/emptytarget.xml", "**/emtyproject.xml"]);
        await configuration.update('debug', true);
        await configuration.update('debugLevel', 3);
        //
        // Enabled all options
        //
        await configuration.update('enableAnt', true);
        await configuration.update('enableAppPublisher', true);
        await configuration.update('enableBash', true);
        await configuration.update('enableBatch', true);
        await configuration.update('enableGradle', true);
        await configuration.update('enableGrunt', true);
        await configuration.update('enableGulp', true);
        await configuration.update('enableMake', true);
        await configuration.update('enableNpm', true);
        await configuration.update('enableNsis', true);
        await configuration.update('enablePowershell', true);
        await configuration.update('enablePerl', true);
        await configuration.update('enablePython', true);
        await configuration.update('enableRuby', true);
        await configuration.update('enableWorkspace', true);

        setWriteToConsole(true); // write debug logging from exiension to console
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
            console.log('        Manually activating extension');
            try {
                teApi = await ext.activate();
                assert(vscode.commands.executeCommand("taskExplorer.showOutput"));
            }
            catch(e) {
                assert.fail("Failed to activate extension");
            }
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
