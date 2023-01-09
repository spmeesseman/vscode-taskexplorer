/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* tslint:disable */

//
// Documentation on https://mochajs.org/ for help.
//
import * as assert from "assert";
import * as path from "path";
import { TaskExecution, Uri, workspace, WorkspaceFolder } from "vscode";
import { BashTaskProvider } from "../../providers/bash";
import { isObjectEmpty } from "../../lib/utils/utils";
import { IFilesystemApi, ITaskExplorerApi } from "@spmeesseman/vscode-taskexplorer-types";
import {
    activate, executeSettingsUpdate, executeTeCommand2, getWsPath, testControl, treeUtils, verifyTaskCount,
    waitForTaskExecution, logItsSupposedToHappenSoICanStopShittingMyselfOverRedErrorMsgs,
} from "../helper";

const testsName = "bash";
const startTaskCount = 1;

let teApi: ITaskExplorerApi;
let fsApi: IFilesystemApi;
let pathToTaskProgram: string;
let enableTaskType: boolean;
let wsFolder: WorkspaceFolder;
let dirName: string;
let wasVisible: boolean;
let fileUri: Uri;


suite("Bash Tests", () =>
{

    suiteSetup(async function()
    {   //
        // Initialize
        //
        teApi = await activate(this);
        fsApi = teApi.testsApi.fs;
        wsFolder = (workspace.workspaceFolders as WorkspaceFolder[])[0];
        dirName = getWsPath("tasks_test_");
        fileUri = Uri.file(path.join(dirName, "test_provider.sh"));
        //
        // Store / set initial settings
        //
        pathToTaskProgram = teApi.config.get<string>("pathToPrograms." + testsName);
        enableTaskType = teApi.config.get<boolean>("enabledTasks." + testsName);
        await executeSettingsUpdate("pathToPrograms." + testsName, testsName + "/" + testsName + ".exe");
        await executeSettingsUpdate("enabledTasks." + testsName, true, testControl.waitTime.configEnableEvent);
    });


    suiteTeardown(async function()
    {   //
        // Reset settings
        //
        await executeSettingsUpdate("pathToPrograms." + testsName, pathToTaskProgram);
        await executeSettingsUpdate("enabledTasks." + testsName, enableTaskType, testControl.waitTime.configEnableEvent);
        await fsApi.deleteDir(dirName);
    });


    test("Build Tree (View Collapsed)", async function()
    {
        wasVisible = teApi.testsApi.explorer.isVisible();
        await treeUtils.buildTree(this);
    });


    test("Document Position", async function()
    {
        const provider = teApi.providers.get(testsName) as BashTaskProvider;
        assert(provider.getDocumentPosition() === 0, "Script type should return position 0");
    });


    test("Invalid ScriptProvider Type", async function()
    {
        const provider = teApi.providers.get(testsName) as BashTaskProvider;
        assert(!provider.createTask("no_ext", undefined, wsFolder, Uri.file(getWsPath("hello.sh"))),
               "ScriptProvider type should return position 1");
        logItsSupposedToHappenSoICanStopShittingMyselfOverRedErrorMsgs(true);
    });


    test("Start", async function()
    {
        this.slow(testControl.slowTime.verifyTaskCount);
        await verifyTaskCount(testsName, startTaskCount);
    });


    test("Disable", async function()
    {
        this.slow(testControl.slowTime.configEnableEvent + testControl.slowTime.verifyTaskCount);
        await executeSettingsUpdate("enabledTasks." + testsName, false, testControl.waitTime.configEnableEvent);
        await verifyTaskCount(testsName, 0);
    });


    test("Re-enable", async function()
    {
        this.slow(testControl.slowTime.configEnableEvent + testControl.slowTime.verifyTaskCount);
        await executeSettingsUpdate("enabledTasks." + testsName, true, testControl.waitTime.configEnableEvent);
        await verifyTaskCount(testsName, startTaskCount);
    });


    test("Create File", async function()
    {
        this.slow(testControl.slowTime.fsCreateFolderEvent + testControl.slowTime.verifyTaskCount);
        await fsApi.createDir(dirName);
        await fsApi.writeFile(fileUri.fsPath, "echo test 123\n\n");
        await teApi.waitForIdle(testControl.waitTime.fsCreateEvent);
        await verifyTaskCount(testsName, startTaskCount + 1);
    });


    test("Delete File", async function()
    {
        this.slow(testControl.slowTime.fsDeleteEvent + testControl.slowTime.verifyTaskCount);
        await fsApi.deleteFile(fileUri.fsPath);
        await teApi.waitForIdle(testControl.waitTime.fsDeleteEvent);
        await verifyTaskCount(testsName, startTaskCount);
        await fsApi.deleteDir(dirName);
        await teApi.waitForIdle(testControl.waitTime.fsDeleteEvent);
    });


    test("Re-create File", async function()
    {
        this.slow(testControl.slowTime.fsCreateEvent + testControl.slowTime.verifyTaskCount);
        await fsApi.createDir(dirName);
        await fsApi.writeFile(fileUri.fsPath, "echo test 123\n\n");
        await teApi.waitForIdle(testControl.waitTime.fsCreateEvent);
        await verifyTaskCount(testsName, startTaskCount + 1);
    });


    test("Delete Folder", async function()
    {
        this.slow(testControl.slowTime.fsDeleteFolderEvent + testControl.slowTime.verifyTaskCount);
        await fsApi.deleteDir(dirName);
        await teApi.waitForIdle(testControl.waitTime.fsDeleteEvent);
        await verifyTaskCount(testsName, startTaskCount);
    });


	// test("Focus Task Explorer View for Tree Population", async function()
	// {
	//     await focusExplorer(this);
	// });


    //
    // To run this we'd need to focus the tree and I don't want to yet until the infoPage test suite
    //
    test("Run Shell Script", async function()
    {   //
        // There is only 1 bash file "task" - it sleeps for 3 seconds, 1 second at a time
        //
        const taskMap = teApi.testsApi.explorer.getTaskMap();
        if (isObjectEmpty(taskMap) || !wasVisible) {
            this.slow(testControl.slowTime.getTreeTasks + testControl.slowTime.bashScript + testControl.slowTime.refreshCommand + testControl.slowTime.walkTaskTree);
        }
        else {
            this.slow(testControl.slowTime.getTreeTasks + testControl.slowTime.bashScript);
        }
        const bash = await treeUtils.getTreeTasks("bash", startTaskCount);
        const exec = await executeTeCommand2("run", [ bash[0] ], testControl.waitTime.runCommandMax) as TaskExecution | undefined;
        await waitForTaskExecution(exec);
    });

});
