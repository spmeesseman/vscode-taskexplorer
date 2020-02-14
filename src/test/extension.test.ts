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


    test("Enable required testing options", async function()
    {
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
    });

    // test("Activate extension", function(done) 
    // {
    // 
    //     this.timeout(60 * 1000);
    // 
    //     const extension = vscode.extensions.getExtension(
    //         "spmeesseman.vscode-taskexplorer"
    //     ) as vscode.Extension<any>;
    // 
    //     if (!extension) {
    //         assert.fail("Extension not found");
    //     }
    // 
    //     //
    //     // Enable views
    //     //
    //     assert(configuration.update('enableExplorerView', true));
    //     assert(configuration.update('enableSideBar', true));
    //     //
    //     // Set misc settings
    //     //
    //     assert(configuration.update('includeAnt', ["**/test.xml", "**/emptytarget.xml", "**/emtyproject.xml"]));
    //     assert(configuration.update('debug', true));
    //     assert(configuration.update('debugLevel', 3));
    //     //
    //     // Enable all task types
    //     //
    //     assert(configuration.update('enableAnt', true));
    //     assert(configuration.update('enableAppPublisher', true));
    //     assert(configuration.update('enableBash', true));
    //     assert(configuration.update('enableBatch', true));
    //     assert(configuration.update('enableGradle', true));
    //     assert(configuration.update('enableGrunt', true));
    //     assert(configuration.update('enableGulp', true));
    //     assert(configuration.update('enableMake', true));
    //     assert(configuration.update('enableNpm', true));
    //     assert(configuration.update('enableNsis', true));
    //     assert(configuration.update('enablePowershell', true));
    //     assert(configuration.update('enablePerl', true));
    //     assert(configuration.update('enablePython', true));
    //     assert(configuration.update('enableRuby', true));
    //     assert(configuration.update('enableWorkspace', true));
    // 
    //     configuration.update('includeAnt', ["**/test.xml", "**/emptytarget.xml", "**/emtyproject.xml"]).then(() =>
    //     {
    //         if (!extension.isActive) 
    //         {
    //             console.log('        Manually activating extension');
    //             extension.activate().then(
    //                 api => {
    //                     trees = api;
    //                     assert(vscode.commands.executeCommand("taskExplorer.showOutput"));
    //                     done();
    //                 },
    //                 () => {
    //                     assert.fail("Failed to activate extension");
    //                 }
    //             );
    //         } 
    //         else {
    //             assert(vscode.commands.executeCommand("taskExplorer.showOutput"));
    //             done();
    //         }
    //     });
    // });


    test("Activate extension", async function() 
    {

        this.timeout(30 * 1000);

        const extension = vscode.extensions.getExtension(
            "spmeesseman.vscode-taskexplorer"
        ) as vscode.Extension<any>;

        if (!extension) {
            assert.fail("Extension not found");
        }

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


    test("Check tree providers", function(done) 
    {
        if (!trees) {
            assert.fail("        ✘ Task Explorer trees api does no exist");
        }
        if (!trees.explorerProvider) {
            assert.fail("        ✘ Task Explorer tree instance does not exist");
        }
        if (!trees.sidebarProvider) {
            assert.fail("        ✘ Task Explorer sidebar tree instance does not exist");
        }
        done();
    });

});
