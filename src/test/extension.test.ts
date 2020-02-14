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


    test("Activate extension", function(done) 
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
        assert(configuration.update('enableExplorerView', true));
        assert(configuration.update('enableSideBar', true));
        //
        // Set misc settings
        //
        assert(configuration.update('includeAnt', ["**/test.xml", "**/emptytarget.xml", "**/emtyproject.xml"]));
        assert(configuration.update('debug', true));
        assert(configuration.update('debugLevel', 3));
        //
        // Enable all task types
        //
        assert(configuration.update('enableAnt', true));
        assert(configuration.update('enableAppPublisher', true));
        assert(configuration.update('enableBash', true));
        assert(configuration.update('enableBatch', true));
        assert(configuration.update('enableGradle', true));
        assert(configuration.update('enableGrunt', true));
        assert(configuration.update('enableGulp', true));
        assert(configuration.update('enableMake', true));
        assert(configuration.update('enableNpm', true));
        assert(configuration.update('enableNsis', true));
        assert(configuration.update('enablePowershell', true));
        assert(configuration.update('enablePerl', true));
        assert(configuration.update('enablePython', true));
        assert(configuration.update('enableRuby', true));
        assert(configuration.update('enableWorkspace', true));

        if (!extension.isActive) 
        {
            console.log('        Manually activating extension');
            extension.activate().then(
                api => {
                    trees = api;
                    assert(vscode.commands.executeCommand("taskExplorer.showOutput"));
                    done();
                },
                () => {
                    assert.fail("Failed to activate extension");
                }
            );
        } 
        else {
            assert(vscode.commands.executeCommand("taskExplorer.showOutput"));
            done();
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
