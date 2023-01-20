/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* tslint:disable */

//
// Documentation on https://mochajs.org/ for help.
//
import * as assert from "assert";
import * as path from "path";
import { Uri, workspace, WorkspaceFolder } from "vscode";
import { BashTaskProvider } from "../../providers/bash";
import { IFilesystemApi, ITaskExplorerApi } from "@spmeesseman/vscode-taskexplorer-types";
import {
    activate, executeSettingsUpdate, getWsPath, testControl, treeUtils, verifyTaskCount,
    logErrorsAreFine, suiteFinished, exitRollingCount, waitForTeIdle
} from "../utils/utils";

const testsName = "bash";
const startTaskCount = 1;

let teApi: ITaskExplorerApi;
let fsApi: IFilesystemApi;
let enableTaskType: boolean;
let wsFolder: WorkspaceFolder;
let dirName: string;
let fileUri: Uri;
let successCount = -1;


suite("Bash Tests", () =>
{

    suiteSetup(async function()
    {
        ({ teApi, fsApi } = await activate(this));
        wsFolder = (workspace.workspaceFolders as WorkspaceFolder[])[0];
        dirName = getWsPath("tasks_test_");
        fileUri = Uri.file(path.join(dirName, "test_provider.sh"));
        enableTaskType = teApi.config.get<boolean>("enabledTasks." + testsName);
        await executeSettingsUpdate("enabledTasks." + testsName, true, testControl.waitTime.config.enableEvent);
        successCount++;
    });


    suiteTeardown(async function()
    {   //
        // Reset settings
        //
        await executeSettingsUpdate("enabledTasks." + testsName, enableTaskType, testControl.waitTime.config.enableEvent);
        await fsApi.deleteDir(dirName);
        suiteFinished(this);
    });


    test("Build Tree", async function()
    {
        if (exitRollingCount(0, successCount)) return;
        await treeUtils.refresh(this);
        successCount++;
    });


    test("Document Position", async function()
    {
        if (exitRollingCount(1, successCount)) return;
        const provider = teApi.providers[testsName] as BashTaskProvider;
        assert(provider.getDocumentPosition() === 0, "Script type should return position 0");
        successCount++;
    });


    test("Invalid ScriptProvider Type", async function()
    {
        if (exitRollingCount(2, successCount)) return;
        const provider = teApi.providers[testsName] as BashTaskProvider;
        assert(!provider.createTask("no_ext", undefined, wsFolder, Uri.file(getWsPath("hello.sh"))),
               "ScriptProvider type should return position 1");
        logErrorsAreFine(true);
        successCount++;
    });


    test("Start", async function()
    {
        if (exitRollingCount(3, successCount)) return;
        this.slow(testControl.slowTime.taskCount.verify);
        await verifyTaskCount(testsName, startTaskCount);
        successCount++;
    });


    test("Disable", async function()
    {
        if (exitRollingCount(4, successCount)) return;
        this.slow(testControl.slowTime.config.enableEvent + testControl.slowTime.taskCount.verify);
        await executeSettingsUpdate("enabledTasks." + testsName, false, testControl.waitTime.config.enableEvent);
        await verifyTaskCount(testsName, 0);
        successCount++;
    });


    test("Re-enable", async function()
    {
        if (exitRollingCount(5, successCount)) return;
        this.slow(testControl.slowTime.config.enableEvent + testControl.slowTime.taskCount.verify);
        await executeSettingsUpdate("enabledTasks." + testsName, true, testControl.waitTime.config.enableEvent);
        await verifyTaskCount(testsName, startTaskCount);
        successCount++;
    });


    test("Create File", async function()
    {
        if (exitRollingCount(6, successCount)) return;
        this.slow(testControl.slowTime.fs.createFolderEvent + testControl.slowTime.fs.createFolderEvent + testControl.slowTime.taskCount.verify);
        await fsApi.createDir(dirName);
        await waitForTeIdle(testControl.waitTime.fs.createFolderEvent);
        await fsApi.writeFile(fileUri.fsPath, "echo test 123\n\n");
        await waitForTeIdle(testControl.waitTime.fs.createEvent);
        await verifyTaskCount(testsName, startTaskCount + 1);
        successCount++;
    });


    test("Delete File", async function()
    {
        if (exitRollingCount(7, successCount)) return;
        this.slow(testControl.slowTime.fs.deleteEvent + testControl.slowTime.taskCount.verify);
        await fsApi.deleteFile(fileUri.fsPath);
        await waitForTeIdle(testControl.waitTime.fs.deleteEvent);
        await verifyTaskCount(testsName, startTaskCount);
        await fsApi.deleteDir(dirName);
        await waitForTeIdle(testControl.waitTime.fs.deleteEvent);
        successCount++;
    });


    test("Re-create File", async function()
    {
        if (exitRollingCount(8, successCount)) return;
        this.slow(testControl.slowTime.fs.createEvent + testControl.slowTime.fs.createFolderEvent + testControl.slowTime.taskCount.verify);
        await fsApi.createDir(dirName);
        await waitForTeIdle(testControl.waitTime.fs.createFolderEvent);
        await fsApi.writeFile(fileUri.fsPath, "echo test 123\n\n");
        await waitForTeIdle(testControl.waitTime.fs.createEvent);
        await verifyTaskCount(testsName, startTaskCount + 1);
        successCount++;
    });


    test("Delete Folder", async function()
    {
        if (exitRollingCount(9, successCount)) return;
        this.slow(testControl.slowTime.fs.deleteFolderEvent + testControl.slowTime.taskCount.verify);
        await fsApi.deleteDir(dirName);
        await waitForTeIdle(testControl.waitTime.fs.deleteEvent);
        await verifyTaskCount(testsName, startTaskCount);
        successCount++;
    });

});
