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
import { PowershellTaskProvider } from "../../providers/powershell";
import { IFilesystemApi, ITaskExplorerApi } from "@spmeesseman/vscode-taskexplorer-types";
import { activate, executeSettingsUpdate, getWsPath,
    logItsSupposedToHappenSoICanStopShittingMyselfOverRedErrorMsgs, testControl, verifyTaskCount
} from "../helper";

const testsName = "powershell";
const startTaskCount = 1;

let teApi: ITaskExplorerApi;
let fsApi: IFilesystemApi;
let pathToTaskProgram: string;
let enableTaskType: boolean;
let wsFolder: WorkspaceFolder;
let dirName: string;
let fileUri: Uri;
let fileUri2: Uri;
let successCount = 0;


suite("Powershell Tests", () =>
{

    suiteSetup(async function()
    {   //
        // Initialize
        //
        teApi = await activate(this);
        fsApi = teApi.testsApi.fs;
        wsFolder = (workspace.workspaceFolders as WorkspaceFolder[])[0];
        dirName = getWsPath("tasks_test_");
        fileUri = Uri.file(path.join(getWsPath("."), "test2.ps1"));
        fileUri2 = Uri.file(path.join(dirName, "test2.ps1"));
        //
        // Store / set initial settings
        //
        pathToTaskProgram = teApi.config.get<string>("pathToPrograms." + testsName);
        enableTaskType = teApi.config.get<boolean>("enabledTasks." + testsName);
        await executeSettingsUpdate("pathToPrograms." + testsName, testsName + "/" + testsName + ".exe", testControl.waitTime.configGlobEvent);
        await executeSettingsUpdate("enabledTasks." + testsName, true, testControl.waitTime.configEnableEvent);
        ++successCount;
    });


    suiteTeardown(async function()
    {   //
        // Reset settings
        //
        await executeSettingsUpdate("pathToPrograms." + testsName, pathToTaskProgram, testControl.waitTime.configGlobEvent);
        await executeSettingsUpdate("enabledTasks." + testsName, enableTaskType, testControl.waitTime.configEnableEvent);
        await fsApi.deleteFile(fileUri.fsPath);
        await fsApi.deleteDir(dirName);
    });


    test("Document Position", async function()
    {
        expect(successCount).to.be.equal(1, "rolling success count failure");
        const provider = teApi.providers.get(testsName) as PowershellTaskProvider;
        assert(provider.getDocumentPosition() === 0, "Script type should return position 0");
    });


    test("Invalid ScriptProvider Type", async function()
    {
        expect(successCount).to.be.equal(1, "rolling success count failure");
        const provider = teApi.providers.get(testsName) as PowershellTaskProvider;
        assert(!provider.createTask("no_ext", undefined, wsFolder, Uri.file(getWsPath("test.ps1"))),
               "ScriptProvider type should return position 1");
        logItsSupposedToHappenSoICanStopShittingMyselfOverRedErrorMsgs();
    });


    test("Start", async function()
    {
        this.slow(testControl.slowTime.verifyTaskCount && testControl.waitTime.min);
        await verifyTaskCount(testsName, startTaskCount);
        await teApi.waitForIdle(testControl.waitTime.min);
    });


    test("Disable", async function()
    {
        this.slow(testControl.slowTime.configEnableEvent + testControl.slowTime.verifyTaskCount + testControl.waitTime.configEnableEvent);
        await executeSettingsUpdate("enabledTasks." + testsName, false, testControl.waitTime.configEnableEvent);
        await verifyTaskCount(testsName, 0);
    });


    test("Re-enable", async function()
    {
        this.slow(testControl.slowTime.configEnableEvent + testControl.slowTime.verifyTaskCount);
        await executeSettingsUpdate("enabledTasks." + testsName, true, testControl.waitTime.configEnableEvent);
        await verifyTaskCount(testsName, startTaskCount);
    });


    test("Create File", async function()
    {
        this.slow(testControl.slowTime.fsCreateFolderEvent + testControl.slowTime.verifyTaskCount + testControl.waitTime.fsCreateEvent);
        await fsApi.writeFile(fileUri.fsPath, "Write-Host 'Hello Code 2'\r\n\r\n");
        await teApi.waitForIdle(testControl.waitTime.fsCreateEvent);
        await verifyTaskCount(testsName, startTaskCount + 1);
    });


    test("Create File 2", async function()
    {
        this.slow(testControl.slowTime.fsCreateFolderEvent + testControl.slowTime.verifyTaskCount + testControl.waitTime.fsCreateEvent);
        await fsApi.createDir(dirName);
        await fsApi.writeFile(fileUri2.fsPath, "Write-Host 'Hello Code 2'\r\n\r\n");
        await teApi.waitForIdle(testControl.waitTime.fsCreateEvent);
        await verifyTaskCount(testsName, startTaskCount + 2);
    });


    test("Delete File 2", async function()
    {
        this.slow(testControl.slowTime.fsDeleteEvent + testControl.slowTime.verifyTaskCount + testControl.waitTime.fsDeleteEvent);
        await fsApi.deleteFile(fileUri2.fsPath);
        await teApi.waitForIdle(testControl.waitTime.fsDeleteEvent);
        await verifyTaskCount(testsName, startTaskCount + 1);
        await fsApi.deleteDir(dirName);
    });


    test("Re-create File 2", async function()
    {
        this.slow(testControl.slowTime.fsCreateFolderEvent + testControl.slowTime.verifyTaskCount + testControl.waitTime.fsCreateEvent);
        await fsApi.createDir(dirName);
        await fsApi.writeFile(fileUri2.fsPath, "Write-Host 'Hello Code 2'\r\n\r\n");
        await teApi.waitForIdle(testControl.waitTime.fsCreateEvent);
        await verifyTaskCount(testsName, startTaskCount + 2);
    });


    test("Delete Folder", async function()
    {
        this.slow(testControl.slowTime.fsDeleteFolderEvent + testControl.slowTime.verifyTaskCount + testControl.waitTime.fsDeleteEvent);
        await fsApi.deleteDir(dirName);
        await teApi.waitForIdle(testControl.waitTime.fsDeleteEvent * 2);
        await verifyTaskCount(testsName, startTaskCount + 1);
    });


    test("Delete File", async function()
    {
        this.slow(testControl.slowTime.fsDeleteEvent + testControl.slowTime.verifyTaskCount + testControl.waitTime.fsDeleteEvent);
        await fsApi.deleteFile(fileUri.fsPath);
        await teApi.waitForIdle(testControl.waitTime.fsDeleteEvent);
        await verifyTaskCount(testsName, startTaskCount);
    });

});
