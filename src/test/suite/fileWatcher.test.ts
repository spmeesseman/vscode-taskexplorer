/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */

import * as utils from "../utils/utils";
import { join } from "path";
import { IFilesystemApi } from "@spmeesseman/vscode-taskexplorer-types";
import { IConfiguration } from "@spmeesseman/vscode-taskexplorer-types/lib/IConfiguration";

const tc = utils.testControl;
const startTaskCountBash = 1;
const startTaskCountBatch = 2;
const startTaskCountNpm = 2;
const startTaskCountGrunt = 7;
const startTaskCountGulp = 17;
const startTaskCountWs = 13; // 10 + 3 User Tasks
let fsApi: IFilesystemApi;
let configApi: IConfiguration;
let insideWsDir: string;
let insideWsDir2: string;
let insideWsDirIgn: string;
let outsideWsDir: string;
let rootPath: string;
let excludes: string[];


suite("File Watcher Tests", () =>
{
    suiteSetup(async function()
    {
        ({ fsApi, configApi } = await utils.activate(this));
        rootPath = utils.getWsPath(".");
        insideWsDir = join(rootPath, "tasks_test_");
        insideWsDir2 = join(rootPath, "tasks_test2_");
        insideWsDirIgn = join(rootPath, "fwTestIgnore");
        outsideWsDir = utils.getTestsPath("testA");
        excludes = configApi.get<string[]>("exclude");
        await utils.executeSettingsUpdate("exclude", [ ...excludes, ...[ "**/fwTestIgnore/**" ] ], tc.waitTime.config.globEvent);
    });


    suiteTeardown(async function()
    {
        await fsApi.deleteDir(insideWsDir);
        await utils.waitForTeIdle(tc.waitTime.fs.deleteFolderEvent);
        await fsApi.deleteDir(insideWsDirIgn);
        await utils.waitForTeIdle(tc.waitTime.fs.deleteFolderEvent);
        await fsApi.deleteDir(outsideWsDir);
        await utils.executeSettingsUpdate("exclude", excludes, tc.waitTime.config.globEvent);
        utils.suiteFinished(this);
    });


    test("Build Tree", async function()
    {
        if (utils.exitRollingCount(this)) return;
        if (utils.needsTreeBuild()) {
            await utils.treeUtils.refresh(this);
        }
    });


    test("Check Task Counts", async function()
    {
        if (utils.exitRollingCount(this)) return;
        await checkTaskCounts(this);
    });


    test("Create Folders", async function()
    {
        if (utils.exitRollingCount(this)) return;
        this.slow(tc.slowTime.fs.createFolderEvent * 2);
        await fsApi.createDir(insideWsDir);
        await fsApi.createDir(insideWsDir2);
        await utils.waitForTeIdle(tc.waitTime.fs.createFolderEvent);
    });


    test("Add Existing File", async function()
    {
        if (utils.exitRollingCount(this)) return;
        this.slow(tc.slowTime.fs.createEvent +  tc.slowTime.taskCount.verify);
        await fsApi.writeFile(
            join(insideWsDir, "Gruntfile.js"),
            "module.exports = function(grunt) {\n" +
            '    grunt.registerTask(\n"default10", ["jshint:myproject"]);\n' +
            '    grunt.registerTask("upload10", ["s3"]);\n' +
            "};\n"
        );
        await utils.waitForTeIdle(tc.waitTime.fs.createEvent);
        await utils.verifyTaskCount("grunt", startTaskCountGrunt + 2);
    });


    test("Delete File", async function()
    {
        if (utils.exitRollingCount(this)) return;
        this.slow(tc.slowTime.fs.deleteEvent + tc.slowTime.taskCount.verify);
        await fsApi.deleteFile(join(insideWsDir, "Gruntfile.js"));
        await utils.waitForTeIdle(tc.waitTime.fs.deleteEvent);
        await utils.verifyTaskCount("grunt", startTaskCountGrunt);
    });


    test("Add New File", async function()
    {
        if (utils.exitRollingCount(this)) return;
        this.slow(tc.slowTime.fs.createEvent + tc.slowTime.taskCount.verify);
        await fsApi.writeFile(join(insideWsDir, "Gruntfile.js"), "");
        await utils.waitForTeIdle(tc.waitTime.fs.createEvent);
        await utils.verifyTaskCount("grunt", startTaskCountGrunt);
    });


    test("Add New Task to File", async function()
    {
        if (utils.exitRollingCount(this)) return;
        this.slow(tc.slowTime.fs.modifyEvent + tc.slowTime.taskCount.verify);
        await fsApi.writeFile(
            join(insideWsDir, "Gruntfile.js"),
            "module.exports = function(grunt) {\n" +
            '    grunt.registerTask("upload_this", ["s3"]);\n' +
            "};\n"
        );
        await utils.waitForTeIdle(tc.waitTime.fs.modifyEvent);
        await utils.verifyTaskCount("grunt", startTaskCountGrunt + 1);
    });


    test("Delete Folder", async function()
    {
        if (utils.exitRollingCount(this)) return;
        this.slow(tc.slowTime.fs.deleteFolderEvent + tc.slowTime.taskCount.verify);
        await fsApi.deleteDir(insideWsDir);
        await utils.waitForTeIdle(tc.waitTime.fs.deleteFolderEvent);
        await utils.verifyTaskCount("grunt", startTaskCountGrunt);
    });


    test("Add Ignored Folder", async function()
    {
        if (utils.exitRollingCount(this)) return;
        this.slow(tc.slowTime.fs.createFolderEvent);
        await fsApi.createDir(insideWsDirIgn);
        await utils.waitForTeIdle(tc.waitTime.fs.createFolderEvent);
    });


    test("Add File to Ignored Folder", async function()
    {
        if (utils.exitRollingCount(this)) return;
        this.slow(tc.slowTime.fs.createEvent + tc.slowTime.taskCount.verify);
        await fsApi.writeFile(
            join(insideWsDirIgn, "Gruntfile.js"),
            "module.exports = function(grunt) {\n" +
            '    grunt.registerTask(\n"default10", ["jshint:myproject"]);\n' +
            '    grunt.registerTask("upload10", ["s3"]);\n' +
            "};\n"
        );
        await utils.waitForTeIdle(tc.waitTime.fs.createEvent);
        await utils.verifyTaskCount("grunt", startTaskCountGrunt);
    });


    test("Modify File in Ignored Folder", async function()
    {
        if (utils.exitRollingCount(this)) return;
        this.slow((tc.slowTime.fs.modifyEvent * 2) + (tc.slowTime.taskCount.verify * 2) + 200);
        await fsApi.writeFile(
            join(insideWsDirIgn, "Gruntfile.js"),
            "module.exports = function(grunt) {\n" +
            '    grunt.registerTask(\n"default10", ["jshint:myproject"]);\n' +
            "};\n"
        );
        await utils.waitForTeIdle(tc.waitTime.fs.modifyEvent);
        await utils.verifyTaskCount("grunt", startTaskCountGrunt);
        await utils.sleep(100);
        await fsApi.writeFile(
            join(insideWsDirIgn, "Gruntfile.js"),
            "module.exports = function(grunt) {\n" +
            '    grunt.registerTask(\n"default20", ["jshint:myproject"]);\n' +
            "};\n"
        );
        await utils.waitForTeIdle(tc.waitTime.fs.modifyEvent);
        await utils.verifyTaskCount("grunt", startTaskCountGrunt);
        await utils.sleep(100);
    });


    test("Delete File in Ignored Folder", async function()
    {
        if (utils.exitRollingCount(this)) return;
        this.slow(tc.slowTime.fs.modifyEvent + tc.slowTime.taskCount.verify);
        await fsApi.deleteFile(join(insideWsDirIgn, "Gruntfile.js"));
        await utils.waitForTeIdle(tc.waitTime.fs.deleteEvent);
        await utils.verifyTaskCount("grunt", startTaskCountGrunt);
    });


    test("Add a Non-Empty Folder to Workspace Folder", async function()
    {
        if (utils.exitRollingCount(this)) return;
        this.slow((tc.slowTime.fs.createFolderEvent * 2) + (tc.waitTime.fs.createFolderEvent * 2) +
                  tc.slowTime.fs.createEvent + (tc.slowTime.taskCount.verify * 2));
        await fsApi.createDir(outsideWsDir);
        await fsApi.writeFile(
            join(outsideWsDir, "Gruntfile.js"),
            "module.exports = function(grunt) {\n" +
            '    grunt.registerTask(\n"default13", ["jshint:myproject"]);\n' +
            '    grunt.registerTask("upload13", ["s3"]);\n' +
            "};\n"
        );
        await fsApi.copyDir(outsideWsDir, insideWsDir, /Gruntfile\.js/, true); // copy folder
        await utils.waitForTeIdle(tc.waitTime.fs.createFolderEvent);
        await utils.verifyTaskCount("grunt", startTaskCountGrunt + 2);
        await fsApi.copyDir(outsideWsDir, insideWsDir); // copies files only within outsideWsDir
        await fsApi.copyDir(outsideWsDir, insideWsDir, /Gulpfile/); // cover filter yielding 0 files
        await utils.waitForTeIdle(tc.waitTime.fs.createFolderEvent);
        await utils.verifyTaskCount("grunt", startTaskCountGrunt + 4);
    });


    test("Add/Modify New Files Repetitively", async function()
    {
        if (utils.exitRollingCount(this)) return;
        this.slow((tc.slowTime.fs.createEvent * 2) + tc.slowTime.taskCount.verify);
        await fsApi.writeFile(join(insideWsDir2, "Gruntfile1.js"), "");
        await fsApi.writeFile(join(insideWsDir2, "Gruntfile2.js"), "");
        await fsApi.writeFile(join(insideWsDir2, "Gruntfile3.js"), "");
        await fsApi.writeFile(join(insideWsDir2, "Gruntfile4.js"), "");
        await fsApi.writeFile(join(insideWsDir2, "Gruntfile5.js"), "");
        await fsApi.writeFile(join(insideWsDir2, "Gruntfile6.js"), "");
        await fsApi.writeFile(join(insideWsDir2, "Gruntfile7.js"), "");
        await fsApi.writeFile(join(insideWsDir, "Gruntfile.js"), "");
        await fsApi.writeFile(join(insideWsDir, "Gruntfile2.js"), "");
        await fsApi.writeFile(join(insideWsDirIgn, "Gruntfile3.js"), "");
        await fsApi.writeFile(join(insideWsDirIgn, "Gruntfile.js"), "");
        await fsApi.writeFile(join(insideWsDirIgn, "Gruntfile3.js"), "");
        await fsApi.writeFile(join(insideWsDir, "Gulpfile.js"), "");
        await fsApi.writeFile(join(insideWsDir2, "Gruntfile.js"), "");
        await fsApi.writeFile(
            join(insideWsDir2, "Gruntfile.js"),
            "module.exports = function(grunt) {\n" +
            '    grunt.registerTask(\n"d45", ["jshint:m2"]);\n' +
            "};\n"
        );
        await fsApi.writeFile(join(insideWsDir2, "Gruntfile.js"), " ");
        await fsApi.writeFile(join(insideWsDir2, "Gruntfile.js"), "");
        await fsApi.writeFile(join(insideWsDir2, "Gulpfile1.js"), "");
        await fsApi.deleteFile(join(insideWsDir2, "Gruntfile.js"));
        await fsApi.writeFile(
            join(insideWsDir2, "Gruntfile.js"),
            "module.exports = function(grunt) {\n" +
            '    grunt.registerTask(\n"d45", ["jshint:m2"]);\n' +
            '    grunt.registerTask(\n"d46", ["jshint:m2"]);\n' +
            "};\n"
        );
        await fsApi.writeFile(join(insideWsDir2, "Gulpfile1.js"), " ");
        await fsApi.deleteFile(join(insideWsDir2, "Gruntfile6.js"));
        await fsApi.writeFile(join(insideWsDir2, "Gruntfile6.js"), "");
        await fsApi.deleteFile(join(insideWsDir2, "Gruntfile6.js"));
        await fsApi.writeFile(join(insideWsDir2, "Gruntfile6.js"), "");
        await fsApi.deleteFile(join(insideWsDir2, "Gruntfile6.js"));
        await fsApi.writeFile(join(insideWsDir2, "Gruntfile6.js"), "");
        await fsApi.deleteFile(join(insideWsDir2, "Gruntfile6.js"));
        await fsApi.writeFile(join(insideWsDir2, "Gruntfile6.js"), "");
        await fsApi.deleteFile(join(insideWsDir2, "Gruntfile6.js"));
        await fsApi.writeFile(join(insideWsDir2, "Gruntfile6.js"), "");
        await fsApi.deleteFile(join(insideWsDir2, "Gruntfile6.js"));
        await fsApi.writeFile(join(insideWsDir2, "Gruntfile6.js"), "");
        await fsApi.writeFile(join(insideWsDir2, "Gulpfile1.js"), "");
        await fsApi.writeFile(join(insideWsDir, "Gulpfile2.js"), "");
        await fsApi.deleteFile(join(insideWsDir2, "Gruntfile.js"));
        await fsApi.writeFile(join(insideWsDir2, "Gruntfile.js"), "");
        await fsApi.writeFile(join(insideWsDirIgn, "Gruntfile4.js"), "");
        await fsApi.writeFile(join(insideWsDir, "Gruntfile5.js"), "");
        await fsApi.writeFile(join(insideWsDir, "Gruntfile5.js"), " ");
        await fsApi.writeFile(join(insideWsDir, "Gruntfile5.js"), "");
        await fsApi.writeFile(join(insideWsDir2, "Gruntfile6.js"), "");
        await fsApi.writeFile(join(insideWsDir2, "Gruntfile7.js"), "");
        await fsApi.deleteFile(join(insideWsDir2, "Gruntfile6.js"));
        await fsApi.deleteFile(join(insideWsDir2, "Gruntfile7.js"));
        await fsApi.writeFile(join(insideWsDir2, "Gruntfile7.js"), "");
        await fsApi.writeFile(join(insideWsDir2, "Gruntfile6.js"), "");
        await fsApi.writeFile(join(insideWsDir2, "Gulpfile.js"), "");
        await fsApi.writeFile(join(insideWsDir, "Gruntfile8.js"), "");
        await fsApi.writeFile(join(insideWsDirIgn, "Gruntfile9.js"), "");
        await fsApi.writeFile(join(insideWsDir, "Gulpfile2.js"), "");
        await fsApi.writeFile(join(insideWsDir, "Gruntfile10.js"), "");
        await fsApi.deleteFile(join(insideWsDir2, "Gulpfile.js"));
        await fsApi.deleteFile(join(insideWsDir2, "Gulpfile1.js"));
        await fsApi.deleteFile(join(insideWsDir2, "Gulpfile.js"));
        await fsApi.deleteFile(join(insideWsDir2, "Gruntfile.js"));
        await fsApi.writeFile(join(insideWsDir, "Gruntfile2.js"), " ");
        await fsApi.deleteFile(join(insideWsDir2, "Gruntfile1.js"));
        await fsApi.deleteFile(join(insideWsDir2, "Gruntfile2.js"));
        await fsApi.deleteFile(join(insideWsDir2, "Gruntfile3.js"));
        await fsApi.deleteFile(join(insideWsDir2, "Gruntfile4.js"));
        await fsApi.deleteFile(join(insideWsDir2, "Gruntfile5.js"));
        await fsApi.writeFile(join(insideWsDir, "Gruntfile2.js"), "");
        await fsApi.deleteFile(join(insideWsDir2, "Gruntfile6.js"));
        await fsApi.deleteFile(join(insideWsDir2, "Gruntfile7.js"));
        await utils.waitForTeIdle(tc.waitTime.fs.createEvent * 2);
        await utils.verifyTaskCount("grunt", startTaskCountGrunt + 2); // 2 less than previous test, blanked /_test_files/Gruntfile.js
    });


    test("Delete Folders", async function()
    {
        if (utils.exitRollingCount(this)) return;
        this.slow(tc.slowTime.fs.deleteFolderEvent + (tc.slowTime.taskCount.verify * 6));
        await fsApi.deleteDir(outsideWsDir);
        await fsApi.deleteDir(insideWsDir);
        await fsApi.deleteDir(insideWsDir2);
        await fsApi.deleteDir(insideWsDirIgn);
        await utils.waitForTeIdle(tc.waitTime.fs.deleteFolderEvent);
        await checkTaskCounts(this);
    });

});


const checkTaskCounts = async (instance: Mocha.Context) =>
{
    instance.slow((4 * utils.testControl.slowTime.taskCount.verify) + utils.testControl.slowTime.taskCount.verifyNpm + utils.testControl.slowTime.taskCount.verifyWorkspace);
    await utils.verifyTaskCount("bash", startTaskCountBash);
    await utils.verifyTaskCount("batch", startTaskCountBatch);
    await utils.verifyTaskCount("npm", startTaskCountNpm);
    await utils.verifyTaskCount("grunt", startTaskCountGrunt);
    await utils.verifyTaskCount("gulp", startTaskCountGulp);
    await utils.verifyTaskCount("Workspace", startTaskCountWs);
};
