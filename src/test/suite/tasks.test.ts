/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* tslint:disable */

//
// Documentation on https://mochajs.org/ for help.
//
import * as assert from "assert";
import * as fs from "fs";
import * as path from "path";
import { commands, ConfigurationTarget, tasks, workspace } from "vscode";
import { configuration } from "../../common/configuration";
import constants from "../../common/constants";
import { TaskExplorerApi } from "../../extension";
import TaskItem from "../../tree/item";
import { activate, findIdInTaskMap, sleep } from "../helper";


let teApi: TaskExplorerApi;
let rootPath = workspace.workspaceFolders ? workspace.workspaceFolders[0].uri.fsPath : undefined;
let taskMap: Map<string, TaskItem> = new Map();


suite("Task Tests", () =>
{

    suiteSetup(async () =>
    {
        teApi = await activate();
        assert(teApi, "   ✘ TeApi null");
        assert(teApi.explorerProvider, "   ✘ Task Explorer tree instance does not exist");
        rootPath = workspace.workspaceFolders ? workspace.workspaceFolders[0].uri.fsPath : undefined;
        assert(rootPath, "   ✘ Workspace folder does not exist");
        //
        // Scan task tree using internal explorer scanner fn
        //
        taskMap = await teApi.explorerProvider.getTaskItems(undefined, "      ", true) as Map<string, TaskItem>;
    });


    test("Run, pause, open, and stop tasks", async function()
    {
        let ranBash = false;
        let ranBatch = false;

        this.timeout(75 * 1000);

        //
        // Just find and task, a batch task, and run all commands on it
        //
        let lastTask: TaskItem | null = null;
        for (const map of taskMap)
        {
            const value = map[1];
            if (value && value.taskSource === "batch")
            {
                console.log("Run batch task: " + value.label);
                console.log("   Folder: " + value.getFolder()?.name);
                await runTask(value, lastTask);
                ranBatch = !!lastTask;
                lastTask = value;
                if (ranBash && ranBatch) break;
            }
            else if (value && value.taskSource === "bash")
            {
                console.log("Run bash task: " + value.label);
                console.log("   Folder: " + value.getFolder()?.name);
                await runTask(value, lastTask);
                ranBash = true;
                if (ranBash && ranBatch) break;
            }
        }

        //
        // Wait for any missed running tasks
        //
        await sleep(2500);
    });


    test("NPM Install", async function()
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

        let npmRan = false;
        for (const map of taskMap)
        {
            const value = map[1];
            if (value && value.taskSource === "npm")
            {
                // await commands.executeCommand("taskExplorer.open", value);
                await commands.executeCommand("taskExplorer.runInstall", value.taskFile);
                npmRan = true;
                break;
            }
        }
        if (!npmRan) {
            console.log("        ℹ Running npm install in local testing env");
            // TODO - how to run with local test ran in vscode dev host?
            // await commands.executeCommand("taskExplorer.runInstall", value.taskFile);
            // const npmTasks = await tasks.fetchTasks({ type: "npm" });
            // if (npmTasks)
            // {
            //     for (const npmTask of npmTasks)
            //     {
            //         console.log(npmTask.name);
            //         await commands.executeCommand("taskExplorer.open", npmTask);
            //     }
            // }
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


async function runTask(value: TaskItem, lastTask: TaskItem | null)
{
    if (value.taskSource !== "bash")
    {
        if (lastTask) {
            await commands.executeCommand("taskExplorer.open", value);
            await commands.executeCommand("taskExplorer.addRemoveFromFavorites", value);
            await configuration.updateWs("keepTermOnStop", true);
            await configuration.updateWs("clickAction", "Execute");
            await commands.executeCommand("taskExplorer.run", lastTask);
            await sleep(1000);
            await configuration.updateWs("clickAction", "Open");
            await commands.executeCommand("taskExplorer.pause", value);
            await sleep(1000);
            await commands.executeCommand("taskExplorer.run", value);
            await sleep(1000);
            await commands.executeCommand("taskExplorer.stop", value);
            //
            // Cover code that removes a "Last Task" if it was removed
            //
            value.taskFile.removeTreeNode(value);
            await commands.executeCommand("taskExplorer.runLastTask");
            await commands.executeCommand("taskExplorer.stop", value);
            value.taskFile.addTreeNode(value); // remove fav coverage
        }
        await configuration.updateWs("keepTermOnStop", false);
        await commands.executeCommand("taskExplorer.addRemoveFromFavorites", value);
        await commands.executeCommand("taskExplorer.open", value);
        await commands.executeCommand("taskExplorer.runWithArgs", value, "--test --test2");
        await sleep(250);
        await commands.executeCommand("taskExplorer.stop", value);
        await configuration.updateWs("keepTermOnStop", true);
        await commands.executeCommand("taskExplorer.run", value);
        await sleep(250);
        await commands.executeCommand("taskExplorer.pause", value);
        await configuration.updateWs("clickAction", "Execute");
        await commands.executeCommand("taskExplorer.run", value);
        await configuration.updateWs("clickAction", "Open");
        await sleep(250);
        await commands.executeCommand("taskExplorer.openTerminal", value);
        await commands.executeCommand("taskExplorer.pause", value);
        await sleep(250);
        await commands.executeCommand("taskExplorer.stop", value);
        await commands.executeCommand("taskExplorer.runLastTask", value);
        await sleep(250);
        await configuration.updateWs("keepTermOnStop", false);
        await commands.executeCommand("taskExplorer.restart", value);
        await sleep(250);
        await commands.executeCommand("taskExplorer.stop", value);
        await commands.executeCommand("taskExplorer.runNoTerm", value);
        await sleep(250);
        await commands.executeCommand("taskExplorer.stop", value);
        await commands.executeCommand("taskExplorer.addRemoveFromFavorites", value); // remove fav coverage
    }
    else
    {
        if (lastTask) {
            await commands.executeCommand("taskExplorer.openTerminal", lastTask);
        }
        await commands.executeCommand("taskExplorer.addRemoveFromFavorites", value);
        await commands.executeCommand("taskExplorer.run", value);
        await sleep(1000);
        await workspace.getConfiguration().update("terminal.integrated.shell.windows",
                                                    "bash.exe", ConfigurationTarget.Workspace);
        await commands.executeCommand("taskExplorer.run", value);
        await sleep(1000);
        await workspace.getConfiguration().update("terminal.integrated.shell.windows",
                                                    "C:\\Windows\\System32\\cmd.exe", ConfigurationTarget.Workspace);
        await commands.executeCommand("workbench.action.terminal.new"); // force openTerminal to search through a set of terminals
        await commands.executeCommand("workbench.action.terminal.new"); // force openTerminal to search through a set of terminals
        await commands.executeCommand("taskExplorer.addRemoveFromFavorites", value);
        await commands.executeCommand("taskExplorer.openTerminal", value);
    }
}