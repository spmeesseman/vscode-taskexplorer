/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* tslint:disable */

import * as assert from "assert";
import * as fs from "fs";
import TaskItem from "../../tree/item";
import { getPackageManager } from "../../lib/utils/utils";
import { ITaskExplorerApi } from "@spmeesseman/vscode-taskexplorer-types";
import {
    activate, executeTeCommand2, focusExplorer, getTreeTasks, getWsPath, isReady,
    overrideNextShowInputBox, testsControl, verifyTaskCount, waitForTaskExecution
} from "../helper";
import { TaskExecution } from "vscode";

const testsName = "npm";

let teApi: ITaskExplorerApi;
let packageJsonPath: string;
let npmTaskItems: TaskItem[];


suite("NPM Tests", () =>
{

    suiteSetup(async function()
    {
        teApi = await activate(this);
        assert(isReady() === true, "    ✘ TeApi not ready");
    });


    suiteTeardown(async function()
    {
        const packageLockJsonPath = packageJsonPath.replace(".", "-lock.");
        fs.unlinkSync(packageJsonPath);
        if (fs.existsSync(packageLockJsonPath)) {
            try {
                fs.unlinkSync(packageLockJsonPath);
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
        this.slow(testsControl.slowTimeForFsCreateEvent);
        //
        // Create NPM package.json
        //
        packageJsonPath = getWsPath("package.json");
        fs.writeFileSync(
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
        await teApi.waitForIdle(testsControl.waitTimeForFsCreateEvent);
    });


    test("Verify NPM Task Count", async function()
    {
        await verifyTaskCount(testsName, 5);
    });


    test("Get NPM Task Items", function()
    {   //
        // Get the explorer tree task items (three less task than above, one of them tree
        // does not display the 'install' task with the other tasks found, and two of them
        // are the 'build' and 'watch' tasks are registered in tasks.json and will show in
        // the tree under the VSCode tasks node, not the npm node)
        //
        npmTaskItems = getTreeTasks(testsName, 2);
    });



    test("Get Package Manager", function()
    {
        getPackageManager();
    });


    test("Document Position", async function()
    {
        this.slow(testsControl.slowTimeForCommandFast * npmTaskItems.length);
        for (const taskItem of npmTaskItems) {
            await executeTeCommand2("open", [ taskItem ], testsControl.waitTimeForCommandFast);
        }
    });


    test("Install", async function()
    {
        this.slow(testsControl.slowTimeForNpmCommand);
        const exec = await executeTeCommand2("runInstall", [ npmTaskItems[0].taskFile ], testsControl.waitTimeForNpmCommandMin, testsControl.waitTimeForNpmCommandMax) as TaskExecution | undefined;
        await waitForTaskExecution(exec);
    });


    test("Update", async function()
    {
        this.slow(testsControl.slowTimeForNpmCommand);
        const exec = await executeTeCommand2("runUpdate", [ npmTaskItems[0].taskFile ], testsControl.waitTimeForNpmCommandMin, testsControl.waitTimeForNpmCommandMax) as TaskExecution | undefined;
        await waitForTaskExecution(exec);
    });


    test("Update Specified Package", async function()
    {
        this.slow(testsControl.slowTimeForNpmCommand);
        overrideNextShowInputBox("@spmeesseman/app-publisher");
        const exec = await executeTeCommand2("runUpdatePackage", [ npmTaskItems[0].taskFile ], testsControl.waitTimeForNpmCommandMin, testsControl.waitTimeForNpmCommandMax) as TaskExecution | undefined;
        await waitForTaskExecution(exec);
    });


    test("Audit", async function()
    {
        this.slow(testsControl.slowTimeForNpmCommand);
        const exec = await executeTeCommand2("runAudit", [ npmTaskItems[0].taskFile ], testsControl.waitTimeForNpmCommandMin, testsControl.waitTimeForNpmCommandMax) as TaskExecution | undefined;
        await waitForTaskExecution(exec);
    });


    test("Audit Fix", async function()
    {
        this.slow(testsControl.slowTimeForNpmCommand);
        const exec = await executeTeCommand2("runAuditFix", [ npmTaskItems[0].taskFile ], testsControl.waitTimeForNpmCommandMin, testsControl.waitTimeForNpmCommandMax) as TaskExecution | undefined;
        await waitForTaskExecution(exec);
    });

});
