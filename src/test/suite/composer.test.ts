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
import { activate, executeSettingsUpdate, getWsPath, isReady, testsControl, verifyTaskCount } from "../helper";
import { ITaskExplorerApi } from "@spmeesseman/vscode-taskexplorer-types";
import { ComposerTaskProvider } from "../../providers/composer";
import { readFileAsync } from "../../lib/utils/fs";

const testsName = "composer";

let teApi: ITaskExplorerApi;
let pathToProgram: string;
let dirName: string;
let fileUri: Uri;


suite("Composer Tests", () =>
{

    suiteSetup(async function()
    {   //
        // Initialize
        //
        teApi = await activate(this);
        assert(isReady(testsName) === true, "    ✘ TeApi not ready");
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
        await verifyTaskCount(testsName, 2);
    });


    test("Document Position", async function()
    {
        const provider = teApi.providers.get(testsName) as ComposerTaskProvider;
        // provider.readTasks();
        assert (provider.getDocumentPosition(undefined, undefined) === 0);
        assert (provider.getDocumentPosition("test", undefined) === 0);
        assert (provider.getDocumentPosition(undefined, "test") === 0);
        assert (provider.getDocumentPosition("doc", await readFileAsync(path.join(getWsPath("."), "composer.json"))) > 0);
    });


    test("Disable", async function()
    {
        this.slow(testsControl.slowTimeForConfigEnableEvent);
        await executeSettingsUpdate(`enabledTasks.${testsName}`, false, testsControl.waitTimeForConfigEnableEvent);
        await verifyTaskCount(testsName, 0);
    });


    test("Re-enable", async function()
    {
        this.slow(testsControl.slowTimeForConfigEnableEvent);
        await executeSettingsUpdate(`enabledTasks.${testsName}`, true, testsControl.waitTimeForConfigEnableEvent);
        await verifyTaskCount(testsName, 2);
    });


    test("Create File", async function()
    {
        this.slow(testsControl.slowTimeForFsCreateEvent);

        if (!fs.existsSync(dirName)) {
            fs.mkdirSync(dirName, { mode: 0o777 });
        }

        fs.writeFileSync(
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
        await verifyTaskCount(testsName, 5);
    });


    test("Add Task to File", async function()
    {
        this.slow(testsControl.slowTimeForFsCreateEvent);

        fs.writeFileSync(
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
        await verifyTaskCount(testsName, 6);
    });


    test("Remove Task from File", async function()
    {
        this.slow(testsControl.slowTimeForFsCreateEvent);

        fs.writeFileSync(
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
        await verifyTaskCount(testsName, 4);
    });


    test("Invalid JSON", async function()
    {
        fs.writeFileSync(
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
        await verifyTaskCount(testsName, 2);
    });



    test("Delete File", async function()
    {
        this.slow(testsControl.slowTimeForFsDeleteEvent);
        fs.unlinkSync(fileUri.fsPath);
        fs.rmdirSync(dirName, {
            recursive: true
        });
        await teApi.waitForIdle(testsControl.waitTimeForFsDeleteEvent);
        await verifyTaskCount(testsName, 2);
    });


    test("Disable (Default is OFF)", async function()
    {
        this.slow(testsControl.slowTimeForConfigEnableEvent);
        await executeSettingsUpdate(`enabledTasks.${testsName}`, false, testsControl.waitTimeForConfigEnableEvent);
        await verifyTaskCount(testsName, 0);
    });

});
