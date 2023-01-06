/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* tslint:disable */

//
// Documentation on https://mochajs.org/ for help.
//
import * as path from "path";
import { Uri } from "vscode";
import { AppPublisherTaskProvider } from "../../providers/appPublisher";
import { IFilesystemApi, ITaskExplorerApi } from "@spmeesseman/vscode-taskexplorer-types";
import { activate, executeSettingsUpdate, getWsPath, testsControl, treeUtils, verifyTaskCount } from "../helper";

const testsName = "apppublisher";
const startTaskCount = 21;

let teApi: ITaskExplorerApi;
let fsApi: IFilesystemApi;
let pathToProgram: string;
let rootPath: string;
let fileUri: Uri;


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
    });


    suiteTeardown(async function()
    {
        await executeSettingsUpdate(`pathToPrograms.${testsName}`, pathToProgram);
        await fsApi.deleteFile(fileUri.fsPath);
    });


    test("Enable (Off by Default)", async function()
    {
        this.slow(testsControl.slowTimeForConfigEnableEvent);
        await executeSettingsUpdate(`enabledTasks.${testsName}`, true, testsControl.waitTimeForConfigEnableEvent);
    });


    test("Build Tree (View Collapsed)", async function()
    {
        await treeUtils.buildTree(this);
    });


    test("Start", async function()
    {
        this.slow(testsControl.slowTimeForVerifyTaskCount);
        await verifyTaskCount(testsName, startTaskCount);
    });


    test("Document Position", async function()
    {
        const provider = teApi.providers.get(testsName) as AppPublisherTaskProvider;
        // provider.readTasks();
        provider.getDocumentPosition(undefined, undefined);
        provider.getDocumentPosition("test", undefined);
        provider.getDocumentPosition(undefined, "test");
    });


    test("Create file", async function()
    {
        this.slow(testsControl.slowTimeForFsCreateEvent + testsControl.slowTimeForVerifyTaskCount);
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
        await teApi.waitForIdle(testsControl.waitTimeForFsCreateEvent);
        await verifyTaskCount(testsName, startTaskCount + 21);
    });


    test("Disable", async function()
    {
        this.slow(testsControl.slowTimeForConfigEnableEvent + testsControl.slowTimeForVerifyTaskCount);
        await executeSettingsUpdate(`enabledTasks.${testsName}`, false, testsControl.waitTimeForConfigEnableEvent);
        await verifyTaskCount(testsName, 0);
    });


    test("Re-enable", async function()
    {
        this.slow(testsControl.slowTimeForConfigEnableEvent + testsControl.slowTimeForVerifyTaskCount);
        await executeSettingsUpdate(`enabledTasks.${testsName}`, true, testsControl.waitTimeForConfigEnableEvent);
        await verifyTaskCount(testsName, startTaskCount + 21);
    });


    test("Invalid JSON", async function()
    {
        let resetLogging = teApi.log.isLoggingEnabled();
        if (resetLogging) { // turn scary error logging off
            this.slow(testsControl.slowTimeForFsCreateEvent + (testsControl.slowTimeForConfigEvent * 2));
            executeSettingsUpdate("logging.enable", false);
            resetLogging = true;
        }
        else {
            this.slow(testsControl.slowTimeForFsCreateEvent + testsControl.slowTimeForVerifyTaskCount);
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
        await teApi.waitForIdle(testsControl.waitTimeForFsModifyEvent);
        await verifyTaskCount(testsName, startTaskCount);
        if (resetLogging) { // turn scary error logging off
            executeSettingsUpdate("logging.enable", true);
        }
    });


    test("Fix Invalid JSON", async function()
    {
        this.slow(testsControl.slowTimeForFsCreateEvent + testsControl.slowTimeForVerifyTaskCount);
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
        await teApi.waitForIdle(testsControl.waitTimeForFsModifyEvent + testsControl.slowTimeForVerifyTaskCount);
        await verifyTaskCount(testsName, startTaskCount + 21);
    });


    test("Delete file", async function()
    {
        this.slow(testsControl.slowTimeForFsDeleteEvent + testsControl.slowTimeForVerifyTaskCount);
        await fsApi.deleteFile(fileUri.fsPath);
        await teApi.waitForIdle(testsControl.waitTimeForFsDeleteEvent);
        await verifyTaskCount(testsName, startTaskCount);
    });


    test("Disable (Default is OFF)", async function()
    {
        this.slow(testsControl.slowTimeForConfigEnableEvent + testsControl.slowTimeForVerifyTaskCount);
        await executeSettingsUpdate(`enabledTasks.${testsName}`, false, testsControl.waitTimeForConfigEnableEvent);
        await verifyTaskCount(testsName, 0);
    });

});
