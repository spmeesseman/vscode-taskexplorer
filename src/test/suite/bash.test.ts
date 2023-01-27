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
import { executeSettingsUpdate } from "../utils/commandUtils";
import { IFilesystemApi, ITaskExplorerApi } from "@spmeesseman/vscode-taskexplorer-types";
import {
    activate, getWsPath, testControl, treeUtils, verifyTaskCount,
    logErrorsAreFine, suiteFinished, exitRollingCount, waitForTeIdle, endRollingCount, needsTreeBuild
} from "../utils/utils";

const testsName = "bash";
const startTaskCount = 1;

let teApi: ITaskExplorerApi;
let fsApi: IFilesystemApi;
let enableTaskType: boolean;
let wsFolder: WorkspaceFolder;
let dirName: string;
let fileUri: Uri;


suite("Bash Tests", () =>
{

    suiteSetup(async function()
    {
        if (exitRollingCount(this, true)) return;
        ({ teApi, fsApi } = await activate(this));
        wsFolder = (workspace.workspaceFolders as WorkspaceFolder[])[0];
        dirName = getWsPath("tasks_test_");
        fileUri = Uri.file(path.join(dirName, "test_provider.sh"));
        enableTaskType = teApi.config.get<boolean>("enabledTasks." + testsName);
        await executeSettingsUpdate("enabledTasks." + testsName, true, testControl.waitTime.config.enableEvent);
        endRollingCount(this, true);
    });


    suiteTeardown(async function()
    {
        if (exitRollingCount(this, false, true)) return;
        await executeSettingsUpdate("enabledTasks." + testsName, enableTaskType, testControl.waitTime.config.enableEvent);
        await fsApi.deleteDir(dirName);
        suiteFinished(this);
    });


    test("Build Tree", async function()
    {
        if (exitRollingCount(this)) return;
        if (needsTreeBuild()) {
            await treeUtils.refresh(this);
        }
        endRollingCount(this);
    });


    test("Document Position", async function()
    {
        if (exitRollingCount(this)) return;
        const provider = teApi.providers[testsName] as BashTaskProvider;
        assert(provider.getDocumentPosition() === 0, "Script type should return position 0");
        endRollingCount(this);
    });


    test("Invalid ScriptProvider Type", async function()
    {
        if (exitRollingCount(this)) return;
        const provider = teApi.providers[testsName] as BashTaskProvider;
        assert(!provider.createTask("no_ext", undefined, wsFolder, Uri.file(getWsPath("hello.sh"))),
               "ScriptProvider type should return position 1");
        logErrorsAreFine(true);
        endRollingCount(this);
    });


    test("Start", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(testControl.slowTime.taskCount.verify);
        await verifyTaskCount(testsName, startTaskCount);
        endRollingCount(this);
    });


    test("Disable", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(testControl.slowTime.config.enableEvent + testControl.slowTime.taskCount.verify);
        await executeSettingsUpdate("enabledTasks." + testsName, false, testControl.waitTime.config.enableEvent);
        await verifyTaskCount(testsName, 0);
        endRollingCount(this);
    });


    test("Re-enable", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(testControl.slowTime.config.enableEvent + testControl.slowTime.taskCount.verify);
        await executeSettingsUpdate("enabledTasks." + testsName, true, testControl.waitTime.config.enableEvent);
        await verifyTaskCount(testsName, startTaskCount);
        endRollingCount(this);
    });


    test("Create File", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(testControl.slowTime.fs.createFolderEvent + testControl.slowTime.fs.createFolderEvent + testControl.slowTime.taskCount.verify);
        await fsApi.createDir(dirName);
        await waitForTeIdle(testControl.waitTime.fs.createFolderEvent);
        await fsApi.writeFile(fileUri.fsPath, "echo test 123\n\n");
        await waitForTeIdle(testControl.waitTime.fs.createEvent);
        await verifyTaskCount(testsName, startTaskCount + 1);
        endRollingCount(this);
    });


    test("Delete File", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(testControl.slowTime.fs.deleteEvent + testControl.slowTime.fs.deleteFolderEvent + testControl.slowTime.taskCount.verify);
        await fsApi.deleteFile(fileUri.fsPath);
        await waitForTeIdle(testControl.waitTime.fs.deleteEvent);
        await verifyTaskCount(testsName, startTaskCount);
        await fsApi.deleteDir(dirName);
        await waitForTeIdle(testControl.waitTime.fs.deleteFolderEvent);
        endRollingCount(this);
    });


    test("Re-create File", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(testControl.slowTime.fs.createEvent + testControl.slowTime.fs.createFolderEvent + testControl.slowTime.taskCount.verify);
        await fsApi.createDir(dirName);
        await waitForTeIdle(testControl.waitTime.fs.createFolderEvent);
        await fsApi.writeFile(fileUri.fsPath, "echo test 123\n\n");
        await waitForTeIdle(testControl.waitTime.fs.createEvent);
        await verifyTaskCount(testsName, startTaskCount + 1);
        endRollingCount(this);
    });


    test("Delete Folder", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(testControl.slowTime.fs.deleteFolderEvent + testControl.slowTime.taskCount.verify);
        await fsApi.deleteDir(dirName);
        await waitForTeIdle(testControl.waitTime.fs.deleteEvent);
        await verifyTaskCount(testsName, startTaskCount);
        endRollingCount(this);
    });

});
