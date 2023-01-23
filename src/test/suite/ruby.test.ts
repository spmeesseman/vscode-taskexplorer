/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* tslint:disable */

import * as path from "path";
import { Uri } from "vscode";
import { RubyTaskProvider } from "../../providers/ruby";
import { IFilesystemApi, ITaskExplorerApi } from "@spmeesseman/vscode-taskexplorer-types";
import { activate, endRollingCount, exitRollingCount, focusExplorerView, getWsPath, needsTreeBuild,
    suiteFinished, testControl
} from "../utils/utils";

const testsName = "ruby";
const startTaskCount = 7;

let teApi: ITaskExplorerApi;
let fsApi: IFilesystemApi;
let provider: RubyTaskProvider;
let dirName: string;
let fileUri: Uri;


suite("Ruby Tests", () =>
{

    suiteSetup(async function()
    {
        if (exitRollingCount(this, true)) return;
        ({ teApi, fsApi } = await activate(this));
        provider = teApi.providers[testsName] as RubyTaskProvider;
        dirName = getWsPath("tasks_test_");
        fileUri = Uri.file(path.join(dirName, "newscript.pl"));
        endRollingCount(this, true);
    });

    suiteTeardown(async function()
    {
        suiteFinished(this);
    });


	test("Focus Tree View", async function()
	{
        if (exitRollingCount(this)) return;
        if (needsTreeBuild()) {
            await focusExplorerView(this);
        }
        endRollingCount(this);
	});



    test("Document Position", async function()
    {
        if (exitRollingCount(this)) return;
        // provider.getDocumentPosition(undefined, undefined);
        // provider.getDocumentPosition("test", undefined);
        // provider.getDocumentPosition(undefined, "test");
        endRollingCount(this);
    });


    test("Start", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(testControl.slowTime.taskCount.verify + testControl.waitTime.min);
        // await verifyTaskCount(testsName, startTaskCount);
        // await waitForTeIdle(testControl.waitTime.min);
        endRollingCount(this);
    });


    test("Disable", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(testControl.slowTime.config.enableEvent + testControl.slowTime.taskCount.verify + testControl.waitTime.config.enableEvent + testControl.waitTime.min);
        // await teApi.config.updateWs("enabledTasks.ruby", false);
        // await waitForTeIdle(testControl.waitTime.config.enableEvent);
        // await verifyTaskCount(testsName, 0);
        // await waitForTeIdle(testControl.waitTime.min);
        endRollingCount(this);
    });


    test("Re-enable", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(testControl.slowTime.config.enableEvent + testControl.slowTime.taskCount.verify + testControl.waitTime.config.enableEvent + testControl.waitTime.min);
        // await teApi.config.updateWs("enabledTasks.ruby", true);
        // await waitForTeIdle(testControl.waitTime.config.enableEvent);
        // await verifyTaskCount(testsName, startTaskCount);
        // await waitForTeIdle(testControl.waitTime.min);
        endRollingCount(this);
    });


    test("Create File", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(testControl.slowTime.fs.createEvent + testControl.slowTime.taskCount.verify + testControl.waitTime.fs.createEvent + testControl.waitTime.min);
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
        // await waitForTeIdle(testControl.waitTime.fs.createEvent);
        // await verifyTaskCount(testsName, startTaskCount + 2);
        // await waitForTeIdle(testControl.waitTime.min);
        endRollingCount(this);
    });


    test("Add 4 Tasks to File", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(testControl.slowTime.fs.modifyEvent + testControl.slowTime.taskCount.verify + testControl.waitTime.fs.modifyEvent + testControl.waitTime.min);
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
        // await waitForTeIdle(testControl.waitTime.fs.modifyEvent);
        // await verifyTaskCount(testsName, startTaskCount + 6);
        // await waitForTeIdle(testControl.waitTime.min);
        endRollingCount(this);
    });


    test("Remove 2 Tasks from File", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(testControl.slowTime.fs.deleteEvent + testControl.slowTime.taskCount.verify + testControl.waitTime.fs.modifyEvent + testControl.waitTime.min);
        // await fsApi.writeFile(
        //     fileUri.fsPath,
        //     "module.exports = function(ruby) {\n" +
        //     '    ruby.registerTask(\n"default2", ["jshint:myproject"]);\n' +
        //     '    ruby.registerTask("upload2", ["s3"]);\n' +
        //     '    ruby.registerTask("upload5", ["s5"]);\n' +
        //     '    ruby.registerTask("upload6", ["s7"]);\n' +
        //     "};\n"
        // );
        // await waitForTeIdle(testControl.waitTime.fs.modifyEvent);
        // await verifyTaskCount(testsName, startTaskCount + 4);
        // await waitForTeIdle(testControl.waitTime.min);
        endRollingCount(this);
    });


    test("Delete File", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(testControl.slowTime.fs.deleteEvent + testControl.slowTime.taskCount.verify + testControl.waitTime.fs.deleteEvent + testControl.waitTime.min);
        // await fsApi.deleteFile(fileUri.fsPath);
        // await fsApi.deleteDir(dirName);
        // await waitForTeIdle(testControl.waitTime.fs.deleteEvent);
        // await verifyTaskCount(testsName, startTaskCount);
        // await waitForTeIdle(testControl.waitTime.min);
        endRollingCount(this);
    });

});
