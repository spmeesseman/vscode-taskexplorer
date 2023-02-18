/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */

// Note:  FileWatcher.onWsFoldersChange() is Exported for testsApi to mimic the workspace
//        folder add/remove events in test suites.
//        Te updateWorkSpaceFolders() call does not work when running tests, the testing
//        instance of VSCode even pops up an info message saying so.  So for now we mimic
//        as best we can by exporting onWsFoldersChange() to be added to the ITestsApi so
//        that the test suites can mimic the add ws folder event.  But...  When I first
//        started messing with the updateWorkspaceFolders() function, it saved the state
//        and on subsequent loads it was trying to load the ws folders that had "failed"
//        to be added.  Loading because of cache data in /.vscode-test.  And when it did
//        that, it opened as a multi-root ws, I could then keep that instance open (it also
//        launched the normal test instance), and, the ws folder adds succeed.  Unfortunately
//        i can;t figure out how to start tests using a multi-root workspace, doesn't seem
//        like its supported :(  SO this is the best we can do...

import { join } from "path";
import { startupFocus } from "../utils/suiteUtils";
import { Task, Uri, workspace, WorkspaceFolder } from "vscode";
import { onWsFoldersChange } from "../../lib/watcher/fileWatcher";
import { ITeWrapper, ITaskItem } from "@spmeesseman/vscode-taskexplorer-types";
import { executeSettingsUpdate, focusExplorerView, focusSearchView } from "../utils/commandUtils";
import {
    activate, endRollingCount, exitRollingCount, getProjectsPath, sleep, suiteFinished,
    testControl as tc, verifyTaskCount, waitForTeIdle
} from "../utils/utils";

const gruntCt = 7;
const originalGetWorkspaceFolder = workspace.getWorkspaceFolder;

let fakeWsfStartIdx = 1;
let teWrapper: ITeWrapper;
let sortAlpha: boolean;
let sortAlphaReset: boolean;
let testsPath: string;
let wsf1DirName: string;
let wsf2DirName: string;
let wsf3DirName: string;
let wsf4DirName: string;
const wsf: WorkspaceFolder[] = [];


suite("Multi-Root Workspace Tests", () =>
{
    suiteSetup(async function()
    {
        if (exitRollingCount(this, true)) return;
        ({ teWrapper } = await activate(this));

        sortAlpha = teWrapper.config.get<boolean>("sortProjectFoldersAlpha");
        await teWrapper.config.updateVs("grunt.autoDetect", false); // we ignore internally provided grunt tasks when building the tree
                                                                // so make sure they're off for the verifyTaskCount() calls
        testsPath = getProjectsPath(".");
        wsf1DirName = join(testsPath, "wsf1");
        await teWrapper.fs.createDir(wsf1DirName);
        wsf2DirName = join(testsPath, "wsf2");
        await teWrapper.fs.createDir(wsf2DirName);
        wsf3DirName = join(testsPath, "wsf3");
        await teWrapper.fs.createDir(wsf3DirName);
        wsf4DirName = join(testsPath, "wsf4");
        await teWrapper.fs.createDir(wsf4DirName);

        wsf.push((workspace.workspaceFolders as WorkspaceFolder[])[0]);
        if (tc.isMultiRootWorkspace) {
            fakeWsfStartIdx = 2;
            wsf.push((workspace.workspaceFolders as WorkspaceFolder[])[1]);
        }
        wsf.push(...[
        {
            uri: Uri.file(wsf1DirName),
            name: "wsf1",
            index: fakeWsfStartIdx
        },
        {
            uri: Uri.file(wsf2DirName),
            name: "wsf2",
            index: fakeWsfStartIdx + 1
        },
        {
            uri: Uri.file(wsf3DirName),
            name: "wsf3",
            index: fakeWsfStartIdx + 2
        },
        {
            uri: Uri.file(wsf4DirName),
            name: "wsf4",
            index: fakeWsfStartIdx + 3
        }]);

        endRollingCount(this, true);
    });


    suiteTeardown(async function()
    {
        if (exitRollingCount(this, false, true)) return;
        if (!teWrapper.explorer?.isVisible()) {
            await focusExplorerView(teWrapper);
        }
        await teWrapper.config.updateVs("grunt.autoDetect", tc.vsCodeAutoDetectGrunt);
        if (!tc.isMultiRootWorkspace) {
            workspace.getWorkspaceFolder = originalGetWorkspaceFolder;
        }
        if (!sortAlphaReset){
            await executeSettingsUpdate("sortProjectFoldersAlpha", sortAlpha);
        }
        await teWrapper.fs.deleteDir(wsf1DirName);
        await teWrapper.fs.deleteDir(wsf2DirName);
        await teWrapper.fs.deleteDir(wsf3DirName);
        await teWrapper.fs.deleteDir(wsf4DirName);
        suiteFinished(this);
    });


	test("Focus Explorer View", async function()
	{
        await startupFocus(this);
	});


    test("Add Undefined Workspace", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.commands.standard);
        await teWrapper.filecache.addWsFolders(undefined);
        await waitForTeIdle(tc.waitTime.command);
        endRollingCount(this);
    });


    test("Add Workspace Folder 1 (Empty)", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.wsFolder.addEmpty + tc.slowTime.taskCount.verify);
        if (!tc.isMultiRootWorkspace)
        {
            await onWsFoldersChange({
                added: [ wsf[fakeWsfStartIdx] ],
                removed: []
            });
        }
        else {
            workspace.updateWorkspaceFolders(2, null, wsf[fakeWsfStartIdx]);
        }
        await waitForTeIdle(tc.waitTime.addWorkspaceFolder);
        await verifyTaskCount("grunt", gruntCt);
        endRollingCount(this);
    });


    test("Add Workspace Folders 2 and 3 (Empty)", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.wsFolder.addEmpty * 2);
        if (!tc.isMultiRootWorkspace)
        {
            await onWsFoldersChange({
                added: [ wsf[fakeWsfStartIdx + 1], wsf[fakeWsfStartIdx + 2] ],
                removed: []
            });
        }
        else {
            workspace.updateWorkspaceFolders(3, null, wsf[fakeWsfStartIdx + 1], wsf[fakeWsfStartIdx + 2]);
        }
        await waitForTeIdle(tc.waitTime.addWorkspaceFolder * 2);
        endRollingCount(this);
    });


    test("Add Workspace Folder 4 (Empty)", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.wsFolder.addEmpty);
        if (!tc.isMultiRootWorkspace)
        {
            await onWsFoldersChange({
                added: [ wsf[fakeWsfStartIdx + 3] ],
                removed: []
            });
        }
        else {
            workspace.updateWorkspaceFolders(5, null, wsf[fakeWsfStartIdx + 3]);
        }
        await waitForTeIdle(tc.waitTime.addWorkspaceFolder);
        endRollingCount(this);
    });


    test("Re-order Workspace Folders", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.wsFolder.reorder * 3);
        teWrapper.configwatcher = false;
        await executeSettingsUpdate("sortProjectFoldersAlpha", true);
        teWrapper.configwatcher = true;
        await onWsFoldersChange({
            added: [],
            removed: []
        });
        await waitForTeIdle(tc.waitTime.reorderWorkspaceFolders);
        teWrapper.configwatcher = false;
        await executeSettingsUpdate("sortProjectFoldersAlpha", false);
        teWrapper.configwatcher = true;
        await onWsFoldersChange({
            added: [],
            removed: []
        });
        await waitForTeIdle(tc.waitTime.reorderWorkspaceFolders);
        teWrapper.configwatcher = false;
        await executeSettingsUpdate("sortProjectFoldersAlpha", sortAlpha);
        sortAlphaReset = true;
        teWrapper.configwatcher = true;
        endRollingCount(this);
    });


    test("Remove Workspace Folder 1 (Empty)", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.wsFolder.removeEmpty);
        if (!tc.isMultiRootWorkspace)
        {
            await onWsFoldersChange({
                added: [],
                removed: [ wsf[fakeWsfStartIdx] ]
            });
        }
        else {
            workspace.updateWorkspaceFolders(2, 1);
        }
        await waitForTeIdle(tc.waitTime.removeWorkspaceFolder);
        endRollingCount(this);
    });


    test("Remove Workspace Folder 2 and 3 (Empty)", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.wsFolder.removeEmpty * 2);
        if (!tc.isMultiRootWorkspace)
        {
            await onWsFoldersChange({
                added: [],
                removed: [ wsf[fakeWsfStartIdx + 1], wsf[fakeWsfStartIdx + 2] ]
            });
        }
        else {
            workspace.updateWorkspaceFolders(2, 2);
        }
        await waitForTeIdle(tc.waitTime.removeWorkspaceFolder);
        endRollingCount(this);
    });


    test("Remove Workspace Folder 4 (Empty)", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.wsFolder.removeEmpty + tc.slowTime.taskCount.verify);
        if (!tc.isMultiRootWorkspace)
        {
            await onWsFoldersChange({
                added: [],
                removed: [ wsf[fakeWsfStartIdx + 3] ]
            });
        }
        else {
            workspace.updateWorkspaceFolders(2, 1);
        }
        await waitForTeIdle(tc.waitTime.removeWorkspaceFolder);
        await verifyTaskCount("grunt", gruntCt);
        endRollingCount(this);
    });


    test("Add Workspace Folder 1 (w/ File)", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.wsFolder.add + tc.slowTime.taskCount.verify);
        await teWrapper.fs.writeFile(
            join(wsf1DirName, "Gruntfile.js"),
            "module.exports = function(grunt) {\n" +
            '    grunt.registerTask(\n"default2", ["jshint:myproject2"]);\n' +
            '    grunt.registerTask("upload2", ["s2"]);\n' +
            "};\n"
        );
        if (!tc.isMultiRootWorkspace)
        {
            workspace.getWorkspaceFolder = (uri: Uri) =>
            {
                return wsf[uri.fsPath.includes("test-fixture") ? 0 : fakeWsfStartIdx];
            };
            await onWsFoldersChange({
                added: [ wsf[fakeWsfStartIdx] ],
                removed: []
            });
            await waitForTeIdle(tc.waitTime.addWorkspaceFolder);
            await verifyTaskCount("grunt", gruntCt); // vscode won't return the fake ws folder's tasks in fetchTasks()
        }
        else {
            workspace.updateWorkspaceFolders(2, null, wsf[fakeWsfStartIdx]);
            await waitForTeIdle(tc.waitTime.addWorkspaceFolder);
            await verifyTaskCount("grunt", gruntCt + 2);
        }
        endRollingCount(this);
    });


    test("Add Workspace Folder 2, 3, and 4 (w/ File)", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow((tc.slowTime.wsFolder.add * 3) + tc.slowTime.taskCount.verify);
        await teWrapper.fs.writeFile(
            join(wsf2DirName, "Gruntfile.js"),
            "module.exports = function(grunt) {\n" +
            '    grunt.registerTask(\n"default3", ["jshint:myproject3"]);\n' +
            '    grunt.registerTask("upload3", ["s3"]);\n' +
            "};\n"
        );
        await teWrapper.fs.copyFile(join(wsf2DirName, "Gruntfile.js"), join(wsf3DirName, "Gruntfile.JS"));
        await teWrapper.fs.copyFile(join(wsf2DirName, "Gruntfile.js"), join(wsf4DirName, "GRUNTFILE.js"));
        if (!tc.isMultiRootWorkspace)
        {
            workspace.getWorkspaceFolder = (uri: Uri) =>
            {
                return wsf[uri.fsPath.includes("test-fixture") ? 0 : fakeWsfStartIdx + 1];
            };
            await onWsFoldersChange({
                added: [ wsf[fakeWsfStartIdx + 1], wsf[fakeWsfStartIdx + 2], wsf[fakeWsfStartIdx + 3] ],
                removed: []
            });
            await waitForTeIdle(tc.waitTime.addWorkspaceFolder * 2);
            await verifyTaskCount("grunt", gruntCt); // vscode won't return the fake ws folder's tasks in fetchTasks()
        }
        else {
            workspace.updateWorkspaceFolders(3, null, wsf[fakeWsfStartIdx + 1], wsf[fakeWsfStartIdx + 2], wsf[fakeWsfStartIdx + 3]);
            await waitForTeIdle(tc.waitTime.addWorkspaceFolder * 2);
            await verifyTaskCount("grunt", gruntCt + 8);
        }
        endRollingCount(this);
    });


    test("Remove Workspace Folder 1 (w/ File)", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.wsFolder.remove + tc.slowTime.taskCount.verify);
        if (!tc.isMultiRootWorkspace)
        {   // Push task and task item, vscode knows they're fake and won't return them in fetchTasks()
            const taskMap = teWrapper.treeManager.getTaskMap(),
                  tasks = teWrapper.treeManager.getTasks();
            tasks.push({
                definition: {
                    type: "grunt",
                    uri: wsf[fakeWsfStartIdx].uri
                }
            } as unknown as Task);
            taskMap.fakeTaskId1 = {
                id: "fakeTaskId1",
                resourceUri: wsf[fakeWsfStartIdx].uri
            } as unknown as ITaskItem;
            workspace.getWorkspaceFolder = originalGetWorkspaceFolder;
            await onWsFoldersChange({
                added: [],
                removed: [ wsf[fakeWsfStartIdx] ]
            });
            await waitForTeIdle(tc.waitTime.removeWorkspaceFolder);
            await verifyTaskCount("grunt", gruntCt); // vscode doesn't return the fake ws folder's tasks in fetchTasks()
        }
        else {
            workspace.updateWorkspaceFolders(2, 1);
            await waitForTeIdle(tc.waitTime.removeWorkspaceFolder);
            await verifyTaskCount("grunt", gruntCt + 6);
        }
        endRollingCount(this);
    });


    test("Switch Views (Hide/Blur Explorer)", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.commands.focusChangeViews + 10);
        await focusSearchView();
        await sleep(5);
        await waitForTeIdle(tc.waitTime.blurCommand);
        endRollingCount(this);
    });


    test("Remove Workspace Folder 2 (w/ File)", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.wsFolder.remove + tc.slowTime.taskCount.verify);
        if (!tc.isMultiRootWorkspace)
        {   // Push task and task item, vscode knows they're fake and won't return them in fetchTasks()
            const taskMap = teWrapper.treeManager.getTaskMap(),
                  tasks = teWrapper.treeManager.getTasks();
            tasks.push({
                definition: {
                    type: "grunt",
                    uri: wsf[fakeWsfStartIdx + 1].uri
                }
            } as unknown as Task);
            taskMap.fakeTaskId2 = {
                id: "fakeTaskId2",
                resourceUri: wsf[fakeWsfStartIdx + 1].uri
            } as unknown as ITaskItem;
            await onWsFoldersChange({
                added: [],
                removed: [ wsf[fakeWsfStartIdx + 1] ]
            });
            await waitForTeIdle(tc.waitTime.removeWorkspaceFolder);
            await verifyTaskCount("grunt", gruntCt); // vscode doesn't return the fake ws folder's tasks in fetchTasks()
        }
        else {
            workspace.updateWorkspaceFolders(2, 1);
            await waitForTeIdle(tc.waitTime.removeWorkspaceFolder);
            await verifyTaskCount("grunt", gruntCt + 4);
        }
        endRollingCount(this);
    });


    test("Remove Workspace Folder 3 and 4 (w/ File)", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow((tc.slowTime.wsFolder.remove * 2) + tc.slowTime.taskCount.verify);
        if (!tc.isMultiRootWorkspace)
        {   // Push tasks and task items, vscode knows they're fake and won't return them in fetchTasks()
            const taskMap = teWrapper.treeManager.getTaskMap(),
                  tasks = teWrapper.treeManager.getTasks();
            tasks.push({
                definition: {
                    type: "grunt",
                    uri: wsf[fakeWsfStartIdx + 2].uri
                }
            } as unknown as Task);
            taskMap.fakeTaskId3 = {
                id: "fakeTaskId3",
                resourceUri: wsf[fakeWsfStartIdx + 2].uri
            } as unknown as ITaskItem;
            tasks.push({
                definition: {
                    type: "grunt",
                    uri: wsf[fakeWsfStartIdx + 3].uri
                }
            } as unknown as Task);
            taskMap.fakeTaskId4 = {
                id: "fakeTaskId4",
                resourceUri: wsf[fakeWsfStartIdx + 3].uri
            } as unknown as ITaskItem;
            await onWsFoldersChange({
                added: [],
                removed: [ wsf[fakeWsfStartIdx + 2], wsf[fakeWsfStartIdx + 3] ]
            });
        }
        else {
            workspace.updateWorkspaceFolders(2, 2);
        }
        await waitForTeIdle(tc.waitTime.removeWorkspaceFolder * 2);
        await verifyTaskCount("grunt", gruntCt);
        endRollingCount(this);
    });


    test("Switch Views (Show/Focus Explorer)", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.commands.focus);
        await focusExplorerView(teWrapper);
        await waitForTeIdle(tc.waitTime.focusCommand);
        endRollingCount(this);
    });


    test("Add WS Folder 1 (Cache Builder Busy)", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.wsFolder.add + tc.slowTime.taskCount.verify + tc.slowTime.cache.rebuildCancel + 200);
        teWrapper.filecache.rebuildCache(""); // Don't 'await'
        await sleep(100);
        if (!tc.isMultiRootWorkspace)
        {
            workspace.getWorkspaceFolder = (uri: Uri) =>
            {
                return wsf[uri.fsPath.includes("test-fixture") ? 0 : fakeWsfStartIdx];
            };
            await onWsFoldersChange({
                added: [ wsf[fakeWsfStartIdx] ],
                removed: []
            });
            await waitForTeIdle(tc.waitTime.addWorkspaceFolder);
            await verifyTaskCount("grunt", gruntCt); // vscode doesn't return the fake ws folder's tasks in fetchTasks()
        }
        else {
            workspace.updateWorkspaceFolders(2, null, wsf[fakeWsfStartIdx]);
            await waitForTeIdle(tc.waitTime.addWorkspaceFolder);
            await verifyTaskCount("grunt", gruntCt + 2);
        }
        endRollingCount(this);
    });


    test("Remove WS Folder 1 (Cache Builder Busy)", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.wsFolder.remove + tc.slowTime.taskCount.verify + tc.slowTime.cache.rebuildCancel + 200);
        teWrapper.filecache.rebuildCache(""); // Don't 'await'
        await sleep(100);
        if (!tc.isMultiRootWorkspace)
        {
            workspace.getWorkspaceFolder = originalGetWorkspaceFolder;
            await onWsFoldersChange({ // event will wait for previous fil cache build
                added: [],
                removed: [ wsf[fakeWsfStartIdx] ]
            });
        }
        else {
            workspace.updateWorkspaceFolders(2, 1);
        }
        await waitForTeIdle(tc.waitTime.removeWorkspaceFolder);
        await verifyTaskCount("grunt", gruntCt);
        endRollingCount(this);
    });

});
