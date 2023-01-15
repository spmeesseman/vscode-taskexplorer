/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */

import * as utils from "../utils/utils";
import { join } from "path";
import { ITaskExplorerApi } from "@spmeesseman/vscode-taskexplorer-types";

const tc = utils.testControl;
let teApi: ITaskExplorerApi;
let dirName: string;
let dirName2: string;
let rootPath: string;
let successCount = -1;


suite("File Watcher Tests", () =>
{
    suiteSetup(async function()
    {
        teApi = await utils.activate(this);
        rootPath = utils.getWsPath(".");
        dirName = join(rootPath, "tasks_test_");
        dirName2 = utils.getTestsPath(".");
        ++successCount;
    });


    suiteTeardown(async function()
    {
        await teApi.testsApi.fs.deleteDir(dirName);
        await teApi.testsApi.fs.deleteDir(dirName2);
        await utils.waitForTeIdle(tc.waitTime.fsDeleteFolderEvent);
        utils.suiteFinished(this);
    });


    test("Build Tree (View Collapsed)", async function()
    {
        if (utils.exitRollingCount(0, successCount)) return;
        await utils.treeUtils.refresh(this);
        ++successCount;
    });


    test("Check Task Counts", async function()
    {
        if (utils.exitRollingCount(1, successCount)) return;
        await checkTaskCounts(this);
        ++successCount;
    });


    test("Add Empty Folder", async function()
    {
        if (utils.exitRollingCount(2, successCount)) return;
        this.slow(tc.slowTime.fsCreateFolderEvent + tc.waitTime.fsCreateFolderEvent);
        await teApi.testsApi.fs.createDir(dirName);
        await utils.waitForTeIdle(tc.waitTime.fsCreateFolderEvent);
        ++successCount;
    });


    test("Add File", async function()
    {
        if (utils.exitRollingCount(3, successCount)) return;
        ++successCount;
    });


    test("Delete Folder", async function()
    {
        if (utils.exitRollingCount(4, successCount)) return;
        this.slow(tc.slowTime.fsDeleteFolderEvent);
        await teApi.testsApi.fs.deleteDir(dirName);
        await utils.waitForTeIdle(tc.waitTime.fsDeleteFolderEvent);
        ++successCount;
    });


    test("Add Non-Empty Folder (Copy / Move)", async function()
    {
        if (utils.exitRollingCount(5, successCount)) return;
        this.slow((tc.slowTime.fsCreateFolderEvent * 2) + (tc.waitTime.fsCreateFolderEvent * 2) + tc.slowTime.fsCreateEvent + tc.waitTime.fsCreateEvent);
        await teApi.testsApi.fs.createDir(dirName2);
        await utils.waitForTeIdle(tc.waitTime.fsCreateFolderEvent);
        await teApi.testsApi.fs.writeFile(
            join(dirName2, "Gruntfile.js"),
            "module.exports = function(grunt) {\n" +
            '    grunt.registerTask(\n"default2", ["jshint:myproject"]);\n' +
            '    grunt.registerTask("upload2", ["s3"]);\n' +
            "};\n"
        );
        await utils.waitForTeIdle(tc.waitTime.fsCreateEvent);
        await teApi.testsApi.fs.copyDir(dirName2, dirName, /Gruntfile\.js/, true);
        await utils.waitForTeIdle(tc.waitTime.fsCreateFolderEvent);
        await utils.verifyTaskCount("grunt", 8);
        await teApi.testsApi.fs.copyDir(dirName2, dirName);
        await utils.waitForTeIdle(tc.waitTime.fsCreateFolderEvent);
        await utils.verifyTaskCount("grunt", 9);
        ++successCount;
    });


    test("Delete Folders", async function()
    {
        if (utils.exitRollingCount(6, successCount)) return;
        this.slow(tc.slowTime.fsDeleteFolderEvent);
        await teApi.testsApi.fs.deleteDir(dirName2);
        await teApi.testsApi.fs.deleteDir(dirName);
        await utils.waitForTeIdle(tc.waitTime.fsDeleteFolderEvent);
        await checkTaskCounts(this);
        ++successCount;
    });

});


const checkTaskCounts = async (instance: Mocha.Context) =>
{
    instance.slow((4 * utils.testControl.slowTime.verifyTaskCount) + utils.testControl.slowTime.verifyTaskCountNpm + utils.testControl.slowTime.verifyTaskCountWorkspace);
    await utils.verifyTaskCount("bash", 1);
    await utils.verifyTaskCount("batch", 2);
    await utils.verifyTaskCount("npm", 2);
    await utils.verifyTaskCount("grunt", 7);
    await utils.verifyTaskCount("gulp", 17);
    await utils.verifyTaskCount("Workspace", 10);
};
