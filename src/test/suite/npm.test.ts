/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* tslint:disable */

import TaskItem from "../../tree/item";
import { getPackageManager } from "../../lib/utils/utils";
import { IFilesystemApi, ITaskExplorerApi } from "@spmeesseman/vscode-taskexplorer-types";
import {
    activate, executeTeCommand2, focusExplorer, treeUtils, getWsPath,
    overrideNextShowInputBox, testControl, verifyTaskCount, waitForTaskExecution
} from "../helper";
import { TaskExecution } from "vscode";

const testsName = "npm";

let teApi: ITaskExplorerApi;
let fsApi: IFilesystemApi;
let packageJsonPath: string;
let npmTaskItems: TaskItem[];


suite("NPM Tests", () =>
{

    suiteSetup(async function()
    {
        teApi = await activate(this);
        fsApi = teApi.testsApi.fs;
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
    });


	test("Focus Task Explorer View for Tree Population", async function()
	{
        await focusExplorer(this);
	});


    test("Create Package File (package.json)", async function()
    {
        this.slow(testControl.slowTime.fsCreateEvent);
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
        await teApi.waitForIdle(testControl.waitTimeForFsCreateEvent);
    });


    test("Verify NPM Task Count", async function()
    {
        await verifyTaskCount(testsName, 5);
    });


    test("Get NPM Task Items", async function()
    {   //
        // Get the explorer tree task items (three less task than above, one of them tree
        // does not display the 'install' task with the other tasks found, and two of them
        // are the 'build' and 'watch' tasks are registered in tasks.json and will show in
        // the tree under the VSCode tasks node, not the npm node)
        //
        npmTaskItems = await treeUtils.getTreeTasks(testsName, 2);
    });



    test("Get Package Manager", function()
    {
        getPackageManager();
    });


    test("Document Position", async function()
    {
        this.slow(testControl.slowTime.commandFast * npmTaskItems.length);
        for (const taskItem of npmTaskItems) {
            await executeTeCommand2("open", [ taskItem ], testControl.waitTimeForCommandFast);
        }
    });


    test("Install", async function()
    {
        this.slow(testControl.slowTime.npmCommand);
        const exec = await executeTeCommand2("runInstall", [ npmTaskItems[0].taskFile ], testControl.waitTimeForNpmCommandMin, testControl.waitTimeForNpmCommandMax) as TaskExecution | undefined;
        await waitForTaskExecution(exec);
    });


    test("Update", async function()
    {
        this.slow(testControl.slowTime.npmCommand);
        const exec = await executeTeCommand2("runUpdate", [ npmTaskItems[0].taskFile ], testControl.waitTimeForNpmCommandMin, testControl.waitTimeForNpmCommandMax) as TaskExecution | undefined;
        await waitForTaskExecution(exec);
    });


    test("Update Specified Package", async function()
    {
        this.slow(testControl.slowTime.npmCommand);
        overrideNextShowInputBox("@spmeesseman/app-publisher");
        const exec = await executeTeCommand2("runUpdatePackage", [ npmTaskItems[0].taskFile ], testControl.waitTimeForNpmCommandMin, testControl.waitTimeForNpmCommandMax) as TaskExecution | undefined;
        await waitForTaskExecution(exec);
    });


    test("Audit", async function()
    {
        this.slow(testControl.slowTime.npmCommand);
        const exec = await executeTeCommand2("runAudit", [ npmTaskItems[0].taskFile ], testControl.waitTimeForNpmCommandMin, testControl.waitTimeForNpmCommandMax) as TaskExecution | undefined;
        await waitForTaskExecution(exec);
    });


    test("Audit Fix", async function()
    {
        this.slow(testControl.slowTime.npmCommand);
        const exec = await executeTeCommand2("runAuditFix", [ npmTaskItems[0].taskFile ], testControl.waitTimeForNpmCommandMin, testControl.waitTimeForNpmCommandMax) as TaskExecution | undefined;
        await waitForTaskExecution(exec);
    });

});
