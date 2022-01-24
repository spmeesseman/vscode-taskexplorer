/* eslint-disable prefer-arrow/prefer-arrow-functions */
import * as cp from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as assert from "assert";
import TaskItem from "../tree/item";
import { ConfigurationTarget, extensions, TreeItem, window, workspace, WorkspaceFolder } from "vscode";
import { TaskExplorerApi, deactivate } from "../extension";
import { configuration } from "../common/configuration";
import { waitForCache } from "../cache";


const writeToConsole = false;

let treeItems: TreeItem[];
let activated = false;
let teApi: TaskExplorerApi;


export function findIdInTaskMap(id: string, taskMap: Map<string, TaskItem>)
{
    let found = 0;
    for (const [ k, task ] of taskMap)
    {
        if (task.id?.includes(id) && !task.isUser) {
            if (task.id === ":ant") {
                console.error("ant: " + task.resourceUri?.fsPath);
            }
            found++;
        }
    }
    return found;
}


export function spawn(command: string, args?: string[], options?: cp.SpawnOptions): cp.ChildProcess
{
    let proc: cp.ChildProcess;
    if (options) {
        proc = cp.spawn(command, args || [], options);
    }
    else {
        proc = cp.spawn(command, args || []);
    }

    // let fullCommand = "command: " + command;

    // if (args) {
    //   fullCommand += ' "' + args.join('" "') + '"';
    // }
    // console.log(fullCommand);

    // proc.stdout.on("data", function(data) {
    //   console.log("stdout: " + data.toString());
    // });

    // proc.stderr.on("data", function(data) {
    //   console.log("stderr: " + data.toString());
    // });

    // proc.on("exit", function(code) {
    //   console.log("child process exited with code " + code.toString());
    // });

    return proc;
}

/*
export async function waitForActiveExtension(extension: Extension<any>)
{
    return new Promise((resolve,reject) => setTimeout(() =>
    {
        if (!extension || !extension.isActive) {
            return waitForActiveExtension();
        }
        else {
            resolve();
        }
    }, 500));
}
*/

/**
 * Activates the spmeesseman.vscode-taskexplorer extension
 */
export async function activate(instance?: any)
{
    const ext = extensions.getExtension("spmeesseman.vscode-taskexplorer")!;
    assert(ext, "Could not find extension");
    if (instance) instance.timeout(60 * 1000);

    if (!activated)
    {   //
        // Create .vscode directory if it doesn't exist
        //
        const dirNameCode = getWsPath(".vscode"),
			  settingsFile = path.join(dirNameCode, "settings.json");
        if (!fs.existsSync(dirNameCode)) {
            fs.mkdirSync(dirNameCode, { mode: 0o777 });
        }
        if (!fs.existsSync(settingsFile)) {
            fs.writeFileSync(settingsFile, "{}");
        }
        //
        // Init settings
        // Note that the '*' is removed from package.json[activationEvents] before the runTest() call
        //
        initSettings(true);
        //
        // Activate extension
        //
        teApi = await ext.activate();
        activated = true;
        //
        // For debugging
        //
        teApi.logging.setWriteToConsole(writeToConsole);
    }
    return teApi;
}


export async function cleanup()
{
    const dirNameCode = getWsPath(".vscode"),
          settingsFile = path.join(dirNameCode, "settings.json"),
          tasksFile = path.join(dirNameCode, "tasks.json");

    deactivate();

    if (fs.existsSync(settingsFile)) {
        try {
            fs.unlinkSync(settingsFile);
        } catch {}
    }
    if (fs.existsSync(tasksFile)) {
        try {
            fs.unlinkSync(tasksFile);
        } catch {}
    }
    if (fs.existsSync(dirNameCode)) {
        try {
            fs.rmdirSync(dirNameCode, {
                recursive: true
            });
        } catch {}
    }
}


export async function buildTree(instance: any, waitTime?: number)
{
    if (!teApi || !teApi.explorerProvider) {
        assert.fail("   ✘ Not initialized");
    }

    if (treeItems) {
        return treeItems;
    }

    instance.timeout(60 * 1000);

    if (!teApi || !teApi.explorerProvider) {
        assert.fail("   ✘ Task Explorer tree instance does not exist");
    }

    await sleep(waitTime || 1);
    await waitForCache();

    await configuration.updateWs("groupWithSeparator", true);
    await configuration.updateWs("groupSeparator", "-");
    await configuration.updateWs("groupMaxLevel", 5);

    await teApi.explorerProvider.refresh("tests");
    await sleep(4000);
    await waitForCache();

    //
    // Mock explorer open view which would call this function
    //
    treeItems = await teApi.explorerProvider.getChildren(undefined, "        ");

    await teApi.explorerProvider.refresh();
    await sleep(4000);
    await waitForCache();

    return treeItems;
}


export const getWsPath = (p: string) =>
{
	return path.normalize(path.resolve(__dirname, "../../test-files", p));
};


const overridesShowInputBox: any[] = [];


export function overrideNextShowInputBox(value: any)
{
    overridesShowInputBox.push(value);
}


export async function initSettings(enable = true)
{
    await workspace.getConfiguration().update("terminal.integrated.shell.windows",
                                              "C:\\Windows\\System32\\cmd.exe",
                                              ConfigurationTarget.Workspace);
    await configuration.updateWs("exclude", ["**/tasks_test_ignore_/**", "**/ant/**"]);
    //
    // Enable views, use workspace level so that running this test from Code itself
    // in development doesn't trigger the TaskExplorer instance installed in the dev IDE
    //
    await configuration.updateWs("enableExplorerView", true);
    await configuration.updateWs("enableSideBar", true);
    //
    // Set misc settings, use workspace level so that running this test from Code itself
    // in development doesn't trigger the TaskExplorer instance installed in the dev IDE
    //
    await configuration.updateWs("includeAnt", ["**/test.xml", "**/emptytarget.xml", "**/emptyproject.xml", "**/hello.xml"]);
    // Use update() here for coverage, since these two settings wont trigger any processing
    await configuration.update("debug", true);
    await configuration.update("debugLevel", 3);
    await configuration.updateWs("debug", true);
    await configuration.updateWs("debugLevel", 3);
    await configuration.updateWs("autoRefresh", enable);
    await configuration.updateWs("useGulp", false);
    await configuration.updateWs("useAnt", false);
    await configuration.updateWs("groupSeparator", "-");
    await configuration.updateWs("numLastTasks", 10);
    await configuration.updateWs("groupMaxLevel", 1);
    await configuration.updateWs("clickAction", "Open");
    //
    // Enabled all options, use workspace level so that running this test from Code itself
    // in development doesnt trigger the TaskExplorer instance installed in the dev IDE
    //
    await configuration.updateWs("enableAnt", enable);
    await configuration.updateWs("enableAppPublisher", enable);
    await configuration.updateWs("enableBash", enable);
    await configuration.updateWs("enableBatch", enable);
    await configuration.updateWs("enableGradle", enable);
    await configuration.updateWs("enableGrunt", enable);
    await configuration.updateWs("enableGulp", enable);
    await configuration.updateWs("enableMake", enable);
    await configuration.updateWs("enableMaven", enable);
    await configuration.updateWs("enableNpm", enable);
    await configuration.updateWs("enableNsis", enable);
    await configuration.updateWs("enablePowershell", enable);
    await configuration.updateWs("enablePerl", enable);
    await configuration.updateWs("enablePython", enable);
    await configuration.updateWs("enablePipenv", enable);
    await configuration.updateWs("enableRuby", enable);
    await configuration.updateWs("enableTsc", enable);
    await configuration.updateWs("enableWorkspace", enable);
    await configuration.updateWs("groupWithSeparator", enable);
    await configuration.updateWs("groupSeparator", "-");
    await configuration.updateWs("showLastTasks", enable);
    await configuration.updateWs("keepTermOnStop", false);
    await configuration.updateWs("readUserTasks", enable);
    await configuration.updateWs("showFavoritesButton", enable);
    await configuration.updateWs("showRunningTask", enable);
}


export function isReady(taskType?: string)
{
    let err: string | undefined;
    if (!teApi)                                 err = "        ✘ TeApi null";
    else {
        if (!teApi.explorerProvider)            err = "        ✘ TeApi Explorer provider null";
        else if (!teApi.sidebarProvider)        err = "        ✘ TeApi Sidebar Provider null";
        else if (!teApi.taskProviders)          err = "        ✘ Providers null";
    }
    if (!err && taskType) {
        if (!teApi.taskProviders.get(taskType)) err = `        ✘ ${taskType} Provider null`;
    }
    if (!err && !(workspace.workspaceFolders ? workspace.workspaceFolders[0] : undefined)) {
                                                err = "        ✘ Workspace folder does not exist";
    }
    if (!err && !extensions.getExtension("spmeesseman.vscode-taskexplorer")) {
                                                err = "        ✘ Extension not found";
    }
    if (err) {
        console.log(err);
    }
    return !err ? true : err;
}


export async function sleep(ms: number)
{
	return new Promise(resolve => setTimeout(resolve, ms));
}


const originalShowInputBox = window.showInputBox;


window.showInputBox = (...args: any[]) =>
{
    const next = overridesShowInputBox.shift();
    if (typeof next === "undefined")
    {
        return originalShowInputBox.call(null, args as any);
    }
    return new Promise((resolve, reject) =>
    {
        resolve(next);
    });
};

