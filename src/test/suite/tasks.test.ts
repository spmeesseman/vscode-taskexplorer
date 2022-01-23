/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* tslint:disable */

//
// Documentation on https://mochajs.org/ for help.
//
import * as assert from "assert";
import * as fs from "fs";
import * as path from "path";
import TaskItem from "../../tree/item";
import { commands, ConfigurationTarget, tasks, workspace } from "vscode";
import { configuration } from "../../common/configuration";
import { TaskExplorerApi } from "../../extension";
import { activate, findIdInTaskMap, isReady, sleep } from "../helper";


let teApi: TaskExplorerApi;
let rootPath = workspace.workspaceFolders ? workspace.workspaceFolders[0].uri.fsPath : undefined;
let taskMap: Map<string, TaskItem> = new Map();


suite("Task Tests", () =>
{

    suiteSetup(async function()
    {
        teApi = await activate(this);
        assert(isReady() === true, "Setup failed");
        rootPath = workspace.workspaceFolders ? workspace.workspaceFolders[0].uri.fsPath : undefined;
        //
        // Scan task tree using internal explorer scanner fn
        //
        taskMap = await teApi.explorerProvider?.getTaskItems(undefined) as Map<string, TaskItem>;
    });


    test("Run, pause, open, and stop tasks", async function()
    {
        let ranBash = 0, ranBatch = 0,
            lastTask: TaskItem | null = null;

        this.timeout(75 * 1000);

        //
        // Just find and task, a batch task, and run all commands on it
        //
        for (const map of taskMap)
        {
            const value = map[1];
            if (value && value.taskSource === "batch")
            {
                console.log("Run batch task: " + value.label);
                console.log("   Folder: " + value.getFolder()?.name);
                await runTask(value, lastTask);
                ranBatch++;
            }
            else if (value && value.taskSource === "bash")
            {
                console.log("Run bash task: " + value.label);
                console.log("   Folder: " + value.getFolder()?.name);
                await runTask(value, lastTask);
                ranBash++;
            }
            if (ranBash && ranBatch >= 2) break;
            lastTask = value;
        }

        assert(ranBash >= 1 && ranBatch >= 2, "# of tasks expected did not run");
        //
        // Wait for any missed running tasks
        //
        await sleep(2500);
    });


    test("NPM", async function()
    {
        const file = path.join(rootPath as string, "package.json");
        fs.writeFileSync(
            file,
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
        const npmTasks = await tasks.fetchTasks({ type: "npm" });
        assert(npmTasks.length > 0, "No npm tasks registered");

        taskMap = await teApi.explorerProvider?.getTaskItems(undefined, "   ", true) as Map<string, TaskItem>;

        //
        // We just wont check NPM files.  If the vascode engine isnt fast enough to
        // provide the tasks once the package.json files are created, then its not
        // out fault
        //
        const taskCount = findIdInTaskMap(":npm:", taskMap);
        if (taskCount !== 4) {
            assert.fail("Unexpected NPM task count (Found " + taskCount + " of 4)");
        }

        for (const map of taskMap)
        {
            const value = map[1];
            if (value && value.taskSource === "npm")
            {
                // await executeTeCommand("open", value);
                await executeTeCommand("runInstall", value.taskFile);
                await sleep(500);
                await executeTeCommand("runUpdate", value.taskFile);
                await sleep(500);
                await executeTeCommand("runUpdatePackage", value.taskFile, "@spmeesseman/app-publisher");
                await sleep(500);
                await executeTeCommand("runAudit", value.taskFile);
                await sleep(500);
                await executeTeCommand("runAuditFix", value.taskFile);
                break;
            }
        }

        await sleep(100);

        fs.unlinkSync(path.join(rootPath as string, "package.json"));
        if (fs.existsSync(path.join(rootPath as string, "package-lock.json"))) {
            try {
                fs.unlinkSync(path.join(rootPath as string, "package-lock.json"));
            }
            catch (error) {
                console.log(error);
            }
        }
    });

});


async function executeTeCommand(command: string, ...args: any[])
{
    try {
        await commands.executeCommand(`taskExplorer.${command}`, ...args);
    }
    catch (e) { console.log("✘ " + e.toString().substring(0, e.toString().indexOf("\n"))); }
}


async function runTask(value: TaskItem, lastTask: TaskItem | null)
{
    if (value.taskSource !== "bash")
    {
        if (lastTask)
        {
            await executeTeCommand("open", value);
            await executeTeCommand("addRemoveFromFavorites", value);
            await configuration.updateWs("keepTermOnStop", true);
            await configuration.updateWs("clickAction", "Execute");
            await executeTeCommand("run", lastTask);
            await sleep(1000);
            await configuration.updateWs("clickAction", "Open");
            await executeTeCommand("pause", value);
            await sleep(1000);
            await executeTeCommand("run", value);
            await sleep(1000);
            await executeTeCommand("stop", value);
            //
            // Cover code that removes a "Last Task" if it was removed
            //
            value.taskFile.removeTreeNode(value);
            await executeTeCommand("runLastTask");
            await executeTeCommand("stop", value);
            value.taskFile.addTreeNode(value); // remove fav coverage
        }
        await configuration.updateWs("keepTermOnStop", false);
        await executeTeCommand("addRemoveFromFavorites", value);
        await executeTeCommand("renameSpecial", value, "test label");
        await executeTeCommand("renameSpecial", value);
        await executeTeCommand("open", value);
        await executeTeCommand("runWithArgs", value, "--test --test2");
        await sleep(250);
        await executeTeCommand("stop", value);
        await configuration.updateWs("keepTermOnStop", true);
        await executeTeCommand("run", value);
        await sleep(250);
        await executeTeCommand("pause", value);
        await configuration.updateWs("clickAction", "Execute");
        await executeTeCommand("run", value);
        await configuration.updateWs("clickAction", "Open");
        await sleep(250);
        await executeTeCommand("openTerminal", value);
        await executeTeCommand("pause", value);
        await sleep(250);
        await executeTeCommand("stop", value);
        await executeTeCommand("runLastTask", value);
        await sleep(250);
        await configuration.updateWs("keepTermOnStop", false);
        await executeTeCommand("restart", value);
        await sleep(250);
        await executeTeCommand("stop", value);
        await executeTeCommand("runNoTerm", value);
        await sleep(250);
        await executeTeCommand("stop", value);
        await executeTeCommand("addRemoveFromFavorites", value); // remove fav coverage
    }
    else
    {
        if (lastTask) {
            await executeTeCommand("openTerminal", lastTask);
        }
        await executeTeCommand("addRemoveFromFavorites", value);
        await executeTeCommand("run", value);
        await sleep(1000);
        await workspace.getConfiguration().update("terminal.integrated.shell.windows",
                                                    "bash.exe", ConfigurationTarget.Workspace);
        await executeTeCommand("run", value);
        await sleep(1000);
        await workspace.getConfiguration().update("terminal.integrated.shell.windows",
                                                    "C:\\Windows\\System32\\cmd.exe", ConfigurationTarget.Workspace);
        await commands.executeCommand("workbench.action.terminal.new"); // force openTerminal to search through a set of terminals
        await commands.executeCommand("workbench.action.terminal.new"); // force openTerminal to search through a set of terminals
        await executeTeCommand("addRemoveFromFavorites", value);
        await executeTeCommand("openTerminal", value);
    }
}
