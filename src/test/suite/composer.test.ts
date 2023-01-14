/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* tslint:disable */

//
// Documentation on https://mochajs.org/ for help.
//
import * as assert from "assert";
import * as path from "path";
import { Uri } from "vscode";
import { ComposerTaskProvider } from "../../providers/composer";
import { IFilesystemApi, ITaskExplorerApi } from "@spmeesseman/vscode-taskexplorer-types";
import {
    activate, executeSettingsUpdate, exitRollingCount, getWsPath, suiteFinished, testControl, verifyTaskCount
} from "../utils/utils";

const testsName = "composer";
const startTaskCount = 2;

let teApi: ITaskExplorerApi;
let fsApi: IFilesystemApi;
let pathToProgram: string;
let dirName: string;
let fileUri: Uri;
let successCount = -1;


suite("Composer Tests", () =>
{

    suiteSetup(async function()
    {
        teApi = await activate(this);
        fsApi = teApi.testsApi.fs;
        dirName = getWsPath("tasks_test_");
        fileUri = Uri.file(path.join(dirName, "composer.json"));
        //
        // Store / set initial settings
        //
        pathToProgram = teApi.config.get<string>(`pathToPrograms.${testsName}`);
        await executeSettingsUpdate(`pathToPrograms.${testsName}`, "php\\composer.exe");
        // await executeSettingsUpdate("groupMaxLevel", 3); // this is just a random spot to bump the grouping level
        ++successCount;
    });


    suiteTeardown(async function()
    {   //
        // Reset settings
        //
        await executeSettingsUpdate(`pathToPrograms.${testsName}`, pathToProgram);
        suiteFinished(this);
    });


    test("Enable (Off by Default)", async function()
    {
        if (exitRollingCount(0, successCount)) return;
        this.slow(testControl.slowTime.configEnableEvent);
        await executeSettingsUpdate(`enabledTasks.${testsName}`, true, testControl.waitTime.configEnableEvent);
        ++successCount;
    });


    test("Start", async function()
    {
        if (exitRollingCount(1, successCount)) return;
        await verifyTaskCount(testsName, startTaskCount);
        ++successCount;
    });


    test("Document Position", async function()
    {
        if (exitRollingCount(2, successCount)) return;
        const provider = teApi.providers.get(testsName) as ComposerTaskProvider;
        // provider.readTasks();
        assert (provider.getDocumentPosition(undefined, undefined) === 0);
        assert (provider.getDocumentPosition("test", undefined) === 0);
        assert (provider.getDocumentPosition(undefined, "test") === 0);
        assert (provider.getDocumentPosition("doc", await fsApi.readFileAsync(path.join(getWsPath("."), "composer.json"))) > 0);
        ++successCount;
    });


    test("Disable", async function()
    {
        if (exitRollingCount(3, successCount)) return;
        this.slow(testControl.slowTime.configEnableEvent + testControl.slowTime.verifyTaskCount);
        await executeSettingsUpdate(`enabledTasks.${testsName}`, false, testControl.waitTime.configEnableEvent);
        await verifyTaskCount(testsName, 0);
        ++successCount;
    });


    test("Re-enable", async function()
    {
        if (exitRollingCount(4, successCount)) return;
        this.slow(testControl.slowTime.configEnableEvent + testControl.slowTime.verifyTaskCount);
        await executeSettingsUpdate(`enabledTasks.${testsName}`, true, testControl.waitTime.configEnableEvent);
        await verifyTaskCount(testsName, startTaskCount);
        ++successCount;
    });


    test("Create File", async function()
    {
        if (exitRollingCount(5, successCount)) return;
        this.slow(testControl.slowTime.fsCreateEvent + testControl.slowTime.verifyTaskCount);
        if (!await fsApi.pathExists(dirName)) {
            await fsApi.createDir(dirName);
        }
        await fsApi.writeFile(
            fileUri.fsPath,
            "{\n" +
            '  "scripts":\n' +
            "  {\n" +
            '    "test1": "run -r test",\n' +
            '    "test2": "open -p tmp.txt",\n' +
            '    "test3": "start -x 1 -y 2"\n' +
            "  },\n" +
            '  "include": ["**/*"],\n' +
            '  "exclude": ["node_modules"]\n' +
            "}\n"
        );
        await teApi.waitForIdle(testControl.waitTime.fsCreateEvent);
        await verifyTaskCount(testsName, startTaskCount + 3);
        ++successCount;
    });


    test("Add Task to File", async function()
    {
        if (exitRollingCount(6, successCount)) return;
        this.slow(testControl.slowTime.fsCreateEvent + testControl.slowTime.verifyTaskCount);
        await fsApi.writeFile(
            fileUri.fsPath,
            "{\n" +
            '  "scripts":\n' +
            "  {\n" +
            '    "test1": "run -r test",\n' +
            '    "test2": "open -p tmp.txt",\n' +
            '    "test3": "start -x 1 -y 2",\n' +
            '    "test4": "start -x 2 -y 3"\n' +
            "  },\n" +
            '  "include": ["**/*"],\n' +
            '  "exclude": ["node_modules"]\n' +
            "}\n"
        );
        await teApi.waitForIdle(testControl.waitTime.fsModifyEvent);
        await verifyTaskCount(testsName, startTaskCount + 4);
        ++successCount;
    });


    test("Remove 2 Tasks from File", async function()
    {
        if (exitRollingCount(7, successCount)) return;
        this.slow(testControl.slowTime.fsCreateEvent + testControl.slowTime.verifyTaskCount);
        await fsApi.writeFile(
            fileUri.fsPath,
            "{\n" +
            '  "scripts":\n' +
            "  {\n" +
            '    "test1": "run -r test",\n' +
            '    "test2": "open -p tmp.txt"\n' +
            "  },\n" +
            '  "include": ["**/*"],\n' +
            '  "exclude": ["node_modules"]\n' +
            "}\n"
        );
        await teApi.waitForIdle(testControl.waitTime.fsModifyEvent);
        await verifyTaskCount(testsName, startTaskCount + 2);
        ++successCount;
    });


    test("Invalid JSON", async function()
    {
        if (exitRollingCount(8, successCount)) return;
        let resetLogging = teApi.log.isLoggingEnabled();
        if (resetLogging) { // turn scary error logging off
            this.slow(testControl.slowTime.fsCreateEvent + (testControl.slowTime.configEvent * 2) + testControl.slowTime.verifyTaskCount);
            executeSettingsUpdate("logging.enable", false);
            resetLogging = true;
        }
        else {
            this.slow(testControl.slowTime.fsCreateEvent);
        }
        await fsApi.writeFile(
            fileUri.fsPath,
            "{\n" +
            '  "scripts":\n' +
            "  {\n" +
            '    "test1": "run -r test",\n' +
            '    "test2" "open -p tmp.txt",,\n' +
            "  },\n" +
            '  "include": ["**/*"],\n' +
            '  "exclude": ["node_modules"]\n' +
            "\n"
        );
        await teApi.waitForIdle(testControl.waitTime.fsModifyEvent);
        await verifyTaskCount(testsName, startTaskCount);
        if (resetLogging) { // turn scary error logging off
            executeSettingsUpdate("logging.enable", true);
        }
        ++successCount;
    });



    test("Delete File", async function()
    {
        if (exitRollingCount(9, successCount)) return;
        this.slow(testControl.slowTime.fsDeleteEvent + testControl.slowTime.verifyTaskCount);
        await fsApi.deleteFile(fileUri.fsPath);
        await fsApi.deleteDir(dirName);
        await teApi.waitForIdle(testControl.waitTime.fsDeleteEvent);
        await verifyTaskCount(testsName, startTaskCount);
        ++successCount;
    });


    test("Disable (Default is OFF)", async function()
    {
        if (exitRollingCount(10, successCount)) return;
        this.slow(testControl.slowTime.configEnableEvent + testControl.slowTime.verifyTaskCount);
        await executeSettingsUpdate(`enabledTasks.${testsName}`, false, testControl.waitTime.configEnableEvent);
        await verifyTaskCount(testsName, 0);
        ++successCount;
    });

});
