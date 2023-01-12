/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* tslint:disable */

//
// Documentation on https://mochajs.org/ for help.
//
import * as path from "path";
import { expect } from "chai";
import { Uri } from "vscode";
import { AppPublisherTaskProvider } from "../../providers/appPublisher";
import { IFilesystemApi, ITaskExplorerApi } from "@spmeesseman/vscode-taskexplorer-types";
import {
    activate, executeSettingsUpdate, getWsPath, suiteFinished, testControl, treeUtils, verifyTaskCount
} from "../helper";

const testsName = "apppublisher";
const startTaskCount = 21;

let teApi: ITaskExplorerApi;
let fsApi: IFilesystemApi;
let pathToProgram: string;
let rootPath: string;
let fileUri: Uri;
let successCount = 0;


suite("App-Publisher Tests", () =>
{

    suiteSetup(async function()
    {   //
        // Initialize
        //
        teApi = await activate(this);
        fsApi = teApi.testsApi.fs;
        rootPath = getWsPath(".");
        fileUri = Uri.file(path.join(rootPath, ".publishrc.json"));
        //
        // Store / set initial settings
        //
        pathToProgram = teApi.config.get<string>(`pathToPrograms.${testsName}`);
        await executeSettingsUpdate(`pathToPrograms.${testsName}`, "app-publisher");
        ++successCount;
    });


    suiteTeardown(async function()
    {
        await executeSettingsUpdate(`pathToPrograms.${testsName}`, pathToProgram);
        await fsApi.deleteFile(fileUri.fsPath);
        suiteFinished(this);
    });


    test("Enable (Off by Default)", async function()
    {
        expect(successCount).to.be.equal(1, "rolling success count failure");
        this.slow(testControl.slowTime.configEnableEvent);
        await executeSettingsUpdate(`enabledTasks.${testsName}`, true, testControl.waitTime.configEnableEvent);
        ++successCount;
    });


    test("Build Tree (View Collapsed)", async function()
    {
        expect(successCount).to.be.equal(2, "rolling success count failure");
        await treeUtils.refresh(this);
        ++successCount;
    });


    test("Start", async function()
    {
        expect(successCount).to.be.equal(3, "rolling success count failure");
        this.slow(testControl.slowTime.verifyTaskCount + testControl.waitTime.verifyTaskCountRetryInterval);
        await verifyTaskCount(testsName, startTaskCount, 5, testControl.waitTime.verifyTaskCountRetryInterval);
        ++successCount;
    });


    test("Document Position", async function()
    {
        expect(successCount).to.be.equal(4, "rolling success count failure");
        const provider = teApi.providers.get(testsName) as AppPublisherTaskProvider;
        // provider.readTasks();
        provider.getDocumentPosition(undefined, undefined);
        provider.getDocumentPosition("test", undefined);
        provider.getDocumentPosition(undefined, "test");
        ++successCount;
    });


    test("Create file", async function()
    {
        expect(successCount).to.be.equal(5, "rolling success count failure");
        this.slow(testControl.slowTime.fsCreateEvent + testControl.waitTime.fsCreateEvent + testControl.slowTime.verifyTaskCount);
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
        await teApi.waitForIdle(testControl.waitTime.fsCreateEvent);
        await verifyTaskCount(testsName, startTaskCount + 21);
        ++successCount;
    });


    test("Disable", async function()
    {
        expect(successCount).to.be.equal(6, "rolling success count failure");
        this.slow(testControl.slowTime.configDisableEvent + testControl.waitTime.configDisableEvent + testControl.slowTime.verifyTaskCount);
        await executeSettingsUpdate(`enabledTasks.${testsName}`, false, testControl.waitTime.configDisableEvent);
        await verifyTaskCount(testsName, 0);
        ++successCount;
    });


    test("Re-enable", async function()
    {
        expect(successCount).to.be.equal(7, "rolling success count failure");
        this.slow(testControl.slowTime.configEnableEvent + testControl.waitTime.configEnableEvent + testControl.slowTime.verifyTaskCount);
        await executeSettingsUpdate(`enabledTasks.${testsName}`, true, testControl.waitTime.configEnableEvent);
        await verifyTaskCount(testsName, startTaskCount + 21);
        ++successCount;
    });


    test("Invalid JSON", async function()
    {
        expect(successCount).to.be.equal(8, "rolling success count failure");
        //
        // Note: FileWatcher ignores mod event for this task type since # of tasks never changes
        //
        let resetLogging = teApi.log.isLoggingEnabled();
        if (resetLogging) { // turn scary error logging off
            this.slow(testControl.slowTime.fsCreateEvent + (testControl.slowTime.configEvent * 2));
            executeSettingsUpdate("logging.enable", false);
            resetLogging = true;
        }
        else {
            this.slow(testControl.slowTime.fsCreateEvent + testControl.slowTime.verifyTaskCount);
        }
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
        await teApi.waitForIdle(testControl.waitTime.fsModifyEvent);
        //
        // See fileWatcher.ts, we ignore modify event because the task count will never change
        // for this task type. So if there is invalid json after a save, the tasks will remain,
        // but are actually invalid.
        //
        // await verifyTaskCount(testsName, startTaskCount);
        await verifyTaskCount(testsName, startTaskCount + 21);
        if (resetLogging) { // turn scary error logging off
            executeSettingsUpdate("logging.enable", true);
        }
        ++successCount;
    });


    test("Fix Invalid JSON", async function()
    {
        expect(successCount).to.be.equal(9, "rolling success count failure");
        this.slow(testControl.slowTime.fsCreateEvent + testControl.waitTime.fsModifyEvent + testControl.slowTime.verifyTaskCount);
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
        await teApi.waitForIdle(testControl.waitTime.fsModifyEvent);
        await verifyTaskCount(testsName, startTaskCount + 21);
        ++successCount;
    });


    test("Delete file", async function()
    {
        expect(successCount).to.be.equal(10, "rolling success count failure");
        this.slow(testControl.slowTime.fsDeleteEvent + testControl.waitTime.fsDeleteEvent + testControl.slowTime.verifyTaskCount);
        await fsApi.deleteFile(fileUri.fsPath);
        await teApi.waitForIdle(testControl.waitTime.fsDeleteEvent);
        await verifyTaskCount(testsName, startTaskCount);
        ++successCount;
    });


    test("Disable (Default is OFF)", async function()
    {
        expect(successCount).to.be.equal(11, "rolling success count failure");
        this.slow(testControl.slowTime.configDisableEvent + testControl.waitTime.configDisableEvent + testControl.slowTime.verifyTaskCount);
        await executeSettingsUpdate(`enabledTasks.${testsName}`, false, testControl.waitTime.configDisableEvent);
        await verifyTaskCount(testsName, 0);
        ++successCount;
    });

});
