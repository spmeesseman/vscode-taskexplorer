/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* tslint:disable */

import * as utils from "../utils/utils";
import TaskItem from "../../tree/item";
import { getPackageManager } from "../../lib/utils/utils";
import { TaskExecution } from "vscode";
import { IFilesystemApi, ITaskExplorerApi } from "@spmeesseman/vscode-taskexplorer-types";

const testsName = "npm";
const startTaskCount = 0;

let teApi: ITaskExplorerApi;
let fsApi: IFilesystemApi;
let packageJsonPath: string;
let npmTaskItems: TaskItem[];
let successCount = -1;


suite("NPM Tests", () =>
{

    let testControl: any;

    suiteSetup(async function()
    {
        teApi = await utils.activate(this);
        fsApi = teApi.testsApi.fs;
        testControl = utils.testControl;
        ++successCount;
    });


    suiteTeardown(async function()
    {
        const packageLockJsonPath = packageJsonPath.replace(".", "-lock.");
        await fsApi.deleteFile(packageJsonPath);
        if (await fsApi.pathExists(packageLockJsonPath)) {
            try {
                await fsApi.deleteFile(packageLockJsonPath);
            }
            catch (error) {
                console.log(error);
            }
        }
        await teApi.waitForIdle(testControl.waitTime.fsDeleteEvent);
        utils.suiteFinished(this);
    });


	test("Activate Tree (Focus Explorer View)", async function()
	{
        if (utils.exitRollingCount(0, successCount)) return;;
        await utils.focusExplorerView(this);
        ++successCount;
	});


    test("Create Package File (package.json)", async function()
    {
        if (utils.exitRollingCount(1, successCount)) return;;
        this.slow(testControl.slowTime.fsCreateEvent + (testControl.waitTime.fsCreateEvent * 2));
        // tagLog("NPM", "Create Package File (1: package.json)");
        //
        // Create NPM package.json
        //
        packageJsonPath = utils.getWsPath("package.json");
        await fsApi.writeFile(
            packageJsonPath,
            "{\r\n" +
            '    "name": "vscode-taskexplorer",\r\n' +
            '    "version": "0.0.1",\r\n' +
            '    "scripts":{\r\n' +
            '        "test": "node ./node_modules/vscode/bin/test",\r\n' +
            '        "compile": "cmd.exe /c test.bat",\r\n' +
            '        "watch": "tsc -watch -p ./",\r\n' +
            '        "build": "npx tsc -p ./"\r\n' +
            "    }\r\n" +
            "}\r\n"
        );
        // tagLog("NPM", "Create Package File (2: package.json)");
        await teApi.waitForIdle(testControl.waitTime.fsCreateEvent * 2);
        // tagLog("NPM", "Create Package File (3: package.json)");
        ++successCount;
    });


    test("Verify NPM Task Count", async function()
    {   // npm task provider is slower than shit on a turtle
        if (utils.exitRollingCount(2, successCount)) return;;
        this.slow(testControl.slowTime.utils.verifyTaskCountNpm + testControl.waitTime.min);
        await utils.verifyTaskCount(testsName, startTaskCount + 5, 2);
        await teApi.waitForIdle(testControl.waitTime.min);
        ++successCount;
    });


    test("Get NPM Task Items", async function()
    {   // npm task provider is slower than shit on a turtle
        if (utils.exitRollingCount(3, successCount)) return;;
        this.slow(testControl.slowTime.getTreeTasksNpm);
        // tagLog("NPM", "Get NPM Task Items [Start]");
        //
        // Get the explorer tree task items (three less task than above, one of them tree
        // does not display the 'install' task with the other tasks found, and two of them
        // are the 'build' and 'watch' tasks are registered in tasks.json and will show in
        // the tree under the VSCode tasks node, not the npm node)
        //
        // tagLog("NPM", "Get NPM Task Items [DoWorkSon]");
        npmTaskItems = await utils.treeUtils.getTreeTasks(testsName, 2) as TaskItem[];
        // tagLog("NPM", "Get NPM Task Items [Complete]");
        ++successCount;
    });



    test("Get Package Manager", function()
    {
        if (utils.exitRollingCount(4, successCount)) return;;
        this.slow(testControl.slowTime.configEventFast);
        getPackageManager();
        ++successCount;
    });


    test("Document Position", async function()
    {
        if (utils.exitRollingCount(5, successCount)) return;;
        this.slow((testControl.slowTime.findDocumentPositionCommand * npmTaskItems.length) + testControl.waitTime.commandFast);
        for (const taskItem of npmTaskItems) {
            await utils.executeTeCommand2("open", [ taskItem ], testControl.waitTime.commandFast);
        }
        ++successCount;
    });


    test("Install", async function()
    {
        if (utils.exitRollingCount(6, successCount)) return;;
        this.slow(testControl.slowTime.npmInstallCommand + testControl.waitTime.npmCommandMin);
        const exec = await utils.executeTeCommand2(
            "runInstall", [ npmTaskItems[0].taskFile ], testControl.waitTime.npmCommandMin, testControl.waitTime.npmCommandMin
        ) as TaskExecution | undefined;
        await utils.waitForTaskExecution(exec);
        ++successCount;
    });


    test("Update", async function()
    {
        if (utils.exitRollingCount(7, successCount)) return;;
        this.slow(testControl.slowTime.npmCommand + testControl.waitTime.npmCommandMin);
        const exec = await utils.executeTeCommand2(
            "runUpdate", [ npmTaskItems[0].taskFile ], testControl.waitTime.npmCommandMin, testControl.waitTime.npmCommandMin
        ) as TaskExecution | undefined;
        await utils.waitForTaskExecution(exec);
        ++successCount;
    });


    test("Update Specified Package", async function()
    {
        if (utils.exitRollingCount(8, successCount)) return;;
        this.slow(testControl.slowTime.npmCommandPkg + testControl.waitTime.npmCommandMin);
        utils.overrideNextShowInputBox("@spmeesseman/app-publisher");
        const exec = await utils.executeTeCommand2(
            "runUpdatePackage", [ npmTaskItems[0].taskFile ], testControl.waitTime.npmCommandMin, testControl.waitTime.npmCommandMin
        ) as TaskExecution | undefined;
        await utils.waitForTaskExecution(exec);
        ++successCount;
    });


    test("Audit", async function()
    {
        if (utils.exitRollingCount(9, successCount)) return;;
        this.slow(testControl.slowTime.npmCommand + testControl.waitTime.npmCommandMin);
        const exec = await utils.executeTeCommand2(
            "runAudit", [ npmTaskItems[0].taskFile ], testControl.waitTime.npmCommandMin, testControl.waitTime.npmCommandMin
        ) as TaskExecution | undefined;
        await utils.waitForTaskExecution(exec);
        ++successCount;
    });


    test("Audit Fix", async function()
    {
        if (utils.exitRollingCount(10, successCount)) return;;
        this.slow(testControl.slowTime.npmCommand + testControl.waitTime.npmCommandMin);
        const exec = await utils.executeTeCommand2(
            "runAuditFix", [ npmTaskItems[0].taskFile ], testControl.waitTime.npmCommandMin, testControl.waitTime.npmCommandMin
        ) as TaskExecution | undefined;
        await utils.waitForTaskExecution(exec);
        ++successCount;
    });

});
