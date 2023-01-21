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
    activate, endRollingCount, executeSettingsUpdate, executeTeCommand, exitRollingCount, focusExplorerView,
    getWsPath, needsTreeBuild, suiteFinished, testControl as tc, verifyTaskCount, waitForTeIdle
} from "../utils/utils";

const testsName = "maven";
const startTaskCount = 8;

let teApi: ITaskExplorerApi;
let fsApi: IFilesystemApi;
let pathToProgram: string;
let rootPath: string;
let fileUri: Uri;


suite("Maven Tests", () =>
{

    suiteSetup(async function()
    {   //
        // Initialize
        //
        ({ teApi, fsApi } = await activate(this));
        rootPath = getWsPath(".");
        fileUri = Uri.file(path.join(rootPath, "pom.xml"));
        //
        // Store / set initial settings
        //
        pathToProgram = teApi.config.get<string>(`pathToPrograms.${testsName}`);
        await executeSettingsUpdate(`pathToPrograms.${testsName}`, "java\\maven\\mvn.exe");
        endRollingCount(this);
    });


    suiteTeardown(async function()
    {
        await executeSettingsUpdate(`pathToPrograms.${testsName}`, pathToProgram);
        suiteFinished(this);
    });


	test("Focus Tree View", async function()
	{
        if (exitRollingCount(this)) return;
        if (needsTreeBuild(true)) {
            await focusExplorerView(this);
        }
        endRollingCount(this);
	});


    test("Create file", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.fs.createEvent);
        await fsApi.writeFile(
            fileUri.fsPath,
            "<project xmlns=\"http://maven.apache.org/POM/4.0.0\">\n" +
            "    <modelVersion>4.0.0</modelVersion>\n" +
            "</project>\n"
        );
        await waitForTeIdle(tc.waitTime.fs.createEvent);
        endRollingCount(this);
    });


    test("Enable (Off by Default)", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.config.enableEvent);
        await executeSettingsUpdate(`enabledTasks.${testsName}`, true);
        endRollingCount(this);
    });


    test("Start", async function()
    {
        if (exitRollingCount(this)) return;
        await verifyTaskCount(testsName, startTaskCount);
        endRollingCount(this);
    });


    test("Document Position", async function()
    {
        if (exitRollingCount(this)) return;
        const provider = teApi.providers[testsName] as MavenTaskProvider;
        // provider.readTasks();
        provider.getDocumentPosition(undefined, undefined);
        provider.getDocumentPosition("test", undefined);
        provider.getDocumentPosition(undefined, "test");
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
        await verifyTaskCount(testsName, startTaskCount);
        endRollingCount(this);
    });


    test("Invalid XML", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.fs.createEvent + tc.slowTime.refreshCommand + tc.slowTime.taskCount.verify);
        await fsApi.writeFile(
            fileUri.fsPath,
            "<project xmlns=\"http://maven.apache.org/POM/4.0.0\">\n" +
            "    <modelVersion>4.0.0</modelVersion>\n" +
            "</project\n"
        );
        await waitForTeIdle(tc.waitTime.fs.modifyEvent);
        //
        // The 'modify' event is ignored for app-publisher tasks, since the # of tasks for any.publishrc
        // file is always 21. Force a task invalidation to cover the invalid json fix check
        //
        await executeTeCommand("refresh", tc.waitTime.refreshCommand);
        await verifyTaskCount(testsName, 0);
        endRollingCount(this);
    });


    test("Fix Invalid XML", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.fs.createEvent + tc.slowTime.refreshCommand + tc.slowTime.taskCount.verify);
        await fsApi.writeFile(
            fileUri.fsPath,
            "<project xmlns=\"http://maven.apache.org/POM/4.0.0\">\n" +
            "    <modelVersion>4.0.0</modelVersion>\n" +
            "</project>\n"
        );
        await waitForTeIdle(tc.waitTime.fs.modifyEvent);
        //
        // The 'modify' event is ignored for app-publisher tasks, since the # of tasks for any.publishrc
        // file is always 21. Force a task invalidation to cover the invalid json fix check
        //
        await executeTeCommand("refresh", tc.waitTime.refreshCommand);
        await verifyTaskCount(testsName, startTaskCount);
        endRollingCount(this);
    });


    test("Delete file", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.fs.deleteEvent + tc.slowTime.taskCount.verify);
        await fsApi.deleteFile(fileUri.fsPath);
        await waitForTeIdle(tc.waitTime.fs.deleteEvent);
        await verifyTaskCount(testsName, 0);
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
