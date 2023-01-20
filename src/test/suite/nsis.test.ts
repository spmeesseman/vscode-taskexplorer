/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* tslint:disable */

import * as path from "path";
import { Uri } from "vscode";
import { expect } from "chai";
import { NsisTaskProvider } from "../../providers/nsis";
import { configuration } from "../../lib/utils/configuration";
import { IFilesystemApi, ITaskExplorerApi } from "@spmeesseman/vscode-taskexplorer-types";
import {
    activate, executeSettingsUpdate, executeTeCommand, exitRollingCount, getWsPath, needsTreeBuild, suiteFinished,
    testControl, treeUtils, verifyTaskCount
} from "../utils/utils";

const testsName = "nsis";
const startTaskCount = 7;

let teApi: ITaskExplorerApi;
let fsApi: IFilesystemApi;
let provider: NsisTaskProvider;
let dirName: string;
let fileUri: Uri;
let successCount = 0;


suite("Nullsoft NSIS Tests", () =>
{

    suiteSetup(async function()
    {
        ({ teApi, fsApi } = await activate(this));
        provider = teApi.providers[testsName] as NsisTaskProvider;
        dirName = getWsPath("tasks_test_");
        fileUri = Uri.file(path.join(dirName, "new_build.nsi"));
        ++successCount;
    });

    suiteTeardown(async function()
    {
        suiteFinished(this);
    });


    test("Build Tree", async function()
    {
        if (exitRollingCount(1, successCount)) return;
        if (needsTreeBuild()) {
            await treeUtils.refresh(this);
        }
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
        this.slow(testControl.slowTime.taskCount.verify + testControl.waitTime.min);
        // await verifyTaskCount(testsName, startTaskCount);
        // await waitForTeIdle(testControl.waitTime.min);
        ++successCount;
    });


    test("Disable", async function()
    {
        if (exitRollingCount(4, successCount)) return;
        this.slow(testControl.slowTime.config.enableEvent + testControl.slowTime.taskCount.verify + testControl.waitTime.config.enableEvent + testControl.waitTime.min);
        // await teApi.config.updateWs("enabledTasks.nsis", false);
        // await waitForTeIdle(testControl.waitTime.config.enableEvent);
        // await verifyTaskCount(testsName, 0);
        // await waitForTeIdle(testControl.waitTime.min);
        ++successCount;
    });


    test("Re-enable", async function()
    {
        if (exitRollingCount(5, successCount)) return;
        this.slow(testControl.slowTime.config.enableEvent + testControl.slowTime.taskCount.verify + testControl.waitTime.config.enableEvent + testControl.waitTime.min);
        // await teApi.config.updateWs("enabledTasks.nsis", true);
        // await waitForTeIdle(testControl.waitTime.config.enableEvent);
        // await verifyTaskCount(testsName, startTaskCount);
        // await waitForTeIdle(testControl.waitTime.min);
        ++successCount;
    });


    test("Create File", async function()
    {
        if (exitRollingCount(6, successCount)) return;
        this.slow(testControl.slowTime.fs.createEvent + testControl.slowTime.taskCount.verify + testControl.waitTime.fs.createEvent + testControl.waitTime.min);
        // if (!(await fsApi.pathExists(dirName))) {
        //     await fsApi.createDir(dirName);
        // }
        // await fsApi.writeFile(
        //     fileUri.fsPath,
        //     "module.exports = function(nsis) {\n" +
        //     '    nsis.registerTask(\n"default2", ["jshint:myproject"]);\n' +
        //     '    nsis.registerTask("upload2", ["s3"]);\n' +
        //     "};\n"
        // );
        // await waitForTeIdle(testControl.waitTime.fs.createEvent);
        // await verifyTaskCount(testsName, startTaskCount + 2);
        // await waitForTeIdle(testControl.waitTime.min);
        ++successCount;
    });


    test("Delete File", async function()
    {
        if (exitRollingCount(7, successCount)) return;
        this.slow(testControl.slowTime.fs.deleteEvent + testControl.slowTime.taskCount.verify + testControl.waitTime.fs.deleteEvent + testControl.waitTime.min);
        // await fsApi.deleteFile(fileUri.fsPath);
        // await fsApi.deleteDir(dirName);
        // await waitForTeIdle(testControl.waitTime.fs.deleteEvent);
        // await verifyTaskCount(testsName, startTaskCount);
        // await waitForTeIdle(testControl.waitTime.min);
        ++successCount;
    });

});
