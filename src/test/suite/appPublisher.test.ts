/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* tslint:disable */

//
// Documentation on https://mochajs.org/ for help.
//
import { join } from "path";
import { Uri } from "vscode";
import { AppPublisherTaskProvider } from "../../providers/appPublisher";
import { IFilesystemApi, ITaskExplorerApi } from "@spmeesseman/vscode-taskexplorer-types";
import {
    activate, endRollingCount, executeSettingsUpdate, executeTeCommand, exitRollingCount, getWsPath,
    needsTreeBuild, suiteFinished, testControl as tc, treeUtils, verifyTaskCount, waitForTeIdle
} from "../utils/utils";

const testsName = "apppublisher";
const startTaskCount = 21;

let teApi: ITaskExplorerApi;
let fsApi: IFilesystemApi;
let rootPath: string;
let fileUri: Uri;


suite("App-Publisher Tests", () =>
{

    suiteSetup(async function()
    {   //
        // Initialize
        //
        if (exitRollingCount(this, true)) return;
        ({ teApi, fsApi } = await activate(this));
        rootPath = getWsPath(".");
        fileUri = Uri.file(join(rootPath, ".publishrc.json"));
        endRollingCount(this, true);
    });


    suiteTeardown(async function()
    {
        if (exitRollingCount(this, false, true)) return;
        await fsApi.deleteFile(fileUri.fsPath);
        suiteFinished(this);
    });


    test("Enable (Off by Default)", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.config.enableEvent);
        await executeSettingsUpdate(`enabledTasks.${testsName}`, true, tc.waitTime.config.enableEvent);
        endRollingCount(this);
    });


    test("Build Tree", async function()
    {
        if (exitRollingCount(this)) return;
        if (needsTreeBuild()) {
            await treeUtils.refresh(this);
        }
        endRollingCount(this);
    });


    test("Start", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.taskCount.verify);
        await verifyTaskCount(testsName, startTaskCount, 5);
        endRollingCount(this);
    });


    test("Document Position", async function()
    {
        if (exitRollingCount(this)) return;
        const provider = teApi.providers[testsName] as AppPublisherTaskProvider;
        // provider.readTasks();
        provider.getDocumentPosition(undefined, undefined);
        provider.getDocumentPosition("test", undefined);
        provider.getDocumentPosition(undefined, "test");
        provider.createTask("publish", "publish", teApi.testsApi.wsFolder, Uri.file(getWsPath(".")), []);
        endRollingCount(this);
    });


    test("Create file", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.fs.createEvent + tc.slowTime.taskCount.verify);
        await fsApi.writeFile(
            fileUri.fsPath,
            "{\n" +
            '    "version": "1.0.0",\n' +
            '    "branch": "trunk",\n' +
            '    "buildCommand": [],\n' +
            '    "mantisbtRelease": "Y",\n' +
            '    "mantisbtChglogEdit": "N",\n' +
            '    "mantisbtProject": "",\n' +
            '    "repoType": "svn"\n' +
            "}\n"
        );
        await waitForTeIdle(tc.waitTime.fs.createEvent);
        await verifyTaskCount(testsName, startTaskCount + 21);
        endRollingCount(this);
    });


    test("Disable", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.config.disableEvent + tc.slowTime.taskCount.verify);
        await executeSettingsUpdate(`enabledTasks.${testsName}`, false, tc.waitTime.config.disableEvent);
        await verifyTaskCount(testsName, 0);
        endRollingCount(this);
    });


    test("Re-enable", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.config.enableEvent + tc.slowTime.taskCount.verify);
        await executeSettingsUpdate(`enabledTasks.${testsName}`, true, tc.waitTime.config.enableEvent);
        await verifyTaskCount(testsName, startTaskCount + 21);
        endRollingCount(this);
    });


    test("Invalid JSON", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.fs.createEvent + tc.slowTime.refreshCommand + tc.slowTime.taskCount.verify);
        await fsApi.writeFile(
            fileUri.fsPath,
            "{\n" +
            '    "version": "1.0.0"\n' +
            '    "branch": "trunk",\n' +
            '    "buildCommand": [],\n' +
            '    "mantisbtRelease": "Y",\n' +
            '    "mantisbtChglogEdit": "N",\n' +
            '    "mantisbtProject": "",\n' +
            '    "repoType": "svn""\n' +
            "\n"
        );
        await waitForTeIdle(tc.waitTime.fs.modifyEvent);
        //
        // The 'modify' event is ignored for app-publisher tasks, since the # of tasks for any.publishrc
        // file is always 21. Force a task invalidation to cover the invalid json check
        //
        await executeTeCommand("refresh", tc.waitTime.refreshCommand);
        await verifyTaskCount(testsName, startTaskCount);
        endRollingCount(this);
    });


    test("Fix Invalid JSON", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.fs.createEvent + tc.slowTime.refreshCommand + tc.slowTime.taskCount.verify);
        await fsApi.writeFile(
            fileUri.fsPath,
            "{\n" +
            '    "version": "1.0.0",\n' +
            '    "branch": "trunk",\n' +
            '    "buildCommand": [],\n' +
            '    "mantisbtRelease": "Y",\n' +
            '    "mantisbtChglogEdit": "N",\n' +
            '    "mantisbtProject": "",\n' +
            '    "repoType": "svn"\n' +
            "}\n"
        );
        await waitForTeIdle(tc.waitTime.fs.modifyEvent);
        //
        // The 'modify' event is ignored for app-publisher tasks, since the # of tasks for any.publishrc
        // file is always 21. Force a task invalidation to cover the invalid json fix check
        //
        await executeTeCommand("refresh", tc.waitTime.refreshCommand);
        await verifyTaskCount(testsName, startTaskCount + 21);
        endRollingCount(this);
    });


    test("Delete file", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.fs.deleteEvent + tc.slowTime.taskCount.verify);
        await fsApi.deleteFile(fileUri.fsPath);
        await waitForTeIdle(tc.waitTime.fs.deleteEvent);
        await verifyTaskCount(testsName, startTaskCount);
        endRollingCount(this);
    });


    test("Disable (Default is OFF)", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.config.disableEvent + tc.slowTime.taskCount.verify);
        await executeSettingsUpdate(`enabledTasks.${testsName}`, false, tc.waitTime.config.disableEvent);
        await verifyTaskCount(testsName, 0);
        endRollingCount(this);
    });

});
