/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* tslint:disable */

//
// Documentation on https://mochajs.org/ for help.
//
import * as assert from "assert";
import * as path from "path";
import { Uri, workspace, WorkspaceFolder } from "vscode";
import { PowershellTaskProvider } from "../../providers/powershell";
import { IFilesystemApi, ITaskExplorerApi } from "@spmeesseman/vscode-taskexplorer-types";
import { activate, executeSettingsUpdate, exitRollingCount, getWsPath,
    logErrorsAreFine, suiteFinished, testControl as tc, verifyTaskCount, waitForTeIdle
} from "../utils/utils";

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
let successCount = -1;


suite("Powershell Tests", () =>
{

    suiteSetup(async function()
    {
        ({ teApi, fsApi } = await activate(this));
        wsFolder = (workspace.workspaceFolders as WorkspaceFolder[])[0];
        dirName = getWsPath("tasks_test_");
        fileUri = Uri.file(path.join(getWsPath("."), "test2.ps1"));
        fileUri2 = Uri.file(path.join(dirName, "test2.ps1"));
        pathToTaskProgram = teApi.config.get<string>("pathToPrograms." + testsName);
        enableTaskType = teApi.config.get<boolean>("enabledTasks." + testsName);
        await executeSettingsUpdate("pathToPrograms." + testsName, testsName + "/" + testsName + ".exe", tc.waitTime.config.globEvent);
        await executeSettingsUpdate("enabledTasks." + testsName, true, tc.waitTime.config.enableEvent);
        ++successCount;
    });


    suiteTeardown(async function()
    {
        await executeSettingsUpdate("pathToPrograms." + testsName, pathToTaskProgram, tc.waitTime.config.globEvent);
        await executeSettingsUpdate("enabledTasks." + testsName, enableTaskType, tc.waitTime.config.enableEvent);
        await fsApi.deleteFile(fileUri.fsPath);
        await fsApi.deleteDir(dirName);
        suiteFinished(this);
    });


    test("Document Position", async function()
    {
        if (exitRollingCount(0, successCount)) return;
        const provider = teApi.providers[testsName] as PowershellTaskProvider;
        assert(provider.getDocumentPosition() === 0, "Script type should return position 0");
        ++successCount;
    });


    test("Invalid ScriptProvider Type", async function()
    {
        if (exitRollingCount(1, successCount)) return;
        const provider = teApi.providers[testsName] as PowershellTaskProvider;
        assert(!provider.createTask("no_ext", undefined, wsFolder, Uri.file(getWsPath("test.ps1"))),
               "ScriptProvider type should return position 1");
        logErrorsAreFine();
        ++successCount;
    });


    test("Start", async function()
    {
        if (exitRollingCount(2, successCount)) return;
        this.slow(tc.slowTime.taskCount.verify + tc.slowTime.min);
        await verifyTaskCount(testsName, startTaskCount);
        await waitForTeIdle(tc.waitTime.min);
        ++successCount;
    });


    test("Disable", async function()
    {
        if (exitRollingCount(3, successCount)) return;
        this.slow(tc.slowTime.config.enableEvent + tc.slowTime.taskCount.verify);
        await executeSettingsUpdate("enabledTasks." + testsName, false, tc.waitTime.config.enableEvent);
        await verifyTaskCount(testsName, 0);
        ++successCount;
    });


    test("Re-enable", async function()
    {
        if (exitRollingCount(4, successCount)) return;
        this.slow(tc.slowTime.config.enableEvent + tc.slowTime.taskCount.verify);
        await executeSettingsUpdate("enabledTasks." + testsName, true, tc.waitTime.config.enableEvent);
        await verifyTaskCount(testsName, startTaskCount);
        ++successCount;
    });


    test("Create File", async function()
    {
        if (exitRollingCount(5, successCount)) return;
        this.slow(tc.slowTime.fs.createFolderEvent + tc.slowTime.taskCount.verify);
        await fsApi.writeFile(fileUri.fsPath, "Write-Host 'Hello Code 2'\r\n\r\n");
        await waitForTeIdle(tc.waitTime.fs.createEvent);
        await verifyTaskCount(testsName, startTaskCount + 1);
        ++successCount;
    });


    test("Create Empty Directory", async function()
    {
        if (exitRollingCount(6, successCount)) return;
        this.slow(tc.slowTime.fs.createFolderEvent + tc.slowTime.taskCount.verify);
        await fsApi.createDir(dirName);
        await waitForTeIdle(tc.waitTime.fs.createFolderEvent);
        await verifyTaskCount(testsName, startTaskCount + 1);
        ++successCount;
    });


    test("Create File 2", async function()
    {
        if (exitRollingCount(7, successCount)) return;
        this.slow(tc.slowTime.fs.createEvent + tc.slowTime.taskCount.verify);
        await fsApi.writeFile(fileUri2.fsPath, "Write-Host 'Hello Code 2'\r\n\r\n");
        await waitForTeIdle(tc.waitTime.fs.createEvent);
        await verifyTaskCount(testsName, startTaskCount + 2);
        ++successCount;
    });


    test("Delete File 2", async function()
    {
        if (exitRollingCount(8, successCount)) return;
        this.slow(tc.slowTime.fs.deleteEvent + tc.slowTime.taskCount.verify);
        await fsApi.deleteFile(fileUri2.fsPath);
        await waitForTeIdle(tc.waitTime.fs.deleteEvent);
        await verifyTaskCount(testsName, startTaskCount + 1);
        ++successCount;
    });


    test("Re-create File 2", async function()
    {
        if (exitRollingCount(9, successCount)) return;
        this.slow(tc.slowTime.fs.createFolderEvent + tc.slowTime.taskCount.verify);
        await fsApi.writeFile(fileUri2.fsPath, "Write-Host 'Hello Code 2'\r\n\r\n");
        await waitForTeIdle(tc.waitTime.fs.createEvent);
        await verifyTaskCount(testsName, startTaskCount + 2);
        ++successCount;
    });


    test("Delete Folder w/ File", async function()
    {
        if (exitRollingCount(10, successCount)) return;
        this.slow(tc.slowTime.fs.deleteFolderEvent + tc.slowTime.taskCount.verify);
        await fsApi.deleteDir(dirName);
        await waitForTeIdle(tc.waitTime.fs.deleteFolderEvent);
        await verifyTaskCount(testsName, startTaskCount + 1);
        ++successCount;
    });


    test("Delete File", async function()
    {
        if (exitRollingCount(11, successCount)) return;
        this.slow(tc.slowTime.fs.deleteEvent + tc.slowTime.taskCount.verify);
        await fsApi.deleteFile(fileUri.fsPath);
        await waitForTeIdle(tc.waitTime.fs.deleteEvent);
        await verifyTaskCount(testsName, startTaskCount);
        ++successCount;
    });

});
