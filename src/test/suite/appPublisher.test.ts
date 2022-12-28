/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* tslint:disable */

//
// Documentation on https://mochajs.org/ for help.
//
import * as assert from "assert";
import * as fs from "fs";
import * as path from "path";
import { Uri } from "vscode";
import { configuration } from "../../common/configuration";
import { activate, buildTree, executeSettingsUpdate, executeTeCommand, getWsPath, isReady, testsControl, verifyTaskCount } from "../helper";
import { ExplorerApi, TaskExplorerApi } from "@spmeesseman/vscode-taskexplorer-types";
import { AppPublisherTaskProvider } from "../../providers/appPublisher";


const testsName = "apppublisher";
const waitTimeForFsModEvent = testsControl.waitTimeForFsModifyEvent;
const waitTimeForFsDelEvent = testsControl.waitTimeForFsDeleteEvent;
const waitTimeForFsNewEvent = testsControl.waitTimeForFsCreateEvent;
const waitTimeForConfigEvent = testsControl.waitTimeForConfigEvent;

let teApi: TaskExplorerApi;
let explorer: ExplorerApi;
let pathToProgram: string;
let enableTaskType: boolean;
let dirName: string;
let rootPath: string;
let fileUri: Uri;


suite("App-Publisher Tests", () =>
{

    suiteSetup(async function()
    {   //
        // Initialize
        //
        teApi = await activate(this);
        assert(isReady(testsName) === true, "    ✘ TeApi not ready");
        if (!teApi.explorer) {
            assert.fail("        ✘ Explorer instance does not exist");
        }
        explorer = teApi.explorer;
        rootPath = getWsPath(".");
        dirName = path.join(rootPath, "tasks_test_");
        fileUri = Uri.file(path.join(rootPath, ".publishrc.json"));
        //
        // Store / set initial settings
        //
        pathToProgram = configuration.get<string>(`pathToPrograms.${testsName}`);
        enableTaskType = configuration.get<boolean>(`enabledTasks.${testsName}`);
        await executeSettingsUpdate(`pathToPrograms.${testsName}`, "app-publisher");
        await executeSettingsUpdate(`enabledTasks.${testsName}`, true);
    });


    suiteTeardown(async function()
    {   //
        // Reset settings
        //
        await executeSettingsUpdate(`pathToPrograms.${testsName}`, pathToProgram);
        await executeSettingsUpdate(`enabledTasks.${testsName}`, enableTaskType);
    });


    test("Enable (Off by Default)", async function()
    {
        this.slow(testsControl.slowTimeForConfigEnableEvent);
        await executeSettingsUpdate(`enabledTasks.${testsName}`, true);
    });


    test("Build Tree (View Collapsed)", async function()
    {
        await buildTree(this);
    });


    test("Start", async function()
    {
        await verifyTaskCount(testsName, 21);
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
        this.slow(testsControl.slowTimeForFsCreateEvent);
        fs.writeFileSync(
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
        await teApi.waitForIdle(waitTimeForFsNewEvent, 3000);
        await verifyTaskCount(testsName, 42);
    });


    test("Disable", async function()
    {
        this.slow(testsControl.slowTimeForConfigEnableEvent);
        await executeSettingsUpdate(`enabledTasks.${testsName}`, false);
        await verifyTaskCount(testsName, 0);
    });


    test("Re-enable", async function()
    {
        this.slow(testsControl.slowTimeForConfigEnableEvent);
        await executeSettingsUpdate(`enabledTasks.${testsName}`, true);
        await verifyTaskCount(testsName, 42);
    });


    test("Invalid JSON", async function()
    {
        this.slow(testsControl.slowTimeForFsCreateEvent);
        fs.writeFileSync(
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
        await teApi.waitForIdle(waitTimeForFsModEvent, 3000);
        await verifyTaskCount(testsName, 21);
    });


    test("Fix Invalid JSON", async function()
    {
        this.slow(testsControl.slowTimeForFsCreateEvent);
        fs.writeFileSync(
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
        await teApi.waitForIdle(waitTimeForFsModEvent, 3000);
        await verifyTaskCount(testsName, 42);
    });


    test("Delete file", async function()
    {
        this.slow(testsControl.slowTimeForFsDeleteEvent);
        fs.unlinkSync(fileUri.fsPath);
        await teApi.waitForIdle(waitTimeForFsDelEvent);
        await verifyTaskCount(testsName, 21);
    });

});
