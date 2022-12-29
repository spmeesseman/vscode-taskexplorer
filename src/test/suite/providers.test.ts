/* eslint-disable import/no-extraneous-dependencies */
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
import { expect } from "chai";
import { workspace, tasks, commands, Uri, WorkspaceFolder } from "vscode";
import { removeFromArray } from "../../common/utils";
import { TaskExplorerApi, ExplorerApi } from "@spmeesseman/vscode-taskexplorer-types";
import { configuration } from "../../common/configuration";
import { storage } from "../../common/storage";
import {
    activate, buildTree, executeSettingsUpdate, executeTeCommand, executeTeCommand2, findIdInTaskMap,
    getTreeTasks, getWsPath, isReady, sleep, testsControl, verifyTaskCount
} from "../helper";


const tempFiles: string[] = [];
const slowTimeForFsCreateEvent = testsControl.slowTimeForFsCreateEvent;
const waitTimeForFsModEvent = testsControl.waitTimeForFsModifyEvent;
const waitTimeForFsDelEvent = testsControl.waitTimeForFsDeleteEvent;
const waitTimeForFsNewEvent = testsControl.waitTimeForFsCreateEvent;
const waitTimeForConfigEvent = testsControl.waitTimeForConfigEvent;

let teApi: TaskExplorerApi;
let explorer: ExplorerApi;
let rootPath: string;
let dirName: string;
let dirNameL2: string;
let ws2DirName: string;
let dirNameIgn: string;
let batch: TaskItem[];
let taskMap: Map<string, TaskItem>;


suite("Provider Tests", () =>
{

    suiteSetup(async function()
    {
        teApi = await activate(this);
        assert(isReady() === true, "    ✘ TeApi not ready");
        if (!teApi.explorer) {
            assert.fail("        ✘ Explorer instance does not exist");
        }
        explorer = teApi.explorer;
        rootPath = getWsPath(".");
        dirName = path.join(rootPath, "tasks_test_");
        dirNameL2 = path.join(dirName, "subfolder");
        ws2DirName = path.join(rootPath, "ws2");
        dirNameIgn = path.join(rootPath, "tasks_test_ignore_");
        //
        // Add some excludes, use both config update and task explorer addExclude command
        // for full coverage.  The 'addExclude' command will add the setting globally though,
        // so add it to the workspace setting as well
        //
        await executeSettingsUpdate("exclude", [ "**/tasks_test_ignore_/**", "**/ant/**" ]);
        await executeTeCommand2("addToExcludes", [ "**/tasks_test_ignore_/**" ]);

    });


    suiteTeardown(async function()
    {
        await executeSettingsUpdate("debug", testsControl.writeToOutput || testsControl.writeToConsole);
        await executeSettingsUpdate("expanded.test-files", false);
    });


    test("Create Temporary Directories", async function()
    {
        this.slow(10000);
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

        //
        // New Workspace folders
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

        //
        // Merge VSCode ws folders
        //
        (workspace.workspaceFolders as WorkspaceFolder[]).concat(wsf);

        await teApi.waitForIdle(2500);
    });


    test("Check Existing Bash Task Counts", async function()
    {
        this.slow(1000);
        batch = await getTreeTasks("bash", 1);
    });


    test("Check Existing Batch Task Counts", async function()
    {
        this.slow(1000);
        batch = await getTreeTasks("batch", 2);
    });


    test("Create Temporary Task Files - App Publisher", async function()
    {
        this.slow(slowTimeForFsCreateEvent);
        await setupAppPublisher();
    });


    test("Create Temporary Task Files - Ant", async function()
    {
        this.slow(slowTimeForFsCreateEvent);
        await setupAnt();
    });


    test("Create Temporary Task Files - Bash", async function()
    {
        this.slow(slowTimeForFsCreateEvent);
        await setupBash();
    });


    test("Create Temporary Task Files - Batch", async function()
    {
        this.slow(slowTimeForFsCreateEvent);
        await setupBatch();
    });


    test("Create Temporary Task Files - Gradle", async function()
    {
        this.slow(slowTimeForFsCreateEvent);
        await setupGradle();
    });


    test("Create Temporary Task Files - Grunt", async function()
    {
        this.slow(slowTimeForFsCreateEvent);
        await setupGrunt();
    });


    test("Create Temporary Task Files - Gulp", async function()
    {
        this.slow(slowTimeForFsCreateEvent);
        await setupGulp();
    });


    test("Create Temporary Task Files - Makefile", async function()
    {
        this.slow(slowTimeForFsCreateEvent);
        await setupMakefile();
    });


    test("Create Temporary Task Files - Maven", async function()
    {
        this.slow(slowTimeForFsCreateEvent);
        await setupMaven();
    });


    test("Create Temporary Task Files - Typescript", async function()
    {
        this.slow(slowTimeForFsCreateEvent);
        await setupTsc();
    });


	test("Focus Task Explorer View for Tree Population", async function()
	{
        if (!explorer.isVisible()) {
            this.slow(1000);
		    await executeTeCommand("focus", testsControl.slowTimeForFocusCommand, 3000);
        }
	});


    test("Enable App-Publisher Tasks (Off by Default)", async function()
    {
        this.slow(1000);
        await executeSettingsUpdate("enabledTasks.apppublisher", true);
    });


    test("Enable Pipenv Tasks (Off by Default)", async function()
    {
        this.slow(1000);
        await executeSettingsUpdate("enabledTasks.pipenv", true);
    });


    test("Enable Maven Tasks (Off by Default)", async function()
    {
        this.slow(1000);
        await executeSettingsUpdate("enabledTasks.maven", true);
    });


    test("Build Tree", async function()
    {
        await buildTree(this);
        //
        // Check VSCode provided task types for the hell of it
        //
        let nTasks = await tasks.fetchTasks({ type: "grunt" });
        assert(nTasks.length > 0, "No grunt tasks registered");
        nTasks = await tasks.fetchTasks({ type: "gulp" });
        assert(nTasks.length > 0, "No gulp tasks registered");
        batch = await getTreeTasks("batch", 4);
    });


    test("Build Tree Variations  - Last Tasks Collapsed", async function()
    {
        const favTasks = storage.get<string[]>(constants.FAV_TASKS_STORE, []);
        const lastTasks = storage.get<string[]>(constants.LAST_TASKS_STORE, []);
        const showLasTasks = configuration.get<boolean>("showLastTasks");
        try {
            await storage.update(constants.FAV_TASKS_STORE, [ "hello.bat" ]);
            await storage.update(constants.LAST_TASKS_STORE, [ "hello.bat" ]);
            await configuration.updateWs("showLastTasks", true);
            await configuration.updateWs("expanded.lastTasks", false);
            expect(await explorer.buildTaskTree([], "   ", 5)).to.be.an("array").that.has.a.lengthOf(2);
        }
        catch (e) {
            throw e;
        }
        finally {
            await configuration.updateWs("expanded.lastTasks", true);
            await configuration.updateWs("showLastTasks", showLasTasks);
            await storage.update(constants.FAV_TASKS_STORE, favTasks);
            await storage.update(constants.LAST_TASKS_STORE, lastTasks);
        }
    });


    test("Build Tree Variations - Favorites Collapsed", async function()
    {
        const favTasks = storage.get<string[]>(constants.FAV_TASKS_STORE, []);
        const showLasTasks = configuration.get<boolean>("showLastTasks");
        try {
            await storage.update(constants.FAV_TASKS_STORE, [ "hello.bat" ]);
            await configuration.updateWs("showLastTasks", false);
            await configuration.updateWs("expanded.favorites", false);
            expect(await explorer.buildTaskTree([], "   ", 5)).to.be.an("array").that.has.a.lengthOf(1);
        }
        catch (e) {
            throw e;
        }
        finally {
            await configuration.updateWs("expanded.favorites", true);
            await configuration.updateWs("showLastTasks", showLasTasks);
            await storage.update(constants.FAV_TASKS_STORE, favTasks);
        }
    });


    test("Open Tasks for Edit", async function()
    {   //
        // The 3rd param `true` will open the task files and locate task positions while parsing the tree
        //
        this.slow(3000);
        taskMap = await explorer.getTaskItems(undefined, "   ", true) as unknown as Map<string, TaskItem>;
        checkTasks(7, 42, 3, 4, 3, 13, 32, 2, 4, 10);
    });


    test("Resolve Task", async function()
    {
        const provider = teApi.providers.get("script");
        assert(provider);
        provider.resolveTask(batch[0]);
    });


    test("Add to Excludes - TaskItem", async function()
    {
        this.slow(1000);
        const taskItems = await tasks.fetchTasks({ type: "grunt" }),
              gruntCt = taskItems.length;
        for (const map of taskMap)
        {
            const value = map[1];
            if (value && value.taskSource === "grunt" && !value.taskFile.path.startsWith("grunt"))
            {
                const node = value.taskFile.treeNodes.find(
                    n => n instanceof TaskItem && n.task.name && n.task.name.includes("upload2")
                ) as TaskItem;
                if (node)
                {
                    await executeTeCommand("addToExcludes", waitTimeForConfigEvent, 3000, node);
                    break;
                }
            }
        }
        await verifyTaskCount("grunt", gruntCt - 1);
    });


    test("Add to Excludes - TaskItem (Script Type)", async function()
    {
        this.slow(1000);
        const taskItems = await tasks.fetchTasks({ type: "script" }),
              scriptCt = taskItems.length;
        for (const map of taskMap)
        {
            const value = map[1];
            if (value && value.taskSource === "batch" && value.taskFile.fileName.toLowerCase().includes("test2.bat"))
            {
                const node = value.taskFile.treeNodes.find(
                    n => n instanceof TaskItem && n.task.name && n.task.name.toLowerCase().includes("test2.bat")
                ) as TaskItem;
                if (node)
                {
                    await executeTeCommand("addToExcludes", 500, 3000, node);
                    break;
                }
            }
        }
        await verifyTaskCount("script", scriptCt - 1);
    });


    test("Add to Excludes - TaskFile", async function()
    {
        this.slow(1000);
        const taskItems = await tasks.fetchTasks({ type: "grunt" }),
              gruntCt = taskItems.length;
        for (const map of taskMap)
        {
            const value = map[1];
            if (value && value.taskSource === "grunt" && !value.taskFile.path.startsWith("grunt"))
            {
                await executeTeCommand("addToExcludes", 500, 3000, value.taskFile);
                break;
            }
        }
        await verifyTaskCount("grunt", gruntCt - 2);
    });


    test("Add to Excludes - Bad Call", async function()
    {
        this.slow(1000);
        await commands.executeCommand("taskExplorer.addToExcludes");
        await teApi.waitForIdle(500, 1500);
    });


    test("App Publisher Delete / Add", async function()
    {
        this.slow(1000);
        const file = path.join(rootPath, ".publishrc.json");
        removeFromArray(tempFiles, file);
        fs.unlinkSync(file);
        await teApi.waitForIdle(waitTimeForFsDelEvent, 1500);
        await verifyTaskCount("apppublisher", 21);
        await createAppPublisherFile();
        await verifyTaskCount("apppublisher", 42);
    });


    test("Ant Delete / Add", async function()
    {
        this.slow(1000);
        const file = path.join(dirName, "build.xml");
        removeFromArray(tempFiles, file);
        fs.unlinkSync(file);
        await teApi.waitForIdle(waitTimeForFsDelEvent, 1500);
        await createAntFile();
    });


    test("Gradle Delete / Add", async function()
    {
        this.slow(1000);
        const file = path.join(dirName, "build.gradle");
        removeFromArray(tempFiles, file);
        fs.unlinkSync(file);
        await teApi.waitForIdle(waitTimeForFsDelEvent, 1500);
        await createGradleFile();
    });


    test("Grunt Delete / Add", async function()
    {
        this.slow(1000);
        const file = path.join(rootPath, "GRUNTFILE.js");
        removeFromArray(tempFiles, file);
        fs.unlinkSync(file);
        await teApi.waitForIdle(waitTimeForFsDelEvent, 1500);
        await createGruntFile();
    });


    test("Gulp Delete / Add", async function()
    {
        this.slow(1000);
        const file = path.join(rootPath, "gulpfile.js");
        removeFromArray(tempFiles, file);
        fs.unlinkSync(file);
        await teApi.waitForIdle(waitTimeForFsDelEvent, 1500);
        await createGulpFile();
    });


    test("Makefile Delete / Add", async function()
    {
        this.slow(1000);
        const file = path.join(rootPath, "Makefile");
        removeFromArray(tempFiles, file);
        fs.unlinkSync(file);
        await teApi.waitForIdle(waitTimeForFsDelEvent, 1500);
        await createMakeFile();
        await configuration.updateWs("debug", true); // hit tree.logTask()
    });


    test("Maven Delete / Add", async function()
    {
        this.slow(1000);
        const file = path.join(rootPath, "pom.xml");
        removeFromArray(tempFiles, file);
        fs.unlinkSync(file);
        await teApi.waitForIdle(waitTimeForFsDelEvent, 1500);
        await createMavenPomFile();
    });


    test("Batch Delete / Add", async function()
    {
        this.slow(1000);
        const file = path.join(rootPath, "test.bat");
        removeFromArray(tempFiles, file);
        fs.unlinkSync(file);
        await teApi.waitForIdle(waitTimeForFsDelEvent, 1500);
        await createBatchFile();
    });


    test("Add WS Folder to File Cache", async function()
    {   //
        // Cover single-if branches in cache module
        //
        this.slow(7500);
        await teApi.testsApi.fileCache.addWsFolders();
        await teApi.testsApi.fileCache.addWsFolders(workspace.workspaceFolders as WorkspaceFolder[]);
        await teApi.waitForIdle(2500, 10000);
    });


    test("Run Refresh Task", async function()
    {
        this.slow(testsControl.slowTimeForRefreshCommand);
        await executeSettingsUpdate("expanded.test-files", true);
        await executeTeCommand("refresh");
        await executeSettingsUpdate("debug", false); // was hitting tree.logTask()
    });


    test("Invalidate Bash Tasks With New Bash Shell Setting", async function()
    {
        this.slow(1000);
        if (!teApi || !teApi.explorer || !workspace.workspaceFolders) {
            assert.fail("        ✘ Task Explorer tree instance does not exist");
        }
        await configuration.updateVsWs("terminal.integrated.shell.windows",
                                       "C:\\Program Files\\Git\\bin\\bash.exe");
        await teApi.waitForIdle(waitTimeForConfigEvent, 1000);
        await teApi.testsApi.fileCache.buildCache("bash", constants.GLOB_BASH, workspace.workspaceFolders[0], true);
        await teApi.waitForIdle();
        await executeSettingsUpdate("expanded.test-files", false);
    });


    test("Rebuild Cache on Workspace Folder", async function()
    {
        this.slow(250);
        if (!teApi || !teApi.explorer || !workspace.workspaceFolders) {
            assert.fail("        ✘ Task Explorer tree instance does not exist");
        }
        await teApi.testsApi.fileCache.buildCache("gulp",constants.GLOB_GULP, workspace.workspaceFolders[0], true);
        await teApi.waitForIdle();
    });


    test("Groups with Separator", async function()
    {
        this.slow(2000);
        await executeSettingsUpdate("groupWithSeparator", true);
        await executeSettingsUpdate("groupSeparator", "-");
        await executeSettingsUpdate("groupMaxLevel", 5);
    });


    test("Add to Excludes After Grouping", async function()
    {
        this.slow(2000);

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
                    await sleep(1000);
                    break;
                }
            }
        }

        await sleep(500);
        const taskItems = await tasks.fetchTasks({ type: "grunt" });
        await sleep(500);
        if (taskItems.length !== gruntCt - 2) { // grunt file that just got ignored had 7 tasks
            assert.fail("Unexpected grunt task count (Found " + taskItems.length + " of " +
                        (gruntCt - 2).toString() + ")");
        }
    });


    test("Cancel Rebuild Cache", async function()
    {
        this.slow(20000);
        //
        // Try a bunch of times to cover all of the hooks in the processing loops
        //
        await teApi.testsApi.fileCache.cancelBuildCache(true);
        teApi.testsApi.fileCache.rebuildCache();
        await teApi.testsApi.fileCache.cancelBuildCache(true);
        teApi.testsApi.fileCache.rebuildCache();
        await sleep(40);
        await teApi.testsApi.fileCache.cancelBuildCache(true);
        teApi.testsApi.fileCache.rebuildCache();
        await sleep(75);
        await teApi.testsApi.fileCache.cancelBuildCache(true);
        teApi.testsApi.fileCache.rebuildCache();
        await teApi.testsApi.fileCache.cancelBuildCache(true);
        await teApi.testsApi.fileCache.rebuildCache();
    });


    test("Mimic Add/Remove a Workspace Folder", async function()
    {
        teApi.testsApi.fileCache.addWsFolders(workspace.workspaceFolders);
        teApi.testsApi.fileCache.removeWsFolders((workspace.workspaceFolders as WorkspaceFolder[]).filter(f =>  f.index > 0));
    });


    test("Remove Temporary Directories", async function()
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

        if (dirName && ws2DirName && dirNameIgn && dirNameL2)
        {
            try {
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
        }
        catch(error) {
            console.log(error);
        }

        await teApi.waitForIdle(3000);
    });

});


function checkTasks(ant: number, ap: number, bash: number, bat: number, gradle: number, grunt: number, gulp: number, python: number, tsc: number, vsc: number)
{
    console.log("    Task Counts");

    let taskCount = findIdInTaskMap(":ant", taskMap);
    console.log("      Ant           : " + taskCount.toString());
    if (taskCount !== ant) {
        assert.fail(`Unexpected Ant task count (Found ${taskCount} of ${ant})`);
    }

    taskCount = findIdInTaskMap(":apppublisher:", taskMap);
    console.log("      App-Publisher : " + taskCount.toString());
    if (taskCount !== ap) {
        assert.fail(`Unexpected AppPublisher task count (Found ${taskCount} of ${ap})`);
    }

    taskCount = findIdInTaskMap(":bash:", taskMap);
    console.log("      Bash          : " + taskCount.toString());
    if (taskCount !== bash) {
        assert.fail(`Unexpected Bash task count (Found ${taskCount} of ${bash})`);
    }

    taskCount = findIdInTaskMap(":batch:", taskMap);
    console.log("      Batch         : " + taskCount.toString());
    if (taskCount !== bat) {
        assert.fail(`Unexpected Batch task count (Found ${taskCount} of ${bat})`);
    }

    taskCount = findIdInTaskMap(":gradle:", taskMap);
    console.log("      Gradle        : " + taskCount.toString());
    if (taskCount !== gradle) {
        assert.fail(`Unexpected Gradle task count (Found ${taskCount} of ${gradle})`);
    }

    taskCount = findIdInTaskMap(":grunt:", taskMap);
    console.log("      Grunt         : " + taskCount.toString());
    if (taskCount !== grunt) {
        assert.fail(`Unexpected Grunt task count (Found ${taskCount} of ${grunt})`);
    }

    taskCount = findIdInTaskMap(":gulp:", taskMap);
    console.log("      Gulp          : " + taskCount.toString());
    if (taskCount !== gulp) {
        assert.fail(`Unexpected Gulp task count (Found ${taskCount} of ${gulp})`);
    }

    taskCount = findIdInTaskMap(":python:", taskMap);
    console.log("      Python        : " + taskCount.toString());
    if (taskCount !== python) {
        assert.fail(`Unexpected Python task count (Found ${taskCount} of ${python})`);
    }

    taskCount = findIdInTaskMap(":tsc:", taskMap);
    console.log("      TypeScript    : " + taskCount.toString());
    if (taskCount !== tsc) {
        assert.fail(`Unexpected Typescript task count (Found ${taskCount} of ${tsc})`);
    }

    taskCount = findIdInTaskMap(":Workspace:", taskMap);
    console.log("      VSCode        : " + taskCount.toString());
    if (taskCount !== vsc) {
        assert.fail(`Unexpected VSCode task count (Found ${taskCount} of ${vsc})`);
    }
}


async function setupAnt()
{
    if (!rootPath || !dirNameIgn || !dirName) {
        assert.fail("        ✘ Workspace folder does not exist");
    }

    await createAntFile();

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

    await teApi.waitForIdle(waitTimeForFsNewEvent, 3000);
}


async function setupGradle()
{
    if (!rootPath || !dirNameIgn || !dirName) {
        assert.fail("        ✘ Workspace folder does not exist");
    }

    await createGradleFile();

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

    await teApi.waitForIdle(waitTimeForFsNewEvent, 3000);
}


async function setupTsc()
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

    await teApi.waitForIdle(waitTimeForFsNewEvent, 3000);
}


async function setupGulp()
{
    if (!rootPath || !dirNameIgn || !dirName || !dirNameL2) {
        assert.fail("        ✘ Workspace folder does not exist");
    }

    await createGulpFile();

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

    await teApi.waitForIdle(waitTimeForFsNewEvent, 3000);
}


async function setupMakefile()
{
    if (!rootPath || !dirNameIgn || !dirName) {
        assert.fail("        ✘ Workspace folder does not exist");
    }

    await createMakeFile();

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

    await teApi.waitForIdle(waitTimeForFsNewEvent, 3000);
}


async function setupBatch()
{
    if (!rootPath || !dirNameIgn || !dirName) {
        assert.fail("        ✘ Workspace folder does not exist");
    }

    await createBatchFile();

    const file2 = path.join(dirName, "test2.BAT");
    tempFiles.push(file2);

    const file3 = path.join(dirNameIgn, "test3.bat");
    tempFiles.push(file3);

    fs.writeFileSync(file2, "@echo testing batch file 2\r\nsleep /t 5\r\n");
    fs.writeFileSync(file3, "@echo testing batch file 3\r\n");
    await teApi.waitForIdle(waitTimeForFsNewEvent);
}


async function setupBash()
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

    await teApi.waitForIdle(waitTimeForFsNewEvent, 3000);
}


async function setupGrunt()
{
    if (!rootPath || !dirName || !dirNameIgn || !dirNameL2) {
        assert.fail("        ✘ Workspace folder does not exist");
    }

    await createGruntFile();

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

    await teApi.waitForIdle(waitTimeForFsNewEvent, 3000);
}


async function setupAppPublisher()
{
    if (!rootPath) {
        assert.fail("        ✘ Workspace folder does not exist");
    }
    await createAppPublisherFile();
}


async function setupMaven()
{
    if (!rootPath) {
        assert.fail("        ✘ Workspace folder does not exist");
    }
    await createMavenPomFile();
}


async function createAntFile()
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
            await teApi.waitForIdle(waitTimeForFsNewEvent, 3000);
        }
    }
}


async function createAppPublisherFile()
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
                '    "version": "1.0.0",\n' +
                '    "branch": "trunk",\n' +
                '    "buildCommand": [],\n' +
                '    "mantisbtRelease": "Y",\n' +
                '    "mantisbtChglogEdit": "N",\n' +
                '    "mantisbtProject": "",\n' +
                '    "repoType": "svn"\n' +
                "}\n"
            );
            await teApi.waitForIdle(waitTimeForFsNewEvent, 3000);
        }
    }
}


async function createMavenPomFile()
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
            await teApi.waitForIdle(waitTimeForFsNewEvent, 3000);
        }
    }
}


async function createBatchFile()
{
    if (rootPath)
    {
        const file = path.join(rootPath, "test.bat");
        tempFiles.push(file);
        if (!fs.existsSync(file))
        {
            fs.writeFileSync(file, "@echo testing batch file\r\n");
            await teApi.waitForIdle(waitTimeForFsNewEvent, 3000);
        }
    }
}


async function createGradleFile()
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
            await teApi.waitForIdle(waitTimeForFsNewEvent, 3000);
        }
    }
}


async function createGruntFile()
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
            await teApi.waitForIdle(waitTimeForFsNewEvent, 3000);
        }
    }
}


async function createGulpFile()
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
            await teApi.waitForIdle(waitTimeForFsNewEvent, 3000);
        }
    }
}


async function createMakeFile()
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
            await teApi.waitForIdle(waitTimeForFsNewEvent, 3000);
        }
    }
}
