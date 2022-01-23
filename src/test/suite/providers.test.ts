/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* tslint:disable */

//
// Documentation on https://mochajs.org/ for help.
//
import * as assert from "assert";
import * as fs from "fs";
import * as path from "path";
import TaskItem from "../../tree/item";
import TaskFile from "../../tree/file";
import constants from "../../common/constants";
import { workspace, tasks, commands, Uri, ConfigurationTarget, WorkspaceFolder, WorkspaceEdit } from "vscode";
import { removeFromArray } from "../../common/utils";
import { waitForCache } from "../../cache";
import { addWsFolder, removeWsFolder, TaskExplorerApi } from "../../extension";
import { configuration } from "../../common/configuration";
import { activate, buildTree, findIdInTaskMap, sleep } from "../helper";


let teApi: TaskExplorerApi;
let rootPath = workspace.workspaceFolders ? workspace.workspaceFolders[0].uri.fsPath : undefined;
let dirName: string | undefined;
let dirNameL2: string | undefined;
let ws2DirName: string | undefined;
let dirNameIgn: string | undefined;
let dirNameCode: string | undefined;
const tempFiles: string[] = [];
let didCodeDirExist = false;
let taskMap: Map<string, TaskItem> = new Map();


suite("Provider Tests", () =>
{

    suiteSetup(async function()
    {
        teApi = await activate();

        rootPath = workspace.workspaceFolders ? workspace.workspaceFolders[0].uri.fsPath : undefined;

        if (!rootPath) {
            assert.fail("        ✘ Workspace folder does not exist");
        }

        dirName = path.join(rootPath, "tasks_test_");
        dirNameL2 = path.join(dirName, "subfolder");
        ws2DirName = path.join(rootPath, "ws2");
        dirNameIgn = path.join(rootPath, "tasks_test_ignore_");
        dirNameCode = path.join(rootPath, ".vscode");

        //
        // Add some excludes, use both config update and task explorer addExclude command
        // for full coverage.  The 'addExclude' command will add the setting globally though,
        // so add it to the workspace setting as well
        //
        await configuration.updateWs("exclude", ["**/tasks_test_ignore_/**", "**/ant/**"]);
        await commands.executeCommand("taskExplorer.addToExcludes", "**/tasks_test_ignore_/**");

        //
        // Create the temporary project dirs
        //
        if (!fs.existsSync(dirName)) {
            fs.mkdirSync(dirName, { mode: 0o777 });
        }
        if (!fs.existsSync(dirNameL2)) {
            fs.mkdirSync(dirNameL2, { mode: 0o777 });
        }
        if (!fs.existsSync(ws2DirName)) {
            fs.mkdirSync(ws2DirName, { mode: 0o777 });
        }
        if (!fs.existsSync(dirNameIgn)) {
            fs.mkdirSync(dirNameIgn, { mode: 0o777 });
        }
        if (!fs.existsSync(dirNameCode)) {
            fs.mkdirSync(dirNameCode, { mode: 0o777 });
        }
        else {
            didCodeDirExist = true;
        }

        //
        // Workspace folders
        //
        let wsDirName = path.join(rootPath, "newA");
        if (!fs.existsSync(wsDirName)) {
            fs.mkdirSync(wsDirName, { mode: 0o777 });
        }
        wsDirName = path.join(rootPath, "newB");
        if (!fs.existsSync(wsDirName)) {
            fs.mkdirSync(wsDirName, { mode: 0o777 });
        }
        wsDirName = path.join(rootPath, "newC");
        if (!fs.existsSync(wsDirName)) {
            fs.mkdirSync(wsDirName, { mode: 0o777 });
        }
        wsDirName = path.join(rootPath, "newD");
        if (!fs.existsSync(wsDirName)) {
            fs.mkdirSync(wsDirName, { mode: 0o777 });
        }

        const wsf: WorkspaceFolder[] = [
        {
            uri: Uri.parse(ws2DirName),
            name: "ws2",
            index: 1
        },
        {
            uri: Uri.parse(path.join(rootPath, "newC")),
            name: "C Test Workspace",
            index: 2
        },
        {
            uri: Uri.parse(path.join(rootPath, "newB")),
            name: "B Test Workspace",
            index: 3
        },
        {
            uri: Uri.parse(path.join(rootPath, "newA")),
            name: "A Test Workspace",
            index: 4
        },
        {
            uri: Uri.parse(path.join(rootPath, "newD")),
            name: "D Test Workspace",
            index: 5
        }];

        workspace.workspaceFolders?.concat(wsf);
        await teApi.explorerProvider?.getTaskItems(undefined, "         ", true) as Map<string, TaskItem>;

        setupVscode(); setupAnt(); setupGradle(); setupTsc(); setupMakefile();
        setupBash(); setupBatch(); setupGrunt(); setupGulp(); setupAppPublisher(); setupMaven();

        this.timeout(45000);
        await buildTree(this, 7500);

        //
        // Check VSCode provided task types for the hell of it
        //
        let nTasks = await tasks.fetchTasks({ type: "grunt" });
        assert(nTasks.length > 0, "No grunt tasks registered");
        nTasks = await tasks.fetchTasks({ type: "gulp" });
        assert(nTasks.length > 0, "No gulp tasks registered");
    });


    suiteTeardown(async () =>
    {
        if (tempFiles.length)
        {
            let file: string | undefined;
            while ((file = tempFiles.shift()))
            {
                try {
                    fs.unlinkSync(file);
                }
                catch (error) {
                    console.log(error);
                }
            }
        }

        if (dirName && ws2DirName && dirNameCode && dirNameIgn && dirNameL2)
        {
            try {
                if (!didCodeDirExist) {
                    fs.rmdirSync(dirNameCode, {
                        recursive: true
                    });
                }
                fs.rmdirSync(ws2DirName, {
                    recursive: true
                });
                fs.rmdirSync(dirNameL2, {
                    recursive: true
                });
                fs.rmdirSync(dirName, {
                    recursive: true
                });
                fs.rmdirSync(dirNameIgn, {
                    recursive: true
                });
            }
            catch (error) {
                console.log(error);
            }
        }

        rootPath = workspace.workspaceFolders ? workspace.workspaceFolders[0].uri.fsPath : undefined;

        if (!rootPath) {
            assert.fail("        ✘ Workspace folder does not exist");
        }

        //
        // Workspace folders
        //
        try {
            let wsDirName = path.join(rootPath, "newA");
            if (fs.existsSync(wsDirName)) {
                fs.rmdirSync(wsDirName);
            }
            wsDirName = path.join(rootPath, "newB");
            if (fs.existsSync(wsDirName)) {
                fs.rmdirSync(wsDirName);
            }
            wsDirName = path.join(rootPath, "newC");
            if (fs.existsSync(wsDirName)) {
                fs.rmdirSync(wsDirName);
            }
            wsDirName = path.join(rootPath, "newD");
            if (fs.existsSync(wsDirName)) {
                fs.rmdirSync(wsDirName);
            }
            wsDirName = path.join(rootPath, ".vscode");
            if (fs.existsSync(wsDirName)) {
                fs.rmdirSync(wsDirName, {
                    recursive: true
                });
            }
        }
        catch(error) {
            console.log(error);
        }

        await sleep(3000); // wait for filesystem change events
    });


    test("Open tasks for edit", async function()
    {
        if (!rootPath || !dirNameIgn || !dirName) {
            assert.fail("        ✘ Workspace folder does not exist");
        }

        if (!teApi || !teApi.explorerProvider) {
            assert.fail("        ✘ Task Explorer tree instance does not exist");
        }

        //
        // Scan task tree using internal explorer scanner fn
        //
        console.log("    Scan task tree for tasks");

        taskMap = await teApi.explorerProvider.getTaskItems(undefined, "   ", true) as Map<string, TaskItem>;

        //
        // Find all created tasks in the task tree and ensure the counts are correct.
        //
        // We added some files in the ignored directory, which would make the
        // task counts higher if these files weren't ignored
        //

        console.log("         Finding and counting tasks");

        let taskCount = findIdInTaskMap(":ant", taskMap);
        console.log("            Ant          : " + taskCount.toString());
        if (taskCount !== 7) {
            assert.fail("Unexpected Ant task count (Found " + taskCount + " of 7)");
        }

        taskCount = findIdInTaskMap(":app-publisher:", taskMap);
        console.log("            App-Publisher: " + taskCount.toString());
        if (taskCount < 6) {
            assert.fail("Unexpected App-Publisher task count (Found " + taskCount + " of 6)");
        }

        taskCount = findIdInTaskMap(":bash:", taskMap);
        console.log("            Bash         : " + taskCount.toString());
        if (taskCount !== 3) {
            assert.fail("Unexpected Bash task count (Found " + taskCount + " of 3)");
        }

        taskCount = findIdInTaskMap(":batch:", taskMap);
        console.log("            Batch        : " + taskCount.toString());
        if (taskCount !== 4) {
            assert.fail("Unexpected Batch task count (Found " + taskCount + " of 4)");
        }

        taskCount = findIdInTaskMap(":gradle:", taskMap);
        console.log("            Gradle       : " + taskCount.toString());
        if (taskCount !== 3) {
            assert.fail("Unexpected Gradle task count (Found " + taskCount + " of 3)");
        }

        taskCount = findIdInTaskMap(":grunt:", taskMap);
        console.log("            Grunt        : " + taskCount.toString());
        if (taskCount !== 13) {
            assert.fail("Unexpected Grunt task count (Found " + taskCount + " of 13)");
        }

        taskCount = findIdInTaskMap(":gulp:", taskMap);
        console.log("            Gulp         : " + taskCount.toString());
        if (taskCount !== 32) {
            assert.fail("Unexpected Gulp task count (Found " + taskCount + " of 32)");
        }

        taskCount = findIdInTaskMap(":tsc:", taskMap);
        console.log("            TSC          : " + taskCount.toString());
        if (taskCount !== 4) {
            assert.fail("Unexpected Typescript task count (Found " + taskCount + " of 4)");
        }

        taskCount = findIdInTaskMap(":Workspace:", taskMap);
        console.log("            VSCode       : " + taskCount.toString());
        if (taskCount !== 7) {
            assert.fail("Unexpected VSCode task count (Found " + taskCount + " of 7)");
        }
    });


    test("Add to excludes", async function()
    {
        let taskItems = await tasks.fetchTasks({ type: "grunt" });
        const gruntCt = taskItems.length;

        console.log("    Simulate add to exclude");
        for (const map of taskMap)
        {
            const value = map[1];
            if (value && value.taskSource === "grunt" && !value.taskFile.path.startsWith("grunt")) {
                await commands.executeCommand("taskExplorer.addToExcludes", value.taskFile);
                await teApi.explorerProvider?.invalidateTasksCache("grunt", value.taskFile.resourceUri);
                break;
            }
        }

        taskItems = await tasks.fetchTasks({ type: "grunt" });
        if (taskItems.length !== gruntCt - 2) {
            assert.fail("Unexpected Grunt task count (Found " + taskItems.length + " of " +
                        (gruntCt - 2).toString() + ")");
        }
    });


    test("Invalidation tests", async function()
    {
        if (!rootPath || !dirName) {
            assert.fail("        ✘ Workspace folder does not exist");
        }

        if (!teApi || !teApi.explorerProvider || !workspace.workspaceFolders) {
            assert.fail("        ✘ Task Explorer tree instance does not exist");
        }

        this.timeout(30 * 1000);

        //
        // App-Publisher - Delete and invalidate, re-add and invalidate
        //
        console.log("    Running app-publisher invalidation");
        let file = path.join(rootPath, ".publishrc.json");
        let uri = Uri.parse(file);
        await teApi.explorerProvider.invalidateTasksCache("app-publisher", uri);
        removeFromArray(tempFiles, file);
        try {
            fs.unlinkSync(file);
        }
        catch {}
        await teApi.explorerProvider.invalidateTasksCache("app-publisher", uri);
        await(sleep(1000));
        createAppPublisherFile();
        await teApi.explorerProvider.invalidateTasksCache("app-publisher", uri);
        await(sleep(100));

        //
        // Ant type - Delete and invalidate, re-add and invalidate
        //
        console.log("    Running ant invalidation");
        file = path.join(dirName, "build.xml");
        uri = Uri.parse(file);
        await teApi.explorerProvider.invalidateTasksCache("ant", uri);
        await removeFromArray(tempFiles, file);
        try {
            fs.unlinkSync(file);
        }
        catch {}
        await teApi.explorerProvider.invalidateTasksCache("ant", uri);
        await(sleep(1000));
        createAntFile();
        await teApi.explorerProvider.invalidateTasksCache("ant", uri);
        await(sleep(100));

        //
        // Gradle type - Delete and invalidate, re-add and invalidate
        //
        console.log("    Running gradle invalidation");
        file = path.join(dirName, "build.gradle");
        uri = Uri.parse(file);
        await teApi.explorerProvider.invalidateTasksCache("gradle", uri);
        removeFromArray(tempFiles, file);
        try {
            fs.unlinkSync(file);
        }
        catch {}
        await teApi.explorerProvider.invalidateTasksCache("gradle", uri);
        await(sleep(1000));
        createGradleFile();
        await teApi.explorerProvider.invalidateTasksCache("gradle", uri);
        await(sleep(100));

        //
        // Grunt type - Delete and invalidate, re-add and invalidate
        //
        console.log("    Running grunt invalidation");
        file = path.join(rootPath, "GRUNTFILE.js");
        uri = Uri.parse(file);
        await teApi.explorerProvider.invalidateTasksCache("grunt", uri);
        removeFromArray(tempFiles, file);
        try {
            fs.unlinkSync(file);
        }
        catch {}
        await teApi.explorerProvider.invalidateTasksCache("grunt", uri);
        await(sleep(1000));
        createGruntFile();
        await teApi.explorerProvider.invalidateTasksCache("grunt", uri);
        await(sleep(100));

        //
        // Gulp type - Delete and invalidate, re-add and invalidate
        //
        console.log("    Running gulp invalidation");
        file = path.join(rootPath, "gulpfile.js");
        uri = Uri.parse(file);
        await teApi.explorerProvider.invalidateTasksCache("gulp", uri);
        removeFromArray(tempFiles, file);
        try {
            fs.unlinkSync(file);
        }
        catch {}
        await teApi.explorerProvider.refresh("gulp", uri);
        await(sleep(1000));
        createGulpFile();
        await teApi.explorerProvider.invalidateTasksCache("gulp", uri);
        await(sleep(100));

        //
        // Make type - Delete and invalidate, re-add and invalidate
        //
        console.log("    Running makefile invalidation");
        file = path.join(rootPath, "Makefile");
        uri = Uri.parse(file);
        await teApi.explorerProvider.invalidateTasksCache("make", uri);
        removeFromArray(tempFiles, file);
        try {
            fs.unlinkSync(file);
        }
        catch {}
        await teApi.explorerProvider.invalidateTasksCache("make", uri);
        await(sleep(1000));
        createMakeFile();
        await teApi.explorerProvider.refresh("make", uri);
        await(sleep(100));

        //
        // Maven - Delete and invalidate, re-add and invalidate
        //
        console.log("    Running maven invalidation");
        file = path.join(rootPath, "pom.xml");
        uri = Uri.parse(file);
        await teApi.explorerProvider.invalidateTasksCache("maven", uri);
        removeFromArray(tempFiles, file);
        try {
            fs.unlinkSync(file);
        }
        catch {}
        await teApi.explorerProvider.invalidateTasksCache("maven", uri);
        await(sleep(1000));
        createMavenPomFile();
        await teApi.explorerProvider.invalidateTasksCache("maven", uri);
        await(sleep(100));

        //
        // Script type - Delete and invalidate, re-add and invalidate
        //
        console.log("    Running script file invalidation");
        file = path.join(rootPath, "test.bat");
        uri = Uri.parse(file);
        await teApi.explorerProvider.invalidateTasksCache("batch", uri);
        removeFromArray(tempFiles, file);
        try {
            fs.unlinkSync(file);
        }
        catch {}
        await teApi.explorerProvider.invalidateTasksCache("batch", uri);
        await(sleep(1000));
        createBatchFile();
        await teApi.explorerProvider.refresh("batch", uri);
        await(sleep(100));

        console.log("    Running all other invalidations");
        for (const map of taskMap)
        {
            const value = map[1];
            if (value && value.task && teApi && teApi.explorerProvider && value.taskFile.resourceUri) {
                if (fs.existsSync(value.taskFile.resourceUri.fsPath)) {
                    await teApi.explorerProvider.invalidateTasksCache(value.taskSource, value.task.definition.uri);
                }
            }
            else {
                assert.fail("        ✘ TaskItem definition is incomplete");
            }
        }

        console.log("    Disable all task providers");
        await configuration.updateWs("enableAnt", false);
        await configuration.updateWs("enableAppPublisher", false);
        await configuration.updateWs("enableBash", false);
        await configuration.updateWs("enableBatch", false);
        await configuration.updateWs("enableGradle", false);
        await configuration.updateWs("enableGrunt", false);
        await configuration.updateWs("enableGulp", false);
        await configuration.updateWs("enableMake", false);
        await configuration.updateWs("enableMaven", false);
        await configuration.updateWs("enableNpm", false);
        await configuration.updateWs("enableNsis", false);
        await configuration.updateWs("enablePowershell", false);
        await configuration.updateWs("enablePerl", false);
        await configuration.updateWs("enablePython", false);
        await configuration.updateWs("enablePipenv", false);
        await configuration.updateWs("enableRuby", false);
        await configuration.updateWs("enableTsc", false);
        await configuration.updateWs("enableWorkspace", false);

        //
        // Cover single-if branches in cache module
        //
        await teApi.fileCache.addFolderToCache();
        await teApi.fileCache.addFolderToCache(workspace.workspaceFolders[0]);

        console.log("    Re-enable all task providers");
        await configuration.updateWs("enableAnt", true);
        await configuration.updateWs("enableAppPublisher", true);
        await configuration.updateWs("enableBash", true);
        await configuration.updateWs("enableBatch", true);
        await configuration.updateWs("enableGradle", true);
        await configuration.updateWs("enableGrunt", true);
        await configuration.updateWs("enableGulp", true);
        await configuration.updateWs("enableMake", true);
        await configuration.updateWs("enableMaven", true);
        await configuration.updateWs("enableNpm", true);
        await configuration.updateWs("enableNsis", true);
        await configuration.updateWs("enablePowershell", true);
        await configuration.updateWs("enablePerl", true);
        await configuration.updateWs("enablePython", true);
        await configuration.updateWs("enablePipenv", true);
        await configuration.updateWs("enableRuby", true);
        await configuration.updateWs("enableTsc", true);
        await configuration.updateWs("enableWorkspace", true);

        console.log("    Running global invalidation");
        // await commands.executeCommand("taskExplorer.refresh");
        await teApi.explorerProvider.invalidateTasksCache();

        await sleep(1000); // wait for filesystem change events
    });


    test("Invalidate bash tasks with new bash shell setting", async function()
    {
        if (!teApi || !teApi.explorerProvider || !workspace.workspaceFolders) {
            assert.fail("        ✘ Task Explorer tree instance does not exist");
        }

        await workspace.getConfiguration().update("terminal.integrated.shell.windows",
                                                  "C:\\Program Files\\Git\\bin\\bash.exe", ConfigurationTarget.Workspace);
        await sleep(1000);
        await teApi.fileCache.buildCache("bash", "bash", constants.GLOB_BASH, workspace.workspaceFolders[0], true);
    });


    test("Rebuild cache on workspace folder", async function()
    {
        if (!teApi || !teApi.explorerProvider || !workspace.workspaceFolders) {
            assert.fail("        ✘ Task Explorer tree instance does not exist");
        }
        await teApi.fileCache.buildCache("gulp", "gulp", constants.GLOB_GULP, workspace.workspaceFolders[0], true);
    });


    test("Groups with separator", async function()
    {
        await configuration.updateWs("groupWithSeparator", true);
        await configuration.updateWs("groupSeparator", "-");
        await configuration.updateWs("groupMaxLevel", 5);

        await sleep(2000); // wait for filesystem change events
        await waitForCache();
    });


    test("Add to excludes after grouping", async function()
    {
        const taskItemsB4 = await tasks.fetchTasks({ type: "grunt" }),
              gruntCt = taskItemsB4.length;

        for (const map of taskMap)
        {
            const value = map[1];
            if (value && value.taskSource === "grunt")
            {
                let taskFile = value.taskFile;
                while (taskFile.treeNodes.length === 1 && taskFile.treeNodes[0] instanceof TaskFile && !taskFile.isGroup)
                {
                    taskFile = taskFile.treeNodes[0];
                }
                if (taskFile && taskFile.isGroup && !value.taskFile.path.startsWith("grunt"))
                {
                    await commands.executeCommand("taskExplorer.addToExcludes", taskFile);
                    await teApi.explorerProvider?.invalidateTasksCache("grunt", taskFile.resourceUri);
                    break;
                }
            }
        }

        sleep(500);
        const taskItems = await tasks.fetchTasks({ type: "grunt" });
        sleep(500);
        if (taskItems.length !== gruntCt - 2) { // grunt file that just got ignored had 7 tasks
            assert.fail("Unexpected grunt task count (Found " + taskItems.length + " of " +
                        (gruntCt - 2).toString() + ")");
        }
    });

    test("Cancel rebuild cache", async function()
    {
        this.timeout(60 * 1000);
        //
        // Try a bunch of times to cover all of the hooks in the processing loops
        //
        await teApi.fileCache.cancelBuildCache(true);
        teApi.fileCache.rebuildCache();
        await teApi.fileCache.cancelBuildCache(true);
        teApi.fileCache.rebuildCache();
        await sleep(40);
        await teApi.fileCache.cancelBuildCache(true);
        teApi.fileCache.rebuildCache();
        await sleep(75);
        await teApi.fileCache.cancelBuildCache(true);
        teApi.fileCache.rebuildCache();
        await teApi.fileCache.cancelBuildCache(true);
        await teApi.fileCache.rebuildCache();
    });


    test("Enable and disable views", async function()
    {
        await configuration.updateWs("enableExplorerView", false);
        await configuration.updateWs("enableSideBar", false);
        await configuration.updateWs("enableExplorerView", true);
        await configuration.updateWs("enableSideBar", true);
        await sleep(5000); // wait for refresh
    });


    test("Add and remove a workspace folder", async function()
    {
        addWsFolder(workspace.workspaceFolders);
        removeWsFolder(workspace.workspaceFolders as WorkspaceFolder[]);
    });

});


function setupVscode()
{
    if (!rootPath || !dirNameCode) {
        assert.fail("        ✘ Workspace folder does not exist");
    }

    const file = path.join(dirNameCode, "tasks.json");
    tempFiles.push(file);

    fs.writeFileSync(
        file,
        "{\r\n" +
        '    "version": "2.0.0",\r\n' +
        '    "tasks": [\r\n' +
        "    {\r\n" +
        '        "label": "test1",\r\n' +
        '        "type": "shell",\r\n' +
        '        "command": "ant.bat",\r\n' +
        '        "group": "build",\r\n' +
        '        "problemMatcher": [\r\n' +
        '            "$eslint-stylish"\r\n' +
        "        ]\r\n" +
        "    },\r\n" +
        "    {\r\n" +
        '        "type": "npm",\r\n' +
        '        "script": "watch",\r\n' +
        '        "problemMatcher": "$tsc-watch",\r\n' +
        '        "isBackground": true,\r\n' +
        '        "presentation": {\r\n' +
        '            "reveal": "never"\r\n' +
        "        },\r\n" +
        '        "problemMatcher": [\r\n' +
        '            "$tsc-watch"\r\n' +
        "        ],\r\n" +
        '        "group": {\r\n' +
        '            "kind": "build",\r\n' +
        '            "isDefault": true\r\n' +
        "        }\r\n" +
        "    },\r\n" +
        "    {\r\n" +
        '        "type": "npm",\r\n' +
        '        "script": "build",\r\n' +
        '        "group": "build",\r\n' +
        '        "problemMatcher": [\r\n' +
        '            "$tsc"\r\n' +
        "        ]\r\n" +
        "    },\r\n" +
        "    {\r\n" +
        '        "type": "shell",\r\n' +
        '        "label": "build-dev",\r\n' +
        '        "command": "..\\test.bat",\r\n' +
        '        "group": "build",\r\n' +
        '        "problemMatcher": [\r\n' +
        '            "$eslint-stylish"\r\n' +
        "        ]\r\n" +
        "    },\r\n" +
        "    {\r\n" +
        '        "type": "shell",\r\n' +
        '        "label": "build-prod",\r\n' +
        '        "command": "..\\test.bat",\r\n' +
        '        "group": "build",\r\n' +
        '        "problemMatcher": [\r\n' +
        '            "$eslint-stylish"\r\n' +
        "        ]\r\n" +
        "    },\r\n" +
        "    {\r\n" +
        '        "type": "shell",\r\n' +
        '        "label": "test.bat",\r\n' +
        '        "command": "..\\test.bat",\r\n' +
        '        "group": "build",\r\n' +
        '        "problemMatcher": [\r\n' +
        '            $eslint-stylish"\r\n' +
        "        ]\r\n" +
        "    },\r\n" +
        "    {\r\n" +
        '        "type": "shell",\r\n' +
        '        "label": "build-server",\r\n' +
        '        "command": "..\\test.bat",\r\n' +
        '        "group": "build",\r\n' +
        '        "problemMatcher": [\r\n' +
        '            "$eslint-stylish"\r\n' +
        "        ]\r\n" +
        "    }]\r\n" +
        "}\r\n"
    );
}


function setupAnt()
{
    if (!rootPath || !dirNameIgn || !dirName) {
        assert.fail("        ✘ Workspace folder does not exist");
    }

    createAntFile();

    const file2 = path.join(dirName, "test.xml");
    const file3 = path.join(dirName, "emptytarget.xml");
    const file4 = path.join(dirName, "emptyproject.xml");
    const file5 = path.join(dirNameIgn, "build.xml");

    tempFiles.push(file2);
    tempFiles.push(file3);
    tempFiles.push(file4);
    tempFiles.push(file5);

    fs.writeFileSync(
        file2,
        '<?xml version="1.0"?>\n' +
        '<project basedir="." default="test2">\n' +
        '    <property name="test2" value="test2" />\n' +
        "    <target name='test3'></target>\n" +
        '    <target name="test4"></target>\n' +
        "</project>\n"
    );

    fs.writeFileSync(
        file3,
        '<?xml version="1.0"?>\n' +
        '<project basedir="." default="test1">\n' +
        '    <property environment="env" />\n' +
        '    <property name="test" value="test" />\n' +
        "</project>\n"
    );

    fs.writeFileSync(file4, '<?xml version="1.0"?>\n');

    fs.writeFileSync(
        file5,
        '<?xml version="1.0"?>\n' +
        '<project basedir="." default="test2">\n' +
        '    <property name="testv" value="testv" />\n' +
        "    <target name='test5'></target>\n" +
        "</project>\n"
    );
}


function setupGradle()
{
    if (!rootPath || !dirNameIgn || !dirName) {
        assert.fail("        ✘ Workspace folder does not exist");
    }

    createGradleFile();

    const file2 = path.join(dirName, "TEST.GRADLE");
    const file3 = path.join(dirNameIgn, "build.gradle");

    tempFiles.push(file2);
    tempFiles.push(file3);

    fs.writeFileSync(
        file2,
        "task fatJar2(type: Jar) {\n" +
        "    manifest {\n" +
        "        attributes 'Implementation-Title': 'Gradle Jar File Example',\n" +
        "            'Implementation-Version': version,\n" +
        "            'Main-Class': 'com.spmeesseman.test'\n" +
        "    }\n" +
        "    baseName = project.name + '-all'\n" +
        "    from { configurations.compile.collect { it.isDirectory() ? it : zipTree(it) } }\n" +
        "    with jar\n" +
        "}\n"
    );

    fs.writeFileSync(
        file3,
        "task fatJar3(type: Jar) {\n" +
        "    manifest {\n" +
        "        attributes 'Implementation-Title': 'Gradle Jar File Example',\n" +
        "            'Implementation-Version': version,\n" +
        "            'Main-Class': 'com.spmeesseman.test'\n" +
        "    }\n" +
        "    baseName = project.name + '-all'\n" +
        "    from { configurations.compile.collect { it.isDirectory() ? it : zipTree(it) } }\n" +
        "    with jar\n" +
        "}\n"
    );

}


function setupTsc()
{
    if (!rootPath || !dirName) {
        assert.fail("        ✘ Workspace folder does not exist");
    }

    const file = path.join(rootPath, "tsconfig.json");
    tempFiles.push(file);
    const file2 = path.join(dirName, "tsconfig.json");
    tempFiles.push(file2);

    fs.writeFileSync(
        file,
        "{\n" +
        '    "compilerOptions":\n' +
        "  {\n" +
        '    "target": "es6",\n' +
        '    "lib": ["es2016"],\n' +
        '    "module": "commonjs",\n' +
        '    "outDir": "./out",\n' +
        '    "typeRoots": ["./node_modules/@types"],\n' +
        '    "strict": true,\n' +
        '    "experimentalDecorators": true,\n' +
        '    "sourceMap": true,\n' +
        '    "noImplicitThis": false\n' +
        "  },\n" +
        '  "include": ["**/*"],\n' +
        '  "exclude": ["node_modules"]\n' +
        "}\n"
    );

    fs.writeFileSync(
        file2,
        "{\n" +
        '    "compilerOptions":\n' +
        "  {\n" +
        '    "target": "es6",\n' +
        '    "lib": ["es2016"],\n' +
        '    "module": "commonjs",\n' +
        '    "outDir": "./out",\n' +
        '    "typeRoots": ["./node_modules/@types"],\n' +
        '    "strict": true,\n' +
        '    "experimentalDecorators": true,\n' +
        '    "sourceMap": true,\n' +
        '    "noImplicitThis": false\n' +
        "  },\n" +
        '  "include": ["**/*"],\n' +
        '  "exclude": ["node_modules"]\n' +
        "}\n"
    );
}


function setupGulp()
{
    if (!rootPath || !dirNameIgn || !dirName || !dirNameL2) {
        assert.fail("        ✘ Workspace folder does not exist");
    }

    createGulpFile();

    const file2 = path.join(dirName, "Gulpfile.js");
    tempFiles.push(file2);

    const file3 = path.join(dirNameIgn, "gulpfile.js");
    tempFiles.push(file3);

    const file4 = path.join(dirName, "GULPFILE.MJS");
    tempFiles.push(file4);

    const file5 = path.join(dirNameL2, "GULPFILE.js");
    tempFiles.push(file5);


    fs.writeFileSync(
        file2,
        "const { series } = require('gulp');\n" +
        "function clean(cb) {\n" +
        "    console.log('clean!!!');\n" +
        "    cb();\n" +
        "};\n" +
        "function build(cb) {" +
        "    console.log('build!!!');\n" +
        "    cb();\n" +
        "};\n" +
        "exports.build = build;\n" +
        'exports["clean"] = clean;\n' +
        "exports.default = series(clean, build);\n"
    );

    fs.writeFileSync(
        file3,
        "var gulp = require('gulp');\n" +
        "gulp.task('hello3', (done) => {\n" +
        "    console.log('Hello3!');\n" +
        "    done();\n" +
        "});\n" +
        'gulp.task(\n"hello4", (done) => {\n' +
        "    console.log('Hello4!');\n" +
        "    done();\n" +
        "});\n"
    );

    fs.writeFileSync(
        file4,
        "var gulp = require('gulp');\n" +
        "gulp.task('group-test-build-ui-one', (done) => {\n" +
        "    console.log('Hello3!');\n" +
        "    done();\n" +
        "});\n" +
        'gulp.task(\n"group-test-build-ui-two", (done) => {\n' +
        "    console.log('Hello4!');\n" +
        "    done();\n" +
        "});\n" +
        "gulp.task('group-test-build-ui-three', (done) => {\n" +
        "    console.log('Hello3!');\n" +
        "    done();\n" +
        "});\n" +
        "gulp.task('group-test-build-ui-four', (done) => {\n" +
        "    console.log('Hello3!');\n" +
        "    done();\n" +
        "});\n" +
        "gulp.task('group-test-build-ui-five', (done) => {\n" +
        "    console.log('Hello3!');\n" +
        "    done();\n" +
        "});\n"
    );

    fs.writeFileSync(
        file5,
        "var gulp = require('gulp');\n" +
        "gulp.task('group2-test2-build-ui-one', (done) => {\n" +
        "    console.log('Hello1!');\n" +
        "    done();\n" +
        "});\n" +
        'gulp.task(\n"group2-test2-build-ui-two", (done) => {\n' +
        "    console.log('Hello2!');\n" +
        "    done();\n" +
        "});\n" +
        "gulp.task('group2-test2-build-ui-three', (done) => {\n" +
        "    console.log('Hello3!');\n" +
        "    done();\n" +
        "});\n" +
        "gulp.task('group2-test2-build-ui-four', (done) => {\n" +
        "    console.log('Hello4!');\n" +
        "    done();\n" +
        "});\n" +
        "gulp.task('group2-test2-build-ui-five', (done) => {\n" +
        "    console.log('Hello5!');\n" +
        "    done();\n" +
        "});\n"
    );
}


function setupMakefile()
{
    if (!rootPath || !dirNameIgn || !dirName) {
        assert.fail("        ✘ Workspace folder does not exist");
    }

    createMakeFile();

    const file2 = path.join(dirName, "Makefile");
    tempFiles.push(file2);

    const file3 = path.join(dirNameIgn, "Makefile");
    tempFiles.push(file3);

    fs.writeFileSync(
        file2,
        "# all tasks comment\n" +
        "all   : temp.exe\r\n" + "    @echo Building app\r\n" + "clean: t1\r\n" + "    rmdir /q /s ../build\r\n"
    );

    fs.writeFileSync(
        file3,
        "all   : temp.exe\r\n" + "    @echo Building app\r\n" + "clean: t1\r\n" + "    rmdir /q /s ../build\r\n"
    );
}


function setupBatch()
{
    if (!rootPath || !dirNameIgn || !dirName) {
        assert.fail("        ✘ Workspace folder does not exist");
    }

    createBatchFile();

    const file2 = path.join(dirName, "test2.BAT");
    tempFiles.push(file2);

    const file3 = path.join(dirNameIgn, "test3.bat");
    tempFiles.push(file3);

    fs.writeFileSync(file2, "@echo testing batch file 2\r\nsleep /t 5\r\n");
    fs.writeFileSync(file3, "@echo testing batch file 3\r\n");
}


function setupBash()
{
    if (!rootPath || !dirNameIgn || !dirName) {
        assert.fail("        ✘ Workspace folder does not exist");
    }

    const file = path.join(rootPath, "test.sh");
    tempFiles.push(file);

    const file2 = path.join(dirName, "test2.SH");
    tempFiles.push(file2);

    const file3 = path.join(dirNameIgn, "test3.sh");
    tempFiles.push(file3);

    fs.writeFileSync(file, "echo testing bash file\n");
    fs.writeFileSync(file2, "echo testing bash file 2\n");
    fs.writeFileSync(file3, "echo testing bash file 3\n");
}


function setupGrunt()
{
    if (!rootPath || !dirName || !dirNameIgn || !dirNameL2) {
        assert.fail("        ✘ Workspace folder does not exist");
    }

    createGruntFile();

    const file2 = path.join(dirName, "Gruntfile.js");
    tempFiles.push(file2);

    const file3 = path.join(dirNameIgn, "Gruntfile.js");
    tempFiles.push(file3);

    const file4 = path.join(dirNameL2, "GRUNTFILE.JS");
    tempFiles.push(file4);

    fs.writeFileSync(
        file2,
        "module.exports = function(grunt) {\n" +
        '    grunt.registerTask(\n"default2", ["jshint:myproject"]);\n' +
        '    grunt.registerTask("upload2", ["s3"]);\n' +
        "};\n"
    );

    fs.writeFileSync(
        file3,
        "module.exports = function(grunt) {\n" +
        '    grunt.registerTask(\n"default3", ["jshint:myproject"]);\n' +
        '    grunt.registerTask("upload3", ["s3"]);\n' +
        "};\n"
    );

    fs.writeFileSync(
        file4,
        "module.exports = function(grunt) {\n" +
        '    grunt.registerTask("grp-test-svr-build1", ["s1"]);\n' +
        '    grunt.registerTask("grp-test-svr-build2", ["s2"]);\n' +
        "};\n"
    );
}


function setupAppPublisher()
{
    if (!rootPath) {
        assert.fail("        ✘ Workspace folder does not exist");
    }
    createAppPublisherFile();
}


function setupMaven()
{
    if (!rootPath) {
        assert.fail("        ✘ Workspace folder does not exist");
    }
    createMavenPomFile();
}


function createAntFile()
{
    if (dirName)
    {
        const file = path.join(dirName, "build.xml");
        tempFiles.push(file);

        if (!fs.existsSync(file))
        {
            fs.writeFileSync(
                file,
                '<?xml version="1.0"?>\n' +
                '<project basedir="." default="test1">\n' +
                '    <property environment="env" />\n' +
                '    <property name="test" value="test" />\n' +
                '    <target name="test1" depends="init"></target>\n' +
                '    <target name="test2" depends="init"></target>\n' +
                "</project>\n"
            );
        }
    }
}


function createAppPublisherFile()
{
    if (rootPath)
    {
        const file = path.join(rootPath, ".publishrc.json");
        tempFiles.push(file);

        if (!fs.existsSync(file))
        {
            fs.writeFileSync(
                file,
                "{\n" +
                '    "version": "1.0.0"\n' +
                '    "branch": "trunk",\n' +
                '    "buildCommand": [],\n' +
                '    "mantisbtRelease": "Y",\n' +
                '    "mantisbtChglogEdit": "N",\n' +
                '    "mantisbtProject": "",\n' +
                '    "repoType": "svn""\n' +
                "}\n"
            );
        }
    }
}


function createMavenPomFile()
{
    if (rootPath)
    {
        const file = path.join(rootPath, "pom.xml");
        tempFiles.push(file);

        if (!fs.existsSync(file))
        {
            fs.writeFileSync(
                file,
                "<project xmlns=\"http://maven.apache.org/POM/4.0.0\">\n" +
                "    <modelVersion>4.0.0</modelVersion>\n" +
                "</project>\n"
            );
        }
    }
}


function createBatchFile()
{
    if (rootPath)
    {
        const file = path.join(rootPath, "test.bat");
        tempFiles.push(file);
        if (!fs.existsSync(file))
        {
            fs.writeFileSync(file, "@echo testing batch file\r\n");
        }
    }
}


function createGradleFile()
{
    if (dirName)
    {
        const file = path.join(dirName, "build.gradle");
        tempFiles.push(file);

        if (!fs.existsSync(file))
        {
            fs.writeFileSync(
                file,
                "task fatJar(type: Jar) {\n" +
                "    manifest {\n" +
                "        attributes 'Implementation-Title': 'Gradle Jar File Example',\n" +
                "            'Implementation-Version': version,\n" +
                "            'Main-Class': 'com.spmeesseman.test'\n" +
                "    }\n" +
                "    baseName = project.name + '-all'\n" +
                "    from { configurations.compile.collect { it.isDirectory() ? it : zipTree(it) } }\n" +
                "    with jar\n" +
                "}\n"
            );
        }
    }
}


function createGruntFile()
{
    if (rootPath)
    {
        const file = path.join(rootPath, "GRUNTFILE.js");
        tempFiles.push(file);

        if (!fs.existsSync(file))
        {
            fs.writeFileSync(
                file,
                "module.exports = function(grunt) {\n" +
                "    grunt.registerTask(\n'default', ['jshint:myproject']);\n" +
                '    grunt.registerTask("upload", [\'s3\']);\n' +
                "};\n"
            );
        }
    }
}


function createGulpFile()
{
    if (rootPath)
    {
        const file = path.join(rootPath, "gulpfile.js");
        tempFiles.push(file);

        if (!fs.existsSync(file))
        {
            fs.writeFileSync(
                file,
                "var gulp = require('gulp');\n" +
                "gulp.task(\n'hello', (done) => {\n" +
                "    console.log('Hello!');\n" +
                "    done();\n" +
                "});\n" +
                'gulp.task(\n       "hello2", (done) => {\n' +
                "    done();\n" +
                "});\n"
            );
        }
    }
}


function createMakeFile()
{
    if (rootPath)
    {
        const file = path.join(rootPath, "Makefile");
        tempFiles.push(file);

        if (!fs.existsSync(file))
        {
            fs.writeFileSync(
                file,
                "all   : temp.exe\r\n" + "    @echo Building app\r\n" + "clean: t1\r\n" + "    rmdir /q /s ../build\r\n"
            );
        }
    }
}
