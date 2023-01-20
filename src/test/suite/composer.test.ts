/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* tslint:disable */

//
// Documentation on https://mochajs.org/ for help.
//
import * as assert from "assert";
import * as path from "path";
import { Uri } from "vscode";
import { ComposerTaskProvider } from "../../providers/composer";
import { IFilesystemApi, ITaskExplorerApi } from "@spmeesseman/vscode-taskexplorer-types";
import {
    activate, executeSettingsUpdate, exitRollingCount, getWsPath, needsTreeBuild, suiteFinished,
    testControl, treeUtils, verifyTaskCount, waitForTeIdle
} from "../utils/utils";

const testsName = "composer";
const startTaskCount = 2;

let teApi: ITaskExplorerApi;
let fsApi: IFilesystemApi;
let dirName: string;
let fileUri: Uri;
let successCount = -1;


suite("Composer Tests", () =>
{

    suiteSetup(async function()
    {
        ({ teApi, fsApi } = await activate(this));
        dirName = getWsPath("tasks_test_");
        fileUri = Uri.file(path.join(dirName, "composer.json"));
        ++successCount;
    });


    suiteTeardown(async function()
    {
        if (successCount < 13) {
            await fsApi.deleteDir(dirName);
        }
        suiteFinished(this);
    });


    test("Enable (Off by Default)", async function()
    {
        if (exitRollingCount(0, successCount)) return;
        this.slow(testControl.slowTime.config.enableEvent);
        await executeSettingsUpdate(`enabledTasks.${testsName}`, true, testControl.waitTime.config.enableEvent);
        ++successCount;
    });


    test("Build Tree", async function()
    {
        if (exitRollingCount(1, successCount)) return;
        if (needsTreeBuild()) {
            await treeUtils.refresh(this);
        }
        ++successCount;
    });


    test("Start", async function()
    {
        if (exitRollingCount(2, successCount)) return;
        await verifyTaskCount(testsName, startTaskCount);
        ++successCount;
    });


    test("Document Position", async function()
    {
        if (exitRollingCount(3, successCount)) return;
        const provider = teApi.providers[testsName] as ComposerTaskProvider;
        // provider.readTasks();
        assert (provider.getDocumentPosition(undefined, undefined) === 0);
        assert (provider.getDocumentPosition("test", undefined) === 0);
        assert (provider.getDocumentPosition(undefined, "test") === 0);
        assert (provider.getDocumentPosition("doc", await fsApi.readFileAsync(path.join(getWsPath("."), "composer.json"))) > 0);
        ++successCount;
    });


    test("Disable", async function()
    {
        if (exitRollingCount(4, successCount)) return;
        this.slow(testControl.slowTime.config.enableEvent + testControl.slowTime.taskCount.verify);
        await executeSettingsUpdate(`enabledTasks.${testsName}`, false, testControl.waitTime.config.enableEvent);
        await verifyTaskCount(testsName, 0);
        ++successCount;
    });


    test("Re-enable", async function()
    {
        if (exitRollingCount(5, successCount)) return;
        this.slow(testControl.slowTime.config.enableEvent + testControl.slowTime.taskCount.verify);
        await executeSettingsUpdate(`enabledTasks.${testsName}`, true, testControl.waitTime.config.enableEvent);
        await verifyTaskCount(testsName, startTaskCount);
        ++successCount;
    });


    test("Create Empty Directory", async function()
    {
        if (exitRollingCount(6, successCount)) return;
        this.slow(testControl.slowTime.fs.createFolderEvent + testControl.slowTime.taskCount.verify);
        await fsApi.createDir(dirName);
        await waitForTeIdle(testControl.waitTime.fs.createFolderEvent);
        await verifyTaskCount(testsName, startTaskCount);
        ++successCount;
    });


    test("Create File", async function()
    {
        if (exitRollingCount(7, successCount)) return;
        this.slow(testControl.slowTime.fs.createEvent + testControl.slowTime.taskCount.verify);
        await fsApi.writeFile(
            fileUri.fsPath,
            "{\n" +
            '  "scripts":\n' +
            "  {\n" +
            '    "test1": "run -r test",\n' +
            '    "test2": "open -p tmp.txt",\n' +
            '    "test3": "start -x 1 -y 2"\n' +
            "  },\n" +
            '  "include": ["**/*"],\n' +
            '  "exclude": ["node_modules"]\n' +
            "}\n"
        );
        await waitForTeIdle(testControl.waitTime.fs.createEvent);
        await verifyTaskCount(testsName, startTaskCount + 3);
        ++successCount;
    });


    test("Add Task to File", async function()
    {
        if (exitRollingCount(8, successCount)) return;
        this.slow(testControl.slowTime.fs.createEvent + testControl.slowTime.taskCount.verify);
        await fsApi.writeFile(
            fileUri.fsPath,
            "{\n" +
            '  "scripts":\n' +
            "  {\n" +
            '    "test1": "run -r test",\n' +
            '    "test2": "open -p tmp.txt",\n' +
            '    "test3": "start -x 1 -y 2",\n' +
            '    "test4": "start -x 2 -y 3"\n' +
            "  },\n" +
            '  "include": ["**/*"],\n' +
            '  "exclude": ["node_modules"]\n' +
            "}\n"
        );
        await waitForTeIdle(testControl.waitTime.fs.modifyEvent);
        await verifyTaskCount(testsName, startTaskCount + 4);
        ++successCount;
    });


    test("Remove 2 Tasks from File", async function()
    {
        if (exitRollingCount(9, successCount)) return;
        this.slow(testControl.slowTime.fs.createEvent + testControl.slowTime.taskCount.verify);
        await fsApi.writeFile(
            fileUri.fsPath,
            "{\n" +
            '  "scripts":\n' +
            "  {\n" +
            '    "test1": "run -r test",\n' +
            '    "test2": "open -p tmp.txt"\n' +
            "  },\n" +
            '  "include": ["**/*"],\n' +
            '  "exclude": ["node_modules"]\n' +
            "}\n"
        );
        await waitForTeIdle(testControl.waitTime.fs.modifyEvent);
        await verifyTaskCount(testsName, startTaskCount + 2);
        ++successCount;
    });


    test("Invalid JSON", async function()
    {
        if (exitRollingCount(10, successCount)) return;
        let resetLogging = teApi.log.isLoggingEnabled();
        if (resetLogging) { // turn scary error logging off
            this.slow(testControl.slowTime.fs.createEvent + (testControl.slowTime.config.event * 2) + testControl.slowTime.taskCount.verify);
            executeSettingsUpdate("logging.enable", false);
            resetLogging = true;
        }
        else {
            this.slow(testControl.slowTime.fs.createEvent);
        }
        await fsApi.writeFile(
            fileUri.fsPath,
            "{\n" +
            '  "scripts":\n' +
            "  {\n" +
            '    "test1": "run -r test",\n' +
            '    "test2" "open -p tmp.txt",,\n' +
            "  },\n" +
            '  "include": ["**/*"],\n' +
            '  "exclude": ["node_modules"]\n' +
            "\n"
        );
        await waitForTeIdle(testControl.waitTime.fs.modifyEvent);
        await verifyTaskCount(testsName, startTaskCount);
        if (resetLogging) { // turn scary error logging off
            executeSettingsUpdate("logging.enable", true);
        }
        ++successCount;
    });


    test("Delete File", async function()
    {
        if (exitRollingCount(11, successCount)) return;
        this.slow(testControl.slowTime.fs.deleteEvent + testControl.slowTime.taskCount.verify);
        await fsApi.deleteFile(fileUri.fsPath);
        await waitForTeIdle(testControl.waitTime.fs.deleteEvent);
        await verifyTaskCount(testsName, startTaskCount);
        ++successCount;
    });


    test("Delete Directory", async function()
    {
        if (exitRollingCount(12, successCount)) return;
        this.slow(testControl.slowTime.fs.deleteFolderEvent + testControl.slowTime.taskCount.verify);
        await fsApi.deleteDir(dirName);
        await waitForTeIdle(testControl.waitTime.fs.deleteFolderEvent);
        await verifyTaskCount(testsName, startTaskCount);
        ++successCount;
    });


    test("Disable (Default is OFF)", async function()
    {
        if (exitRollingCount(13, successCount)) return;
        this.slow(testControl.slowTime.config.enableEvent + testControl.slowTime.taskCount.verify);
        await executeSettingsUpdate(`enabledTasks.${testsName}`, false, testControl.waitTime.config.enableEvent);
        await verifyTaskCount(testsName, 0);
        ++successCount;
    });

});
