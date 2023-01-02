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
import { configuration } from "../../lib/utils/configuration";
import { activate, executeSettingsUpdate, executeTeCommand, getWsPath, isReady, testsControl, verifyTaskCount } from "../helper";
import { ExplorerApi, TaskExplorerApi } from "@spmeesseman/vscode-taskexplorer-types";
import { MavenTaskProvider } from "../../providers/maven";


const testsName = "maven";

let teApi: TaskExplorerApi;
let explorer: ExplorerApi;
let pathToProgram: string;
let rootPath: string;
let fileUri: Uri;


suite("Maven Tests", () =>
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
        fileUri = Uri.file(path.join(rootPath, "pom.xml"));
        //
        // Store / set initial settings
        //
        pathToProgram = configuration.get<string>(`pathToPrograms.${testsName}`);
        await executeSettingsUpdate(`pathToPrograms.${testsName}`, "java\\maven\\mvn.exe");
    });


    suiteTeardown(async function()
    {   //
        // Reset settings
        //
        await executeSettingsUpdate(`pathToPrograms.${testsName}`, pathToProgram);
    });


	test("Focus Task Explorer View for Tree Population", async function()
	{
        if (!explorer.isVisible()) {
            this.slow(1000);
		    await executeTeCommand("focus", testsControl.slowTimeForFocusCommand, 3000);
        }
	});


    test("Create file", async function()
    {
        this.slow(testsControl.slowTimeForFsCreateEvent);
        fs.writeFileSync(
            fileUri.fsPath,
            "<project xmlns=\"http://maven.apache.org/POM/4.0.0\">\n" +
            "    <modelVersion>4.0.0</modelVersion>\n" +
            "</project>\n"
        );
        await teApi.waitForIdle(testsControl.waitTimeForFsCreateEvent, 3000);
    });


    test("Enable (Off by Default)", async function()
    {
        this.slow(testsControl.slowTimeForConfigEnableEvent);
        await executeSettingsUpdate(`enabledTasks.${testsName}`, true);
    });


    test("Start", async function()
    {
        await verifyTaskCount(testsName, 8);
    });


    test("Document Position", async function()
    {
        const provider = teApi.providers.get(testsName) as MavenTaskProvider;
        // provider.readTasks();
        provider.getDocumentPosition(undefined, undefined);
        provider.getDocumentPosition("test", undefined);
        provider.getDocumentPosition(undefined, "test");
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
        await verifyTaskCount(testsName, 8);
    });


    test("Invalid XML", async function()
    {
        this.slow(testsControl.slowTimeForFsCreateEvent);
        fs.writeFileSync(
            fileUri.fsPath,
            "<project xmlns=\"http://maven.apache.org/POM/4.0.0\">\n" +
            "    <modelVersion>4.0.0</modelVersion>\n" +
            "</project\n"
        );
        await teApi.waitForIdle(testsControl.waitTimeForFsModifyEvent, 3000);
        await verifyTaskCount(testsName, 0);
    });


    test("Fix Invalid XML", async function()
    {
        this.slow(testsControl.slowTimeForFsCreateEvent);
        fs.writeFileSync(
            fileUri.fsPath,
            "<project xmlns=\"http://maven.apache.org/POM/4.0.0\">\n" +
            "    <modelVersion>4.0.0</modelVersion>\n" +
            "</project>\n"
        );
        await teApi.waitForIdle(testsControl.waitTimeForFsModifyEvent, 3000);
        await verifyTaskCount(testsName, 8);
    });


    test("Delete file", async function()
    {
        this.slow(testsControl.slowTimeForFsDeleteEvent);
        fs.unlinkSync(fileUri.fsPath);
        await teApi.waitForIdle(testsControl.waitTimeForFsDeleteEvent);
        await verifyTaskCount(testsName, 0);
    });


    test("Disable (Default is OFF)", async function()
    {
        this.slow(testsControl.slowTimeForConfigEnableEvent);
        await executeSettingsUpdate(`enabledTasks.${testsName}`, false);
        await verifyTaskCount(testsName, 0);
    });

});
