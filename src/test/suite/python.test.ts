/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* tslint:disable */

//
// Documentation on https://mochajs.org/ for help.
//
import * as assert from "assert";
import * as path from "path";
import { Uri, workspace, WorkspaceFolder } from "vscode";
import { PythonTaskProvider } from "../../providers/python";
import { IFilesystemApi, ITaskExplorerApi } from "@spmeesseman/vscode-taskexplorer-types";
import {
    activate, executeSettingsUpdate, exitRollingCount, getWsPath,
    logErrorsAreFine, suiteFinished, testControl as tc, verifyTaskCount, waitForTeIdle
} from "../utils/utils";

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
        ({ teApi, fsApi } = await activate(this));
        wsFolder = (workspace.workspaceFolders as WorkspaceFolder[])[0];
        dirName = getWsPath("tasks_test_");
        fileUri = Uri.file(path.join(dirName, "test2.py"));
        //
        // Store / set initial settings
        //
        pathToTaskProgram = teApi.config.get<string>("pathToPrograms." + testsName);
        enableTaskType = teApi.config.get<boolean>("enabledTasks." + testsName);
        await executeSettingsUpdate("pathToPrograms." + testsName, testsName + "/" + testsName + ".exe", tc.waitTime.configEvent);
        await executeSettingsUpdate("enabledTasks." + testsName, true, tc.waitTime.configEnableEvent);
        ++successCount;
    });


    suiteTeardown(async function()
    {
        await executeSettingsUpdate("pathToPrograms." + testsName, pathToTaskProgram, tc.waitTime.configEvent);
        await executeSettingsUpdate("enabledTasks." + testsName, enableTaskType, tc.waitTime.configEnableEvent);
        await fsApi.deleteDir(dirName);
        suiteFinished(this);
    });


    test("Document Position", async function()
    {
        if (exitRollingCount(0, successCount)) return;
        const provider = teApi.providers[testsName] as PythonTaskProvider;
        assert(provider.getDocumentPosition() === 0, "Script type should return position 0");
        ++successCount;
    });


    test("Invalid ScriptProvider Type", async function()
    {
        if (exitRollingCount(1, successCount)) return;
        const provider = teApi.providers[testsName] as PythonTaskProvider;
        assert(!provider.createTask("no_ext", undefined, wsFolder, Uri.file(getWsPath("test.py"))),
               "ScriptProvider type should return position 1");
        logErrorsAreFine(true);
        ++successCount;
    });


    test("Start", async function()
    {
        if (exitRollingCount(2, successCount)) return;
        this.slow(tc.slowTime.verifyTaskCount);
        await verifyTaskCount(testsName, startTaskCount, 3);
        ++successCount;
    });


    test("Disable", async function()
    {
        if (exitRollingCount(3, successCount)) return;
        this.slow(tc.slowTime.configEnableEvent + tc.slowTime.verifyTaskCount);
        await executeSettingsUpdate("enabledTasks." + testsName, false, tc.waitTime.configEnableEvent);
        await verifyTaskCount(testsName, 0);
        ++successCount;
    });


    test("Re-enable", async function()
    {
        if (exitRollingCount(4, successCount)) return;
        this.slow(tc.slowTime.configEnableEvent + tc.slowTime.verifyTaskCount);
        await executeSettingsUpdate("enabledTasks." + testsName, true, tc.waitTime.configEnableEvent);
        await verifyTaskCount(testsName, startTaskCount);
        ++successCount;
    });


    test("Create Empty Directory", async function()
    {
        if (exitRollingCount(5, successCount)) return;
        this.slow(tc.slowTime.fsCreateFolderEvent + tc.slowTime.verifyTaskCount);
        await fsApi.createDir(dirName);
        await waitForTeIdle(tc.waitTime.fsCreateFolderEvent);
        await verifyTaskCount(testsName, startTaskCount);
        ++successCount;
    });


    test("Create File", async function()
    {
        if (exitRollingCount(6, successCount)) return;
        this.slow(tc.waitTime.fsCreateEvent + tc.slowTime.verifyTaskCount);
        await fsApi.writeFile(fileUri.fsPath, "#!/usr/local/bin/python\n\n");
        await waitForTeIdle(tc.waitTime.fsCreateEvent);
        await verifyTaskCount(testsName, startTaskCount + 1);
        ++successCount;
    });


    test("Delete File", async function()
    {
        if (exitRollingCount(7, successCount)) return;
        this.slow(tc.slowTime.fsDeleteEvent + tc.slowTime.verifyTaskCount);
        await fsApi.deleteFile(fileUri.fsPath);
        await waitForTeIdle(tc.waitTime.fsDeleteEvent);
        await verifyTaskCount(testsName, startTaskCount);
        ++successCount;
    });


    test("Re-create File", async function()
    {
        if (exitRollingCount(8, successCount)) return;
        this.slow(tc.slowTime.fsCreateEvent + tc.slowTime.verifyTaskCount);
        await fsApi.writeFile(fileUri.fsPath, "#!/usr/local/bin/python\n\n");
        await waitForTeIdle(tc.waitTime.fsCreateEvent);
        await verifyTaskCount(testsName, startTaskCount + 1, 1);
        ++successCount;
    });


    test("Delete Folder", async function()
    {
        if (exitRollingCount(9, successCount)) return;
        this.slow(tc.slowTime.fsDeleteFolderEvent + (tc.waitTime.fsDeleteEvent * 2) + tc.slowTime.verifyTaskCount);
        // await fsApi.deleteFile(fileUri.fsPath);
        await fsApi.deleteDir(dirName);
        await waitForTeIdle(tc.waitTime.fsDeleteEvent * 2);
        await verifyTaskCount(testsName, startTaskCount);
        ++successCount;
    });

});
