/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* tslint:disable */

//
// Documentation on https://mochajs.org/ for help.
//
import * as assert from "assert";
import * as path from "path";
import { expect } from "chai";
import { Uri, workspace, WorkspaceFolder } from "vscode";
import { BashTaskProvider } from "../../providers/bash";
import { IFilesystemApi, ITaskExplorerApi } from "@spmeesseman/vscode-taskexplorer-types";
import {
    activate, executeSettingsUpdate, getWsPath, testControl, treeUtils, verifyTaskCount,
    logItsSupposedToHappenSoICanStopShittingMyselfOverRedErrorMsgs,
    suiteFinished,
} from "../utils";

const testsName = "bash";
const startTaskCount = 1;

let teApi: ITaskExplorerApi;
let fsApi: IFilesystemApi;
let pathToTaskProgram: string;
let enableTaskType: boolean;
let wsFolder: WorkspaceFolder;
let dirName: string;
let fileUri: Uri;
let successCount = 0;


suite("Bash Tests", () =>
{

    suiteSetup(async function()
    {   //
        // Initialize
        //
        teApi = await activate(this);
        fsApi = teApi.testsApi.fs;
        wsFolder = (workspace.workspaceFolders as WorkspaceFolder[])[0];
        dirName = getWsPath("tasks_test_");
        fileUri = Uri.file(path.join(dirName, "test_provider.sh"));
        //
        // Store / set initial settings
        //
        pathToTaskProgram = teApi.config.get<string>("pathToPrograms." + testsName);
        enableTaskType = teApi.config.get<boolean>("enabledTasks." + testsName);
        await executeSettingsUpdate("pathToPrograms." + testsName, testsName + "/" + testsName + ".exe");
        await executeSettingsUpdate("enabledTasks." + testsName, true, testControl.waitTime.configEnableEvent);
        successCount++;
    });


    suiteTeardown(async function()
    {   //
        // Reset settings
        //
        await executeSettingsUpdate("pathToPrograms." + testsName, pathToTaskProgram);
        await executeSettingsUpdate("enabledTasks." + testsName, enableTaskType, testControl.waitTime.configEnableEvent);
        await fsApi.deleteDir(dirName);
        suiteFinished(this);
    });


    test("Build Tree (View Collapsed)", async function()
    {
        expect(successCount).to.be.equal(1, "rolling success count failure");
        await treeUtils.refresh(this);
        successCount++;
    });


    test("Document Position", async function()
    {
        expect(successCount).to.be.equal(2, "rolling success count failure");
        const provider = teApi.providers.get(testsName) as BashTaskProvider;
        assert(provider.getDocumentPosition() === 0, "Script type should return position 0");
        successCount++;
    });


    test("Invalid ScriptProvider Type", async function()
    {
        expect(successCount).to.be.equal(3, "rolling success count failure");
        const provider = teApi.providers.get(testsName) as BashTaskProvider;
        assert(!provider.createTask("no_ext", undefined, wsFolder, Uri.file(getWsPath("hello.sh"))),
               "ScriptProvider type should return position 1");
        logItsSupposedToHappenSoICanStopShittingMyselfOverRedErrorMsgs(true);
        successCount++;
    });


    test("Start", async function()
    {
        expect(successCount).to.be.equal(4, "rolling success count failure");
        this.slow(testControl.slowTime.verifyTaskCount);
        await verifyTaskCount(testsName, startTaskCount);
        successCount++;
    });


    test("Disable", async function()
    {
        expect(successCount).to.be.equal(5, "rolling success count failure");
        this.slow(testControl.slowTime.configEnableEvent + testControl.slowTime.verifyTaskCount);
        await executeSettingsUpdate("enabledTasks." + testsName, false, testControl.waitTime.configEnableEvent);
        await verifyTaskCount(testsName, 0);
        successCount++;
    });


    test("Re-enable", async function()
    {
        expect(successCount).to.be.equal(6, "rolling success count failure");
        this.slow(testControl.slowTime.configEnableEvent + testControl.slowTime.verifyTaskCount);
        await executeSettingsUpdate("enabledTasks." + testsName, true, testControl.waitTime.configEnableEvent);
        await verifyTaskCount(testsName, startTaskCount);
        successCount++;
    });


    test("Create File", async function()
    {
        expect(successCount).to.be.equal(7, "rolling success count failure");
        this.slow(testControl.slowTime.fsCreateFolderEvent + testControl.slowTime.verifyTaskCount);
        await fsApi.createDir(dirName);
        await fsApi.writeFile(fileUri.fsPath, "echo test 123\n\n");
        await teApi.waitForIdle(testControl.waitTime.fsCreateEvent);
        await verifyTaskCount(testsName, startTaskCount + 1);
        successCount++;
    });


    test("Delete File", async function()
    {
        expect(successCount).to.be.equal(8, "rolling success count failure");
        this.slow(testControl.slowTime.fsDeleteEvent + testControl.slowTime.verifyTaskCount);
        await fsApi.deleteFile(fileUri.fsPath);
        await teApi.waitForIdle(testControl.waitTime.fsDeleteEvent);
        await verifyTaskCount(testsName, startTaskCount);
        await fsApi.deleteDir(dirName);
        await teApi.waitForIdle(testControl.waitTime.fsDeleteEvent);
        successCount++;
    });


    test("Re-create File", async function()
    {
        expect(successCount).to.be.equal(9, "rolling success count failure");
        this.slow(testControl.slowTime.fsCreateEvent + testControl.slowTime.verifyTaskCount);
        await fsApi.createDir(dirName);
        await fsApi.writeFile(fileUri.fsPath, "echo test 123\n\n");
        await teApi.waitForIdle(testControl.waitTime.fsCreateEvent);
        await verifyTaskCount(testsName, startTaskCount + 1);
        successCount++;
    });


    test("Delete Folder", async function()
    {
        expect(successCount).to.be.equal(10, "rolling success count failure");
        this.slow(testControl.slowTime.fsDeleteFolderEvent + testControl.slowTime.verifyTaskCount);
        await fsApi.deleteDir(dirName);
        await teApi.waitForIdle(testControl.waitTime.fsDeleteEvent);
        await verifyTaskCount(testsName, startTaskCount);
        successCount++;
    });

});
