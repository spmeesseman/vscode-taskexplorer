/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* tslint:disable */

import * as path from "path";
import { Uri } from "vscode";
import { TeWrapper } from "../../lib/wrapper";
import { startupFocus } from "../utils/suiteUtils";
import { MavenTaskProvider } from "../../providers/maven";
import { deleteFile, writeFile } from "../../lib/utils/fs";
import { ITaskExplorerApi } from "@spmeesseman/vscode-taskexplorer-types";
import { executeSettingsUpdate, executeTeCommand } from "../utils/commandUtils";
import {
    activate, endRollingCount, exitRollingCount,  getWsPath, suiteFinished, testControl as tc,
    testInvDocPositions, verifyTaskCount, waitForTeIdle
} from "../utils/utils";

const testsName = "maven";
const startTaskCount = 8;

let teWrapper: TeWrapper;
let teApi: ITaskExplorerApi;
let pathToProgram: string;
let rootPath: string;
let fileUri: Uri;


suite("Maven Tests", () =>
{

    suiteSetup(async function()
    {
        if (exitRollingCount(this, true)) return;
        //
        // Initialize
        //
        ({ teApi } = await activate(this));
        rootPath = getWsPath(".");
        fileUri = Uri.file(path.join(rootPath, "pom.xml"));
        //
        // Store / set initial settings
        //
        pathToProgram = teWrapper.configuration.get<string>(`pathToPrograms.${testsName}`);
        await executeSettingsUpdate(`pathToPrograms.${testsName}`, "java\\maven\\mvn.exe");
        endRollingCount(this, true);
    });


    suiteTeardown(async function()
    {
        if (exitRollingCount(this, false, true)) return;
        await executeSettingsUpdate(`pathToPrograms.${testsName}`, pathToProgram);
        suiteFinished(this);
    });


	test("Focus Explorer View", async function()
	{
        await startupFocus(this);
	});


    test("Create file", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.fs.createEvent);
        await writeFile(
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
        testInvDocPositions(provider);
        provider.createTask("publish", "publish", teWrapper.wsfolder, Uri.file(getWsPath(".")), []);
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
        this.slow(tc.slowTime.fs.createEvent + tc.slowTime.commands.refresh + tc.slowTime.taskCount.verify);
        await writeFile(
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
        this.slow(tc.slowTime.fs.createEvent + tc.slowTime.commands.refresh + tc.slowTime.taskCount.verify);
        await writeFile(
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
        await deleteFile(fileUri.fsPath);
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
