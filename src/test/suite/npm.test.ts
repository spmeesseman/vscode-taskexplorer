/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* tslint:disable */

import TaskItem from "../../tree/item";
import { expect } from "chai";
import { getPackageManager } from "../../lib/utils/utils";
import { IFilesystemApi, ITaskExplorerApi } from "@spmeesseman/vscode-taskexplorer-types";
import {
    activate, executeTeCommand2, focusExplorer, treeUtils, getWsPath,
    overrideNextShowInputBox, testControl, verifyTaskCount, waitForTaskExecution, tagLog
} from "../helper";
import { TaskExecution } from "vscode";

const testsName = "npm";

let teApi: ITaskExplorerApi;
let fsApi: IFilesystemApi;
let packageJsonPath: string;
let npmTaskItems: TaskItem[];
let successCount = 0;


suite("NPM Tests", () =>
{

    suiteSetup(async function()
    {
        teApi = await activate(this);
        fsApi = teApi.testsApi.fs;
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
    });


	test("Focus Task Explorer View for Tree Population", async function()
	{
        expect(successCount).to.be.equal(1);
        await focusExplorer(this);
        ++successCount;
	});


    test("Create Package File (package.json)", async function()
    {
        expect(successCount).to.be.equal(2);
        this.slow(testControl.slowTime.fsCreateEvent);
        // tagLog("NPM", "Create Package File (1: package.json)");
        //
        // Create NPM package.json
        //
        packageJsonPath = getWsPath("package.json");
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
        await teApi.waitForIdle(testControl.waitTime.fsCreateEvent);
        // tagLog("NPM", "Create Package File (3: package.json)");
        ++successCount;
    });


    test("Verify NPM Task Count", async function()
    {
        expect(successCount).to.be.equal(3);
        this.slow(testControl.slowTime.verifyTaskCount * 3); // NPM getTasks just takes longer???
        await verifyTaskCount(testsName, 5);
        await teApi.waitForIdle(testControl.waitTime.min);
        ++successCount;
    });


    test("Get NPM Task Items", async function()
    {
        expect(successCount).to.be.equal(4);
        this.slow(testControl.slowTime.getTreeTasks * 3); // NPM getTasks just takes longer???
        // tagLog("NPM", "Get NPM Task Items [Start]");
        //
        // Get the explorer tree task items (three less task than above, one of them tree
        // does not display the 'install' task with the other tasks found, and two of them
        // are the 'build' and 'watch' tasks are registered in tasks.json and will show in
        // the tree under the VSCode tasks node, not the npm node)
        //
        // tagLog("NPM", "Get NPM Task Items [DoWorkSon]");
        npmTaskItems = await treeUtils.getTreeTasks(testsName, 2) as TaskItem[];
        // tagLog("NPM", "Get NPM Task Items [Complete]");
        ++successCount;
    });



    test("Get Package Manager", function()
    {
        expect(successCount).to.be.equal(5);
        this.slow(testControl.slowTime.configEventFast);
        getPackageManager();
        ++successCount;
    });


    test("Document Position", async function()
    {
        expect(successCount).to.be.equal(6);
        this.slow(testControl.slowTime.commandFast * npmTaskItems.length);
        for (const taskItem of npmTaskItems) {
            await executeTeCommand2("open", [ taskItem ], testControl.waitTime.commandFast);
        }
        ++successCount;
    });


    test("Install", async function()
    {
        expect(successCount).to.be.equal(7);
        this.slow(testControl.slowTime.npmCommand);
        const exec = await executeTeCommand2("runInstall", [ npmTaskItems[0].taskFile ], testControl.waitTime.npmCommandMin, testControl.waitTime.npmCommandMin) as TaskExecution | undefined;
        await waitForTaskExecution(exec);
        ++successCount;
    });


    test("Update", async function()
    {
        expect(successCount).to.be.equal(8);
        this.slow(testControl.slowTime.npmCommand);
        const exec = await executeTeCommand2("runUpdate", [ npmTaskItems[0].taskFile ], testControl.waitTime.npmCommandMin, testControl.waitTime.npmCommandMin) as TaskExecution | undefined;
        await waitForTaskExecution(exec);
        ++successCount;
    });


    test("Update Specified Package", async function()
    {
        expect(successCount).to.be.equal(9);
        this.slow(testControl.slowTime.npmCommand);
        overrideNextShowInputBox("@spmeesseman/app-publisher");
        const exec = await executeTeCommand2("runUpdatePackage", [ npmTaskItems[0].taskFile ], testControl.waitTime.npmCommandMin, testControl.waitTime.npmCommandMin) as TaskExecution | undefined;
        await waitForTaskExecution(exec);
        ++successCount;
    });


    test("Audit", async function()
    {
        expect(successCount).to.be.equal(10);
        this.slow(testControl.slowTime.npmCommand);
        const exec = await executeTeCommand2("runAudit", [ npmTaskItems[0].taskFile ], testControl.waitTime.npmCommandMin, testControl.waitTime.npmCommandMin) as TaskExecution | undefined;
        await waitForTaskExecution(exec);
        ++successCount;
    });


    test("Audit Fix", async function()
    {
        expect(successCount).to.be.equal(11);
        this.slow(testControl.slowTime.npmCommand);
        const exec = await executeTeCommand2("runAuditFix", [ npmTaskItems[0].taskFile ], testControl.waitTime.npmCommandMin, testControl.waitTime.npmCommandMin) as TaskExecution | undefined;
        await waitForTaskExecution(exec);
        ++successCount;
    });

});
