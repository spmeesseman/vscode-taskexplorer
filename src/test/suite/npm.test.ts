/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* tslint:disable */

import * as assert from "assert";
import * as fs from "fs";
import TaskItem from "../../tree/item";
import { getPackageManager } from "../../common/utils";
import {
    activate, executeTeCommand, getTreeTasks, getWsPath, isReady, overrideNextShowInputBox, sleep, verifyTaskCount
} from "../helper";


let packageJsonPath: string;
let npmTaskItems: TaskItem[];


suite("NPM Tests", () =>
{

    suiteSetup(async function()
    {
        await activate(this);
        assert(isReady() === true, "TeApi not ready");
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
        await sleep(1500);
        //
        // Verify npm tasks
        //
        await verifyTaskCount("npm", 5);
        //
        // Get the explorer tree task items (one less task than above since Explorer does
        // not display the 'install' task in the tree with the other tasks found)
        //
        npmTaskItems = await getTreeTasks("npm", 4);
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


    test("Get package manager", function()
    {
        getPackageManager();
    });


    test("Document Position", async () =>
    {
        for (const taskItem of npmTaskItems) {
            await executeTeCommand("open", 500, taskItem);
        }
    });


    test("Install", async function()
    {
        await executeTeCommand("runInstall", 8500, npmTaskItems[0].taskFile);
    });


    test("Update", async function()
    {
        await executeTeCommand("runUpdate", 7500, npmTaskItems[0].taskFile);
    });


    test("Update specified package", async function()
    {
        overrideNextShowInputBox("@spmeesseman/app-publisher");
        await executeTeCommand("runUpdatePackage", 7500, npmTaskItems[0].taskFile);
    });


    test("Audit", async function()
    {
        await executeTeCommand("runAudit", 7500, npmTaskItems[0].taskFile);
    });


    test("Audit Fix", async function()
    {
        await executeTeCommand("runAuditFix", 7500, npmTaskItems[0].taskFile);
    });

});
