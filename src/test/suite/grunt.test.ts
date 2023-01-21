/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* tslint:disable */

import * as path from "path";
import { Uri } from "vscode";
import { GruntTaskProvider } from "../../providers/grunt";
import { configuration } from "../../lib/utils/configuration";
import { IFilesystemApi, ITaskExplorerApi } from "@spmeesseman/vscode-taskexplorer-types";
import {
    activate, endRollingCount, executeSettingsUpdate, exitRollingCount, focusExplorerView, getWsPath,
    needsTreeBuild, sleep, suiteFinished, testControl as tc, treeUtils, verifyTaskCount, waitForTeIdle
} from "../utils/utils";

const testsName = "grunt";
const startTaskCount = 7;

let teApi: ITaskExplorerApi;
let fsApi: IFilesystemApi;
let provider: GruntTaskProvider;
let dirName: string;
let fileUri: Uri;


suite("Grunt Tests", () =>
{

    suiteSetup(async function()
    {
        ({ teApi, fsApi } = await activate(this));
        provider = teApi.providers[testsName] as GruntTaskProvider;
        dirName = getWsPath("tasks_test_");
        fileUri = Uri.file(path.join(dirName, "gruntfile.js"));
        // await executeSettingsUpdate("groupMaxLevel", 5); // this is just a random spot to bump the grouping level
        endRollingCount(this);
    });

    suiteTeardown(async function()
    {
        suiteFinished(this);
    });


    test("Build Tree", async function()
    {
        if (exitRollingCount(this)) return;
        if (needsTreeBuild()) {
            await treeUtils.refresh(this);
        }
        endRollingCount(this);
    });



    test("Document Position", async function()
    {
        if (exitRollingCount(this)) return;
        provider.getDocumentPosition(undefined, undefined);
        provider.getDocumentPosition("test", undefined);
        provider.getDocumentPosition(undefined, "test");
        endRollingCount(this);
    });


    test("Start", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.taskCount.verify);
        await verifyTaskCount(testsName, startTaskCount);
        endRollingCount(this);
    });


    test("Disable", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.config.enableEvent + tc.slowTime.taskCount.verify);
        await executeSettingsUpdate("enabledTasks.grunt", false, tc.waitTime.config.enableEvent);
        await verifyTaskCount(testsName, 0);
        endRollingCount(this);
    });


    test("Re-enable", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.config.enableEvent + tc.slowTime.taskCount.verify);
        await executeSettingsUpdate("enabledTasks.grunt", true, tc.waitTime.config.enableEvent);
        await verifyTaskCount(testsName, startTaskCount);
        endRollingCount(this);
    });


    test("Create File", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.fs.createEvent + tc.slowTime.fs.createFolderEvent + tc.slowTime.taskCount.verify);
        await fsApi.createDir(dirName);
        await waitForTeIdle(tc.waitTime.fs.createFolderEvent);
        await fsApi.writeFile(
            fileUri.fsPath,
            "module.exports = function(grunt) {\n" +
            '    grunt.registerTask(\n"default2", ["jshint:myproject"]);\n' +
            '    grunt.registerTask("upload2", ["s3"]);\n' +
            "};\n"
        );
        await waitForTeIdle(tc.waitTime.fs.createEvent);
        await verifyTaskCount(testsName, startTaskCount + 2);
        endRollingCount(this);
    });


    test("Add 4 Tasks to File", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.fs.modifyEvent + tc.slowTime.taskCount.verify);
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
        endRollingCount(this);
    });


    test("Remove 2 Tasks from File", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.fs.deleteEvent + tc.slowTime.taskCount.verify);
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
        endRollingCount(this);
    });


    test("Delete File", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.fs.deleteEvent + tc.slowTime.fs.deleteFolderEvent + tc.slowTime.taskCount.verify);
        await fsApi.deleteFile(fileUri.fsPath);
        await waitForTeIdle(tc.waitTime.fs.deleteEvent);
        await fsApi.deleteDir(dirName);
        await waitForTeIdle(tc.waitTime.fs.deleteFolderEvent);
        await verifyTaskCount(testsName, startTaskCount);
        endRollingCount(this);
    });


    test("Turn VSCode Grunt Provider On", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.config.eventFast + tc.slowTime.refreshCommand + tc.slowTime.taskCount.verify + 3000);
        await configuration.updateVs("grunt.autoDetect", "on");
        await sleep(3000);
        await treeUtils.refresh();
        await verifyTaskCount(testsName, startTaskCount);
        endRollingCount(this);
    });


    //
    // *** FOCUS #1 ***   Moved up one suite from infoPage tests.
    //
    // Go ahead and focus the view.  Have done enough tests now with it not having received a visibility event yet.
    // We need the visual loaded to scan VSCode provided and Grunt tasks and in the next suite Gulp tasks same thing.
    //
	test("Focus Tree View", async function()
	{
        if (exitRollingCount(this)) return;
		if (needsTreeBuild(true)) {
            await focusExplorerView(this);
        }
        endRollingCount(this);
	});


    test("Turn VSCode Grunt Provider Off", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.config.eventFast +  tc.slowTime.refreshCommand + tc.slowTime.taskCount.verify + 1500);
        await configuration.updateVs("grunt.autoDetect", "off");
        await sleep(1500);
        await treeUtils.refresh();
        await verifyTaskCount(testsName, startTaskCount);
        endRollingCount(this);
    });

});
