/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* tslint:disable */

//
// Documentation on https://mochajs.org/ for help.
//
import TaskItem from "../../tree/item";
import TaskFile from "../../tree/file";
import { join } from "path";
import { expect } from "chai";
import { workspace, tasks, WorkspaceFolder } from "vscode";
import { ITaskExplorerApi, TaskMap, IFilesystemApi, ITaskFile } from "@spmeesseman/vscode-taskexplorer-types";
import { executeSettingsUpdate, executeTeCommand, executeTeCommand2, focusExplorerView } from "../utils/commandUtils";
import {
    activate, endRollingCount, exitRollingCount, getWsPath, needsTreeBuild, suiteFinished, testControl as tc,
    treeUtils, verifyTaskCount, waitForTeIdle
} from "../utils/utils";
import { refresh } from "../utils/treeUtils";


const tempFiles: string[] = [];

let teApi: ITaskExplorerApi;
let fsApi: IFilesystemApi;
let taskFile: ITaskFile | undefined;
let rootPath: string;
let dirName: string;
let dirNameL2: string;
let dirNameIgn: string;
let taskMap: TaskMap;
let tempDirsDeleted = false;


suite("Provider Tests", () =>
{

    suiteSetup(async function()
    {
        if (exitRollingCount(this, true)) return;
        ({ teApi, fsApi } = await activate(this));
        rootPath = getWsPath(".");
        dirName = join(rootPath, "tasks_test_");
        dirNameL2 = join(dirName, "subfolder");
        dirNameIgn = join(rootPath, "tasks_test_ignore_");
        await executeSettingsUpdate("exclude", [ "**/tasks_test_ignore_/**", "**/ant/**" ], tc.waitTime.config.globEvent);
        endRollingCount(this, true);
    });


    suiteTeardown(async function()
    {
        if (exitRollingCount(this, false, true)) return;
        await teApi.config.updateVsWs("terminal.integrated.shell.windows", tc.defaultWindowsShell);
        await waitForTeIdle(tc.waitTime.refreshCommand);
        await executeSettingsUpdate("logging.enable", tc.log.enabled, tc.waitTime.config.event);
        await executeSettingsUpdate("enabledTasks", {
            apppublisher: false, // off by default
            gradle: false,       // off by default
            maven: false,        // off by default
            pipenv: false,       // off by default
        });
        if (!tempDirsDeleted) {
            await deleteTempFilesAndDirectories();
        }
        suiteFinished(this);
    });


    test("Create Empty Directories", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.fs.createFolderEvent * 3);
        if (!await fsApi.pathExists(dirName)) {
            await fsApi.createDir(dirName);
            await waitForTeIdle(tc.waitTime.fs.createFolderEvent);
        }
        if (!await fsApi.pathExists(dirNameL2)) {
            await fsApi.createDir(dirNameL2);
            await waitForTeIdle(tc.waitTime.fs.createFolderEvent);
        }
        if (!await fsApi.pathExists(dirNameIgn)) {
            await fsApi.createDir(dirNameIgn);
            await waitForTeIdle(tc.waitTime.fs.createFolderEvent);
        }
        endRollingCount(this);
    });


    test("Build Tree", async function()
    {
        if (exitRollingCount(this)) return;
        if (needsTreeBuild()) {
            await treeUtils.refresh(this);
        }
        endRollingCount(this);
    });


    test("Create Temporary Task Files - App Publisher", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.fs.createEvent);
        await setupAppPublisher();
        endRollingCount(this);
    });


    test("Create Temporary Task Files - Ant", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.fs.createEvent * 5);
        await setupAnt();
        endRollingCount(this);
    });


    test("Create Temporary Task Files - Bash", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.fs.createEvent * 3);
        await setupBash();
        endRollingCount(this);
    });


    test("Create Temporary Task Files - Batch", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.fs.createEvent * 3);
        await setupBatch();
        endRollingCount(this);
    });


    test("Create Temporary Task Files - Gradle", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.fs.createEvent * 3);
        await setupGradle();
        endRollingCount(this);
    });


    test("Create Temporary Task Files - Grunt", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.fs.createEvent * 4);
        await setupGrunt();
        endRollingCount(this);
    });


    test("Create Temporary Task Files - Gulp", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.fs.createEvent * 5);
        await setupGulp();
        endRollingCount(this);
    });


    test("Create Temporary Task Files - Makefile", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.fs.createEvent * 3);
        await setupMakefile();
        endRollingCount(this);
    });


    test("Create Temporary Task Files - Maven", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.fs.createEvent);
        await setupMaven();
        endRollingCount(this);
    });


    test("Create Temporary Task Files - Typescript", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.fs.createEvent * 2);
        await setupTsc();
        await waitForTeIdle(tc.waitTime.min);
        endRollingCount(this);
    });


	test("Focus Tree View", async function()
	{
        if (exitRollingCount(this)) return;
        if (needsTreeBuild(true)) {
            await focusExplorerView(this);
        }
        else {
            this.slow(tc.slowTime.focusCommandAlreadyFocused + tc.slowTime.min);
            await waitForTeIdle(tc.waitTime.min);
        }
        endRollingCount(this);
	});


    test("Enable App-Publisher Tasks (Off by Default)", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.config.enableEvent);
        await executeSettingsUpdate("enabledTasks.apppublisher", true);
        endRollingCount(this);
    });


    test("Enable Gradle Tasks (Off by Default)", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.config.enableEvent);
        await executeSettingsUpdate("enabledTasks.gradle", true);
        endRollingCount(this);
    });


    test("Enable Pipenv Tasks (Off by Default)", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.config.enableEvent);
        await executeSettingsUpdate("enabledTasks.pipenv", true);
        endRollingCount(this);
    });


    test("Enable Maven Tasks (Off by Default)", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.config.enableEvent);
        await executeSettingsUpdate("enabledTasks.maven", true);
        endRollingCount(this);
    });


    test("Enable Python Tasks (Turned Off in Configuration Suite)", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.config.enableEvent);
        await executeSettingsUpdate("enabledTasks.python", true);
        endRollingCount(this);
    });


    test("Show Favorites Expanded and Last Tasks Collapsed", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow((tc.slowTime.config.eventFast * 2) + (tc.slowTime.config.showHideSpecialFolder * 6) + (tc.slowTime.config.readEvent * 2));
        const showFavorites = teApi.config.get<boolean>("specialFolders.showFavorites");
        const showLastTasks = teApi.config.get<boolean>("specialFolders.showLastTasks");
        await executeSettingsUpdate("specialFolders.showFavorites", false, tc.waitTime.config.showHideSpecialFolder);
        await executeSettingsUpdate("specialFolders.showLastTasks", false, tc.waitTime.config.showHideSpecialFolder);
        try {
            await executeSettingsUpdate("specialFolders.expanded.lastTasks", false);
            await executeSettingsUpdate("specialFolders.showFavorites", true, tc.waitTime.config.showHideSpecialFolder);
            await executeSettingsUpdate("specialFolders.showLastTasks", true, tc.waitTime.config.showHideSpecialFolder);
        }
        catch (e) {
            throw e;
        }
        finally {
            await executeSettingsUpdate("specialFolders.expanded.lastTasks", true);
            await executeSettingsUpdate("specialFolders.showFavorites", showFavorites, tc.waitTime.config.showHideSpecialFolder);
            await executeSettingsUpdate("specialFolders.showLastTasks", showLastTasks, tc.waitTime.config.showHideSpecialFolder);
        }
        endRollingCount(this);
    });


    test("Show Favorites and Last Tasks Collapsed", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow((tc.slowTime.config.eventFast * 2) + (tc.slowTime.config.showHideSpecialFolder * 6) + (tc.slowTime.config.readEvent * 2));
        const showFavorites = teApi.config.get<boolean>("specialFolders.showFavorites");
        const showLastTasks = teApi.config.get<boolean>("specialFolders.showLastTasks");
        await executeSettingsUpdate("specialFolders.showFavorites", false, tc.waitTime.config.showHideSpecialFolder);
        await executeSettingsUpdate("specialFolders.showLastTasks", false, tc.waitTime.config.showHideSpecialFolder);
        try {
            await executeSettingsUpdate("specialFolders.expanded.favorites", false);
            await executeSettingsUpdate("specialFolders.showFavorites", true, tc.waitTime.config.showHideSpecialFolder);
            await executeSettingsUpdate("specialFolders.showLastTasks", true, tc.waitTime.config.showHideSpecialFolder);
        }
        catch (e) {
            throw e;
        }
        finally {
            await executeSettingsUpdate("specialFolders.expanded.favorites", true);
            await executeSettingsUpdate("specialFolders.showLastTasks", showLastTasks, tc.waitTime.config.showHideSpecialFolder);
            await executeSettingsUpdate("specialFolders.showFavorites", showFavorites, tc.waitTime.config.showHideSpecialFolder);
        }
        endRollingCount(this);
    });


    test("Show Last Tasks Collapsed and Favorites Disabled", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow((tc.slowTime.config.eventFast * 4) + (tc.slowTime.config.showHideSpecialFolder * 5) + (tc.slowTime.config.readEvent * 2));
        const showFavorites = teApi.config.get<boolean>("specialFolders.showFavorites");
        const showLastTasks = teApi.config.get<boolean>("specialFolders.showLastTasks");
        await executeSettingsUpdate("specialFolders.showLastTasks", false, tc.waitTime.config.showHideSpecialFolder);
        try {
            await executeSettingsUpdate("specialFolders.expanded.favorites", false);
            await executeSettingsUpdate("specialFolders.expanded.lastTasks", false);
            await executeSettingsUpdate("specialFolders.showFavorites", false, tc.waitTime.config.showHideSpecialFolder);
            await executeSettingsUpdate("specialFolders.showLastTasks", true, tc.waitTime.config.showHideSpecialFolder);
        }
        catch (e) {
            throw e;
        }
        finally {
            await executeSettingsUpdate("specialFolders.expanded.favorites", true);
            await executeSettingsUpdate("specialFolders.expanded.lastTasks", true);
            await executeSettingsUpdate("specialFolders.showLastTasks", showLastTasks, tc.waitTime.config.showHideSpecialFolder);
            await executeSettingsUpdate("specialFolders.showFavorites", showFavorites, tc.waitTime.config.showHideSpecialFolder);
        }
        endRollingCount(this);
    });


    test("Show Favorites Collapsed and Last Tasks Disabled", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow((tc.slowTime.config.eventFast * 2) + (tc.slowTime.config.showHideSpecialFolder * 5) + (tc.slowTime.config.readEvent * 2));
        const showFavorites = teApi.config.get<boolean>("specialFolders.showFavorites");
        const showLastTasks = teApi.config.get<boolean>("specialFolders.showLastTasks");
        await executeSettingsUpdate("specialFolders.showFavorites", false, tc.waitTime.config.showHideSpecialFolder);
        try {
            await executeSettingsUpdate("specialFolders.showFavorites", true, tc.waitTime.config.showHideSpecialFolder);
            await executeSettingsUpdate("specialFolders.showLastTasks", false, tc.waitTime.config.showHideSpecialFolder);
            await executeSettingsUpdate("specialFolders.expanded.favorites", false);
        }
        catch (e) {
            throw e;
        }
        finally {
            await executeSettingsUpdate("specialFolders.expanded.favorites", true);
            await executeSettingsUpdate("specialFolders.showLastTasks", showLastTasks, tc.waitTime.config.showHideSpecialFolder);
            await executeSettingsUpdate("specialFolders.showFavorites", showFavorites, tc.waitTime.config.showHideSpecialFolder);
        }
        endRollingCount(this);
    });


    test("Open Tasks for Edit", async function()
    {
        if (exitRollingCount(this)) return;
        let numOpened = 0,
            numFilesOpened = 0;
        const taskMap = teApi.testsApi.explorer.getTaskMap(),
              filesOpened: string[] = [];
        for (const t of Object.keys(taskMap))
        {
            const taskItem = taskMap[t] as TaskItem;
            await executeTeCommand2("open", [ taskItem ], 4);
            if (!filesOpened.includes(taskItem.taskFile.resourceUri.fsPath)) {
                filesOpened.push(taskItem.taskFile.resourceUri.fsPath);
                ++numFilesOpened;
            }
            ++numOpened;
        }
        this.slow((numFilesOpened * tc.slowTime.findTaskPosition) + ((numOpened - numFilesOpened) * tc.slowTime.findTaskPositionDocOpen));
        endRollingCount(this);
    });


    test("Verify Task Counts", async function()
    {
        if (exitRollingCount(this)) return;
        const taskMap = teApi.testsApi.explorer.getTaskMap();
        let taskCount = treeUtils.findIdInTaskMap(":ant", taskMap);
        expect(taskCount).to.be.equal(7, `Unexpected Ant task count (Found ${taskCount} of 7)`);
        taskCount = treeUtils.findIdInTaskMap(":apppublisher:", taskMap);
        expect(taskCount).to.be.equal(42, `Unexpected App-Publisher task count (Found ${taskCount} of 42)`);
        taskCount = treeUtils.findIdInTaskMap(":bash:", taskMap);
        expect(taskCount).to.be.equal(3, `Unexpected Bash task count (Found ${taskCount} of 3)`);
        taskCount = treeUtils.findIdInTaskMap(":batch:", taskMap);
        expect(taskCount).to.be.equal(4, `Unexpected Batch task count (Found ${taskCount} of 4)`);
        taskCount = treeUtils.findIdInTaskMap(":gradle:", taskMap);
        expect(taskCount).to.be.equal(4, `Unexpected Gradle task count (Found ${taskCount} of 4)`);
        taskCount = treeUtils.findIdInTaskMap(":grunt:", taskMap);
        expect(taskCount).to.be.equal(13, `Unexpected Grunt task count (Found ${taskCount} of 13)`);
        taskCount = treeUtils.findIdInTaskMap(":gulp:", taskMap);
        expect(taskCount).to.be.equal(32, `Unexpected Gulp task count (Found ${taskCount} of 32)`);
        taskCount = treeUtils.findIdInTaskMap(":python:", taskMap);
        expect(taskCount).to.be.equal(2, `Unexpected Python task count (Found ${taskCount} of 2)`);
        taskCount = treeUtils.findIdInTaskMap(":tsc:", taskMap);
        expect(taskCount).to.be.equal(4, `Unexpected Typescript task count (Found ${taskCount} of 4)`);
        taskCount = treeUtils.findIdInTaskMap(":Workspace:", taskMap);
        // There are 3 'User' Workspace/VSCode Tasks but they won't be in the TaskMap
        expect(taskCount).to.be.equal(10, `Unexpected VSCode task count (Found ${taskCount} of 10)`);
        // There are 3 'User' Workspace/VSCode Tasks but they won't be in the TaskMap
        expect(taskCount).to.be.equal(10, `Unexpected VSCode task count (Found ${taskCount} of 10)`);
        endRollingCount(this);
    });


    test("Add to Excludes - TaskItem", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.fetchTasksCommand + tc.slowTime.taskCount.verify + tc.slowTime.config.excludeTasksEvent);
        const grunt = await treeUtils.getTreeTasks("grunt", 13) as TaskItem[],
              taskItems = (await tasks.fetchTasks({ type: "grunt" })).filter(t => !!t.definition.uri),
              gruntCt = taskItems.length,
              taskItem = grunt.find(t => t.taskSource === "grunt" && !t.taskFile.path.startsWith("grunt") && t.task.name === "default" && t.taskFile.fileName === "GRUNTFILE.js");
        await executeTeCommand2("addToExcludes", [ taskItem ], tc.waitTime.config.excludeTasksEvent);
        await verifyTaskCount("grunt", gruntCt - 2); // there are 3 tasks that would getmasked by the task name regex 'default'
        taskFile = taskItem?.taskFile;               // but oe of them is already ignored as it is in an ignored folder
        endRollingCount(this);
    });


    test("Add to Excludes - TaskItem (Script Type)", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.fetchTasksCommand + tc.slowTime.taskCount.verify + tc.slowTime.excludeCommand);
        const batch = await treeUtils.getTreeTasks("batch", 4) as TaskItem[],
              taskItems = await tasks.fetchTasks({ type: "batch" }),
              scriptCt = taskItems.length,
              taskItem = batch.find(t => t.taskSource === "batch" && t.taskFile.fileName.toLowerCase().includes("test2.bat"));
        await executeTeCommand2("addToExcludes", [ taskItem ], tc.waitTime.config.globEvent);
        await verifyTaskCount("batch", scriptCt - 1);
        await executeSettingsUpdate("logging.enable", true); // hit tree.logTask()
        endRollingCount(this);
    });


    test("Add to Excludes - TaskFile", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.fetchTasksCommand + tc.slowTime.taskCount.verify + tc.slowTime.config.excludesEvent);
        const taskItems = (await tasks.fetchTasks({ type: "grunt" })).filter(t => !!t.definition.uri),
              gruntCt = taskItems.length;
        if (taskFile) {
            await executeTeCommand2("addToExcludes", [ taskFile ], tc.waitTime.config.globEvent);
        }
        taskFile = undefined;
        await verifyTaskCount("grunt", gruntCt - 1); // there's just oe more task left in the file we just ignored
        endRollingCount(this);                              // after excluding the task name regex 'default' a few tests above
    });


    test("Disable Task Types Off by Default", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow((tc.slowTime.config.disableEvent * 4) + (tc.slowTime.taskCount.verify * 4));
        await executeSettingsUpdate("enabledTasks.apppublisher", false);
        await executeSettingsUpdate("enabledTasks.gradle", false);
        await executeSettingsUpdate("enabledTasks.maven", false);
        await executeSettingsUpdate("enabledTasks.pipenv", false);
        await verifyTaskCount("apppublisher", 0);
        await verifyTaskCount("gradle", 0);
        await verifyTaskCount("maven", 0);
        await verifyTaskCount("pipenv", 0);
        endRollingCount(this);
    });


    test("Project Folder Collapsed on Start", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.cache.build + tc.slowTime.config.event + tc.slowTime.config.eventFast + tc.slowTime.min +
                  (tc.slowTime.refreshCommand* 2) + (tc.waitTime.refreshCommand* 2));
        await executeSettingsUpdate("logging.enable", false); // was hitting tree.logTask()
        await executeSettingsUpdate("specialFolders.expanded.project1", false, tc.waitTime.config.event);
        await refresh();
        endRollingCount(this);
    });


    test("Groups with Separator", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.config.groupingEvent * 3);
        await executeSettingsUpdate("groupWithSeparator", true);
        await executeSettingsUpdate("groupSeparator", "-");
        await executeSettingsUpdate("groupMaxLevel", 5);
        endRollingCount(this);
    });


    test("Add to Excludes After Grouping", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.config.event + tc.slowTime.config.globEvent + (tc.slowTime.fetchTasksCommand * 2) + tc.slowTime.min);
        const taskItemsB4 = (await tasks.fetchTasks({ type: "grunt" })).filter(t => !!t.definition.uri),
              gruntCt = taskItemsB4.length;
        for (const taskItem of Object.values(taskMap))
        {
            if (taskItem && taskItem.taskSource === "grunt")
            {
                let taskFile = taskItem.taskFile;
                while (taskFile.treeNodes.length === 1 && taskFile.treeNodes[0] instanceof TaskFile && !taskFile.isGroup)
                {
                    taskFile = taskFile.treeNodes[0];
                }
                if (taskFile && taskFile.isGroup && !taskItem.taskFile.path.startsWith("grunt"))
                {
                    await executeTeCommand2("addToExcludes", [ taskFile ]);
                    break;
                }
            }
        }
        const taskItems = (await tasks.fetchTasks({ type: "grunt" })).filter(t => !!t.definition.uri);
        expect(taskItems.length).to.be.equal(gruntCt - 2, `Unexpected grunt task count (Found ${taskItems.length} of ${gruntCt - 2})`);
        await waitForTeIdle(tc.waitTime.min);
        endRollingCount(this);
    });


    test("Remove Temporary Files and Directories", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow((tc.slowTime.fs.deleteFolderEvent * 3) + (tc.slowTime.fs.deleteEvent * (tempFiles.length)) + 4000);
        await deleteTempFilesAndDirectories();
        endRollingCount(this);
    });

});


async function deleteTempFilesAndDirectories()
{
    if (tempFiles.length)
    {
        let file: string | undefined;
        while ((file = tempFiles.shift()))
        {
            try {
                await fsApi.deleteFile(file);
            }
            catch (error) {
                console.log(error);
            }
        }
    }
    try {
        await fsApi.deleteDir(dirNameL2);
        await waitForTeIdle(tc.waitTime.fs.deleteFolderEvent);
        await fsApi.deleteDir(dirName);
        await waitForTeIdle(tc.waitTime.fs.deleteFolderEvent);
        await fsApi.deleteDir(dirNameIgn);
        await waitForTeIdle(tc.waitTime.fs.deleteFolderEvent);
    }
    catch (error) {
        console.log(error);
    }
    tempDirsDeleted = true;
}


async function setupAnt()
{
    await createAntFile();

    const file2 = join(dirName, "test.xml");
    const file3 = join(dirName, "emptytarget.xml");
    const file4 = join(dirName, "emptyproject.xml");
    const file5 = join(dirNameIgn, "build.xml");

    tempFiles.push(file2);
    tempFiles.push(file3);
    tempFiles.push(file4);
    tempFiles.push(file5);

    await fsApi.writeFile(
        file2,
        '<?xml version="1.0"?>\n' +
        '<project basedir="." default="test2">\n' +
        '    <property name="test2" value="test2" />\n' +
        "    <target name='test3'></target>\n" +
        '    <target name="test4"></target>\n' +
        "</project>\n"
    );

    await fsApi.writeFile(
        file3,
        '<?xml version="1.0"?>\n' +
        '<project basedir="." default="test1">\n' +
        '    <property environment="env" />\n' +
        '    <property name="test" value="test" />\n' +
        "</project>\n"
    );

    await fsApi.writeFile(file4, '<?xml version="1.0"?>\n');

    await fsApi.writeFile(
        file5,
        '<?xml version="1.0"?>\n' +
        '<project basedir="." default="test2">\n' +
        '    <property name="testv" value="testv" />\n' +
        "    <target name='test5'></target>\n" +
        "</project>\n"
    );

    await waitForTeIdle(tc.waitTime.fs.createEvent);
}


async function setupGradle()
{
    await createGradleFile();

    const file2 = join(dirName, "TEST.GRADLE");
    const file3 = join(dirNameIgn, "build.gradle");

    tempFiles.push(file2);
    tempFiles.push(file3);

    await fsApi.writeFile(
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

    await fsApi.writeFile(
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

    await waitForTeIdle(tc.waitTime.fs.createEvent);
}


async function setupTsc()
{
    const file = join(rootPath, "tsconfig.json");
    tempFiles.push(file);
    const file2 = join(dirName, "tsconfig.json");
    tempFiles.push(file2);

    await fsApi.writeFile(
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

    await fsApi.writeFile(
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

    await waitForTeIdle(tc.waitTime.fs.createEvent);
}


async function setupGulp()
{
    await createGulpFile();

    const file2 = join(dirName, "Gulpfile.js");
    tempFiles.push(file2);

    const file3 = join(dirNameIgn, "gulpfile.js");
    tempFiles.push(file3);

    const file4 = join(dirName, "GULPFILE.MJS");
    tempFiles.push(file4);

    const file5 = join(dirNameL2, "GULPFILE.js");
    tempFiles.push(file5);


    await fsApi.writeFile(
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

    await fsApi.writeFile(
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

    await fsApi.writeFile(
        file4,
        "import pkg from 'gulp';\n" +
        "const { task, series } = pkg;\n" +
        "function clean2(cb) {\n" +
        "    console.log('clean2!!!');\n" +
        "    cb();\n" +
        "}\n" +
        "function build2(cb) {\n" +
        "    console.log('build2!!!');\n" +
        "    cb();\n" +
        "}\n" +
        "const _build1 = build2;\n" +
        "const _build2 = build2;\n" +
        "const build3 = build2;\n" +
        "const build4 = build2;\n" +
        "export { _build1 as build1 };\n" +
        "export { _build2 as build2 };\n" +
        "export { build3 };\n" +
        "export { build4 };\n" +
        "export const default123 = series(clean2, build2);\n"
    );

    await fsApi.writeFile(
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

    await waitForTeIdle(tc.waitTime.fs.createEvent);
}


async function setupMakefile()
{
    await createMakeFile();

    const file2 = join(dirName, "Makefile");
    tempFiles.push(file2);

    const file3 = join(dirNameIgn, "Makefile");
    tempFiles.push(file3);

    await fsApi.writeFile(
        file2,
        "# all tasks comment\n" +
        "all   : temp.exe\r\n" + "    @echo Building app\r\n" + "clean: t1\r\n" + "    rmdir /q /s ../build\r\n"
    );

    await fsApi.writeFile(
        file3,
        "all   : temp.exe\r\n" + "    @echo Building app\r\n" + "clean: t1\r\n" + "    rmdir /q /s ../build\r\n"
    );

    await waitForTeIdle(tc.waitTime.fs.createEvent);
}


async function setupBatch()
{
    await createBatchFile();

    const file2 = join(dirName, "test2.BAT");
    tempFiles.push(file2);

    const file3 = join(dirNameIgn, "test3.bat");
    tempFiles.push(file3);

    await fsApi.writeFile(file2, "@echo testing batch file 2\r\nsleep /t 5\r\n");
    await fsApi.writeFile(file3, "@echo testing batch file 3\r\n");
    await waitForTeIdle(tc.waitTime.fs.createEvent);
}


async function setupBash()
{
    const file = join(rootPath, "test.sh");
    tempFiles.push(file);

    const file2 = join(dirName, "test2.SH");
    tempFiles.push(file2);

    const file3 = join(dirNameIgn, "test3.sh");
    tempFiles.push(file3);

    await fsApi.writeFile(file, "echo testing bash file\n");
    await fsApi.writeFile(file2, "echo testing bash file 2\n");
    await fsApi.writeFile(file3, "echo testing bash file 3\n");

    await waitForTeIdle(tc.waitTime.fs.createEvent);
}


async function setupGrunt()
{
    await createGruntFile();

    const file2 = join(dirName, "Gruntfile.js");
    tempFiles.push(file2);

    const file3 = join(dirNameIgn, "Gruntfile.js");
    tempFiles.push(file3);

    const file4 = join(dirNameL2, "GRUNTFILE.JS");
    tempFiles.push(file4);

    await fsApi.writeFile(
        file2,
        "module.exports = function(grunt) {\n" +
        '    grunt.registerTask(\n"default2", ["jshint:myproject"]);\n' +
        '    grunt.registerTask("upload2", ["s3"]);\n' +
        "};\n"
    );

    await fsApi.writeFile(
        file3,
        "module.exports = function(grunt) {\n" +
        '    grunt.registerTask(\n"default3", ["jshint:myproject"]);\n' +
        '    grunt.registerTask("upload3", ["s3"]);\n' +
        "};\n"
    );

    await fsApi.writeFile(
        file4,
        "module.exports = function(grunt) {\n" +
        '    grunt.registerTask("grp-test-svr-build1", ["s1"]);\n' +
        '    grunt.registerTask("grp-test-svr-build2", ["s2"]);\n' +
        "};\n"
    );

    await waitForTeIdle(tc.waitTime.fs.createEvent);
}


async function setupAppPublisher()
{
    await createAppPublisherFile();
}


async function setupMaven()
{
    await createMavenPomFile();
}


async function createAntFile()
{
    if (dirName)
    {
        const file = join(dirName, "build.xml");
        tempFiles.push(file);

        if (!await fsApi.pathExists(file))
        {
            await fsApi.writeFile(
                file,
                '<?xml version="1.0"?>\n' +
                '<project basedir="." default="test1">\n' +
                '    <property environment="env" />\n' +
                '    <property name="test" value="test" />\n' +
                '    <target name="test1" depends="init"></target>\n' +
                '    <target name="test2" depends="init"></target>\n' +
                "</project>\n"
            );
            await waitForTeIdle(tc.waitTime.fs.createEvent);
        }
    }
}


async function createAppPublisherFile()
{
    if (rootPath)
    {
        const file = join(rootPath, ".publishrc.json");
        tempFiles.push(file);

        if (!await fsApi.pathExists(file))
        {
            await fsApi.writeFile(
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
            await waitForTeIdle(tc.waitTime.fs.createEvent);
        }
    }
}


async function createMavenPomFile()
{
    if (rootPath)
    {
        const file = join(rootPath, "pom.xml");
        tempFiles.push(file);

        if (!await fsApi.pathExists(file))
        {
            await fsApi.writeFile(
                file,
                "<project xmlns=\"http://maven.apache.org/POM/4.0.0\">\n" +
                "    <modelVersion>4.0.0</modelVersion>\n" +
                "</project>\n"
            );
            await waitForTeIdle(tc.waitTime.fs.createEvent);
        }
    }
}


async function createBatchFile()
{
    if (rootPath)
    {
        const file = join(rootPath, "test.bat");
        tempFiles.push(file);
        if (!await fsApi.pathExists(file))
        {
            await fsApi.writeFile(file, "@echo testing batch file\r\n");
            await waitForTeIdle(tc.waitTime.fs.createEvent);
        }
    }
}


async function createGradleFile()
{
    if (dirName)
    {
        const file = join(dirName, "build.gradle");
        tempFiles.push(file);

        if (!await fsApi.pathExists(file))
        {
            await fsApi.writeFile(
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
            await waitForTeIdle(tc.waitTime.fs.createEvent);
        }
    }
}


async function createGruntFile()
{
    if (rootPath)
    {
        const file = join(rootPath, "GRUNTFILE.js");
        tempFiles.push(file);

        if (!await fsApi.pathExists(file))
        {
            await fsApi.writeFile(
                file,
                "module.exports = function(grunt) {\n" +
                "    grunt.registerTask(\n'default', ['jshint:myproject']);\n" +
                '    grunt.registerTask("upload", [\'s3\']);\n' +
                "};\n"
            );
            await waitForTeIdle(tc.waitTime.fs.createEvent);
        }
    }
}


async function createGulpFile()
{
    if (rootPath)
    {
        const file = join(rootPath, "gulpfile.js");
        tempFiles.push(file);

        if (!await fsApi.pathExists(file))
        {
            await fsApi.writeFile(
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
            await waitForTeIdle(tc.waitTime.fs.createEvent);
        }
    }
}


async function createMakeFile()
{
    if (rootPath)
    {
        const file = join(rootPath, "Makefile");
        tempFiles.push(file);

        if (!await fsApi.pathExists(file))
        {
            await fsApi.writeFile(
                file,
                "all   : temp.exe\r\n" + "    @echo Building app\r\n" + "clean: t1\r\n" + "    rmdir /q /s ../build\r\n"
            );
            await waitForTeIdle(tc.waitTime.fs.createEvent);
        }
    }
}
