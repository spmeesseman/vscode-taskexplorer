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
import { tasks } from "vscode";
import { refresh } from "../utils/treeUtils";
import { executeSettingsUpdate, executeTeCommand2, focusExplorerView } from "../utils/commandUtils";
import { ITaskExplorerApi, TaskMap, IFilesystemApi, ITaskFile } from "@spmeesseman/vscode-taskexplorer-types";
import {
    activate, endRollingCount, exitRollingCount, getWsPath, needsTreeBuild, suiteFinished, testControl as tc,
    treeUtils, verifyTaskCount, waitForTeIdle
} from "../utils/utils";


const tempFiles: string[] = [];

let teApi: ITaskExplorerApi;
let fsApi: IFilesystemApi;
let taskFile: ITaskFile | undefined;
let rootPath: string;
let dirName: string;
let dirNameL2: string;
let dirNameIgn: string;
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


    test("Create Temporary Task Files - Batch", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.fs.createEvent * 3);
        await setupBatch();
        endRollingCount(this);
    });


    test("Create Temporary Task Files - Grunt", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.fs.createEvent * 4);
        await setupGrunt();
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
        expect(taskCount).to.be.equal(3, `Unexpected Ant task count (Found ${taskCount} of 7)`);
        taskCount = treeUtils.findIdInTaskMap(":bash:", taskMap);
        expect(taskCount).to.be.equal(1, `Unexpected Bash task count (Found ${taskCount} of 3)`);
        taskCount = treeUtils.findIdInTaskMap(":batch:", taskMap);
        expect(taskCount).to.be.equal(4, `Unexpected Batch task count (Found ${taskCount} of 4)`);
        taskCount = treeUtils.findIdInTaskMap(":grunt:", taskMap);
        expect(taskCount).to.be.equal(13, `Unexpected Grunt task count (Found ${taskCount} of 13)`);
        taskCount = treeUtils.findIdInTaskMap(":gulp:", taskMap);
        expect(taskCount).to.be.equal(17, `Unexpected Gulp task count (Found ${taskCount} of 32)`);
        taskCount = treeUtils.findIdInTaskMap(":python:", taskMap);
        expect(taskCount).to.be.equal(2, `Unexpected Python task count (Found ${taskCount} of 2)`);
        taskCount = treeUtils.findIdInTaskMap(":Workspace:", taskMap);
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
        const taskMap = teApi.testsApi.explorer.getTaskMap(),
              taskItemsB4 = (await tasks.fetchTasks({ type: "grunt" })).filter(t => !!t.definition.uri),
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
