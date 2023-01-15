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
import {
    activate, executeSettingsUpdate, executeTeCommand, exitRollingCount, focusExplorerView,
    getWsPath, suiteFinished, testControl as tc, verifyTaskCount, waitForTeIdle
} from "../utils/utils";

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
        this.slow(tc.slowTime.fsCreateEvent);
        await fs.writeFile(
            fileUri.fsPath,
            "<project xmlns=\"http://maven.apache.org/POM/4.0.0\">\n" +
            "    <modelVersion>4.0.0</modelVersion>\n" +
            "</project>\n"
        );
        await waitForTeIdle(tc.waitTime.fsCreateEvent, 3000);
        ++successCount;
    });


    test("Enable (Off by Default)", async function()
    {
        if (exitRollingCount(2, successCount)) return;
        this.slow(tc.slowTime.configEnableEvent);
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
        this.slow(tc.slowTime.configDisableEvent + tc.slowTime.verifyTaskCount + tc.waitTime.configDisableEvent);
        await executeSettingsUpdate(`enabledTasks.${testsName}`, false, tc.waitTime.configDisableEvent);
        await verifyTaskCount(testsName, 0);
        ++successCount;
    });


    test("Re-enable", async function()
    {
        if (exitRollingCount(6, successCount)) return;
        this.slow(tc.slowTime.configEnableEvent + tc.slowTime.verifyTaskCount + tc.waitTime.configEnableEvent);
        await executeSettingsUpdate(`enabledTasks.${testsName}`, true, tc.waitTime.configEnableEvent);
        await verifyTaskCount(testsName, startTaskCount);
        ++successCount;
    });


    test("Invalid XML", async function()
    {
        if (exitRollingCount(7, successCount)) return;
        this.slow(tc.slowTime.fsCreateEvent + tc.slowTime.refreshCommand + tc.waitTime.fsModifyEvent + tc.slowTime.verifyTaskCount);
        await fs.writeFile(
            fileUri.fsPath,
            "<project xmlns=\"http://maven.apache.org/POM/4.0.0\">\n" +
            "    <modelVersion>4.0.0</modelVersion>\n" +
            "</project\n"
        );
        await waitForTeIdle(tc.waitTime.fsModifyEvent);
        //
        // The 'modify' event is ignored for app-publisher tasks, since the # of tasks for any.publishrc
        // file is always 21. Force a task invalidation to cover the invalid json fix check
        //
        await executeTeCommand("refresh", tc.waitTime.refreshCommand);
        await verifyTaskCount(testsName, 0);
        ++successCount;
    });


    test("Fix Invalid XML", async function()
    {
        if (exitRollingCount(8, successCount)) return;
        this.slow(tc.slowTime.fsCreateEvent + tc.slowTime.refreshCommand + tc.waitTime.fsModifyEvent + tc.slowTime.verifyTaskCount);
        await fs.writeFile(
            fileUri.fsPath,
            "<project xmlns=\"http://maven.apache.org/POM/4.0.0\">\n" +
            "    <modelVersion>4.0.0</modelVersion>\n" +
            "</project>\n"
        );
        await waitForTeIdle(tc.waitTime.fsModifyEvent);
        //
        // The 'modify' event is ignored for app-publisher tasks, since the # of tasks for any.publishrc
        // file is always 21. Force a task invalidation to cover the invalid json fix check
        //
        await executeTeCommand("refresh", tc.waitTime.refreshCommand);
        await verifyTaskCount(testsName, startTaskCount);
        ++successCount;
    });


    test("Delete file", async function()
    {
        if (exitRollingCount(9, successCount)) return;
        this.slow(tc.slowTime.fsDeleteEvent + tc.waitTime.fsDeleteEvent + tc.slowTime.verifyTaskCount);
        await fs.deleteFile(fileUri.fsPath);
        await waitForTeIdle(tc.waitTime.fsDeleteEvent);
        await verifyTaskCount(testsName, 0);
        ++successCount;
    });


    test("Disable (Default is OFF)", async function()
    {
        if (exitRollingCount(10, successCount)) return;
        this.slow(tc.slowTime.configDisableEvent + tc.waitTime.configDisableEvent + tc.slowTime.verifyTaskCount);
        await executeSettingsUpdate(`enabledTasks.${testsName}`, false, tc.waitTime.configDisableEvent);
        await verifyTaskCount(testsName, 0);
        ++successCount;
    });

});
