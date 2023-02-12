/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* tslint:disable */

import * as utils from "../utils/utils";
import { TaskItem } from "../../tree/item";
import { TaskExecution } from "vscode";
import { startupFocus } from "../utils/suiteUtils";
import { getPackageManager } from "../../lib/utils/utils";
import { executeTeCommand2 } from "../utils/commandUtils";
import { TeWrapper } from "../../lib/wrapper";

const testsName = "npm";
let teWrapper: TeWrapper;
const tc = utils.testControl;
let startTaskCount = 0; // set in suiteSetup() as it will change depending on single or multi root ws
let packageJsonPath: string | undefined;
let npmTaskItems: TaskItem[];


suite("NPM Tests", () =>
{

    suiteSetup(async function()
    {
        if (utils.exitRollingCount(this, true)) return;
        ({ teWrapper } = await utils.activate(this));
        startTaskCount = tc.isMultiRootWorkspace ? 15 : 0;
        utils.endRollingCount(this, true);
    });


    suiteTeardown(async function()
    {
        if (utils.exitRollingCount(this, false, true)) return;
        if (packageJsonPath)
        {
            const packageLockJsonPath = packageJsonPath.replace(".", "-lock.");
            await teWrapper.fs.deleteFile(packageJsonPath);
            if (await teWrapper.fs.pathExists(packageLockJsonPath)) {
                try {
                    await teWrapper.fs.deleteFile(packageLockJsonPath);
                }
                catch (error) {
                    console.log(error);
                }
            }
            await utils.waitForTeIdle(tc.waitTime.fs.deleteEvent);
        }
        utils.suiteFinished(this);
    });


    test("Focus Explorer View", async function()
	{
        await startupFocus(this);
	});


    test("Create Package File (package.json)", async function()
    {
        if (utils.exitRollingCount(this)) return;
        this.slow(tc.slowTime.fs.createEvent + (tc.waitTime.fs.createEvent * 2));
        // tagLog("NPM", "Create Package File (1: package.json)");
        //
        // Create NPM package.json
        //
        packageJsonPath = utils.getWsPath("package.json");
        await teWrapper.fs.writeFile(
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
        await utils.waitForTeIdle(tc.waitTime.fs.createEvent * 2);
        // tagLog("NPM", "Create Package File (3: package.json)");
        utils.endRollingCount(this);
    });


    test("Verify NPM Task Count", async function()
    {   // npm task provider is slower than shit on a turtle
        if (utils.exitRollingCount(this)) return;
        this.slow(tc.slowTime.taskCount.verify);
        await utils.verifyTaskCount(testsName, startTaskCount + 5, 2);
        utils.endRollingCount(this);
    });


    test("Get NPM Task Items", async function()
    {   // npm task provider is slower than shit on a turtle
        if (utils.exitRollingCount(this)) return;
        this.slow(tc.slowTime.getTreeTasksNpm);
        // tagLog("NPM", "Get NPM Task Items [Start]");
        //
        // Get the explorer tree task items (three less task than above, one of them tree
        // does not display the 'install' task with the other tasks found, and two of them
        // are the 'build' and 'watch' tasks are registered in tasks.json and will show in
        // the tree under the VSCode tasks node, not the npm node)
        //
        // tagLog("NPM", "Get NPM Task Items [DoWorkSon]"); / -1 for install task not in tree for multi-root ws
        npmTaskItems = await utils.treeUtils.getTreeTasks(teWrapper, testsName, startTaskCount - (tc.isMultiRootWorkspace ? 1 : 0) + 2);
        // tagLog("NPM", "Get NPM Task Items [Complete]");
        utils.endRollingCount(this);
    });



    test("Get Package Manager", function()
    {
        if (utils.exitRollingCount(this)) return;
        this.slow(tc.slowTime.config.eventFast);
        getPackageManager();
        utils.endRollingCount(this);
    });


    test("Document Position", async function()
    {
        if (utils.exitRollingCount(this)) return;
        this.slow(tc.slowTime.findTaskPosition + (tc.slowTime.findTaskPositionDocOpen * (npmTaskItems.length - 1)) + (tc.slowTime.commands.fast * npmTaskItems.length));
        for (const taskItem of npmTaskItems) {
            await executeTeCommand2("open", [ taskItem ], tc.waitTime.commandFast);
        }
		await utils.closeEditors();
        utils.endRollingCount(this);
    });


    test("Install", async function()
    {
        if (utils.exitRollingCount(this)) return;
        this.slow(tc.slowTime.tasks.npmInstallCommand);
        const exec = await executeTeCommand2<TaskExecution | undefined>(
            "runInstall", [ npmTaskItems[0].taskFile ], tc.waitTime.npmCommandMin, tc.waitTime.npmCommandMin
        );
        await utils.waitForTaskExecution(exec);
        utils.endRollingCount(this);
    });


    test("Update", async function()
    {
        if (utils.exitRollingCount(this)) return;
        this.slow(tc.slowTime.tasks.npmCommand);
        const exec = await executeTeCommand2<TaskExecution | undefined>(
            "runUpdate", [ npmTaskItems[0].taskFile ], tc.waitTime.npmCommandMin, tc.waitTime.npmCommandMin
        );
        await utils.waitForTaskExecution(exec);
        utils.endRollingCount(this);
    });


    test("Update Specified Package", async function()
    {
        if (utils.exitRollingCount(this)) return;
        this.slow(tc.slowTime.tasks.npmCommandPkg);
        utils.overrideNextShowInputBox("@spmeesseman/app-publisher");
        const exec = await executeTeCommand2<TaskExecution | undefined>(
            "runUpdatePackage", [ npmTaskItems[0].taskFile ], tc.waitTime.npmCommandMin, tc.waitTime.npmCommandMin
        );
        await utils.waitForTaskExecution(exec);
        utils.endRollingCount(this);
    });


    test("Audit", async function()
    {
        if (utils.exitRollingCount(this)) return;
        this.slow(tc.slowTime.tasks.npmCommand);
        const exec = await executeTeCommand2<TaskExecution | undefined>(
            "runAudit", [ npmTaskItems[0].taskFile ], tc.waitTime.npmCommandMin, tc.waitTime.npmCommandMin
        );
        await utils.waitForTaskExecution(exec);
        utils.endRollingCount(this);
    });


    test("Audit Fix", async function()
    {
        if (utils.exitRollingCount(this)) return;
        this.slow(tc.slowTime.tasks.npmCommand);
        const exec = await executeTeCommand2<TaskExecution | undefined>(
            "runAuditFix", [ npmTaskItems[0].taskFile ], tc.waitTime.npmCommandMin, tc.waitTime.npmCommandMin
        );
        await utils.waitForTaskExecution(exec);
        utils.endRollingCount(this);
    });

});
