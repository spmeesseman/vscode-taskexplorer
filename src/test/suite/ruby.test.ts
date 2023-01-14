/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* tslint:disable */

import * as path from "path";
import { Uri } from "vscode";
import { expect } from "chai";
import { RubyTaskProvider } from "../../providers/ruby";
import { configuration } from "../../lib/utils/configuration";
import { IFilesystemApi, ITaskExplorerApi } from "@spmeesseman/vscode-taskexplorer-types";
import { activate, executeSettingsUpdate, executeTeCommand, exitRollingCount, getWsPath, suiteFinished, testControl, treeUtils, verifyTaskCount } from "../utils/utils";

const testsName = "ruby";
const startTaskCount = 7;

let teApi: ITaskExplorerApi;
let fsApi: IFilesystemApi;
let provider: RubyTaskProvider;
let dirName: string;
let fileUri: Uri;
let successCount = 0;


suite("Ruby Tests", () =>
{

    suiteSetup(async function()
    {
        teApi = await activate(this);
        fsApi = teApi.testsApi.fs;
        provider = teApi.providers.get(testsName) as RubyTaskProvider;
        dirName = getWsPath("tasks_test_");
        fileUri = Uri.file(path.join(dirName, "newscript.pl"));
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
        // provider.getDocumentPosition(undefined, undefined);
        // provider.getDocumentPosition("test", undefined);
        // provider.getDocumentPosition(undefined, "test");
        ++successCount;
    });


    test("Start", async function()
    {
        if (exitRollingCount(3, successCount)) return;
        this.slow(testControl.slowTime.verifyTaskCount + testControl.waitTime.min);
        // await verifyTaskCount(testsName, startTaskCount);
        // await teApi.waitForIdle(testControl.waitTime.min);
        ++successCount;
    });


    test("Disable", async function()
    {
        if (exitRollingCount(4, successCount)) return;
        this.slow(testControl.slowTime.configEnableEvent + testControl.slowTime.verifyTaskCount + testControl.waitTime.configEnableEvent + testControl.waitTime.min);
        // await teApi.config.updateWs("enabledTasks.ruby", false);
        // await teApi.waitForIdle(testControl.waitTime.configEnableEvent);
        // await verifyTaskCount(testsName, 0);
        // await teApi.waitForIdle(testControl.waitTime.min);
        ++successCount;
    });


    test("Re-enable", async function()
    {
        if (exitRollingCount(5, successCount)) return;
        this.slow(testControl.slowTime.configEnableEvent + testControl.slowTime.verifyTaskCount + testControl.waitTime.configEnableEvent + testControl.waitTime.min);
        // await teApi.config.updateWs("enabledTasks.ruby", true);
        // await teApi.waitForIdle(testControl.waitTime.configEnableEvent);
        // await verifyTaskCount(testsName, startTaskCount);
        // await teApi.waitForIdle(testControl.waitTime.min);
        ++successCount;
    });


    test("Create File", async function()
    {
        if (exitRollingCount(6, successCount)) return;
        this.slow(testControl.slowTime.fsCreateEvent + testControl.slowTime.verifyTaskCount + testControl.waitTime.fsCreateEvent + testControl.waitTime.min);
        // if (!(await fsApi.pathExists(dirName))) {
        //     await fsApi.createDir(dirName);
        // }
        // await fsApi.writeFile(
        //     fileUri.fsPath,
        //     "module.exports = function(ruby) {\n" +
        //     '    ruby.registerTask(\n"default2", ["jshint:myproject"]);\n' +
        //     '    ruby.registerTask("upload2", ["s3"]);\n' +
        //     "};\n"
        // );
        // await teApi.waitForIdle(testControl.waitTime.fsCreateEvent);
        // await verifyTaskCount(testsName, startTaskCount + 2);
        // await teApi.waitForIdle(testControl.waitTime.min);
        ++successCount;
    });


    test("Add 4 Tasks to File", async function()
    {
        if (exitRollingCount(7, successCount)) return;
        this.slow(testControl.slowTime.fsModifyEvent + testControl.slowTime.verifyTaskCount + testControl.waitTime.fsModifyEvent + testControl.waitTime.min);
        // await fsApi.writeFile(
        //     fileUri.fsPath,
        //     "module.exports = function(ruby) {\n" +
        //     '    ruby.registerTask(\n"default2", ["jshint:myproject"]);\n' +
        //     '    ruby.registerTask("upload2", ["s3"]);\n' +
        //     '    ruby.registerTask("upload3", ["s4"]);\n' +
        //     '    ruby.registerTask("upload4", ["s5"]);\n' +
        //     '    ruby.registerTask("upload5", ["s6"]);\n' +
        //     '    ruby.registerTask("upload6", ["s7"]);\n' +
        //     "};\n"
        // );
        // await teApi.waitForIdle(testControl.waitTime.fsModifyEvent);
        // await verifyTaskCount(testsName, startTaskCount + 6);
        // await teApi.waitForIdle(testControl.waitTime.min);
        ++successCount;
    });


    test("Remove 2 Tasks from File", async function()
    {
        if (exitRollingCount(8, successCount)) return;
        this.slow(testControl.slowTime.fsDeleteEvent + testControl.slowTime.verifyTaskCount + testControl.waitTime.fsModifyEvent + testControl.waitTime.min);
        // await fsApi.writeFile(
        //     fileUri.fsPath,
        //     "module.exports = function(ruby) {\n" +
        //     '    ruby.registerTask(\n"default2", ["jshint:myproject"]);\n' +
        //     '    ruby.registerTask("upload2", ["s3"]);\n' +
        //     '    ruby.registerTask("upload5", ["s5"]);\n' +
        //     '    ruby.registerTask("upload6", ["s7"]);\n' +
        //     "};\n"
        // );
        // await teApi.waitForIdle(testControl.waitTime.fsModifyEvent);
        // await verifyTaskCount(testsName, startTaskCount + 4);
        // await teApi.waitForIdle(testControl.waitTime.min);
        ++successCount;
    });


    test("Delete File", async function()
    {
        if (exitRollingCount(9, successCount)) return;
        this.slow(testControl.slowTime.fsDeleteEvent + testControl.slowTime.verifyTaskCount + testControl.waitTime.fsDeleteEvent + testControl.waitTime.min);
        // await fsApi.deleteFile(fileUri.fsPath);
        // await fsApi.deleteDir(dirName);
        // await teApi.waitForIdle(testControl.waitTime.fsDeleteEvent);
        // await verifyTaskCount(testsName, startTaskCount);
        // await teApi.waitForIdle(testControl.waitTime.min);
        ++successCount;
    });

});
