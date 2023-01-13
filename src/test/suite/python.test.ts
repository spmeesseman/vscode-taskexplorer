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
import { PythonTaskProvider } from "../../providers/python";
import { IFilesystemApi, ITaskExplorerApi } from "@spmeesseman/vscode-taskexplorer-types";
import {
    activate, executeSettingsUpdate, getWsPath,
    logItsSupposedToHappenSoICanStopShittingMyselfOverRedErrorMsgs, suiteFinished, testControl, verifyTaskCount
} from "../utils";

const testsName = "python";
const startTaskCount = 2;

let teApi: ITaskExplorerApi;
let fsApi: IFilesystemApi;
let pathToTaskProgram: string;
let enableTaskType: boolean;
let wsFolder: WorkspaceFolder;
let dirName: string;
let fileUri: Uri;
let successCount = -1;


suite("Python Tests", () =>
{

    suiteSetup(async function()
    {   //
        // Initialize
        //
        teApi = await activate(this);
        fsApi = teApi.testsApi.fs;
        wsFolder = (workspace.workspaceFolders as WorkspaceFolder[])[0];
        dirName = getWsPath("tasks_test_");
        fileUri = Uri.file(path.join(dirName, "test2.py"));
        //
        // Store / set initial settings
        //
        pathToTaskProgram = teApi.config.get<string>("pathToPrograms." + testsName);
        enableTaskType = teApi.config.get<boolean>("enabledTasks." + testsName);
        await executeSettingsUpdate("pathToPrograms." + testsName, testsName + "/" + testsName + ".exe", testControl.waitTime.configEvent);
        await executeSettingsUpdate("enabledTasks." + testsName, true, testControl.waitTime.configEnableEvent);
        ++successCount;
    });


    suiteTeardown(async function()
    {
        await executeSettingsUpdate("pathToPrograms." + testsName, pathToTaskProgram, testControl.waitTime.configEvent);
        await executeSettingsUpdate("enabledTasks." + testsName, enableTaskType, testControl.waitTime.configEnableEvent);
        await fsApi.deleteDir(dirName);
        suiteFinished(this);
    });


    test("Document Position", async function()
    {
        expect(successCount).to.be.equal(0, "rolling success count failure");
        const provider = teApi.providers.get(testsName) as PythonTaskProvider;
        assert(provider.getDocumentPosition() === 0, "Script type should return position 0");
        ++successCount;
    });


    test("Invalid ScriptProvider Type", async function()
    {
        expect(successCount).to.be.equal(1, "rolling success count failure");
        const provider = teApi.providers.get(testsName) as PythonTaskProvider;
        assert(!provider.createTask("no_ext", undefined, wsFolder, Uri.file(getWsPath("test.py"))),
               "ScriptProvider type should return position 1");
        logItsSupposedToHappenSoICanStopShittingMyselfOverRedErrorMsgs(true);
        ++successCount;
    });


    test("Start", async function()
    {
        expect(successCount).to.be.equal(2, "rolling success count failure");
        this.slow(testControl.slowTime.verifyTaskCount);
        await verifyTaskCount(testsName, startTaskCount, 3);
        ++successCount;
    });


    test("Disable", async function()
    {
        expect(successCount).to.be.equal(3, "rolling success count failure");
        this.slow(testControl.slowTime.configEnableEvent + testControl.waitTime.configEnableEvent + testControl.slowTime.verifyTaskCount);
        await executeSettingsUpdate("enabledTasks." + testsName, false, testControl.waitTime.configEnableEvent);
        await verifyTaskCount(testsName, 0);
        ++successCount;
    });


    test("Re-enable", async function()
    {
        expect(successCount).to.be.equal(4, "rolling success count failure");
        this.slow(testControl.slowTime.configEnableEvent + testControl.waitTime.configEnableEvent+ testControl.slowTime.verifyTaskCount);
        await executeSettingsUpdate("enabledTasks." + testsName, true, testControl.waitTime.configEnableEvent);
        await verifyTaskCount(testsName, startTaskCount);
        ++successCount;
    });


    test("Create Empty Directory", async function()
    {
        expect(successCount).to.be.equal(5, "rolling success count failure");
        this.slow(testControl.slowTime.fsCreateFolderEvent + testControl.waitTime.fsCreateFolderEvent + testControl.slowTime.verifyTaskCount);
        await fsApi.createDir(dirName);
        await teApi.waitForIdle(testControl.waitTime.fsCreateFolderEvent);
        await verifyTaskCount(testsName, startTaskCount);
        ++successCount;
    });


    test("Create File", async function()
    {
        expect(successCount).to.be.equal(6, "rolling success count failure");
        this.slow(testControl.waitTime.fsCreateEvent + testControl.waitTime.fsCreateFolderEvent + testControl.slowTime.verifyTaskCount);
        await fsApi.writeFile(fileUri.fsPath, "#!/usr/local/bin/python\n\n");
        await teApi.waitForIdle(testControl.waitTime.fsCreateEvent);
        await verifyTaskCount(testsName, startTaskCount + 1);
        ++successCount;
    });


    test("Delete File", async function()
    {
        expect(successCount).to.be.equal(7, "rolling success count failure");
        this.slow(testControl.slowTime.fsDeleteEvent + testControl.waitTime.fsDeleteEvent + testControl.slowTime.verifyTaskCount);
        await fsApi.deleteFile(fileUri.fsPath);
        await teApi.waitForIdle(testControl.waitTime.fsDeleteEvent);
        await verifyTaskCount(testsName, startTaskCount);
        ++successCount;
    });


    test("Re-create File", async function()
    {
        expect(successCount).to.be.equal(8, "rolling success count failure");
        this.slow(testControl.slowTime.fsCreateEvent + testControl.waitTime.fsCreateEvent + testControl.slowTime.verifyTaskCount);
        await fsApi.writeFile(fileUri.fsPath, "#!/usr/local/bin/python\n\n");
        await teApi.waitForIdle(testControl.waitTime.fsCreateEvent);
        await verifyTaskCount(testsName, startTaskCount + 1, 1);
        ++successCount;
    });


    test("Delete Folder", async function()
    {
        expect(successCount).to.be.equal(9, "rolling success count failure");
        this.slow(testControl.slowTime.fsDeleteFolderEvent + (testControl.waitTime.fsDeleteEvent * 2) + testControl.slowTime.verifyTaskCount);
        // await fsApi.deleteFile(fileUri.fsPath);
        await fsApi.deleteDir(dirName);
        await teApi.waitForIdle(testControl.waitTime.fsDeleteEvent * 2);
        await verifyTaskCount(testsName, startTaskCount);
        ++successCount;
    });

});
