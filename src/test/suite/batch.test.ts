/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* tslint:disable */

import { join } from "path";
import { Uri } from "vscode";
import { expect } from "chai";
import { BashTaskProvider } from "../../providers/bash";
import { executeSettingsUpdate } from "../utils/commandUtils";
import { IFilesystemApi, ITaskExplorerApi } from "@spmeesseman/vscode-taskexplorer-types";
import {
    activate, getWsPath, testControl, treeUtils, verifyTaskCount, suiteFinished, exitRollingCount,
    waitForTeIdle, endRollingCount, needsTreeBuild
} from "../utils/utils";

const testsName = "batch";
const startTaskCount = 2;
const dirName = getWsPath("tasks_test_");
const fileUriBat = Uri.file(join(dirName, "test_provider_bat.bat"));
const fileUriCmd = Uri.file(join(dirName, "test_provider-cmd.cmd"));

let teApi: ITaskExplorerApi;
let fsApi: IFilesystemApi;


suite("Batch Tests", () =>
{

    suiteSetup(async function()
    {
        if (exitRollingCount(this, true)) return;
        ({ teApi, fsApi } = await activate(this));
        endRollingCount(this, true);
    });


    suiteTeardown(async function()
    {
        if (exitRollingCount(this, false, true)) return;
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
        expect(provider.getDocumentPosition()).to.be.equal(0, "Script type should return position 0");
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


    test("Create Files", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(testControl.slowTime.fs.createFolderEvent + testControl.slowTime.fs.createFolderEvent + testControl.slowTime.taskCount.verify);
        await fsApi.createDir(dirName);
        await waitForTeIdle(testControl.waitTime.fs.createFolderEvent);
        await fsApi.writeFile(fileUriBat.fsPath, "echo test 123\r\n\r\n");
        await fsApi.writeFile(fileUriCmd.fsPath, "echo test 123\r\n");
        await waitForTeIdle(testControl.waitTime.fs.createEvent);
        await verifyTaskCount(testsName, startTaskCount + 2);
        endRollingCount(this);
    });


    test("Delete Files", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(testControl.slowTime.fs.deleteEvent + testControl.slowTime.taskCount.verify);
        await fsApi.deleteFile(fileUriBat.fsPath);
        await fsApi.deleteFile(fileUriCmd.fsPath);
        await waitForTeIdle(testControl.waitTime.fs.deleteEvent);
        await verifyTaskCount(testsName, startTaskCount);
        endRollingCount(this);
    });


    test("Re-create Files", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(testControl.slowTime.fs.createEvent + testControl.slowTime.taskCount.verify);
        await fsApi.writeFile(fileUriBat.fsPath, "echo test 123\r\n\r\n");
        await fsApi.writeFile(fileUriCmd.fsPath, "echo test 123\r\n");
        await waitForTeIdle(testControl.waitTime.fs.createEvent);
        await verifyTaskCount(testsName, startTaskCount + 2);
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
