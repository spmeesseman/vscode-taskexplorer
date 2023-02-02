/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* tslint:disable */

import * as path from "path";
import { Uri } from "vscode";
import { expect } from "chai";
import fsUtils from "../utils/fsUtils";
import { startupFocus } from "../utils/suiteUtils";
import { GruntTaskProvider } from "../../providers/grunt";
import { executeSettingsUpdate } from "../utils/commandUtils";
import { IFilesystemApi, ITaskExplorerApi } from "@spmeesseman/vscode-taskexplorer-types";
import {
    activate, endRollingCount, exitRollingCount, getWsPath, suiteFinished, testControl as tc,
    testInvDocPositions, updateInternalProviderAutoDetect, verifyTaskCount, waitForTeIdle
} from "../utils/utils";

const testsName = "grunt";
const startTaskCount = 7;

let teApi: ITaskExplorerApi;
let fsApi: IFilesystemApi;
let provider: GruntTaskProvider;
let fileUri: Uri;


suite("Grunt Tests", () =>
{

    suiteSetup(async function()
    {
        if (exitRollingCount(this, true)) return;
        ({ teApi, fsApi } = await activate(this));
        provider = teApi.providers[testsName] as GruntTaskProvider;
        fileUri = Uri.file(path.join(getWsPath("."), "gruntfile.js"));
        endRollingCount(this, true);
    });


    suiteTeardown(async function()
    {
        if (exitRollingCount(this, false, true)) return;
        await updateInternalProviderAutoDetect("grunt", "off"); // turned on in tests initSettings()
        await fsUtils.deleteFile(fileUri.fsPath);
        suiteFinished(this);
    });


	test("Focus Explorer View", async function()
	{
        await startupFocus(this);
	});


    test("Document Position", async function()
    {
        if (exitRollingCount(this)) return;
        testInvDocPositions(provider);
        const docText = await fsApi.readFileAsync(path.join(getWsPath("."), "grunt", "GRUNTFILE.JS"));
        expect(provider.getDocumentPosition("grp-test-svr-build1", docText)).to.be.greaterThan(0);
        expect(provider.getDocumentPosition("run_tests", docText)).to.be.equal(0);
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
        await fsUtils.createFile(
            fileUri.fsPath,
            "module.exports = function(grunt) {\n" +
            '    grunt.registerTask(\n"default2", ["jshint:myproject"]);\n' +
            '    grunt.registerTask("upload2", ["s3"]);\n' +
            "};\n"
        );
        await verifyTaskCount(testsName, startTaskCount + 2);
        endRollingCount(this);
    });


    test("Add 4 Tasks to File", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.fs.modifyEvent + tc.slowTime.taskCount.verify);
        await fsUtils.writeFile(
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
        await verifyTaskCount(testsName, startTaskCount + 6);
        endRollingCount(this);
    });


    test("Remove 2 Tasks from File", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.fs.deleteEvent + tc.slowTime.taskCount.verify);
        await fsUtils.writeFile(
            fileUri.fsPath,
            "module.exports = function(grunt) {\n" +
            '    grunt.registerTask(\n"default2", ["jshint:myproject"]);\n' +
            '    grunt.registerTask("upload2", ["s3"]);\n' +
            '    grunt.registerTask("upload5", ["s5"]);\n' +
            '    grunt.registerTask("upload6", ["s7"]);\n' +
            "};\n"
        );
        await verifyTaskCount(testsName, startTaskCount + 4);
        endRollingCount(this);
    });


    test("Delete File", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.fs.deleteEvent + tc.slowTime.fs.deleteFolderEvent + tc.slowTime.taskCount.verify);
        await fsUtils.deleteFile(fileUri.fsPath);
        await verifyTaskCount(testsName, startTaskCount);
        endRollingCount(this);
    });

});
