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
import { activate, findIdInTaskMap, isReady, overrideNextShowInputBox, sleep } from "../helper";


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
        taskMap = await teApi.explorerProvider?.getTaskItems(undefined, "   ") as Map<string, TaskItem>;
    });


    test("Bash / Batch", async function()
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
                console.log("    Run batch task: " + value.label);
                console.log("        Folder: " + value.getFolder()?.name);
                await runTask(value, ranBatch > 0, lastTask);
                ranBatch++;
            }
            else if (value && value.taskSource === "bash")
            {
                console.log("    Run bash task: " + value.label);
                console.log("        Folder: " + value.getFolder()?.name);
                await runTask(value, false, lastTask);
                ranBash++;
            }
            if (ranBash && ranBatch >= 2) break;
            lastTask = value;
        }

        assert(ranBash >= 1 && ranBatch >= 2, "# of tasks expected did not run");
        //
        // Wait for any missed running tasks (5 seconds worth of timeouts in test scripts)
        //
        await sleep(5000);
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

        taskMap = await teApi.explorerProvider?.getTaskItems(undefined, "   ") as Map<string, TaskItem>;

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
                await executeTeCommand("runInstall", 500, value.taskFile);
                await executeTeCommand("runUpdate", 500, value.taskFile);
                overrideNextShowInputBox("@spmeesseman/app-publisher");
                await executeTeCommand("runUpdatePackage", 500, value.taskFile);
                await executeTeCommand("runAudit", 500, value.taskFile);
                await executeTeCommand("runAuditFix", 0, value.taskFile);
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


async function executeTeCommand(command: string, timeout: number, ...args: any[])
{
    try {
        await commands.executeCommand(`taskExplorer.${command}`, ...args);
        if (timeout) { await sleep(timeout); }
    }
    catch (e) { console.log("✘ " + e.toString().substring(0, e.toString().indexOf("\n"))); }
}


async function runTask(value: TaskItem, letFinish: boolean, lastTask: TaskItem | null)
{
    await configuration.updateWs("clickAction", "Execute");

    await executeTeCommand("addRemoveFromFavorites", 0, value);
    overrideNextShowInputBox("test label");
    await executeTeCommand("addRemoveCustomLabel", 0, value);

    if (lastTask) {
        await executeTeCommand("openTerminal", 0, lastTask);
    }

    if (value.taskSource !== "bash")
    {
        await configuration.updateWs("keepTermOnStop", false);
        await executeTeCommand("open", 50, value);
        await executeTeCommand("runWithArgs", 2500, value, "--test --test2");
        if (!letFinish)
        {
            await executeTeCommand("stop", 0, value);
            await configuration.updateWs("keepTermOnStop", true);
            await executeTeCommand("run", 2500, value);
            await executeTeCommand("run", 0, value); // throw 'Busy, please wait...'
            await executeTeCommand("pause", 1000, value);
            await executeTeCommand("run", 500, value);
            await configuration.updateWs("clickAction", "Open");
            await executeTeCommand("run", 500, value);
            await configuration.updateWs("clickAction", "Execute");
            await executeTeCommand("openTerminal", 0, value);
            await executeTeCommand("pause", 1000, value);
            await executeTeCommand("stop", 0, value);
            await executeTeCommand("runLastTask", 1500, value);
            await executeTeCommand("runLastTask", 0, value); // throw 'Busy, please wait...'
            await configuration.updateWs("keepTermOnStop", false);
            await executeTeCommand("restart", 2500, value);
            await executeTeCommand("stop", 500, value);
            await executeTeCommand("runNoTerm", 2500, value);
            await executeTeCommand("stop", 0, value);
        }
        else {
            await sleep(9000);
        }
    }
    else
    {
        await executeTeCommand("run", 2000, value);
        if (!letFinish)
        {
            await executeTeCommand("stop", 0, value);
            await workspace.getConfiguration().update("terminal.integrated.shell.windows",
                                                        "bash.exe", ConfigurationTarget.Workspace);
            await executeTeCommand("run", 2000, value);
            await executeTeCommand("stop", 1000, value);
            await workspace.getConfiguration().update("terminal.integrated.shell.windows",
                                                        "C:\\Windows\\System32\\cmd.exe", ConfigurationTarget.Workspace);
            await commands.executeCommand("workbench.action.terminal.new"); // force openTerminal to search through a set of terminals
            await commands.executeCommand("workbench.action.terminal.new"); // force openTerminal to search through a set of terminals
        }
        else {
            await sleep(8000);
        }
    }

    await executeTeCommand("openTerminal", 0, value);
    await executeTeCommand("addRemoveCustomLabel", 0, value);
    await executeTeCommand("addRemoveFromFavorites", 0, value);
}
