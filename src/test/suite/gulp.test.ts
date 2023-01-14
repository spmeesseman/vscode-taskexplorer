/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* tslint:disable */

import * as path from "path";
import { Uri } from "vscode";
import { expect } from "chai";
import { GulpTaskProvider } from "../../providers/gulp";
import { configuration } from "../../lib/utils/configuration";
import { IFilesystemApi, ITaskExplorerApi } from "@spmeesseman/vscode-taskexplorer-types";
import {
    activate, executeSettingsUpdate, exitRollingCount, getWsPath, sleep, suiteFinished, testControl, treeUtils, verifyTaskCount
} from "../utils/utils";

const testsName = "gulp";
const startTaskCount = 17;

let teApi: ITaskExplorerApi;
let fsApi: IFilesystemApi;
let provider: GulpTaskProvider;
let dirName: string;
let fileUri: Uri;
let successCount = -1;


suite("Gulp Tests", () =>
{

    suiteSetup(async function()
    {
        teApi = await activate(this);
        fsApi = teApi.testsApi.fs;
        provider = teApi.providers.get(testsName) as GulpTaskProvider;
        dirName = getWsPath("tasks_test_");
        fileUri = Uri.file(path.join(dirName, "gulpfile.js"));
        ++successCount;
    });

    suiteTeardown(async function()
    {   //
        // Reset both Grunt / Gulp VSCode internal task providers, which we enabled b4 extension
        // activation in helper.test
        //
        await configuration.updateVs("grunt.autoDetect", testControl.vsCodeAutoDetectGrunt);
        await configuration.updateVs("gulp.autoDetect", testControl.vsCodeAutoDetectGulp);
        suiteFinished(this);
    });


    test("Build Tree (View Collapsed)", async function()
    {
        if (exitRollingCount(0, successCount)) return;
        await treeUtils.refresh(this);
        ++successCount;
    });



    test("Document Position", async function()
    {
        if (exitRollingCount(1, successCount)) return;
        provider.getDocumentPosition(undefined, undefined);
        provider.getDocumentPosition("test", undefined);
        provider.getDocumentPosition(undefined, "test");
        ++successCount;
    });


    test("Start", async function()
    {
        if (exitRollingCount(2, successCount)) return;
        this.slow(testControl.slowTime.verifyTaskCount + testControl.waitTime.min);
        await verifyTaskCount(testsName, startTaskCount);
        await teApi.waitForIdle(testControl.waitTime.min);
        ++successCount;
    });


    test("Disable", async function()
    {
        if (exitRollingCount(3, successCount)) return;
        this.slow(testControl.slowTime.configDisableEvent + testControl.slowTime.verifyTaskCount + testControl.waitTime.configDisableEvent + testControl.waitTime.min);
        await teApi.config.updateWs("enabledTasks.gulp", false);
        await teApi.waitForIdle(testControl.waitTime.configDisableEvent);
        await verifyTaskCount(testsName, 0);
        await teApi.waitForIdle(testControl.waitTime.min);
        ++successCount;
    });


    test("Re-enable", async function()
    {
        if (exitRollingCount(4, successCount)) return;
        this.slow(testControl.slowTime.configEnableEvent + testControl.slowTime.verifyTaskCount + testControl.waitTime.configEnableEvent + testControl.waitTime.min);
        await teApi.config.updateWs("enabledTasks.gulp", true);
        await teApi.waitForIdle(testControl.waitTime.configEnableEvent);
        await verifyTaskCount(testsName, startTaskCount);
        await teApi.waitForIdle(testControl.waitTime.min);
        ++successCount;
    });


    test("Create File", async function()
    {
        if (exitRollingCount(5, successCount)) return;
        this.slow(testControl.slowTime.fsCreateEvent + testControl.slowTime.verifyTaskCount + testControl.waitTime.fsCreateEvent + testControl.waitTime.min);
        if (!(await fsApi.pathExists(dirName))) {
            await fsApi.createDir(dirName);
        }
        await fsApi.writeFile(
            fileUri.fsPath,
            "var gulp = require('gulp');\n" +
            "gulp.task('hello3', (done) => {\n" +
            "    console.log('Hello3!');\n" +
            "    done();\n" +
            "});\n" +
            'gulp.task(\n"hello4", (done) => {\n' +
            "    console.log('Hello4!');\n" +
            "    done();\n" +
            "});\n"
        );
        await teApi.waitForIdle(testControl.waitTime.fsCreateEvent);
        await verifyTaskCount(testsName, startTaskCount + 2);
        await teApi.waitForIdle(testControl.waitTime.min);
        ++successCount;
    });


    test("Add Task to File", async function()
    {
        if (exitRollingCount(6, successCount)) return;
        this.slow(testControl.slowTime.fsModifyEvent + testControl.slowTime.verifyTaskCount + testControl.waitTime.fsModifyEvent + testControl.waitTime.min);
        await fsApi.writeFile(
            fileUri.fsPath,
            "var gulp = require('gulp');\n" +
            "gulp.task('hello3', (done) => {\n" +
            "    console.log('Hello3!');\n" +
            "    done();\n" +
            "});\n" +
            'gulp.task(\n"hello4", (done) => {\n' +
            "    console.log('Hello4!');\n" +
            "    done();\n" +
            "});\n" +
            'gulp.task(\n"hello5", (done) => {\n' +
            "    console.log('Hello5!');\n" +
            "    done();\n" +
            "});\n"
        );
        await teApi.waitForIdle(testControl.waitTime.fsModifyEvent);
        await verifyTaskCount(testsName, startTaskCount + 3);
        await teApi.waitForIdle(testControl.waitTime.min);
        ++successCount;
    });


    test("Remove 2 Tasks from File", async function()
    {
        if (exitRollingCount(7, successCount)) return;
        this.slow(testControl.slowTime.fsDeleteEvent + testControl.slowTime.verifyTaskCount + testControl.waitTime.fsModifyEvent + testControl.waitTime.min);
        await fsApi.writeFile(
            fileUri.fsPath,
            "var gulp = require('gulp');\n" +
            "gulp.task('hello3', (done) => {\n" +
            "    console.log('Hello3!');\n" +
            "    done();\n" +
            "});\n"
        );
        await teApi.waitForIdle(testControl.waitTime.fsModifyEvent);
        await verifyTaskCount(testsName, startTaskCount + 1);
        ++successCount;
    });


    test("Delete File", async function()
    {
        if (exitRollingCount(8, successCount)) return;
        this.slow(testControl.slowTime.fsDeleteEvent + testControl.slowTime.verifyTaskCount + testControl.waitTime.fsDeleteEvent + testControl.waitTime.min);
        await fsApi.deleteFile(fileUri.fsPath);
        await fsApi.deleteDir(dirName);
        await teApi.waitForIdle(testControl.waitTime.fsDeleteEvent);
        await verifyTaskCount(testsName, startTaskCount);
        await teApi.waitForIdle(testControl.waitTime.min);
        ++successCount;
    });


    test("Gulp Parser", async function()
    {
        if (exitRollingCount(9, successCount)) return;
        this.slow((testControl.slowTime.configEventFast * 2) + testControl.waitTime.min + (testControl.waitTime.configEnableEvent * 2));
        // const rootWorkspace = (workspace.workspaceFolders as WorkspaceFolder[])[0],
        //       gulpFile = getWsPath("gulp\\gulpfile.js");
        //
        // Use Gulp
        //
        await executeSettingsUpdate("useGulp", true, testControl.waitTime.configEventFast);
        await teApi.waitForIdle(testControl.waitTime.configEnableEvent);
        // await tasks.fetchTasks({ type: testsName });
        // gulpTasks = await provider.readUriTasks(Uri.file(buildXmlFile));
        // assert(gulpTasks.length === 2, "# of Gulp tasks should be 2");
        // gulpTasks = await provider.readUriTasks(Uri.file(buildXmlFile), rootWorkspace);
        // assert(gulpTasks.length === 2, "# of Gulp tasks should be 2");
        //
        // Reset
        //
        await executeSettingsUpdate("useGulp", false, testControl.waitTime.configEventFast);
        await teApi.waitForIdle(testControl.waitTime.configDisableEvent);
        ++successCount;
    });


    test("Turn VSCode Gulp Provider On", async function()
    {
        if (exitRollingCount(10, successCount)) return;
        this.slow(testControl.slowTime.refreshCommand + testControl.slowTime.verifyTaskCount +
                  testControl.waitTime.min + testControl.waitTime.configEnableEvent + 3000);
        await configuration.updateVs("gulp.autoDetect", "on");
        await teApi.waitForIdle(testControl.waitTime.configEnableEvent);
        await sleep(3000);
        await treeUtils.refresh();
        await verifyTaskCount(testsName, startTaskCount);
        await teApi.waitForIdle(testControl.waitTime.min);
        ++successCount;
    });


    test("Turn VSCode Gulp Provider Off", async function()
    {
        if (exitRollingCount(11, successCount)) return;
        this.slow(testControl.slowTime.configEventFast +  testControl.slowTime.refreshCommand +
                  testControl.slowTime.verifyTaskCount + testControl.waitTime.min + testControl.waitTime.configEnableEvent + 1500);
        await configuration.updateVs("gulp.autoDetect", "off");
        await teApi.waitForIdle(testControl.waitTime.configEnableEvent);
        await sleep(1500);
        // await executeTeCommand("refresh", testControl.waitTime.refreshCommand);
        await treeUtils.refresh(this);
        await verifyTaskCount(testsName, startTaskCount);
        await teApi.waitForIdle(testControl.waitTime.min);
        ++successCount;
    });

});
