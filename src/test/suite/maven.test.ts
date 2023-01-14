/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* tslint:disable */

//
// Documentation on https://mochajs.org/ for help.
//
import * as path from "path";
import { Uri } from "vscode";
import { ITaskExplorerApi } from "@spmeesseman/vscode-taskexplorer-types";
import { MavenTaskProvider } from "../../providers/maven";
import { IFilesystemApi } from "../../interface/IFilesystemApi";
import { activate, executeSettingsUpdate, exitRollingCount, focusExplorerView, getWsPath, suiteFinished, testControl, verifyTaskCount } from "../utils/utils";

const testsName = "maven";
const startTaskCount = 8;

let teApi: ITaskExplorerApi;
let fs: IFilesystemApi;
let pathToProgram: string;
let rootPath: string;
let fileUri: Uri;
let successCount = -1;


suite("Maven Tests", () =>
{

    suiteSetup(async function()
    {   //
        // Initialize
        //
        teApi = await activate(this);
        fs = teApi.testsApi.fs;
        rootPath = getWsPath(".");
        fileUri = Uri.file(path.join(rootPath, "pom.xml"));
        //
        // Store / set initial settings
        //
        pathToProgram = teApi.config.get<string>(`pathToPrograms.${testsName}`);
        await executeSettingsUpdate(`pathToPrograms.${testsName}`, "java\\maven\\mvn.exe");
        ++successCount;
    });


    suiteTeardown(async function()
    {
        await executeSettingsUpdate(`pathToPrograms.${testsName}`, pathToProgram);
        suiteFinished(this);
    });


	test("Activate Tree (Focus Explorer View)", async function()
	{
        if (exitRollingCount(0, successCount)) return;
        await focusExplorerView(this);
        ++successCount;
	});


    test("Create file", async function()
    {
        if (exitRollingCount(1, successCount)) return;
        this.slow(testControl.slowTime.fsCreateEvent);
        await fs.writeFile(
            fileUri.fsPath,
            "<project xmlns=\"http://maven.apache.org/POM/4.0.0\">\n" +
            "    <modelVersion>4.0.0</modelVersion>\n" +
            "</project>\n"
        );
        await teApi.waitForIdle(testControl.waitTime.fsCreateEvent, 3000);
        ++successCount;
    });


    test("Enable (Off by Default)", async function()
    {
        if (exitRollingCount(2, successCount)) return;
        this.slow(testControl.slowTime.configEnableEvent);
        await executeSettingsUpdate(`enabledTasks.${testsName}`, true);
        ++successCount;
    });


    test("Start", async function()
    {
        if (exitRollingCount(3, successCount)) return;
        await verifyTaskCount(testsName, startTaskCount);
        ++successCount;
    });


    test("Document Position", async function()
    {
        if (exitRollingCount(4, successCount)) return;
        const provider = teApi.providers[testsName] as MavenTaskProvider;
        // provider.readTasks();
        provider.getDocumentPosition(undefined, undefined);
        provider.getDocumentPosition("test", undefined);
        provider.getDocumentPosition(undefined, "test");
        ++successCount;
    });


    test("Disable", async function()
    {
        if (exitRollingCount(5, successCount)) return;
        this.slow(testControl.slowTime.configDisableEvent + testControl.slowTime.verifyTaskCount + testControl.waitTime.configDisableEvent);
        await executeSettingsUpdate(`enabledTasks.${testsName}`, false, testControl.waitTime.configDisableEvent);
        await verifyTaskCount(testsName, 0);
        ++successCount;
    });


    test("Re-enable", async function()
    {
        if (exitRollingCount(6, successCount)) return;
        this.slow(testControl.slowTime.configEnableEvent + testControl.slowTime.verifyTaskCount + testControl.waitTime.configEnableEvent);
        await executeSettingsUpdate(`enabledTasks.${testsName}`, true, testControl.waitTime.configEnableEvent);
        await verifyTaskCount(testsName, startTaskCount);
        ++successCount;
    });


    test("Invalid XML", async function()
    {
        if (exitRollingCount(7, successCount)) return;
        //
        // Note: FileWatcher ignores mod event for this task type since # of tasks never changes
        //
        let resetLogging = teApi.log.isLoggingEnabled();
        if (resetLogging) { // turn scary error logging off
            this.slow(testControl.slowTime.fsCreateEvent + (testControl.slowTime.configEvent * 2) +
                      testControl.waitTime.fsModifyEvent + testControl.slowTime.verifyTaskCount + testControl.waitTime.configEvent);
            executeSettingsUpdate("logging.enable", false);
            resetLogging = true;
        }
        else {
            this.slow(testControl.slowTime.fsCreateEvent + testControl.slowTime.verifyTaskCount);
        }
        await fs.writeFile(
            fileUri.fsPath,
            "<project xmlns=\"http://maven.apache.org/POM/4.0.0\">\n" +
            "    <modelVersion>4.0.0</modelVersion>\n" +
            "</project\n"
        );
        await teApi.waitForIdle(testControl.waitTime.fsModifyEvent, 3000);
        //
        // See fileWatcher.ts, we ignore modify event because the task count will never change
        // for this task type. So if there is invalid json after a save, the tasks will remain,
        // but are actually invalid.
        //
        // await verifyTaskCount(testsName, 0);
        await verifyTaskCount(testsName, startTaskCount);
        if (resetLogging) { // turn scary error logging off
            executeSettingsUpdate("logging.enable", true);
        }
        ++successCount;
    });


    test("Fix Invalid XML", async function()
    {
        if (exitRollingCount(8, successCount)) return;
        this.slow(testControl.slowTime.fsCreateEvent + testControl.waitTime.fsModifyEvent + testControl.slowTime.verifyTaskCount);
        await fs.writeFile(
            fileUri.fsPath,
            "<project xmlns=\"http://maven.apache.org/POM/4.0.0\">\n" +
            "    <modelVersion>4.0.0</modelVersion>\n" +
            "</project>\n"
        );
        await teApi.waitForIdle(testControl.waitTime.fsModifyEvent, 3000);
        await verifyTaskCount(testsName, startTaskCount);
        ++successCount;
    });


    test("Delete file", async function()
    {
        if (exitRollingCount(9, successCount)) return;
        this.slow(testControl.slowTime.fsDeleteEvent + testControl.waitTime.fsDeleteEvent + testControl.slowTime.verifyTaskCount);
        await fs.deleteFile(fileUri.fsPath);
        await teApi.waitForIdle(testControl.waitTime.fsDeleteEvent);
        await verifyTaskCount(testsName, 0);
        ++successCount;
    });


    test("Disable (Default is OFF)", async function()
    {
        if (exitRollingCount(10, successCount)) return;
        this.slow(testControl.slowTime.configDisableEvent + testControl.waitTime.configDisableEvent + testControl.slowTime.verifyTaskCount);
        await executeSettingsUpdate(`enabledTasks.${testsName}`, false, testControl.waitTime.configDisableEvent);
        await verifyTaskCount(testsName, 0);
        ++successCount;
    });

});
