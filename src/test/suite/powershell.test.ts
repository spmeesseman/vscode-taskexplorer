/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* tslint:disable */

//
// Documentation on https://mochajs.org/ for help.
//
import * as assert from "assert";
import * as path from "path";
import { Uri, workspace, WorkspaceFolder } from "vscode";
import { activate, executeSettingsUpdate, getWsPath, testsControl, verifyTaskCount } from "../helper";
import { IFilesystemApi, ITaskExplorerApi } from "@spmeesseman/vscode-taskexplorer-types";
import { PowershellTaskProvider } from "../../providers/powershell";

const testsName = "powershell";

let teApi: ITaskExplorerApi;
let fsApi: IFilesystemApi;
let pathToTaskProgram: string;
let enableTaskType: boolean;
let wsFolder: WorkspaceFolder;
let dirName: string;
let fileUri: Uri;
let fileUri2: Uri;


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
        await executeSettingsUpdate("pathToPrograms." + testsName, testsName + "/" + testsName + ".exe");
        await executeSettingsUpdate("enabledTasks." + testsName, true, testsControl.waitTimeForConfigEnableEvent);
    });


    suiteTeardown(async function()
    {   //
        // Reset settings
        //
        await executeSettingsUpdate("pathToPrograms." + testsName, pathToTaskProgram);
        await executeSettingsUpdate("enabledTasks." + testsName, enableTaskType, testsControl.waitTimeForConfigEnableEvent);
        await fsApi.deleteFile(fileUri.fsPath);
        await fsApi.deleteDir(dirName);
    });


    test("Document Position", async function()
    {
        const provider = teApi.providers.get(testsName) as PowershellTaskProvider;
        assert(provider.getDocumentPosition() === 0, "Script type should return position 0");
    });


    test("Invalid ScriptProvider Type", async function()
    {
        const provider = teApi.providers.get(testsName) as PowershellTaskProvider;
        assert(!provider.createTask("no_ext", undefined, wsFolder, Uri.file(getWsPath("test.ps1"))),
               "ScriptProvider type should return position 1");
    });


    test("Start", async function()
    {
        this.slow(testsControl.slowTimeForVerifyTaskCount);
        await verifyTaskCount(testsName, 1);
    });


    test("Disable", async function()
    {
        this.slow(testsControl.slowTimeForConfigEnableEvent + testsControl.slowTimeForVerifyTaskCount);
        await executeSettingsUpdate("enabledTasks." + testsName, false, testsControl.waitTimeForConfigEnableEvent);
        await verifyTaskCount(testsName, 0);
    });


    test("Re-enable", async function()
    {
        this.slow(testsControl.slowTimeForConfigEnableEvent + testsControl.slowTimeForVerifyTaskCount);
        await executeSettingsUpdate("enabledTasks." + testsName, true, testsControl.waitTimeForConfigEnableEvent);
        await verifyTaskCount(testsName, 1);
    });


    test("Create File", async function()
    {
        this.slow(testsControl.slowTimeForFsCreateFolderEvent + testsControl.slowTimeForVerifyTaskCount);
        await fsApi.writeFile(fileUri.fsPath, "Write-Host 'Hello Code 2'\r\n\r\n");
        await teApi.waitForIdle(testsControl.waitTimeForFsCreateEvent);
        await verifyTaskCount(testsName, 2);
    });


    test("Create File 2", async function()
    {
        this.slow(testsControl.slowTimeForFsCreateFolderEvent + testsControl.slowTimeForVerifyTaskCount);
        await fsApi.createDir(dirName);
        await fsApi.writeFile(fileUri2.fsPath, "Write-Host 'Hello Code 2'\r\n\r\n");
        await teApi.waitForIdle(testsControl.waitTimeForFsCreateEvent);
        await verifyTaskCount(testsName, 3);
    });


    test("Delete File 2", async function()
    {
        this.slow(testsControl.slowTimeForFsDeleteEvent + testsControl.slowTimeForVerifyTaskCount);
        await fsApi.deleteFile(fileUri2.fsPath);
        await teApi.waitForIdle(testsControl.waitTimeForFsDeleteEvent);
        await verifyTaskCount(testsName, 2);
        await fsApi.deleteDir(dirName);
    });


    test("Re-create File 2", async function()
    {
        this.slow(testsControl.slowTimeForFsCreateFolderEvent + testsControl.slowTimeForVerifyTaskCount);
        await fsApi.createDir(dirName);
        await fsApi.writeFile(fileUri2.fsPath, "Write-Host 'Hello Code 2'\r\n\r\n");
        await teApi.waitForIdle(testsControl.waitTimeForFsCreateEvent);
        await verifyTaskCount(testsName, 3);
    });


    test("Delete Folder", async function()
    {
        this.slow(testsControl.slowTimeForFsDeleteFolderEvent + testsControl.slowTimeForVerifyTaskCount);
        await fsApi.deleteDir(dirName);
        await teApi.waitForIdle(testsControl.waitTimeForFsDeleteEvent * 2);
        await verifyTaskCount(testsName, 2);
    });


    test("Delete File", async function()
    {
        this.slow(testsControl.slowTimeForFsDeleteEvent + testsControl.slowTimeForVerifyTaskCount);
        await fsApi.deleteFile(fileUri.fsPath);
        await teApi.waitForIdle(testsControl.waitTimeForFsDeleteEvent);
        await verifyTaskCount(testsName, 1);
    });

});
