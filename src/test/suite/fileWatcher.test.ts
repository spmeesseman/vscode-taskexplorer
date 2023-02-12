/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */

import { join } from "path";
import fsUtils from "../utils/fsUtils";
import * as utils from "../utils/utils";
import { TeWrapper } from "../../lib/wrapper";
import { executeSettingsUpdate } from "../utils/commandUtils";
import { IDictionary } from "@spmeesseman/vscode-taskexplorer-types";

const tc = utils.testControl;
const startTaskCountBash = 1;
const startTaskCountBatch = 2;
const startTaskCountGrunt = 7;
const startTaskCountGulp = 17;
const startTaskCountWs = 13; // 10 + 3 User Tasks
let startTaskCountNpm = 2;  // set in suiteSetup() as it will change depending on single or multi root ws
let teWrapper: TeWrapper;
let insideWsDir: string;
let insideWsDir2: string;
let insideWsDirIgn: string;
let outsideWsDir: string;
let rootPath: string;
let excludes: string[];

let files: IDictionary<string> = {};


suite("File Watcher Tests", () =>
{
    suiteSetup(async function()
    {
        if (utils.exitRollingCount(this, true)) return;
        ({ teWrapper } = await utils.activate(this));
        startTaskCountNpm = tc.isMultiRootWorkspace ? 17 : 2;
        rootPath = utils.getWsPath(".");
        insideWsDir = join(rootPath, "tasks_test_");
        insideWsDir2 = join(rootPath, "tasks_test2_");
        insideWsDirIgn = join(rootPath, "fwTestIgnore");
        outsideWsDir = utils.getProjectsPath("testA");
        excludes = teWrapper.config.get<string[]>("exclude");
        files = {
            grunt1_0: join(insideWsDir, "Gruntfile.js"),
            grunt1_1: join(insideWsDir, "Gruntfile1.js"),
            grunt1_2: join(insideWsDir, "Gruntfile2.js"),
            grunt1_3: join(insideWsDir, "Gruntfile3.js"),
            grunt1_4: join(insideWsDir, "Gruntfile4.js"),
            grunt1_5: join(insideWsDir, "Gruntfile5.js"),
            grunt1_6: join(insideWsDir, "Gruntfile6.js"),
            grunt1_7: join(insideWsDir, "Gruntfile7.js"),
            grunt2_0: join(insideWsDir2, "Gruntfile.js"),
            grunt2_1: join(insideWsDir2, "Gruntfile1.js"),
            grunt2_2: join(insideWsDir2, "Gruntfile2.js"),
            grunt2_3: join(insideWsDir2, "Gruntfile3.js"),
            grunt2_4: join(insideWsDir2, "Gruntfile4.js"),
            grunt2_5: join(insideWsDir2, "Gruntfile5.js"),
            grunt2_6: join(insideWsDir2, "Gruntfile6.js"),
            grunt2_7: join(insideWsDir2, "Gruntfile7.js"),
            gruntIgn_0: join(insideWsDirIgn, "Gruntfile.js"),
            gruntIgn_1: join(insideWsDirIgn, "Gruntfile1.js"),
            gruntIgn_2: join(insideWsDirIgn, "Gruntfile2.js"),
            gulp1_0: join(insideWsDir, "Gulpfile.js"),
            gulp1_1: join(insideWsDir, "Gulpfile1.js"),
            gulp2_0: join(insideWsDir2, "Gulpfile.js"),
            gulp2_1: join(insideWsDir2, "Gulpfile1.js"),
            gulpIgn_0: join(insideWsDirIgn, "Gulpfile.js"),
            gulpIgn_1: join(insideWsDirIgn, "Gulpfile1.js")
        };
        executeSettingsUpdate("exclude", [ ...excludes, ...[ "**/fwTestIgnore/**" ] ], tc.waitTime.config.globEvent);
        utils.endRollingCount(this, true);
    });


    suiteTeardown(async function()
    {
        if (utils.exitRollingCount(this, false, true)) return;
        await fsUtils.deleteDir(insideWsDir);
        await fsUtils.deleteDir(insideWsDirIgn);
        await fsUtils.deleteDir(outsideWsDir);
        await executeSettingsUpdate("exclude", excludes, tc.waitTime.config.globEvent);
        utils.suiteFinished(this);
    });


    test("Build Tree", async function()
    {
        if (utils.exitRollingCount(this)) return;
        if (utils.needsTreeBuild()) {
            await utils.treeUtils.refresh(this);
        }
        utils.endRollingCount(this);
    });


    test("Check Task Counts", async function()
    {
        if (utils.exitRollingCount(this)) return;
        await checkTaskCounts(this);
        utils.endRollingCount(this);
    });


    test("Create Folders", async function()
    {
        if (utils.exitRollingCount(this)) return;
        this.slow(tc.slowTime.fs.createFolderEvent * 2);
        await teWrapper.fs.createDir(insideWsDir);
        await teWrapper.fs.createDir(insideWsDir2);
        await utils.waitForTeIdle(tc.waitTime.fs.createFolderEvent);
        utils.endRollingCount(this);
    });


    test("Create File", async function()
    {
        if (utils.exitRollingCount(this)) return;
        this.slow(tc.slowTime.fs.createEvent +  tc.slowTime.taskCount.verify);
        await fsUtils.createFile(
            join(insideWsDir, "Gruntfile.js"),
            "module.exports = function(grunt) {\n" +
            '    grunt.registerTask(\n"default10", ["jshint:myproject"]);\n' +
            '    grunt.registerTask("upload10", ["s3"]);\n' +
            "};\n"
        );
        await utils.verifyTaskCount("grunt", startTaskCountGrunt + 2);
        utils.endRollingCount(this);
    });


    test("Delete File", async function()
    {
        if (utils.exitRollingCount(this)) return;
        this.slow(tc.slowTime.fs.deleteEvent + tc.slowTime.taskCount.verify);
        await fsUtils.deleteFile(join(insideWsDir, "Gruntfile.js"));
        await utils.verifyTaskCount("grunt", startTaskCountGrunt);
        utils.endRollingCount(this);
    });


    test("Create Empty File", async function()
    {
        if (utils.exitRollingCount(this)) return;
        this.slow(tc.slowTime.fs.createEvent + tc.slowTime.taskCount.verify);
        await fsUtils.createFile(join(insideWsDir, "Gruntfile.js"), "");
        await utils.verifyTaskCount("grunt", startTaskCountGrunt);
        utils.endRollingCount(this);
    });


    test("Add New Task to File", async function()
    {
        if (utils.exitRollingCount(this)) return;
        this.slow(tc.slowTime.fs.modifyEvent + tc.slowTime.taskCount.verify);
        await fsUtils.writeFile(
            join(insideWsDir, "Gruntfile.js"),
            "module.exports = function(grunt) {\n" +
            '    grunt.registerTask("upload_this", ["s3"]);\n' +
            "};\n"
        );
        await utils.verifyTaskCount("grunt", startTaskCountGrunt + 1);
        utils.endRollingCount(this);
    });


    test("Delete Folder", async function()
    {
        if (utils.exitRollingCount(this)) return;
        this.slow(tc.slowTime.fs.deleteFolderEvent + tc.slowTime.taskCount.verify);
        await fsUtils.deleteDir(insideWsDir);
        await utils.verifyTaskCount("grunt", startTaskCountGrunt);
        utils.endRollingCount(this);
    });


    test("Add Ignored Folder", async function()
    {
        if (utils.exitRollingCount(this)) return;
        this.slow(tc.slowTime.fs.createFolderEvent);
        await fsUtils.createDir(insideWsDirIgn);
        utils.endRollingCount(this);
    });


    test("Add File to Ignored Folder", async function()
    {
        if (utils.exitRollingCount(this)) return;
        this.slow(tc.slowTime.fs.createEvent + tc.slowTime.taskCount.verify);
        await fsUtils.createFile(
            join(insideWsDirIgn, "Gruntfile.js"),
            "module.exports = function(grunt) {\n" +
            '    grunt.registerTask(\n"default10", ["jshint:myproject"]);\n' +
            '    grunt.registerTask("upload10", ["s3"]);\n' +
            "};\n"
        );
        await utils.verifyTaskCount("grunt", startTaskCountGrunt);
        utils.endRollingCount(this);
    });


    test("Modify File in Ignored Folder", async function()
    {
        if (utils.exitRollingCount(this)) return;
        this.slow((tc.slowTime.fs.modifyEvent * 2) + (tc.slowTime.taskCount.verify * 2) + 200);
        await fsUtils.writeFile(
            join(insideWsDirIgn, "Gruntfile.js"),
            "module.exports = function(grunt) {\n" +
            '    grunt.registerTask(\n"default10", ["jshint:myproject"]);\n' +
            "};\n"
        );
        await utils.verifyTaskCount("grunt", startTaskCountGrunt);
        await utils.sleep(100);
        await fsUtils.writeFile(
            join(insideWsDirIgn, "Gruntfile.js"),
            "module.exports = function(grunt) {\n" +
            '    grunt.registerTask(\n"default20", ["jshint:myproject"]);\n' +
            "};\n"
        );
        await utils.verifyTaskCount("grunt", startTaskCountGrunt);
        await utils.sleep(100);
        utils.endRollingCount(this);
    });


    test("Delete File in Ignored Folder", async function()
    {
        if (utils.exitRollingCount(this)) return;
        this.slow(tc.slowTime.fs.modifyEvent + tc.slowTime.taskCount.verify);
        await fsUtils.deleteFile(join(insideWsDirIgn, "Gruntfile.js"));
        await utils.verifyTaskCount("grunt", startTaskCountGrunt);
        utils.endRollingCount(this);
    });


    test("Add a Non-Empty Folder to Workspace Folder", async function()
    {
        if (utils.exitRollingCount(this)) return;
        this.slow((tc.slowTime.fs.createFolderEvent * 2) + tc.slowTime.fs.createEvent + (tc.slowTime.taskCount.verify * 2));
        await fsUtils.createDir(outsideWsDir);
        await fsUtils.createFile(
            join(outsideWsDir, "Gruntfile.js"),
            "module.exports = function(grunt) {\n" +
            '    grunt.registerTask(\n"default13", ["jshint:myproject"]);\n' +
            '    grunt.registerTask("upload13", ["s3"]);\n' +
            "};\n"
        );
        await teWrapper.fs.copyDir(outsideWsDir, insideWsDir, /Gruntfile\.js/, true); // copy folder
        await utils.waitForTeIdle(tc.waitTime.fs.createFolderEvent);
        await utils.verifyTaskCount("grunt", startTaskCountGrunt + 2);
        await teWrapper.fs.copyDir(outsideWsDir, insideWsDir); // copies files only within outsideWsDir
        await teWrapper.fs.copyDir(outsideWsDir, insideWsDir, /Gulpfile/); // cover filter yielding 0 files
        await utils.waitForTeIdle(tc.waitTime.fs.createFolderEvent);
        await utils.verifyTaskCount("grunt", startTaskCountGrunt + 4);
        utils.endRollingCount(this);
    });


    test("Delete New Non-Empty Folder", async function()
    {
        if (utils.exitRollingCount(this)) return;
        this.slow(tc.slowTime.fs.deleteFolderEvent + tc.slowTime.taskCount.verify);
        await fsUtils.deleteDir(join(insideWsDir, "testA"));
        await utils.verifyTaskCount("grunt", startTaskCountGrunt + 2);
        utils.endRollingCount(this);
    });


    test("Add a Non-Empty Folder to Workspace Folder (Un-Licensed Mode)", async function()
    {
        if (utils.exitRollingCount(this)) return;
        this.slow(tc.slowTime.fs.createFolderEvent + tc.slowTime.taskCount.verify + (tc.slowTime.licenseMgr.setLicenseCmd * 2));
        utils.setLicensed(false);
        await teWrapper.fs.copyDir(outsideWsDir, insideWsDir, undefined, true); // copy folder
        await utils.waitForTeIdle(tc.waitTime.fs.createFolderEvent);
        utils.setLicensed(true);
        await utils.verifyTaskCount("grunt", startTaskCountGrunt + 4);
        utils.endRollingCount(this);
    });


    test("Add/Delete New Files Repetitively", async function()
    {
        if (utils.exitRollingCount(this)) return;
        this.slow((tc.slowTime.fs.createEvent * 2) + tc.slowTime.taskCount.verify + 3850);

        await writeGruntFile("grunt2_0", 1, " ");
        writeGruntFile("grunt2_0", 1, "");
        await writeGruntFile("grunt2_1", 1, "");
        await writeGruntFile("grunt2_2", 10, "");
        await writeGruntFile("grunt2_3", 1, "");
        await writeGruntFile("grunt2_4", 125, "");
        writeGruntFile("grunt2_5", 1, "");
        writeGruntFile("grunt2_5", 1, " ");
        writeGruntFile("grunt2_5", 1, "");
        writeGruntFile("grunt2_5", 1, " ");
        await writeGruntFile("grunt2_5", 25, "");
        await writeGruntFile("grunt2_6", 125, "");
        await writeGruntFile("grunt2_7", 1, "");
        await writeGruntFile("grunt1_0", 125, "");
        await writeGruntFile("grunt1_2", 1, "");
        await writeGruntFile("gruntIgn_0", 1, "");
        await writeGruntFile("gruntIgn_1", 25, "");
        await writeGruntFile("gruntIgn_2", 1, "");
        await writeGulpFile("gulp1_0", 1, "");
        await writeGulpFile("gulp2_0", 125, " ");
        await teWrapper.fs.writeFile(
            join(insideWsDir2, "Gruntfile.js"),
            "module.exports = function(grunt) {\n" +
            '    grunt.registerTask(\n"d45", ["jshint:m2"]);\n' +
            "};\n"
        );
        await utils.sleep(50);
        await writeGruntFile("grunt2_0", 100, " ");
        writeGruntFile("grunt2_0", 1, "");
        await writeGulpFile("gulp2_0", 50, "");
        await writeGruntFile("grunt2_0", 1, " ");
        await teWrapper.fs.writeFile(
            join(insideWsDir2, "Gruntfile.js"),
            "module.exports = function(grunt) {\n" +
            '    grunt.registerTask(\n"d45", ["jshint:m2"]);\n' +
            '    grunt.registerTask(\n"d46", ["jshint:m2"]);\n' +
            "};\n"
        );
        await utils.sleep(50);
        await writeGulpFile("gulp2_0", 1, " ");
        await teWrapper.fs.deleteFile(files.grunt2_6);
        await writeGruntFile("grunt2_0", 1, "  ");
        await teWrapper.fs.deleteFile(files.grunt2_6);
        await writeGruntFile("grunt2_0", 125, "");
        await teWrapper.fs.deleteFile(files.grunt2_6);
        await writeGruntFile("grunt2_0", 1, "");
        await teWrapper.fs.deleteFile(files.grunt2_6);
        await writeGruntFile("grunt2_0", 1, "");
        await teWrapper.fs.deleteFile(files.grunt2_6);
        await writeGruntFile("grunt2_0", 125, "");
        await teWrapper.fs.deleteFile(files.grunt2_6);
        await writeGruntFile("grunt2_0", 1, "");
        await writeGruntFile("grunt2_1", 1, "");
        await writeGulpFile("gulp2_1", 1, "");
        await teWrapper.fs.deleteFile(files.grunt2_0);
        await writeGruntFile("grunt2_1", 50, "");
        await writeGruntFile("gruntIgn_0", 1, "  ");
        await writeGruntFile("grunt1_5", 1, "");
        writeGruntFile("grunt1_5", 1, " ");
        await writeGruntFile("grunt1_5", 50, "");
        await writeGruntFile("grunt2_6", 1, "");
        await writeGruntFile("grunt2_7", 50, "");
        await teWrapper.fs.deleteFile(files.grunt2_6);
        await teWrapper.fs.deleteFile(files.grunt2_7);
        await writeGruntFile("grunt2_6", 1, "");
        await writeGruntFile("grunt2_7", 125, "");
        await writeGruntFile("grunt2_0", 1, "  ");
        await writeGruntFile("grunt2_0", 1, "");
        await writeGruntFile("gruntIgn_0", 1, "");
        await writeGruntFile("grunt1_0", 125, "");
        await writeGruntFile("grunt1_0", 125, " ");
        await teWrapper.fs.deleteFile(files.grunt1_3);
        await writeGruntFile("grunt1_0", 50, " ");
        await teWrapper.fs.deleteFile(files.grunt1_3);
        await writeGruntFile("grunt1_0", 125, " ");
        await teWrapper.fs.deleteFile(files.grunt1_3);
        await writeGruntFile("grunt1_0", 25, " ");
        await teWrapper.fs.deleteFile(files.grunt1_3);
        await writeGruntFile("grunt1_0", 25, " ");
        await teWrapper.fs.deleteFile(files.grunt1_3);
        await utils.sleep(500);
        await teWrapper.fs.deleteFile(files.gulp1_0);
        await teWrapper.fs.deleteFile(files.gulp2_1);
        await utils.sleep(25);
        await teWrapper.fs.deleteFile(files.gulp2_0);
        await teWrapper.fs.deleteFile(files.grunt2_0);
        await writeGruntFile("grunt2_0", 1, "");
        await teWrapper.fs.deleteFile(files.grunt2_0);
        await teWrapper.fs.deleteFile(files.grunt2_1);
        await teWrapper.fs.deleteFile(files.grunt2_2);
        await teWrapper.fs.deleteFile(files.grunt2_3);
        await utils.sleep(25);
        await teWrapper.fs.deleteFile(files.grunt2_4);
        await teWrapper.fs.deleteFile(files.grunt2_5);
        await teWrapper.fs.deleteFile(files.grunt2_6);
        await utils.sleep(25);
        await teWrapper.fs.deleteFile(files.grunt2_7);
        await utils.waitForTeIdle(tc.waitTime.fs.createEvent * 2);
        await utils.verifyTaskCount("grunt", startTaskCountGrunt + 2); // 2 less than previous test, blanked /_test_files/Gruntfile.js
        utils.endRollingCount(this);
    });


    test("Modify Files Repetitively", async function()
    {
        if (utils.exitRollingCount(this)) return;
        this.slow((tc.slowTime.fs.createEvent * 2) + tc.slowTime.taskCount.verify + 3450);
        await writeGruntFile("grunt2_0", 1, "");
        writeGruntFile("grunt2_0", 1, " ");
        await writeGruntFile("grunt2_0", 1, "  ");
        await writeGruntFile("grunt2_0", 125, "   ");
        await writeGruntFile("grunt2_0", 125, "    ");
        await writeGruntFile("grunt2_0", 25, "   ");
        await writeGruntFile("grunt2_0", 1, "  ");
        await writeGruntFile("grunt2_0", 125, " ");
        await writeGruntFile("grunt2_0", 10, "");
        await writeGruntFile("grunt2_1", 1, "");
        await writeGruntFile("grunt2_2", 10, "");
        await writeGruntFile("grunt2_1", 50, " ");
        await writeGruntFile("grunt2_1", 1, "");
        await writeGruntFile("grunt2_1", 125, " ");
        await writeGruntFile("grunt2_3", 1, "");
        await writeGruntFile("grunt2_1", 50, "");
        await writeGruntFile("grunt2_5", 1, "");
        await writeGruntFile("grunt2_6", 125, "");
        await writeGruntFile("grunt2_7", 1, "");
        await teWrapper.fs.writeFile(
            join(insideWsDir2, "Gruntfile.js"),
            "module.exports = function(grunt) {\n" +
            '    grunt.registerTask(\n"d45", ["jshint:m2"]);\n' +
            "};\n"
        );
        await utils.sleep(100);
        await writeGruntFile("grunt2_5", 1, " ");
        await writeGruntFile("grunt2_6", 1, " ");
        await writeGruntFile("grunt2_0", 10, " ");
        await writeGruntFile("grunt2_0", 10, "");
        await writeGulpFile("gulp2_0", 10, "");
        await writeGulpFile("gulp2_0", 1, " ");
        await writeGulpFile("gulp2_0", 50, "");
        await writeGruntFile("grunt2_0", 125, "  ");
        await writeGulpFile("gulp2_0", 10, " ");
        await writeGulpFile("gulp2_0", 50, " ");
        await writeGruntFile("grunt2_0", 125, " ");
        await writeGruntFile("grunt2_0", 1, "");
        await writeGulpFile("gulp2_0", 1, "  ");
        await writeGulpFile("gulp2_0", 125, "");
        await writeGruntFile("grunt2_7", 1, " ");
        await writeGruntFile("grunt2_5", 1, "");
        await writeGruntFile("grunt2_6", 125, "");
        await writeGruntFile("grunt2_7", 1, "");
        await writeGruntFile("grunt2_1", 125, " ");
        await writeGruntFile("grunt2_1", 1, "");
        await writeGruntFile("grunt2_1", 125, " ");
        await writeGruntFile("grunt2_1", 1, "");
        await teWrapper.fs.deleteFile(files.grunt2_0);
        await utils.sleep(25);
        await teWrapper.fs.deleteFile(files.gulp2_0);
        await utils.sleep(25);
        await teWrapper.fs.deleteFile(files.grunt2_1);
        await utils.sleep(500);
        await teWrapper.fs.deleteFile(files.grunt2_2);
        await teWrapper.fs.deleteFile(files.grunt2_3);
        await utils.sleep(50);
        await teWrapper.fs.deleteFile(files.grunt2_5);
        await teWrapper.fs.deleteFile(files.grunt2_6);
        await utils.sleep(50);
        await teWrapper.fs.deleteFile(files.grunt2_7);
        await utils.waitForTeIdle(tc.waitTime.fs.createEvent * 2);
        await utils.verifyTaskCount("grunt", startTaskCountGrunt + 2);
        utils.endRollingCount(this);
    });


    test("Delete Folders", async function()
    {
        if (utils.exitRollingCount(this)) return;
        this.slow(tc.slowTime.fs.deleteFolderEvent + (tc.slowTime.taskCount.verify * 6));
        await teWrapper.fs.deleteDir(outsideWsDir);
        await teWrapper.fs.deleteDir(insideWsDir);
        await teWrapper.fs.deleteDir(insideWsDir2);
        await teWrapper.fs.deleteDir(insideWsDirIgn);
        await utils.waitForTeIdle(tc.waitTime.fs.deleteFolderEvent);
        await checkTaskCounts(this);
        utils.endRollingCount(this);
    });

});


const checkTaskCounts = async (instance: Mocha.Context) =>
{
    instance.slow(6 * utils.testControl.slowTime.taskCount.verify);
    await utils.verifyTaskCount("bash", startTaskCountBash);
    await utils.verifyTaskCount("batch", startTaskCountBatch);
    await utils.verifyTaskCount("npm", startTaskCountNpm);
    await utils.verifyTaskCount("grunt", startTaskCountGrunt);
    await utils.verifyTaskCount("gulp", startTaskCountGulp);
    await utils.verifyTaskCount("Workspace", startTaskCountWs);
};


const writeGruntFile = async(file: string, msSleep: number, content: string) =>
{
    await teWrapper.fs.writeFile(files[file], content);
    await utils.sleep(msSleep);
};


const writeGulpFile = async(file: string, msSleep: number, content: string) =>
{
    await teWrapper.fs.writeFile(files[file], content);
    await utils.sleep(msSleep);
};
