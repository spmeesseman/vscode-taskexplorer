/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* tslint:disable */

import * as path from "path";
import { expect } from "chai";
import { activate, getWsPath, testControl, verifyTaskCount } from "../helper";
import { GulpTaskProvider } from "../../providers/gulp";
import { IFilesystemApi, ITaskExplorerApi } from "@spmeesseman/vscode-taskexplorer-types";
import { Uri } from "vscode";

const testsName = "gulp";
const startTaskCount = 17;

let teApi: ITaskExplorerApi;
let fsApi: IFilesystemApi;
let provider: GulpTaskProvider;
let dirName: string;
let fileUri: Uri;
let successCount = 0;


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


    test("Document Position", async function()
    {
        expect(successCount).to.be.equal(1);
        provider.getDocumentPosition(undefined, undefined);
        provider.getDocumentPosition("test", undefined);
        provider.getDocumentPosition(undefined, "test");
        ++successCount;
    });


    test("Start", async function()
    {
        expect(successCount).to.be.equal(2);
        this.slow(testControl.slowTime.verifyTaskCount);
        await verifyTaskCount(testsName, startTaskCount);
        ++successCount;
    });


    test("Disable", async function()
    {
        expect(successCount).to.be.equal(3);
        this.slow(testControl.slowTime.configEnableEvent + testControl.slowTime.verifyTaskCount);
        await teApi.config.updateWs("enabledTasks.gulp", false);
        await teApi.waitForIdle(testControl.waitTime.configEnableEvent);
        await verifyTaskCount(testsName, 0);
        ++successCount;
    });


    test("Re-enable", async function()
    {
        expect(successCount).to.be.equal(4);
        this.slow(testControl.slowTime.configEnableEvent + testControl.slowTime.verifyTaskCount);
        await teApi.config.updateWs("enabledTasks.gulp", true);
        await teApi.waitForIdle(testControl.waitTime.configEnableEvent);
        await verifyTaskCount(testsName, startTaskCount);
        ++successCount;
    });


    test("Create File", async function()
    {
        expect(successCount).to.be.equal(5);
        this.slow(testControl.slowTime.fsCreateEvent + testControl.slowTime.verifyTaskCount);
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
        ++successCount;
    });


    test("Add Task to file", async function()
    {
        expect(successCount).to.be.equal(6);
        this.slow(testControl.slowTime.fsModifyEvent + testControl.slowTime.verifyTaskCount);
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
        ++successCount;
    });


    test("Remove 2 Tasks from file", async function()
    {
        expect(successCount).to.be.equal(7);
        this.slow(testControl.slowTime.fsDeleteEvent + testControl.slowTime.verifyTaskCount);
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
        expect(successCount).to.be.equal(8);
        this.slow(testControl.slowTime.fsDeleteEvent + testControl.slowTime.verifyTaskCount);
        await fsApi.deleteFile(fileUri.fsPath);
        await fsApi.deleteDir(dirName);
        await teApi.waitForIdle(testControl.waitTime.fsDeleteEvent);
        await verifyTaskCount(testsName, startTaskCount);
        ++successCount;
    });


    test("Gulp Parser", async function()
    {
        expect(successCount).to.be.equal(9);
        // const rootWorkspace = (workspace.workspaceFolders as WorkspaceFolder[])[0],
        //       gulpFile = getWsPath("gulp\\gulpfile.js");
        //
        // Use Gulp
        //
        await teApi.config.updateWs("useGulp", true);

        // await teApi.explorer?.invalidateTasksCache(testsName);
        // await tasks.fetchTasks({ type: testsName });
        // gulpTasks = await provider.readUriTasks(Uri.file(buildXmlFile));
        // assert(gulpTasks.length === 2, "# of Gulp tasks should be 2");
        // gulpTasks = await provider.readUriTasks(Uri.file(buildXmlFile), rootWorkspace);
        // assert(gulpTasks.length === 2, "# of Gulp tasks should be 2");

        //
        // Reset
        //
        await teApi.config.updateWs("useGulp", false);
        ++successCount;
    });

});
