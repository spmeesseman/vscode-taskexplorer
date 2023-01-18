/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */

import * as utils from "../utils/utils";
import { join } from "path";
import { IFilesystemApi, ITaskExplorerApi, ITestsApi } from "@spmeesseman/vscode-taskexplorer-types";
import { IConfiguration } from "@spmeesseman/vscode-taskexplorer-types/lib/IConfiguration";

const tc = utils.testControl;
const startTaskCountBash = 1;
const startTaskCountBatch = 2;
const startTaskCountNpm = 2;
const startTaskCountGrunt = 7;
const startTaskCountGulp = 17;
const startTaskCountWs = 10;
let fsApi: IFilesystemApi;
let configApi: IConfiguration;
let insideWsDir: string;
let insideWsDirIgn: string;
let outsideWsDir: string;
let rootPath: string;
let excludes: string[];
let successCount = -1;


suite("File Watcher Tests", () =>
{
    suiteSetup(async function()
    {
        ({ fsApi, configApi } = await utils.activate(this));
        rootPath = utils.getWsPath(".");
        insideWsDir = join(rootPath, "tasks_test_");
        insideWsDirIgn = join(rootPath, "fwTestIgnore");
        outsideWsDir = utils.getTestsPath("testA");
        excludes = configApi.get<string[]>("exclude");
        await utils.executeSettingsUpdate("exclude", [ ...excludes, ...[ "**/fwTestIgnore/**" ] ], tc.waitTime.config.globEvent);
        ++successCount;
    });


    suiteTeardown(async function()
    {
        await fsApi.deleteDir(insideWsDir);
        await utils.waitForTeIdle(tc.waitTime.fs.deleteFoldereEvent);
        await fsApi.deleteDir(insideWsDirIgn);
        await utils.waitForTeIdle(tc.waitTime.fs.deleteFoldereEvent);
        await fsApi.deleteDir(outsideWsDir);
        await utils.executeSettingsUpdate("exclude", excludes, tc.waitTime.config.globEvent);
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


    test("Create Folder", async function()
    {
        if (utils.exitRollingCount(2, successCount)) return;
        this.slow(tc.slowTime.fs.createFolderEvent);
        await fsApi.createDir(insideWsDir);
        await utils.waitForTeIdle(tc.waitTime.fs.createFolderEvent);
        ++successCount;
    });


    test("Add Existing File", async function()
    {
        if (utils.exitRollingCount(3, successCount)) return;
        this.slow(tc.slowTime.fs.createEvent +  tc.slowTime.verifyTaskCount);
        await fsApi.writeFile(
            join(insideWsDir, "Gruntfile.js"),
            "module.exports = function(grunt) {\n" +
            '    grunt.registerTask(\n"default10", ["jshint:myproject"]);\n' +
            '    grunt.registerTask("upload10", ["s3"]);\n' +
            "};\n"
        );
        await utils.waitForTeIdle(tc.waitTime.fs.createEvent);
        await utils.verifyTaskCount("grunt", startTaskCountGrunt + 2);
        ++successCount;
    });


    test("Delete File", async function()
    {
        if (utils.exitRollingCount(4, successCount)) return;
        this.slow(tc.slowTime.fs.deleteEvent + tc.slowTime.verifyTaskCount);
        await fsApi.deleteFile(join(insideWsDir, "Gruntfile.js"));
        await utils.waitForTeIdle(tc.waitTime.fs.deleteEvent);
        await utils.verifyTaskCount("grunt", startTaskCountGrunt);
        ++successCount;
    });


    test("Add New File", async function()
    {
        if (utils.exitRollingCount(5, successCount)) return;
        this.slow(tc.slowTime.fs.createEvent + tc.slowTime.verifyTaskCount);
        await fsApi.writeFile(join(insideWsDir, "Gruntfile.js"), "");
        await utils.waitForTeIdle(tc.waitTime.fs.createEvent);
        await utils.verifyTaskCount("grunt", startTaskCountGrunt);
        ++successCount;
    });


    test("Add New Task to File", async function()
    {
        if (utils.exitRollingCount(6, successCount)) return;
        this.slow(tc.slowTime.fs.modifyEvent + tc.slowTime.verifyTaskCount);
        await fsApi.writeFile(
            join(insideWsDir, "Gruntfile.js"),
            "module.exports = function(grunt) {\n" +
            '    grunt.registerTask("upload_this", ["s3"]);\n' +
            "};\n"
        );
        await utils.waitForTeIdle(tc.waitTime.fs.modifyEvent);
        await utils.verifyTaskCount("grunt", startTaskCountGrunt + 1);
        ++successCount;
    });


    test("Delete Folder", async function()
    {
        if (utils.exitRollingCount(7, successCount)) return;
        this.slow(tc.slowTime.fs.deleteFoldereEvent + tc.slowTime.verifyTaskCount);
        await fsApi.deleteDir(insideWsDir);
        await utils.waitForTeIdle(tc.waitTime.fs.deleteFoldereEvent);
        await utils.verifyTaskCount("grunt", startTaskCountGrunt);
        ++successCount;
    });


    test("Add Ignored Folder", async function()
    {
        if (utils.exitRollingCount(8, successCount)) return;
        this.slow(tc.slowTime.fs.createFolderEvent);
        await fsApi.createDir(insideWsDirIgn);
        await utils.waitForTeIdle(tc.waitTime.fs.createFolderEvent);
        ++successCount;
    });


    test("Add File to Ignored Folder", async function()
    {
        if (utils.exitRollingCount(9, successCount)) return;
        this.slow(tc.slowTime.fs.createEvent + tc.slowTime.verifyTaskCount);
        await fsApi.writeFile(
            join(insideWsDirIgn, "Gruntfile.js"),
            "module.exports = function(grunt) {\n" +
            '    grunt.registerTask(\n"default10", ["jshint:myproject"]);\n' +
            '    grunt.registerTask("upload10", ["s3"]);\n' +
            "};\n"
        );
        await utils.waitForTeIdle(tc.waitTime.fs.createEvent);
        await utils.verifyTaskCount("grunt", startTaskCountGrunt);
        ++successCount;
    });


    test("Modify File in Ignored Folder", async function()
    {
        if (utils.exitRollingCount(10, successCount)) return;
        this.slow(tc.slowTime.fs.modifyEvent + tc.slowTime.verifyTaskCount);
        await fsApi.writeFile(
            join(insideWsDirIgn, "Gruntfile.js"),
            "module.exports = function(grunt) {\n" +
            '    grunt.registerTask(\n"default10", ["jshint:myproject"]);\n' +
            "};\n"
        );
        await utils.waitForTeIdle(tc.waitTime.fs.modifyEvent);
        await utils.verifyTaskCount("grunt", startTaskCountGrunt);
        ++successCount;
    });


    test("Delete File in Ignored Folder", async function()
    {
        if (utils.exitRollingCount(11, successCount)) return;
        this.slow(tc.slowTime.fs.modifyEvent + tc.slowTime.verifyTaskCount);
        await fsApi.deleteFile(join(insideWsDirIgn, "Gruntfile.js"));
        await utils.waitForTeIdle(tc.waitTime.fs.deleteEvent);
        await utils.verifyTaskCount("grunt", startTaskCountGrunt);
        ++successCount;
    });


    test("Add a Non-Empty Folder to Workspace Folder", async function()
    {
        if (utils.exitRollingCount(12, successCount)) return;
        this.slow((tc.slowTime.fs.createFolderEvent * 2) + (tc.waitTime.fs.createFolderEvent * 2) +
                  tc.slowTime.fs.createEvent + (tc.slowTime.verifyTaskCount * 2));
        await fsApi.createDir(outsideWsDir);
        await fsApi.writeFile(
            join(outsideWsDir, "Gruntfile.js"),
            "module.exports = function(grunt) {\n" +
            '    grunt.registerTask(\n"default2", ["jshint:myproject"]);\n' +
            '    grunt.registerTask("upload2", ["s3"]);\n' +
            "};\n"
        );
        await fsApi.copyDir(outsideWsDir, insideWsDir, /Gruntfile\.js/, true); // copy folder
        await utils.waitForTeIdle(tc.waitTime.fs.createFolderEvent);
        await utils.verifyTaskCount("grunt", startTaskCountGrunt + 2);
        await fsApi.copyDir(outsideWsDir, insideWsDir); // copies files only within outsideWsDir
        await fsApi.copyDir(outsideWsDir, insideWsDir, /Gulpfile/); // cover filter yielding 0 files
        await utils.waitForTeIdle(tc.waitTime.fs.createFolderEvent);
        await utils.verifyTaskCount("grunt", startTaskCountGrunt + 4);
        ++successCount;
    });


    test("Delete Folders", async function()
    {
        if (utils.exitRollingCount(13, successCount)) return;
        this.slow(tc.slowTime.fs.deleteFoldereEvent + (tc.slowTime.verifyTaskCount * 6));
        await fsApi.deleteDir(outsideWsDir);
        await fsApi.deleteDir(insideWsDir);
        await fsApi.deleteDir(insideWsDirIgn);
        await utils.waitForTeIdle(tc.waitTime.fs.deleteFoldereEvent);
        await checkTaskCounts(this);
        ++successCount;
    });

});


const checkTaskCounts = async (instance: Mocha.Context) =>
{
    instance.slow((4 * utils.testControl.slowTime.verifyTaskCount) + utils.testControl.slowTime.verifyTaskCountNpm + utils.testControl.slowTime.verifyTaskCountWorkspace);
    await utils.verifyTaskCount("bash", startTaskCountBash);
    await utils.verifyTaskCount("batch", startTaskCountBatch);
    await utils.verifyTaskCount("npm", startTaskCountNpm);
    await utils.verifyTaskCount("grunt", startTaskCountGrunt);
    await utils.verifyTaskCount("gulp", startTaskCountGulp);
    await utils.verifyTaskCount("Workspace", startTaskCountWs);
};
