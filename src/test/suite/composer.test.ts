/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* tslint:disable */

//
// Documentation on https://mochajs.org/ for help.
//
import * as assert from "assert";
import * as path from "path";
import { Uri } from "vscode";
import { activate, executeSettingsUpdate, getWsPath, testsControl, verifyTaskCount } from "../helper";
import { IFilesystemApi, ITaskExplorerApi } from "@spmeesseman/vscode-taskexplorer-types";
import { ComposerTaskProvider } from "../../providers/composer";

const testsName = "composer";
const startTaskCount = 2;

let teApi: ITaskExplorerApi;
let fsApi: IFilesystemApi;
let pathToProgram: string;
let dirName: string;
let fileUri: Uri;


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
    });


    suiteTeardown(async function()
    {   //
        // Reset settings
        //
        await executeSettingsUpdate(`pathToPrograms.${testsName}`, pathToProgram);
    });


    test("Enable (Off by Default)", async function()
    {
        this.slow(testsControl.slowTimeForConfigEnableEvent);
        await executeSettingsUpdate(`enabledTasks.${testsName}`, true, testsControl.waitTimeForConfigEnableEvent);
    });


    test("Start", async function()
    {
        await verifyTaskCount(testsName, startTaskCount);
    });


    test("Document Position", async function()
    {
        const provider = teApi.providers.get(testsName) as ComposerTaskProvider;
        // provider.readTasks();
        assert (provider.getDocumentPosition(undefined, undefined) === 0);
        assert (provider.getDocumentPosition("test", undefined) === 0);
        assert (provider.getDocumentPosition(undefined, "test") === 0);
        assert (provider.getDocumentPosition("doc", await fsApi.readFileAsync(path.join(getWsPath("."), "composer.json"))) > 0);
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
        await verifyTaskCount(testsName, startTaskCount);
    });


    test("Create File", async function()
    {
        this.slow(testsControl.slowTimeForFsCreateEvent + testsControl.slowTimeForVerifyTaskCount);

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
        await teApi.waitForIdle(testsControl.waitTimeForFsCreateEvent);
        await verifyTaskCount(testsName, startTaskCount + 3);
    });


    test("Add Task to File", async function()
    {
        this.slow(testsControl.slowTimeForFsCreateEvent + testsControl.slowTimeForVerifyTaskCount);
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
        await teApi.waitForIdle(testsControl.waitTimeForFsModifyEvent);
        await verifyTaskCount(testsName, startTaskCount + 4);
    });


    test("Remove 2 Tasks from File", async function()
    {
        this.slow(testsControl.slowTimeForFsCreateEvent + testsControl.slowTimeForVerifyTaskCount);
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
        await teApi.waitForIdle(testsControl.waitTimeForFsModifyEvent);
        await verifyTaskCount(testsName, startTaskCount + 2);
    });


    test("Invalid JSON", async function()
    {
        let resetLogging = teApi.log.isLoggingEnabled();
        if (resetLogging) { // turn scary error logging off
            this.slow(testsControl.slowTimeForFsCreateEvent + (testsControl.slowTimeForConfigEvent * 2) + testsControl.slowTimeForVerifyTaskCount);
            executeSettingsUpdate("logging.enable", false);
            resetLogging = true;
        }
        else {
            this.slow(testsControl.slowTimeForFsCreateEvent);
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
        await teApi.waitForIdle(testsControl.waitTimeForFsModifyEvent);
        await verifyTaskCount(testsName, startTaskCount);
        if (resetLogging) { // turn scary error logging off
            executeSettingsUpdate("logging.enable", true);
        }
    });



    test("Delete File", async function()
    {
        this.slow(testsControl.slowTimeForFsDeleteEvent + testsControl.slowTimeForVerifyTaskCount);
        await fsApi.deleteFile(fileUri.fsPath);
        await fsApi.deleteDir(dirName);
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
