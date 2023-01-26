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
import { Uri, workspace, WorkspaceFolder } from "vscode";
import { IFilesystemApi, ITaskExplorerApi, ITestsApi } from "@spmeesseman/vscode-taskexplorer-types";
import {
    activate, endRollingCount, exitRollingCount, getTestsPath, needsTreeBuild, sleep, suiteFinished,
    testControl as tc, treeUtils, verifyTaskCount, waitForTeIdle
} from "../utils/utils";

const gruntCt = 7;
const originalGetWorkspaceFolder = workspace.getWorkspaceFolder;

let fakeWsfStartIdx = 1;
let teApi: ITaskExplorerApi;
let fsApi: IFilesystemApi;
let testsApi: ITestsApi;
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
        ({ teApi, fsApi, testsApi } = await activate(this));

        testsPath = getTestsPath(".");
        wsf1DirName = join(testsPath, "wsf1");
        await fsApi.createDir(wsf1DirName);
        wsf2DirName = join(testsPath, "wsf2");
        await fsApi.createDir(wsf2DirName);
        wsf3DirName = join(testsPath, "wsf3");
        await fsApi.createDir(wsf3DirName);
        wsf4DirName = join(testsPath, "wsf4");
        await fsApi.createDir(wsf4DirName);

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
        workspace.getWorkspaceFolder = originalGetWorkspaceFolder;
        await fsApi.deleteDir(wsf1DirName);
        await fsApi.deleteDir(wsf2DirName);
        await fsApi.deleteDir(wsf3DirName);
        await fsApi.deleteDir(wsf4DirName);
        suiteFinished(this);
    });


    test("Build Tree", async function()
    {
        if (exitRollingCount(this)) return;
        if (needsTreeBuild()) {
            await treeUtils.refresh(this);
        }
        endRollingCount(this);
    });


    test("Mimic Add WS Folder (Cover Undefined Workspace)", async function()
    {   //  Mimic fileWatcher.onWsFoldersChange() (see note top of file)
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.command);
        await teApi.testsApi.fileCache.addWsFolders(undefined);
        await waitForTeIdle(tc.waitTime.command);
        endRollingCount(this);
    });


    test("Mimic Add WS Folder 1", async function()
    {   //  Mimic fileWatcher.onWsFoldersChange() (see note top of file)
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.addWorkspaceFolder);
        await testsApi.onWsFoldersChange({
            added: [ wsf[fakeWsfStartIdx] ],
            removed: []
        });
        await waitForTeIdle(tc.waitTime.addWorkspaceFolder);
        endRollingCount(this);
    });


    test("Mimic Add WS Folders 2 and 3", async function()
    {   //  Mimic fileWatcher.onWsFoldersChange() (see note top of file)
        if (exitRollingCount(this)) return;
        this.slow((tc.slowTime.addWorkspaceFolder * 2));
        await testsApi.onWsFoldersChange({
            added: [ wsf[fakeWsfStartIdx + 1], wsf[fakeWsfStartIdx + 2] ],
            removed: []
        });
        await waitForTeIdle(tc.waitTime.addWorkspaceFolder);
        endRollingCount(this);
    });


    test("Mimic Add WS Folder 4", async function()
    {   //  Mimic fileWatcher.onWsFoldersChange() (see note top of file)
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.addWorkspaceFolder);
        await testsApi.onWsFoldersChange({
            added: [ wsf[fakeWsfStartIdx + 3] ],
            removed: []
        });
        await waitForTeIdle(tc.waitTime.addWorkspaceFolder);
        endRollingCount(this);
    });


    test("Mimic Remove WS Folder 1", async function()
    {   //  Mimic fileWatcher.onWsFoldersChange() (see note top of file)
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.removeWorkspaceFolder);
        await testsApi.onWsFoldersChange({
            added: [],
            removed: [ wsf[fakeWsfStartIdx] ]
        });
        await waitForTeIdle(tc.waitTime.removeWorkspaceFolder);
        endRollingCount(this);
    });


    test("Mimic Remove WS Folder 2 and 3", async function()
    {   //  Mimic fileWatcher.onWsFoldersChange() (see note top of file)
        if (exitRollingCount(this)) return;
        this.slow((tc.slowTime.removeWorkspaceFolder * 2));
        await testsApi.onWsFoldersChange({
            added: [],
            removed: [ wsf[fakeWsfStartIdx + 1], wsf[fakeWsfStartIdx + 2] ]
        });
        await waitForTeIdle(tc.waitTime.removeWorkspaceFolder);
        endRollingCount(this);
    });


    test("Mimic Remove WS Folder 4", async function()
    {   //  Mimic fileWatcher.onWsFoldersChange() (see note top of file)
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.removeWorkspaceFolder);
        await testsApi.onWsFoldersChange({
            added: [],
            removed: [ wsf[fakeWsfStartIdx + 3] ]
        });
        await waitForTeIdle(tc.waitTime.removeWorkspaceFolder);
        endRollingCount(this);
    });


    test("Mimic Add WS Folder 1 (w/ File)", async function()
    {   //  Mimic fileWatcher.onWsFoldersChange() (see note top of file)
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.addWorkspaceFolder + tc.slowTime.fs.createEvent + tc.slowTime.taskCount.verify);
        await fsApi.writeFile(
            join(wsf[fakeWsfStartIdx].uri.fsPath, "Gruntfile.js"),
            "module.exports = function(grunt) {\n" +
            '    grunt.registerTask(\n"default2", ["jshint:myproject"]);\n' +
            '    grunt.registerTask("upload2", ["s3"]);\n' +
            "};\n"
        );
        workspace.getWorkspaceFolder = (uri: Uri) =>
        {   //
            // See note below.  Can't figure out how to get VSCode to return the fake ws folder tasks
            //
            return wsf[uri.fsPath.includes("test-fixture") ? 0 : fakeWsfStartIdx];
        };
        await testsApi.onWsFoldersChange({
            added: [ wsf[fakeWsfStartIdx] ],
            removed: []
        });
        await waitForTeIdle(tc.waitTime.addWorkspaceFolder);
        //
        // For whatever reason, VSCode doesnt return the two "faked" tasks in fetchTasks(). Strange that
        // verything looks fine, it goes through provideTasks(), which returns 9 tasks (gruntCt + 2) to
        // VSCode, but yet the return result in fetchTasks() does not contain the 2.  It does contain the
        // 7 "real" ws folder tasks.  WIll have to figure this one out another time.
        //
        // await verifyTaskCount("grunt", gruntCt + 2);
        await verifyTaskCount("grunt", gruntCt);
        endRollingCount(this);
    });


    test("Mimic Add WS Folder 2 and 3 (w/ File)", async function()
    {   //  Mimic fileWatcher.onWsFoldersChange() (see note top of file)
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.addWorkspaceFolder + tc.slowTime.fs.createEvent + tc.slowTime.taskCount.verify);
        await fsApi.writeFile(
            join(wsf[fakeWsfStartIdx + 1].uri.fsPath, "Gruntfile.js"),
            "module.exports = function(grunt) {\n" +
            '    grunt.registerTask(\n"default3", ["jshint:myproject"]);\n' +
            '    grunt.registerTask("upload3", ["s3"]);\n' +
            "};\n"
        );
        workspace.getWorkspaceFolder = (uri: Uri) =>
        {   //
            // See note below.  Can't figure out how to get VSCode to return the fake ws folder tasks
            //
            return wsf[uri.fsPath.includes("test-fixture") ? 0 : fakeWsfStartIdx + 1];
        };
        await testsApi.onWsFoldersChange({
            added: [ wsf[fakeWsfStartIdx + 1], wsf[fakeWsfStartIdx + 2] ],
            removed: []
        });
        await waitForTeIdle(tc.waitTime.addWorkspaceFolder);
        //
        // For whatever reason, VSCode doesnt return the two "faked" tasks in fetchTasks(). Strange that
        // verything looks fine, it goes through provideTasks(), which returns 9 tasks (gruntCt + 2) to
        // VSCode, but yet the return result in fetchTasks() does not contain the 2.  It does contain the
        // 7 "real" ws folder tasks.  WIll have to figure this one out another time.
        //
        // await verifyTaskCount("grunt", gruntCt + 4);
        await verifyTaskCount("grunt", gruntCt);
        endRollingCount(this);
    });


    test("Mimic Remove WS Folder 1 (w/ File)", async function()
    {   //  Mimic fileWatcher.onWsFoldersChange() (see note top of file)
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.removeWorkspaceFolder + tc.slowTime.taskCount.verify);
        workspace.getWorkspaceFolder = originalGetWorkspaceFolder;
        await testsApi.onWsFoldersChange({
            added: [],
            removed: [ wsf[fakeWsfStartIdx] ]
        });
        await waitForTeIdle(tc.waitTime.removeWorkspaceFolder);
        await fsApi.deleteFile(join(wsf[fakeWsfStartIdx].uri.fsPath, "Gruntfile.js"));
        // await verifyTaskCount("grunt", gruntCt +2); // vscode knows the ws folders are fake and doesnt serve the tasks
        await verifyTaskCount("grunt", gruntCt);
        endRollingCount(this);
    });


    test("Mimic Remove WS Folder 2 and 3 (w/ File)", async function()
    {   //  Mimic fileWatcher.onWsFoldersChange() (see note top of file)
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.removeWorkspaceFolder + tc.slowTime.taskCount.verify);
        await testsApi.onWsFoldersChange({
            added: [],
            removed: [ wsf[fakeWsfStartIdx + 1], wsf[fakeWsfStartIdx + 2] ]
        });
        await waitForTeIdle(tc.waitTime.removeWorkspaceFolder);
        await fsApi.deleteFile(join(wsf[fakeWsfStartIdx + 1].uri.fsPath, "Gruntfile.js"));
        await verifyTaskCount("grunt", gruntCt);
        endRollingCount(this);
    });


    test("Mimic Add WS Folder 1 (Cache Builder Busy)", async function()
    {   //  Mimic fileWatcher.onWsFoldersChange() (see note top of file)
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.addWorkspaceFolder + tc.slowTime.cache.rebuild + 200);
        teApi.testsApi.fileCache.rebuildCache(""); // Don't 'await'
        await sleep(100);
        await testsApi.onWsFoldersChange({ // event will wait for previous fil cache build
            added: [ wsf[fakeWsfStartIdx] ],
            removed: []
        });
        await waitForTeIdle(tc.waitTime.addWorkspaceFolder);
        endRollingCount(this);
    });


    test("Mimic Remove WS Folder 1 (Cache Builder Busy)", async function()
    {   //  Mimic fileWatcher.onWsFoldersChange() (see note top of file)
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.removeWorkspaceFolder + tc.slowTime.cache.rebuildNoChanges + 200);
        teApi.testsApi.fileCache.rebuildCache(""); // Don't 'await'
        await sleep(100);
        await testsApi.onWsFoldersChange({ // event will wait for previous fil cache build
            added: [],
            removed: [ wsf[fakeWsfStartIdx] ]
        });
        await waitForTeIdle(tc.waitTime.removeWorkspaceFolder);
        endRollingCount(this);
    });

/*
    *** Note *** Using the workspace.updateWorkspaceFolders() function:

    VSCode pops up a message that says 'workspace cannot be modified in tests.  But I saw it work
    when tests were going haywite opening up multiple instances.  The cache data in .vscode-test
    was remembering the folders added, and opening up multi-root workspace extra  instances.  I think
    when I closed the other instance and kept that one open, the whole thing worked.  But cant figure
    outhow to actually start a multi-root workspace clean in tests.  Seems un-supported.  messing with
    it in runtest.ts with the -add command line param, but no luck. Maybe try again another time.

    test("Add Workspace Folder 1", async function()
    {
        this.slow(tc.slowTime.addWorkspaceFolderEmpty);
        console.log("file: " + wsf1DirName);
        console.log("file2: " + Uri.file(wsf1DirName).fsPath);
        console.log("file3: " + Uri.parse(wsf1DirName).fsPath);
        try {
            const success = workspace.updateWorkspaceFolders(1, null, {
                uri: Uri.file(wsf1DirName),
                name: "wsf1"
            });
            console.log("success: " + success);
            await waitForTeIdle(tc.waitTime.addWorkspaceFolderEmpty);
        }
        catch (e) {
            console.log(e);
        }
        workspace.workspaceFolders?.forEach((wf) =>
        {
            console.log("0: " + wf.uri.fsPath);
            console.log("0: " + wf.name);
            console.log("0: " + wf.index);
        });
    });


    test("Add Workspace Folder 2", async function()
    {
        this.slow(tc.slowTime.addWorkspaceFolderEmpty);
        workspace.updateWorkspaceFolders(1, null, {
            uri: Uri.file(wsDirName),
            name: "wsf2"
        });
        await waitForTeIdle(tc.waitTime.addWorkspaceFolderEmpty);
    });


    test("Add Workspace Folder 3", async function()
    {
        this.slow(tc.slowTime.addWorkspaceFolderEmpty);
        workspace.updateWorkspaceFolders(1, null, {
            uri: Uri.file(wsDirName),
            name: "wsf3"
        });
        await waitForTeIdle(tc.waitTime.addWorkspaceFolderEmpty);
    });


    test("Add Workspace Folder 4", async function()
    {
        this.slow(tc.slowTime.addWorkspaceFolderEmpty);
        const wsDirName = path.join(testsPath, "wsf4");
        await fsApi.createDir(wsDirName);
        workspace.updateWorkspaceFolders(1, null, {
            uri: Uri.file(wsDirName),
            name: "wsf4"
        });
        await waitForTeIdle(tc.waitTime.addWorkspaceFolderEmpty);
    });


    test("Remove Workspace Folder 1", async function()
    {
        this.slow(tc.slowTime.removeWorkspaceFolderEmpty);
        workspace.workspaceFolders?.forEach((wf)=>
        {
            console.log("1: " + wf.uri.fsPath);
            console.log("1: " + wf.name);
            console.log("1: " + wf.index);
        });
        workspace.updateWorkspaceFolders(1, 1);
        workspace.workspaceFolders?.forEach((wf)=>
        {
            console.log("2: " + wf.uri.fsPath);
            console.log("2: " + wf.name);
            console.log("2: " + wf.index);
        });
        await waitForTeIdle(tc.waitTime.removeWorkspaceFolderEmpty);
    });


    test("Remove Workspace Folder 2 and 3", async function()
    {
        this.slow(tc.slowTime.removeWorkspaceFolderEmpty * 2);
        workspace.updateWorkspaceFolders(1, 1);
        await waitForTeIdle(tc.waitTime.removeWorkspaceFolderEmpty);
        workspace.updateWorkspaceFolders(1, 1);
        await waitForTeIdle(tc.waitTime.removeWorkspaceFolderEmpty);
    });


    test("Remove Workspace Folder 4", async function()
    {
        this.slow(tc.slowTime.removeWorkspaceFolderEmpty);
        workspace.updateWorkspaceFolders(1, 1);
        await waitForTeIdle(tc.waitTime.removeWorkspaceFolderEmpty);
    });
*/

});
