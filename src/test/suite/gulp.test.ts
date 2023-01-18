/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* tslint:disable */

import * as path from "path";
import { Uri } from "vscode";
import { GulpTaskProvider } from "../../providers/gulp";
import { configuration } from "../../lib/utils/configuration";
import { IFilesystemApi, ITaskExplorerApi } from "@spmeesseman/vscode-taskexplorer-types";
import {
    activate, executeSettingsUpdate, exitRollingCount, focusExplorerView, getWsPath, sleep, suiteFinished, testControl as tc,
    treeUtils, verifyTaskCount, waitForTeIdle
} from "../utils/utils";

const testsName = "gulp";
const startTaskCount = 17;

let teApi: ITaskExplorerApi;
let fsApi: IFilesystemApi;
let provider: GulpTaskProvider;
let dirName: string;
let fileUri: Uri;
let file2Uri: Uri;
let successCount = -1;


suite("Gulp Tests", () =>
{

    suiteSetup(async function()
    {
        ({ teApi, fsApi } = await activate(this));
        provider = teApi.providers[testsName] as GulpTaskProvider;
        dirName = getWsPath("tasks_test_");
        fileUri = Uri.file(path.join(dirName, "gulpfile.js"));
        file2Uri = Uri.file(path.join(dirName, "gulpfile.mjs"));
        ++successCount;
    });


    suiteTeardown(async function()
    {   //
        // Reset both Grunt / Gulp VSCode internal task providers, which we enabled b4 extension
        // activation in helper.test
        //
        await configuration.updateVs("grunt.autoDetect", tc.vsCodeAutoDetectGrunt);
        await configuration.updateVs("gulp.autoDetect", tc.vsCodeAutoDetectGulp);
        await fsApi.deleteFile(fileUri.fsPath);
        await fsApi.deleteFile(file2Uri.fsPath);
        await waitForTeIdle(tc.waitTime.min);
        suiteFinished(this);
    });


	test("Activate Tree (Focus Explorer View)", async function()
	{
        if (exitRollingCount(0, successCount)) return;
		await focusExplorerView(this);
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
        this.slow(tc.slowTime.verifyTaskCount + tc.slowTime.min);
        await verifyTaskCount(testsName, startTaskCount);
        await waitForTeIdle(tc.waitTime.min);
        ++successCount;
    });


    test("Disable", async function()
    {
        if (exitRollingCount(3, successCount)) return;
        this.slow(tc.slowTime.config.disableEvent + tc.slowTime.verifyTaskCount + tc.slowTime.min);
        await teApi.config.updateWs("enabledTasks.gulp", false);
        await waitForTeIdle(tc.waitTime.config.disableEvent);
        await verifyTaskCount(testsName, 0);
        await waitForTeIdle(tc.waitTime.min);
        ++successCount;
    });


    test("Re-enable", async function()
    {
        if (exitRollingCount(4, successCount)) return;
        this.slow(tc.slowTime.config.enableEvent + tc.slowTime.verifyTaskCount + tc.slowTime.min);
        await teApi.config.updateWs("enabledTasks.gulp", true);
        await waitForTeIdle(tc.waitTime.config.enableEvent);
        await verifyTaskCount(testsName, startTaskCount);
        await waitForTeIdle(tc.waitTime.min);
        ++successCount;
    });


    test("Create JS File", async function()
    {
        if (exitRollingCount(5, successCount)) return;
        this.slow(tc.slowTime.fs.createEvent + tc.slowTime.verifyTaskCount + tc.slowTime.min);
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
        await waitForTeIdle(tc.waitTime.fs.createEvent);
        await verifyTaskCount(testsName, startTaskCount + 2);
        await waitForTeIdle(tc.waitTime.min);
        ++successCount;
    });


    test("Add Task to JS File", async function()
    {
        if (exitRollingCount(6, successCount)) return;
        this.slow(tc.slowTime.fs.modifyEvent + tc.slowTime.verifyTaskCount + tc.slowTime.min);
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
        await waitForTeIdle(tc.waitTime.fs.modifyEvent);
        await verifyTaskCount(testsName, startTaskCount + 3);
        await waitForTeIdle(tc.waitTime.min);
        ++successCount;
    });


    test("Remove 2 Tasks from JS File", async function()
    {
        if (exitRollingCount(7, successCount)) return;
        this.slow(tc.slowTime.fs.deleteEvent + tc.slowTime.verifyTaskCount + tc.slowTime.min);
        await fsApi.writeFile(
            fileUri.fsPath,
            "var gulp = require('gulp');\n" +
            "gulp.task('hello3', (done) => {\n" +
            "    console.log('Hello3!');\n" +
            "    done();\n" +
            "});\n"
        );
        await waitForTeIdle(tc.waitTime.fs.modifyEvent);
        await verifyTaskCount(testsName, startTaskCount + 1);
        ++successCount;
    });


    test("Delete JS File", async function()
    {
        if (exitRollingCount(8, successCount)) return;
        this.slow(tc.slowTime.fs.deleteEvent + tc.slowTime.verifyTaskCount + tc.slowTime.min);
        await fsApi.deleteFile(fileUri.fsPath);
        await waitForTeIdle(tc.waitTime.fs.deleteEvent);
        await verifyTaskCount(testsName, startTaskCount);
        await waitForTeIdle(tc.waitTime.min);
        ++successCount;
    });


    test("Create MJS File", async function()
    {
        if (exitRollingCount(9, successCount)) return;
        this.slow(tc.slowTime.fs.createEvent + tc.slowTime.verifyTaskCount + tc.slowTime.min);
        if (!(await fsApi.pathExists(dirName))) {
            await fsApi.createDir(dirName);
        }
        await fsApi.writeFile(
            file2Uri.fsPath,
            "import pkg from 'gulp';\n" +
            "const { task, series } = pkg;\n" +
            "function clean2(cb) {\n" +
            "    console.log('clean2!!!');\n" +
            "    cb();\n" +
            "}\n" +
            "function build2(cb) {\n" +
            "    console.log('build2!!!');\n" +
            "    cb();\n" +
            "}\n" +
            "const _build1 = build2;\n" +
            "const _build2 = build2;\n" +
            "const build3 = build2;\n" +
            "const build4 = build2;\n" +
            "export { _build1 as build1 };\n" +
            "export { _build2 as build2 };\n" +
            "export { build3 };\n" +
            "export { build4 };\n" +
            "export const default123 = series(clean2, build2);\n"
        );
        await waitForTeIdle(tc.waitTime.fs.createEvent);
        await verifyTaskCount(testsName, startTaskCount + 5);
        await waitForTeIdle(tc.waitTime.min);
        ++successCount;
    });


    test("Delete Directory w/ MJS File", async function()
    {
        if (exitRollingCount(10, successCount)) return;
        this.slow(tc.slowTime.fs.deleteFolderEvent + tc.slowTime.verifyTaskCount + (tc.waitTime.min * 2));
        await fsApi.deleteDir(dirName);
        await waitForTeIdle(tc.waitTime.fs.deleteEvent);
        await verifyTaskCount(testsName, startTaskCount);
        await waitForTeIdle(tc.waitTime.min);
        await waitForTeIdle(tc.waitTime.min);
        ++successCount;
    });


    test("Gulp Parser", async function()
    {
        if (exitRollingCount(11, successCount)) return;
        this.slow((tc.slowTime.config.enableEvent * 2) + (tc.waitTime.config.event * 2) +
                  tc.waitTime.config.disableEvent + (tc.slowTime.verifyTaskCount * 2) + (tc.slowTime.tasks.gulpParser * 4));
        //
        // Use Gulp to parse tasks. The configuration change will cause gulp tasks to be invalidated and refreshed
        //
        await configuration.updateVs("gulp.autoDetect", "off");
        await waitForTeIdle(tc.waitTime.config.enableEvent);
        await executeSettingsUpdate("useGulp", true, tc.waitTime.config.event);
        await waitForTeIdle(tc.waitTime.config.enableEvent);
        await verifyTaskCount(testsName, startTaskCount);
        //
        // Reset to Basic Parser. The configuration change will cause gulp tasks to be invalidated and refreshed
        //
        await executeSettingsUpdate("useGulp", false, tc.waitTime.config.event);
        await waitForTeIdle(tc.waitTime.config.disableEvent);
        await verifyTaskCount(testsName, startTaskCount);
        ++successCount;
    });


    test("Turn VSCode Gulp Provider On", async function()
    {
        if (exitRollingCount(12, successCount)) return;
        this.slow(tc.slowTime.config.eventFast + tc.slowTime.refreshCommand + tc.slowTime.verifyTaskCount + tc.slowTime.min + 3000);
        await configuration.updateVs("gulp.autoDetect", "on");
        await waitForTeIdle(tc.waitTime.config.enableEvent);
        await sleep(3000);
        await treeUtils.refresh();
        await verifyTaskCount(testsName, startTaskCount);
        await waitForTeIdle(tc.waitTime.min);
        ++successCount;
    });


    test("Turn VSCode Gulp Provider Off", async function()
    {
        if (exitRollingCount(13, successCount)) return;
        this.slow(tc.slowTime.config.eventFast + tc.slowTime.refreshCommand + tc.slowTime.verifyTaskCount + tc.slowTime.min + 1500);
        await configuration.updateVs("gulp.autoDetect", "off");
        await waitForTeIdle(tc.waitTime.config.enableEvent);
        await sleep(1500);
        // await executeTeCommand("refresh", tc.waitTime.refreshCommand);
        await treeUtils.refresh();
        await verifyTaskCount(testsName, startTaskCount);
        await waitForTeIdle(tc.waitTime.min);
        ++successCount;
    });

});
