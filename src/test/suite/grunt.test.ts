/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* tslint:disable */

import * as path from "path";
import { Uri } from "vscode";
import { expect } from "chai";
import { GruntTaskProvider } from "../../providers/grunt";
import { configuration } from "../../lib/utils/configuration";
import { IFilesystemApi, ITaskExplorerApi } from "@spmeesseman/vscode-taskexplorer-types";
import {
    activate, executeSettingsUpdate, executeTeCommand, focusExplorerView, getWsPath, sleep, testControl, treeUtils, verifyTaskCount
} from "../helper";

const testsName = "grunt";
const startTaskCount = 7;

let teApi: ITaskExplorerApi;
let fsApi: IFilesystemApi;
let provider: GruntTaskProvider;
let dirName: string;
let fileUri: Uri;
let successCount = 0;


suite("Grunt Tests", () =>
{

    suiteSetup(async function()
    {
        teApi = await activate(this);
        fsApi = teApi.testsApi.fs;
        provider = teApi.providers.get(testsName) as GruntTaskProvider;
        dirName = getWsPath("tasks_test_");
        fileUri = Uri.file(path.join(dirName, "gruntfile.js"));
        // await executeSettingsUpdate("groupMaxLevel", 5); // this is just a random spot to bump the grouping level
        ++successCount;
    });

    suiteTeardown(async function()
    {
    });


    test("Build Tree (View Collapsed)", async function()
    {
        expect(successCount).to.be.equal(1, "rolling success count failure");
        await treeUtils.buildTree(this);
        ++successCount;
    });



    test("Document Position", async function()
    {
        expect(successCount).to.be.equal(2, "rolling success count failure");
        provider.getDocumentPosition(undefined, undefined);
        provider.getDocumentPosition("test", undefined);
        provider.getDocumentPosition(undefined, "test");
        ++successCount;
    });


    test("Start", async function()
    {
        expect(successCount).to.be.equal(3, "rolling success count failure");
        this.slow(testControl.slowTime.verifyTaskCount + testControl.waitTime.min);
        await verifyTaskCount(testsName, startTaskCount);
        await teApi.waitForIdle(testControl.waitTime.min);
        ++successCount;
    });


    test("Disable", async function()
    {
        expect(successCount).to.be.equal(4, "rolling success count failure");
        this.slow(testControl.slowTime.configEnableEvent + testControl.slowTime.verifyTaskCount + testControl.waitTime.configEnableEvent + testControl.waitTime.min);
        await teApi.config.updateWs("enabledTasks.grunt", false);
        await teApi.waitForIdle(testControl.waitTime.configEnableEvent);
        await verifyTaskCount(testsName, 0);
        await teApi.waitForIdle(testControl.waitTime.min);
        ++successCount;
    });


    test("Re-enable", async function()
    {
        expect(successCount).to.be.equal(5, "rolling success count failure");
        this.slow(testControl.slowTime.configEnableEvent + testControl.slowTime.verifyTaskCount + testControl.waitTime.configEnableEvent + testControl.waitTime.min);
        await teApi.config.updateWs("enabledTasks.grunt", true);
        await teApi.waitForIdle(testControl.waitTime.configEnableEvent);
        await verifyTaskCount(testsName, startTaskCount);
        await teApi.waitForIdle(testControl.waitTime.min);
        ++successCount;
    });


    test("Create File", async function()
    {
        expect(successCount).to.be.equal(6, "rolling success count failure");
        this.slow(testControl.slowTime.fsCreateEvent + testControl.slowTime.verifyTaskCount + testControl.waitTime.fsCreateEvent + testControl.waitTime.min);
        if (!(await fsApi.pathExists(dirName))) {
            await fsApi.createDir(dirName);
        }
        await fsApi.writeFile(
            fileUri.fsPath,
            "module.exports = function(grunt) {\n" +
            '    grunt.registerTask(\n"default2", ["jshint:myproject"]);\n' +
            '    grunt.registerTask("upload2", ["s3"]);\n' +
            "};\n"
        );
        await teApi.waitForIdle(testControl.waitTime.fsCreateEvent);
        await verifyTaskCount(testsName, startTaskCount + 2);
        await teApi.waitForIdle(testControl.waitTime.min);
        ++successCount;
    });


    test("Add 4 Tasks to File", async function()
    {
        expect(successCount).to.be.equal(7, "rolling success count failure");
        this.slow(testControl.slowTime.fsModifyEvent + testControl.slowTime.verifyTaskCount + testControl.waitTime.fsModifyEvent + testControl.waitTime.min);
        await fsApi.writeFile(
            fileUri.fsPath,
            "module.exports = function(grunt) {\n" +
            '    grunt.registerTask(\n"default2", ["jshint:myproject"]);\n' +
            '    grunt.registerTask("upload2", ["s3"]);\n' +
            '    grunt.registerTask("upload3", ["s4"]);\n' +
            '    grunt.registerTask("upload4", ["s5"]);\n' +
            '    grunt.registerTask("upload5", ["s6"]);\n' +
            '    grunt.registerTask("upload6", ["s7"]);\n' +
            "};\n"
        );
        await teApi.waitForIdle(testControl.waitTime.fsModifyEvent);
        await verifyTaskCount(testsName, startTaskCount + 6);
        await teApi.waitForIdle(testControl.waitTime.min);
        ++successCount;
    });


    test("Remove 2 Tasks from File", async function()
    {
        expect(successCount).to.be.equal(8, "rolling success count failure");
        this.slow(testControl.slowTime.fsDeleteEvent + testControl.slowTime.verifyTaskCount + testControl.waitTime.fsModifyEvent + testControl.waitTime.min);
        await fsApi.writeFile(
            fileUri.fsPath,
            "module.exports = function(grunt) {\n" +
            '    grunt.registerTask(\n"default2", ["jshint:myproject"]);\n' +
            '    grunt.registerTask("upload2", ["s3"]);\n' +
            '    grunt.registerTask("upload5", ["s5"]);\n' +
            '    grunt.registerTask("upload6", ["s7"]);\n' +
            "};\n"
        );
        await teApi.waitForIdle(testControl.waitTime.fsModifyEvent);
        await verifyTaskCount(testsName, startTaskCount + 4);
        await teApi.waitForIdle(testControl.waitTime.min);
        ++successCount;
    });


    test("Delete File", async function()
    {
        expect(successCount).to.be.equal(9, "rolling success count failure");
        this.slow(testControl.slowTime.fsDeleteEvent + testControl.slowTime.verifyTaskCount + testControl.waitTime.fsDeleteEvent + testControl.waitTime.min);
        await fsApi.deleteFile(fileUri.fsPath);
        await fsApi.deleteDir(dirName);
        await teApi.waitForIdle(testControl.waitTime.fsDeleteEvent);
        await verifyTaskCount(testsName, startTaskCount);
        await teApi.waitForIdle(testControl.waitTime.min);
        ++successCount;
    });


    test("Turn VSCode Grunt Provider On", async function()
    {
        expect(successCount).to.be.equal(10, "rolling success count failure");
        this.slow(testControl.slowTime.refreshCommand + testControl.slowTime.verifyTaskCount + testControl.waitTime.min + 3000);
        await configuration.updateVs("grunt.autoDetect", "on");
        await sleep(3000);
        await treeUtils.buildTree(this);
        await verifyTaskCount(testsName, startTaskCount);
        await teApi.waitForIdle(testControl.waitTime.min);
        ++successCount;
    });


    //
    // *** FOCUS #1 ***   Moved up one suite from infoPage tests.
    //
    // Go ahead and focus the view.  Have done enough tests now with it not having received a visibility event yet.
    // We need the visual loaded to scan VSCode provided and Grunt tasks and in the next suite Gulp tasks same thing.
    //
	test("Activate Tree (Focus Explorer View)", async function()
	{
		await focusExplorerView(this);
	});


    test("Turn on VSCode Grunt Provider Off", async function()
    {
        expect(successCount).to.be.equal(11);
        this.slow(testControl.slowTime.configEventFast +  testControl.slowTime.refreshCommand + testControl.slowTime.verifyTaskCount + testControl.waitTime.min + 1500);
        await configuration.updateVs("grunt.autoDetect", "off");
        await sleep(1500);
        await treeUtils.buildTree(this);
        await verifyTaskCount(testsName, startTaskCount);
        await teApi.waitForIdle(testControl.waitTime.min);
    });

});
