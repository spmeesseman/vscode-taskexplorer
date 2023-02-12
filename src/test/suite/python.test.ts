/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* tslint:disable */

import * as path from "path";
import { expect } from "chai";
import { startupFocus } from "../utils/suiteUtils";
import { Uri, workspace, WorkspaceFolder } from "vscode";
import { PythonTaskProvider } from "../../providers/python";
import { executeSettingsUpdate } from "../utils/commandUtils";
import { ITaskExplorerApi } from "@spmeesseman/vscode-taskexplorer-types";
import {
    activate, endRollingCount, exitRollingCount, getWsPath, logErrorsAreFine, suiteFinished,
    testControl as tc, verifyTaskCount, waitForTeIdle
} from "../utils/utils";
import { TeWrapper } from "../../lib/wrapper";

const testsName = "python";
const startTaskCount = 2;

let teApi: ITaskExplorerApi;
let teWrapper: TeWrapper;
let pathToTaskProgram: string;
let enableTaskType: boolean;
let wsFolder: WorkspaceFolder;
let dirName: string;
let fileUri: Uri;


suite("Python Tests", () =>
{

    suiteSetup(async function()
    {
        if (exitRollingCount(this, true)) return;
        //
        // Initialize
        //
        ({ teApi, teWrapper } = await activate(this));
        wsFolder = (workspace.workspaceFolders as WorkspaceFolder[])[0];
        dirName = getWsPath("tasks_test_");
        fileUri = Uri.file(path.join(dirName, "test2.py"));
        //
        // Store / set initial settings
        //
        pathToTaskProgram = teWrapper.configuration.get<string>("pathToPrograms." + testsName);
        enableTaskType = teWrapper.configuration.get<boolean>("enabledTasks." + testsName);
        await executeSettingsUpdate("pathToPrograms." + testsName, testsName + "/" + testsName + ".exe", tc.waitTime.config.event);
        await executeSettingsUpdate("enabledTasks." + testsName, true, tc.waitTime.config.enableEvent);
        endRollingCount(this, true);
    });


    suiteTeardown(async function()
    {
        if (exitRollingCount(this, false, true)) return;
        await executeSettingsUpdate("pathToPrograms." + testsName, pathToTaskProgram, tc.waitTime.config.event);
        await executeSettingsUpdate("enabledTasks." + testsName, enableTaskType, tc.waitTime.config.enableEvent);
        await teWrapper.fs.deleteDir(dirName);
        suiteFinished(this);
    });


	test("Focus Explorer View", async function()
	{
        await startupFocus(this);
	});


    test("Document Position", async function()
    {
        if (exitRollingCount(this)) return;
        const provider = teApi.providers[testsName] as PythonTaskProvider;
        expect(provider.getDocumentPosition()).to.be.equal(0);
        endRollingCount(this);
    });


    test("Invalid ScriptProvider Type", async function()
    {
        if (exitRollingCount(this)) return;
        const provider = teApi.providers[testsName] as PythonTaskProvider;
        expect(!provider.createTask("no_ext", undefined, wsFolder,
               Uri.file(getWsPath("test.py")))).to.not.be.equal(undefined, "ScriptProvider returnned undefined task");
        logErrorsAreFine(true);
        endRollingCount(this);
    });


    test("Start", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.taskCount.verify);
        await verifyTaskCount(testsName, startTaskCount, 3);
        endRollingCount(this);
    });


    test("Disable", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.config.enableEvent + tc.slowTime.taskCount.verify);
        await executeSettingsUpdate("enabledTasks." + testsName, false, tc.waitTime.config.enableEvent);
        await verifyTaskCount(testsName, 0);
        endRollingCount(this);
    });


    test("Re-enable", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.config.enableEvent + tc.slowTime.taskCount.verify);
        await executeSettingsUpdate("enabledTasks." + testsName, true, tc.waitTime.config.enableEvent);
        await verifyTaskCount(testsName, startTaskCount);
        endRollingCount(this);
    });


    test("Create Empty Directory", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.fs.createFolderEvent + tc.slowTime.taskCount.verify);
        await teWrapper.fs.createDir(dirName);
        await waitForTeIdle(tc.waitTime.fs.createFolderEvent);
        await verifyTaskCount(testsName, startTaskCount);
        endRollingCount(this);
    });


    test("Create File", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.fs.createEvent + tc.slowTime.taskCount.verify);
        await teWrapper.fs.writeFile(fileUri.fsPath, "#!/usr/local/bin/python\n\n");
        await waitForTeIdle(tc.waitTime.fs.createEvent);
        await verifyTaskCount(testsName, startTaskCount + 1);
        endRollingCount(this);
    });


    test("Delete File", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.fs.deleteEvent + tc.slowTime.taskCount.verify);
        await teWrapper.fs.deleteFile(fileUri.fsPath);
        await waitForTeIdle(tc.waitTime.fs.deleteEvent);
        await verifyTaskCount(testsName, startTaskCount);
        endRollingCount(this);
    });


    test("Re-create File", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.fs.createEvent + tc.slowTime.taskCount.verify);
        await teWrapper.fs.writeFile(fileUri.fsPath, "#!/usr/local/bin/python\n\n");
        await waitForTeIdle(tc.waitTime.fs.createEvent);
        await verifyTaskCount(testsName, startTaskCount + 1, 1);
        endRollingCount(this);
    });


    test("Delete Folder", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.fs.deleteFolderEvent + (tc.waitTime.fs.deleteEvent * 2) + tc.slowTime.taskCount.verify);
        // await teWrapper.fs.deleteFile(fileUri.fsPath);
        await teWrapper.fs.deleteDir(dirName);
        await waitForTeIdle(tc.waitTime.fs.deleteEvent * 2);
        await verifyTaskCount(testsName, startTaskCount);
        endRollingCount(this);
    });

});
