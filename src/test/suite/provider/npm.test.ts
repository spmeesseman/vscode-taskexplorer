
import { TaskExecution } from "vscode";
import * as utils from "../../utils/utils";
import { writeAndWait } from "../../utils/utils";
import { startupFocus } from "../../utils/suiteUtils";
import { executeTeCommand2 } from "../../utils/commandUtils";
import { ITaskItem, ITeWrapper } from ":types";

const testsName = "npm";
let teWrapper: ITeWrapper;
const tc = utils.testControl;
let startTaskCount = 0; // set in suiteSetup() as it will change depending on single or multi root ws
let packageJsonPath: string | undefined;
let npmTaskItems: ITaskItem[];


suite("NPM Tests", () =>
{

    suiteSetup(async function()
    {
        if (utils.exitRollingCount(this, true)) return;
        ({ teWrapper } = await utils.activate());
        startTaskCount = tc.isMultiRootWorkspace ? 15 : 5;
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


    // test("Create Package File (package.json)", async function()
    // {
    //     if (utils.exitRollingCount(this)) return;
    //     this.slow(tc.slowTime.fs.createEvent + tc.slowTime.tasks.count.verify);
    //     packageJsonPath = utils.getWsPath("package.json");
    //     await writeAndWait(
    //         packageJsonPath,
    //         "{\r\n" +
    //         '    "name": "vscode-taskexplorer",\r\n' +
    //         '    "version": "0.0.1",\r\n' +
    //         '    "scripts":{\r\n' +
    //         '        "test": "node ./node_modules/vscode/bin/test",\r\n' +
    //         '        "compile": "cmd.exe /c test.bat",\r\n' +
    //         '        "watch": "tsc -watch -p ./",\r\n' +
    //         '        "build": "npx tsc -p ./"\r\n' +
    //         "    }\r\n" +
    //         "}\r\n"
    //     );
    //     await utils.verifyTaskCount(testsName, startTaskCount + 5, 2);
    //     utils.endRollingCount(this);
    // });


    test("Get NPM Task Items", async function()
    {   //
        // vscode npm task provider is slower than a turtle's s***
        //
        if (utils.exitRollingCount(this)) return;
        this.slow(tc.slowTime.tasks.getTreeTasksNpm);
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


    test("Modify Package File - Scripts Object", async function()
    {
        if (utils.exitRollingCount(this)) return;
        this.slow((tc.slowTime.fs.modifyEvent * 2) + (tc.slowTime.tasks.count.verify * 2) + 50);
        await writeAndWait(
            packageJsonPath as string,
            "{\r\n" +
            '    "name": "vscode-taskexplorer",\r\n' +
            '    "version": "0.0.1",\r\n' +
            '    "scripts": {\r\n' +
            '        "build": "npx tsc -p ./"\r\n' +
            '        "say_hello": "cmd /c echo hello",\r\n' +
            '        "test": "node ./node_modules/vscode/bin/test",\r\n' +
            '        "test2": "node ./node_modules/vscode/bin/test",\r\n' +
            '        "watch": "tsc -watch -p ./",\r\n' +
            "    }\r\n" +
            "}\r\n"
        );
        await utils.verifyTaskCount(testsName, startTaskCount + 1, 2);
        await utils.sleep(25);
        await writeAndWait(
            packageJsonPath as string,
            "{\r\n" +
            '    "name": "vscode-taskexplorer",\r\n' +
            '    "version": "0.0.1",\r\n' +
            '    "scripts": {\r\n' +
            '        "build": "npx tsc -p ./"\r\n' +
            '        "say_hello": "cmd /c echo hello",\r\n' +
            '        "test": "node ./node_modules/vscode/bin/test",\r\n' +
            '        "watch": "tsc -watch -p ./",\r\n' +
            "    }\r\n" +
            "}\r\n"
        );
        await utils.verifyTaskCount(testsName, startTaskCount, 2);
        utils.endRollingCount(this);
    });


    test("Modify Package File - Outside Scripts Oject", async function()
    {
        if (utils.exitRollingCount(this)) return;
        this.slow(tc.slowTime.fs.modifyEvent + tc.slowTime.tasks.count.verify);
        await writeAndWait(
            packageJsonPath as string,
            "{\r\n" +
            '    "name": "vscode-taskexplorer",\r\n' +
            '    "version": "0.0.1",\r\n' +
            '    "author": "Scott Meesseman",\r\n' + // <- Add author
            '    "scripts": {\r\n' +
            '        "build": "npx tsc -p ./"\r\n' +
            '        "say_hello": "cmd /c echo hello",\r\n' +
            '        "test": "node ./node_modules/vscode/bin/test",\r\n' +
            '        "watch": "tsc -watch -p ./",\r\n' +
            "    }\r\n" +
            "}\r\n"
        );
        await utils.verifyTaskCount(testsName, startTaskCount, 2);
        utils.endRollingCount(this);
    });


    test("Modify Package File - Delete Scripts Oject", async function()
    {
        if (utils.exitRollingCount(this)) return;
        this.slow(tc.slowTime.fs.modifyEvent + tc.slowTime.tasks.count.verify);
        await writeAndWait(
            packageJsonPath as string,
            "{\r\n" +
            '    "name": "vscode-taskexplorer",\r\n' +
            '    "version": "0.0.1",\r\n' +
            '    "author": "Scott Meesseman",\r\n' +
            "}\r\n"
        );
        // + 1 because tasks.json still points to the build script (+ install task)
        await utils.verifyTaskCount(testsName, startTaskCount + 2, 2);
        utils.endRollingCount(this);
    });


    test("Modify Package File - Add Scripts Object", async function()
    {
        if (utils.exitRollingCount(this)) return;
        this.slow(tc.slowTime.fs.modifyEvent + tc.slowTime.tasks.count.verify);
        await writeAndWait(
            packageJsonPath as string,
            "{\r\n" +
            '    "name": "vscode-taskexplorer",\r\n' +
            '    "version": "0.0.1",\r\n' +
            '    "author": "Scott Meesseman",\r\n' +
            '    "scripts": {\r\n' +
            '        "build": "npx tsc -p ./"\r\n' +
            '        "say_hello": "cmd /c echo hello",\r\n' +
            '        "test": "node ./node_modules/vscode/bin/test",\r\n' +
            '        "watch": "tsc -watch -p ./",\r\n' +
            "    }\r\n" +
            "}\r\n"
        );
        await utils.verifyTaskCount(testsName, startTaskCount + 5, 2);
        utils.endRollingCount(this);
    });



    test("Get Package Manager", function()
    {
        if (utils.exitRollingCount(this)) return;
        this.slow(tc.slowTime.config.eventFast);
        utils.getPackageManager();
        utils.endRollingCount(this);
    });


    test("Document Position", async function()
    {
        if (utils.exitRollingCount(this)) return;
        this.slow(tc.slowTime.tasks.findPosition + (tc.slowTime.tasks.findPositionDocOpen * (npmTaskItems.length - 1)) + (tc.slowTime.commands.fast * npmTaskItems.length));
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
            "runInstall", [ npmTaskItems[0].taskFile ], tc.waitTime.npmCommandMin, tc.waitTime.npmCommandMax
        );
        await utils.waitForTaskExecution(exec);
        utils.endRollingCount(this);
    });


    test("Update", async function()
    {
        if (utils.exitRollingCount(this)) return;
        this.slow(tc.slowTime.tasks.npmCommand);
        const exec = await executeTeCommand2<TaskExecution | undefined>(
            "runUpdate", [ npmTaskItems[0].taskFile ], tc.waitTime.npmCommandMin, tc.waitTime.npmCommandMax
        );
        await utils.waitForTaskExecution(exec);
        utils.endRollingCount(this);
    });


    test("Update Specified Package", async function()
    {
        if (utils.exitRollingCount(this)) return;
        this.slow(tc.slowTime.tasks.npmCommandPkg);
        utils.overrideNextShowInputBox("@spmeesseman/app-publisher", true);
        const exec = await executeTeCommand2<TaskExecution | undefined>(
            "runUpdatePackage", [ npmTaskItems[0].taskFile ], tc.waitTime.npmCommandMin, tc.waitTime.npmCommandMax
        );
        await utils.waitForTaskExecution(exec);
        utils.endRollingCount(this);
    });


    test("Audit", async function()
    {
        if (utils.exitRollingCount(this)) return;
        this.slow(tc.slowTime.tasks.npmCommand);
        const exec = await executeTeCommand2<TaskExecution | undefined>(
            "runAudit", [ npmTaskItems[0].taskFile ], tc.waitTime.npmCommandMin, tc.waitTime.npmCommandMax
        );
        await utils.waitForTaskExecution(exec);
        utils.endRollingCount(this);
    });


    test("Audit Fix", async function()
    {
        if (utils.exitRollingCount(this)) return;
        this.slow(tc.slowTime.tasks.npmCommand);
        const exec = await executeTeCommand2<TaskExecution | undefined>(
            "runAuditFix", [ npmTaskItems[0].taskFile ], tc.waitTime.npmCommandMin, tc.waitTime.npmCommandMax
        );
        await utils.waitForTaskExecution(exec);
        utils.endRollingCount(this);
    });


    test("Run Workspace Integrated Script", async function()
    {
        if (utils.exitRollingCount(this)) return;
        this.slow(tc.slowTime.commands.run + tc.slowTime.tasks.npmCommand);
        const tasks = await utils.treeUtils.getTreeTasks(teWrapper, "Workspace", 3);
        const task = tasks.find(t => t.label === "say_hello") as ITaskItem;
        const exec = await executeTeCommand2<TaskExecution | undefined>("run", [ task ], tc.waitTime.runCommandMin) ;
        await utils.waitForTaskExecution(exec);
        utils.endRollingCount(this);
    });

});
