/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */

import * as utils from "../utils/utils";
import { join } from "path";
import { IDictionary, IFilesystemApi } from "@spmeesseman/vscode-taskexplorer-types";
import { IConfiguration } from "@spmeesseman/vscode-taskexplorer-types/lib/IConfiguration";
import { getLicenseManager } from "../../extension";

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

let files: IDictionary<string> = {};


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
        await utils.executeSettingsUpdate("exclude", [ ...excludes, ...[ "**/fwTestIgnore/**" ] ], tc.waitTime.config.globEvent);
        utils.endRollingCount(this);
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
        await fsApi.createDir(insideWsDir);
        await fsApi.createDir(insideWsDir2);
        await utils.waitForTeIdle(tc.waitTime.fs.createFolderEvent);
        utils.endRollingCount(this);
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
        utils.endRollingCount(this);
    });


    test("Delete File", async function()
    {
        if (utils.exitRollingCount(this)) return;
        this.slow(tc.slowTime.fs.deleteEvent + tc.slowTime.taskCount.verify);
        await fsApi.deleteFile(join(insideWsDir, "Gruntfile.js"));
        await utils.waitForTeIdle(tc.waitTime.fs.deleteEvent);
        await utils.verifyTaskCount("grunt", startTaskCountGrunt);
        utils.endRollingCount(this);
    });


    test("Add New File", async function()
    {
        if (utils.exitRollingCount(this)) return;
        this.slow(tc.slowTime.fs.createEvent + tc.slowTime.taskCount.verify);
        await fsApi.writeFile(join(insideWsDir, "Gruntfile.js"), "");
        await utils.waitForTeIdle(tc.waitTime.fs.createEvent);
        await utils.verifyTaskCount("grunt", startTaskCountGrunt);
        utils.endRollingCount(this);
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
        utils.endRollingCount(this);
    });


    test("Delete Folder", async function()
    {
        if (utils.exitRollingCount(this)) return;
        this.slow(tc.slowTime.fs.deleteFolderEvent + tc.slowTime.taskCount.verify);
        await fsApi.deleteDir(insideWsDir);
        await utils.waitForTeIdle(tc.waitTime.fs.deleteFolderEvent);
        await utils.verifyTaskCount("grunt", startTaskCountGrunt);
        utils.endRollingCount(this);
    });


    test("Add Ignored Folder", async function()
    {
        if (utils.exitRollingCount(this)) return;
        this.slow(tc.slowTime.fs.createFolderEvent);
        await fsApi.createDir(insideWsDirIgn);
        await utils.waitForTeIdle(tc.waitTime.fs.createFolderEvent);
        utils.endRollingCount(this);
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
        utils.endRollingCount(this);
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
        utils.endRollingCount(this);
    });


    test("Delete File in Ignored Folder", async function()
    {
        if (utils.exitRollingCount(this)) return;
        this.slow(tc.slowTime.fs.modifyEvent + tc.slowTime.taskCount.verify);
        await fsApi.deleteFile(join(insideWsDirIgn, "Gruntfile.js"));
        await utils.waitForTeIdle(tc.waitTime.fs.deleteEvent);
        await utils.verifyTaskCount("grunt", startTaskCountGrunt);
        utils.endRollingCount(this);
    });


    test("Add a Non-Empty Folder to Workspace Folder", async function()
    {
        if (utils.exitRollingCount(this)) return;
        this.slow((tc.slowTime.fs.createFolderEvent * 2) + tc.slowTime.fs.createEvent + (tc.slowTime.taskCount.verify * 2));
        await fsApi.createDir(outsideWsDir);
        await fsApi.writeFile(
            join(outsideWsDir, "Gruntfile.js"),
            "module.exports = function(grunt) {\n" +
            '    grunt.registerTask(\n"default13", ["jshint:myproject"]);\n' +
            '    grunt.registerTask("upload13", ["s3"]);\n' +
            "};\n"
        );
        utils.setLicensed(true, getLicenseManager());
        await fsApi.copyDir(outsideWsDir, insideWsDir, /Gruntfile\.js/, true); // copy folder
        await utils.waitForTeIdle(tc.waitTime.fs.createFolderEvent);
        await utils.verifyTaskCount("grunt", startTaskCountGrunt + 2);
        await fsApi.copyDir(outsideWsDir, insideWsDir); // copies files only within outsideWsDir
        await fsApi.copyDir(outsideWsDir, insideWsDir, /Gulpfile/); // cover filter yielding 0 files
        await utils.waitForTeIdle(tc.waitTime.fs.createFolderEvent);
        await utils.verifyTaskCount("grunt", startTaskCountGrunt + 4);
        utils.endRollingCount(this);
    });


    test("Delete New Non-Empty Folder", async function()
    {
        if (utils.exitRollingCount(this)) return;
        this.slow(tc.slowTime.fs.deleteFolderEvent + tc.slowTime.taskCount.verify);
        await fsApi.deleteDir(join(insideWsDir, "testA"));
        await utils.waitForTeIdle(tc.waitTime.fs.deleteFolderEvent);
        await utils.verifyTaskCount("grunt", startTaskCountGrunt + 2);
        utils.endRollingCount(this);
    });


    test("Add a Non-Empty Folder to Workspace Folder (Un-Licensed Mode)", async function()
    {
        if (utils.exitRollingCount(this)) return;
        this.slow(tc.slowTime.fs.createFolderEvent + tc.slowTime.taskCount.verify);
        utils.setLicensed(false, getLicenseManager());
        await fsApi.copyDir(outsideWsDir, insideWsDir, undefined, true); // copy folder
        await utils.waitForTeIdle(tc.waitTime.fs.createFolderEvent);
        utils.setLicensed(true, getLicenseManager());
        await utils.verifyTaskCount("grunt", startTaskCountGrunt + 4);
        utils.endRollingCount(this);
    });


    test("Add/Delete New Files Repetitively", async function()
    {
        if (utils.exitRollingCount(this)) return;
        this.slow((tc.slowTime.fs.createEvent * 2) + tc.slowTime.taskCount.verify + 1900);

        await writeGruntFile("grunt2_0", 1, "");
        await writeGruntFile("grunt2_1", 1, "");
        await writeGruntFile("grunt2_2", 10, "");
        await writeGruntFile("grunt2_3", 1, "");
        await writeGruntFile("grunt2_4", 125, "");
        await writeGruntFile("grunt2_5", 1, "");
        await writeGruntFile("grunt2_6", 125, "");
        await writeGruntFile("grunt2_7", 1, "");
        await writeGruntFile("grunt1_0", 125, "");
        await writeGruntFile("grunt1_2", 1, "");
        await writeGruntFile("gruntIgn_0", 1, "");
        await writeGruntFile("gruntIgn_1", 25, "");
        await writeGruntFile("gruntIgn_2", 1, "");
        await writeGulpFile("gulp1_0", 1, "");
        await writeGulpFile("gulp2_0", 125, " ");
        await fsApi.writeFile(
            join(insideWsDir2, "Gruntfile.js"),
            "module.exports = function(grunt) {\n" +
            '    grunt.registerTask(\n"d45", ["jshint:m2"]);\n' +
            "};\n"
        );
        await utils.sleep(50);
        await writeGruntFile("grunt2_0", 100, " ");
        await writeGruntFile("grunt2_0", 1, "");
        await writeGulpFile("gulp2_0", 50, "");
        await writeGruntFile("grunt2_0", 1, " ");
        await fsApi.writeFile(
            join(insideWsDir2, "Gruntfile.js"),
            "module.exports = function(grunt) {\n" +
            '    grunt.registerTask(\n"d45", ["jshint:m2"]);\n' +
            '    grunt.registerTask(\n"d46", ["jshint:m2"]);\n' +
            "};\n"
        );
        await utils.sleep(50);
        await writeGulpFile("gulp2_0", 1, " ");
        await fsApi.deleteFile(files.grunt2_6);
        await writeGruntFile("grunt2_0", 1, "  ");
        await fsApi.deleteFile(files.grunt2_6);
        await writeGruntFile("grunt2_0", 125, "");
        await fsApi.deleteFile(files.grunt2_6);
        await writeGruntFile("grunt2_0", 1, "");
        await fsApi.deleteFile(files.grunt2_6);
        await writeGruntFile("grunt2_0", 1, "");
        await fsApi.deleteFile(files.grunt2_6);
        await writeGruntFile("grunt2_0", 125, "");
        await fsApi.deleteFile(files.grunt2_6);
        await writeGruntFile("grunt2_0", 1, "");
        await writeGruntFile("grunt2_1", 1, "");
        await writeGulpFile("gulp2_1", 1, "");
        await fsApi.deleteFile(files.grunt2_0);
        await writeGruntFile("grunt2_1", 50, "");
        await writeGruntFile("gruntIgn_0", 1, "  ");
        await writeGruntFile("grunt1_5", 1, "");
        await writeGruntFile("grunt1_5", 1, " ");
        await writeGruntFile("grunt1_5", 50, "");
        await writeGruntFile("grunt2_6", 1, "");
        await writeGruntFile("grunt2_7", 50, "");
        await fsApi.deleteFile(files.grunt2_6);
        await fsApi.deleteFile(files.grunt2_7);
        await writeGruntFile("grunt2_6", 1, "");
        await writeGruntFile("grunt2_7", 125, "");
        await writeGruntFile("grunt2_0", 1, "  ");
        await writeGruntFile("grunt2_0", 1, "");
        await writeGruntFile("gruntIgn_0", 1, "");
        await writeGruntFile("grunt1_0", 125, "");
        await writeGruntFile("grunt1_0", 125, " ");
        await fsApi.deleteFile(files.grunt1_3);
        await writeGruntFile("grunt1_0", 50, " ");
        await fsApi.deleteFile(files.grunt1_3);
        await writeGruntFile("grunt1_0", 125, " ");
        await fsApi.deleteFile(files.grunt1_3);
        await writeGruntFile("grunt1_0", 25, " ");
        await fsApi.deleteFile(files.grunt1_3);
        await writeGruntFile("grunt1_0", 25, " ");
        await fsApi.deleteFile(files.grunt1_3);
        await utils.sleep(500);
        await fsApi.deleteFile(files.gulp1_0);
        await fsApi.deleteFile(files.gulp2_1);
        await utils.sleep(25);
        await fsApi.deleteFile(files.gulp2_0);
        await fsApi.deleteFile(files.grunt2_0);
        await writeGruntFile("grunt2_0", 1, "");
        await fsApi.deleteFile(files.grunt2_0);
        await fsApi.deleteFile(files.grunt2_1);
        await fsApi.deleteFile(files.grunt2_2);
        await fsApi.deleteFile(files.grunt2_3);
        await utils.sleep(25);
        await fsApi.deleteFile(files.grunt2_4);
        await fsApi.deleteFile(files.grunt2_5);
        await fsApi.deleteFile(files.grunt2_6);
        await utils.sleep(25);
        await fsApi.deleteFile(files.grunt2_7);
        await utils.waitForTeIdle(tc.waitTime.fs.createEvent * 2);
        await utils.verifyTaskCount("grunt", startTaskCountGrunt + 2); // 2 less than previous test, blanked /_test_files/Gruntfile.js
        utils.endRollingCount(this);
    });


    test("Modify Files Repetitively", async function()
    {
        if (utils.exitRollingCount(this)) return;
        this.slow((tc.slowTime.fs.createEvent * 2) + tc.slowTime.taskCount.verify + 1325);
        await writeGruntFile("grunt2_0", 1, "");
        await writeGruntFile("grunt2_0", 1, " ");
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
        await fsApi.writeFile(
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
        await fsApi.deleteFile(files.grunt2_0);
        await utils.sleep(25);
        await fsApi.deleteFile(files.gulp2_0);
        await utils.sleep(25);
        await fsApi.deleteFile(files.grunt2_1);
        await utils.sleep(500);
        await fsApi.deleteFile(files.grunt2_2);
        await fsApi.deleteFile(files.grunt2_3);
        await utils.sleep(50);
        await fsApi.deleteFile(files.grunt2_5);
        await fsApi.deleteFile(files.grunt2_6);
        await utils.sleep(50);
        await fsApi.deleteFile(files.grunt2_7);
        await utils.waitForTeIdle(tc.waitTime.fs.createEvent * 2);
        await utils.verifyTaskCount("grunt", startTaskCountGrunt + 2);
        utils.endRollingCount(this);
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
        utils.endRollingCount(this);
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


const writeGruntFile = async(file: string, msSleep: number, content: string) =>
{
    await fsApi.writeFile(files[file], content);
    await utils.sleep(msSleep);
};


const writeGulpFile = async(file: string, msSleep: number, content: string) =>
{
    await fsApi.writeFile(files[file], content);
    await utils.sleep(msSleep);
};
