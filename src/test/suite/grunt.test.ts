/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* tslint:disable */

import * as path from "path";
import { Uri } from "vscode";
import { GruntTaskProvider } from "../../providers/grunt";
import { configuration } from "../../lib/utils/configuration";
import { IFilesystemApi, ITaskExplorerApi } from "@spmeesseman/vscode-taskexplorer-types";
import {
    activate, exitRollingCount, focusExplorerView, getWsPath, sleep, suiteFinished, testControl as tc,
    treeUtils, verifyTaskCount, waitForTeIdle
} from "../utils/utils";

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
        ({ teApi, fsApi } = await activate(this));
        provider = teApi.providers[testsName] as GruntTaskProvider;
        dirName = getWsPath("tasks_test_");
        fileUri = Uri.file(path.join(dirName, "gruntfile.js"));
        // await executeSettingsUpdate("groupMaxLevel", 5); // this is just a random spot to bump the grouping level
        ++successCount;
    });

    suiteTeardown(async function()
    {
        suiteFinished(this);
    });


    test("Build Tree (View Collapsed)", async function()
    {
        if (exitRollingCount(1, successCount)) return;
        await treeUtils.refresh(this);
        ++successCount;
    });



    test("Document Position", async function()
    {
        if (exitRollingCount(2, successCount)) return;
        provider.getDocumentPosition(undefined, undefined);
        provider.getDocumentPosition("test", undefined);
        provider.getDocumentPosition(undefined, "test");
        ++successCount;
    });


    test("Start", async function()
    {
        if (exitRollingCount(3, successCount)) return;
        this.slow(tc.slowTime.verifyTaskCount + tc.slowTime.min);
        await verifyTaskCount(testsName, startTaskCount);
        await waitForTeIdle(tc.waitTime.min);
        ++successCount;
    });


    test("Disable", async function()
    {
        if (exitRollingCount(4, successCount)) return;
        this.slow(tc.slowTime.config.enableEvent + tc.slowTime.verifyTaskCount + tc.slowTime.min);
        await teApi.config.updateWs("enabledTasks.grunt", false);
        await waitForTeIdle(tc.waitTime.config.enableEvent);
        await verifyTaskCount(testsName, 0);
        await waitForTeIdle(tc.waitTime.min);
        ++successCount;
    });


    test("Re-enable", async function()
    {
        if (exitRollingCount(5, successCount)) return;
        this.slow(tc.slowTime.config.enableEvent + tc.slowTime.verifyTaskCount + tc.slowTime.min);
        await teApi.config.updateWs("enabledTasks.grunt", true);
        await waitForTeIdle(tc.waitTime.config.enableEvent);
        await verifyTaskCount(testsName, startTaskCount);
        await waitForTeIdle(tc.waitTime.min);
        ++successCount;
    });


    test("Create File", async function()
    {
        if (exitRollingCount(6, successCount)) return;
        this.slow(tc.slowTime.fs.createEvent + tc.slowTime.verifyTaskCount + tc.slowTime.min);
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
        await waitForTeIdle(tc.waitTime.fs.createEvent);
        await verifyTaskCount(testsName, startTaskCount + 2);
        await waitForTeIdle(tc.waitTime.min);
        ++successCount;
    });


    test("Add 4 Tasks to File", async function()
    {
        if (exitRollingCount(7, successCount)) return;
        this.slow(tc.slowTime.fs.modifyEvent + tc.slowTime.verifyTaskCount + tc.slowTime.min);
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
        await waitForTeIdle(tc.waitTime.fs.modifyEvent);
        await verifyTaskCount(testsName, startTaskCount + 6);
        await waitForTeIdle(tc.waitTime.min);
        ++successCount;
    });


    test("Remove 2 Tasks from File", async function()
    {
        if (exitRollingCount(8, successCount)) return;
        this.slow(tc.slowTime.fs.deleteEvent + tc.slowTime.verifyTaskCount + tc.slowTime.min);
        await fsApi.writeFile(
            fileUri.fsPath,
            "module.exports = function(grunt) {\n" +
            '    grunt.registerTask(\n"default2", ["jshint:myproject"]);\n' +
            '    grunt.registerTask("upload2", ["s3"]);\n' +
            '    grunt.registerTask("upload5", ["s5"]);\n' +
            '    grunt.registerTask("upload6", ["s7"]);\n' +
            "};\n"
        );
        await waitForTeIdle(tc.waitTime.fs.modifyEvent);
        await verifyTaskCount(testsName, startTaskCount + 4);
        await waitForTeIdle(tc.waitTime.min);
        ++successCount;
    });


    test("Delete File", async function()
    {
        if (exitRollingCount(9, successCount)) return;
        this.slow(tc.slowTime.fs.deleteEvent + tc.slowTime.verifyTaskCount + tc.slowTime.min);
        await fsApi.deleteFile(fileUri.fsPath);
        await fsApi.deleteDir(dirName);
        await waitForTeIdle(tc.waitTime.fs.deleteEvent);
        await verifyTaskCount(testsName, startTaskCount);
        await waitForTeIdle(tc.waitTime.min);
        ++successCount;
    });


    test("Turn VSCode Grunt Provider On", async function()
    {
        if (exitRollingCount(10, successCount)) return;
        this.slow(tc.slowTime.config.eventFast + tc.slowTime.refreshCommand + tc.slowTime.verifyTaskCount + tc.slowTime.min + 3000);
        await configuration.updateVs("grunt.autoDetect", "on");
        await sleep(3000);
        await treeUtils.refresh();
        await verifyTaskCount(testsName, startTaskCount);
        await waitForTeIdle(tc.waitTime.min);
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
        if (exitRollingCount(11, successCount)) return;
		await focusExplorerView(this);
        ++successCount;
	});


    test("Turn VSCode Grunt Provider Off", async function()
    {
        if (exitRollingCount(12, successCount)) return;
        this.slow(tc.slowTime.config.eventFast +  tc.slowTime.refreshCommand + tc.slowTime.verifyTaskCount + tc.slowTime.min + 1500);
        await configuration.updateVs("grunt.autoDetect", "off");
        await sleep(1500);
        await treeUtils.refresh();
        await verifyTaskCount(testsName, startTaskCount);
        await waitForTeIdle(tc.waitTime.min);
        ++successCount;
    });

});
