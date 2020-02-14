/* tslint:disable */

//
// Documentation on https://mochajs.org/ for help.
//

import * as assert from 'assert';
import * as vscode from "vscode";
import { configuration } from "../common/configuration";

export let trees: any;


suite("Extension Tests", () => 
{
    setup(async () => { });


    teardown(() =>
    {

    });


    test("Get extension", () =>
    {
        assert.ok(vscode.extensions.getExtension("spmeesseman.vscode-taskexplorer"));
    });


    test("Activate extension", async function() 
    {

        this.timeout(60 * 1000);

        const extension = vscode.extensions.getExtension(
            "spmeesseman.vscode-taskexplorer"
        ) as vscode.Extension<any>;

        if (!extension) {
            assert.fail("Extension not found");
        }

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
        // Enable all task types
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

        if (!extension.isActive) 
        {
            console.log('        Manually activating extension');
            try {
                trees = await extension.activate();
                assert(vscode.commands.executeCommand("taskExplorer.showOutput"));
            }
            catch(e) {
                assert.fail("Failed to activate extension");
            }
        } 
        else {
            assert(vscode.commands.executeCommand("taskExplorer.showOutput"));
        }
    });

    
    // test("Enable required testing options", async function()
    // {
    //     //
    //     // Enable views
    //     //
    //     await trees.configuration.update('enableExplorerView', true);
    //     await trees.configuration.update('enableSideBar', true);
    //     //
    //     // Set misc settings
    //     //
    //     await trees.configuration.update('includeAnt', ["**/test.xml", "**/emptytarget.xml", "**/emtyproject.xml"]);
    //     await trees.configuration.update('debug', true);
    //     await trees.configuration.update('debugLevel', 3);
    //     //
    //     // Enabled all options
    //     //
    //     await trees.configuration.update('enableAnt', true);
    //     await trees.configuration.update('enableAppPublisher', true);
    //     await trees.configuration.update('enableBash', true);
    //     await trees.configuration.update('enableBatch', true);
    //     await trees.configuration.update('enableGradle', true);
    //     await trees.configuration.update('enableGrunt', true);
    //     await trees.configuration.update('enableGulp', true);
    //     await trees.configuration.update('enableMake', true);
    //     await trees.configuration.update('enableNpm', true);
    //     await trees.configuration.update('enableNsis', true);
    //     await trees.configuration.update('enablePowershell', true);
    //     await trees.configuration.update('enablePerl', true);
    //     await trees.configuration.update('enablePython', true);
    //     await trees.configuration.update('enableRuby', true);
    //     await trees.configuration.update('enableWorkspace', true);
    // });


    test("Check tree providers", function(done) 
    {
        if (!trees.explorerProvider) {
            assert.fail("        ✘ Task Explorer tree instance does not exist");
        }
        if (!trees.sidebarProvider) {
            assert.fail("        ✘ Task Explorer sidebar tree instance does not exist");
        }
        done();
    });

});
