/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* tslint:disable */

import * as assert from "assert";
import * as fs from "fs";
import TaskItem from "../../tree/item";
import { getPackageManager } from "../../common/utils";
import { TaskExplorerApi } from "@spmeesseman/vscode-taskexplorer-types";
import {
    activate, executeTeCommand, getTreeTasks, getWsPath, isReady, overrideNextShowInputBox, testsControl, verifyTaskCount
} from "../helper";


const testsName = "npm";
// const waitTimeForFsModEvent = testsControl.waitTimeForFsModifyEvent;
// const waitTimeForFsDelEvent = testsControl.waitTimeForFsDeleteEvent;
const waitTimeForFsNewEvent = testsControl.waitTimeForFsCreateEvent;
// const waitTimeForConfigEvent = testsControl.waitTimeForConfigEvent;

let teApi: TaskExplorerApi;
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


    test("Create Package File (package.json)", async function()
    {
        this.slow(500);
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
        await teApi.waitForIdle(waitTimeForFsNewEvent);
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
        npmTaskItems = await getTreeTasks(testsName, 2);
    });



    test("Get Package Manager", function()
    {
        getPackageManager();
    });


    test("Document Position", async function()
    {
        for (const taskItem of npmTaskItems) {
            await executeTeCommand("open", 25, 500, taskItem);
        }
    });


    test("Install", async function()
    {
        await executeTeCommand("runInstall", 4000, 8500, npmTaskItems[0].taskFile);
    });


    test("Update", async function()
    {
        await executeTeCommand("runUpdate", 3500, 7500, npmTaskItems[0].taskFile);
    });


    test("Update Specified Package", async function()
    {
        overrideNextShowInputBox("@spmeesseman/app-publisher");
        await executeTeCommand("runUpdatePackage", 3500, 7500, npmTaskItems[0].taskFile);
    });


    test("Audit", async function()
    {
        await executeTeCommand("runAudit", 3500, 7500, npmTaskItems[0].taskFile);
    });


    test("Audit Fix", async function()
    {
        await executeTeCommand("runAuditFix", 3500, 7500, npmTaskItems[0].taskFile);
    });

});
