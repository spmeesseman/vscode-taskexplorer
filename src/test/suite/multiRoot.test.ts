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
    activate, exitRollingCount, getTestsPath, sleep, suiteFinished, testControl as tc, treeUtils, verifyTaskCount, waitForTeIdle
} from "../utils/utils";
import { expect } from "chai";


const originalGetWorkspaceFolder = workspace.getWorkspaceFolder;
let teApi: ITaskExplorerApi;
let fsApi: IFilesystemApi;
let testsApi: ITestsApi;
let testsPath: string;
let wsf1DirName: string;
let wsf2DirName: string;
let wsf3DirName: string;
let wsf4DirName: string;
let wsf: WorkspaceFolder[];
let gruntCt: number;
let successCount = -1;


suite("Multi-Root Workspace Tests", () =>
{
    suiteSetup(async function()
    {
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

        wsf = [
        {
            uri: Uri.file(wsf1DirName),
            name: "wsf1",
            index: 0
        },
        {
            uri: Uri.file(wsf2DirName),
            name: "wsf2",
            index: 1
        },
        {
            uri: Uri.file(wsf3DirName),
            name: "wsf3",
            index: 2
        },
        {
            uri: Uri.file(wsf4DirName),
            name: "wsf4",
            index: 3
        }];

        ++successCount;
    });


    suiteTeardown(async function()
    {
        workspace.getWorkspaceFolder = originalGetWorkspaceFolder;
        await fsApi.deleteDir(wsf1DirName);
        await fsApi.deleteDir(wsf2DirName);
        await fsApi.deleteDir(wsf3DirName);
        await fsApi.deleteDir(wsf4DirName);
        suiteFinished(this);
    });


    test("Build Tree (View Collapsed)", async function()
    {
        if (exitRollingCount(0, successCount)) return;
        await treeUtils.refresh(this);
        ++successCount;
    });


    test("Mimic Add WS Folder (Cover Undefined Workspace)", async function()
    {   //  Mimic fileWatcher.onWsFoldersChange() (see note top of file)
        if (exitRollingCount(1, successCount)) return;
        this.slow(tc.slowTime.command);
        await teApi.testsApi.fileCache.addWsFolders(undefined);
        await waitForTeIdle(tc.waitTime.command);
        ++successCount;
    });


    test("Mimic Add WS Folder 1", async function()
    {   //  Mimic fileWatcher.onWsFoldersChange() (see note top of file)
        if (exitRollingCount(2, successCount)) return;
        this.slow(tc.slowTime.addWorkspaceFolder + tc.slowTime.min);
        await testsApi.onWsFoldersChange({
            added: [ wsf[0] ],
            removed: []
        });
        await waitForTeIdle(tc.waitTime.min); // awaiting onWsFoldersChange() should finish the event
        ++successCount;
    });


    test("Mimic Add WS Folders 2 and 3", async function()
    {   //  Mimic fileWatcher.onWsFoldersChange() (see note top of file)
        if (exitRollingCount(3, successCount)) return;
        this.slow((tc.slowTime.addWorkspaceFolder * 2) + tc.slowTime.min);
        await testsApi.onWsFoldersChange({
            added: [ wsf[1], wsf[2] ],
            removed: []
        });
        await waitForTeIdle(tc.waitTime.min); // awaiting onWsFoldersChange() should finish the event
        ++successCount;
    });


    test("Mimic Add WS Folder 4", async function()
    {   //  Mimic fileWatcher.onWsFoldersChange() (see note top of file)
        if (exitRollingCount(4, successCount)) return;
        this.slow(tc.slowTime.addWorkspaceFolder + tc.slowTime.min);
        await testsApi.onWsFoldersChange({
            added: [ wsf[3] ],
            removed: []
        });
        await waitForTeIdle(tc.waitTime.min); // awaiting onWsFoldersChange() should finish the event
        ++successCount;
    });


    test("Mimic Remove WS Folder 1", async function()
    {   //  Mimic fileWatcher.onWsFoldersChange() (see note top of file)
        if (exitRollingCount(5, successCount)) return;
        this.slow(tc.slowTime.removeWorkspaceFolder + tc.slowTime.min);
        await testsApi.onWsFoldersChange({
            added: [],
            removed: [ wsf[0] ]
        });
        await waitForTeIdle(tc.waitTime.min); // awaiting onWsFoldersChange() should finish the event
        ++successCount;
    });


    test("Mimic Remove WS Folder 2 and 3", async function()
    {   //  Mimic fileWatcher.onWsFoldersChange() (see note top of file)
        if (exitRollingCount(6, successCount)) return;
        this.slow((tc.slowTime.removeWorkspaceFolder * 2) + tc.slowTime.min);
        await testsApi.onWsFoldersChange({
            added: [],
            removed: [ wsf[1], wsf[2] ]
        });
        await waitForTeIdle(tc.waitTime.min); // awaiting onWsFoldersChange() should finish the event
        ++successCount;
    });


    test("Mimic Remove WS Folder 4", async function()
    {   //  Mimic fileWatcher.onWsFoldersChange() (see note top of file)
        if (exitRollingCount(7, successCount)) return;
        this.slow(tc.slowTime.removeWorkspaceFolder + tc.slowTime.min);
        await testsApi.onWsFoldersChange({
            added: [],
            removed: [ wsf[3] ]
        });
        await waitForTeIdle(tc.waitTime.min); // awaiting onWsFoldersChange() should finish the event
        ++successCount;
    });


    test("Mimic Add WS Folder 1 (w/ File)", async function()
    {   //  Mimic fileWatcher.onWsFoldersChange() (see note top of file)
        if (exitRollingCount(8, successCount)) return;
        this.slow(tc.slowTime.addWorkspaceFolder + tc.slowTime.fs.createEvent + tc.slowTime.min + tc.slowTime.verifyTaskCount);
        gruntCt = teApi.testsApi.fileCache.getTaskFiles("grunt").length;
        await fsApi.writeFile(
            join(wsf[0].uri.fsPath, "Gruntfile.js"),
            "module.exports = function(grunt) {\n" +
            '    grunt.registerTask(\n"default2", ["jshint:myproject"]);\n' +
            '    grunt.registerTask("upload2", ["s3"]);\n' +
            "};\n"
        );
        await waitForTeIdle(tc.waitTime.fs.createEvent);
        workspace.getWorkspaceFolder = (uri: Uri) =>
        {
            return wsf[0];
        };
        await testsApi.onWsFoldersChange({
            added: [ wsf[0] ],
            removed: []
        });
        await waitForTeIdle(tc.waitTime.min); // awaiting onWsFoldersChange() should finish the event
        await verifyTaskCount("grunt", gruntCt + 1);
        ++successCount;
    });


    test("Mimic Remove WS Folder 1 (w/ File)", async function()
    {   //  Mimic fileWatcher.onWsFoldersChange() (see note top of file)
        if (exitRollingCount(9, successCount)) return;
        this.slow(tc.slowTime.removeWorkspaceFolder + tc.slowTime.fs.deleteEvent + tc.slowTime.min + tc.slowTime.verifyTaskCount);
        await testsApi.onWsFoldersChange({
            added: [],
            removed: [ wsf[0] ]
        });
        await waitForTeIdle(tc.waitTime.min); // awaiting onWsFoldersChange() should finish the event
        await fsApi.deleteFile(join(wsf[0].uri.fsPath, "Gruntfile.js"));
        await waitForTeIdle(tc.waitTime.fs.deleteEvent);
        workspace.getWorkspaceFolder = originalGetWorkspaceFolder;
        await verifyTaskCount("grunt", gruntCt);
        ++successCount;
    });


    test("Mimic Add WS Folder 1 (Cache Builder Busy)", async function()
    {   //  Mimic fileWatcher.onWsFoldersChange() (see note top of file)
        if (exitRollingCount(10, successCount)) return;
        this.slow(tc.slowTime.addWorkspaceFolder + tc.slowTime.rebuildFileCache + 100 + tc.slowTime.min);
        teApi.testsApi.fileCache.rebuildCache(""); // Don't 'await'
        await sleep(100);
        await testsApi.onWsFoldersChange({ // event will wait for previous fil cache build
            added: [ wsf[0] ],
            removed: []
        });
        await waitForTeIdle(tc.waitTime.min); // awaiting onWsFoldersChange() should finish the event
        ++successCount;
    });


    test("Mimic Remove WS Folder 1 (Cache Builder Busy)", async function()
    {   //  Mimic fileWatcher.onWsFoldersChange() (see note top of file)
        if (exitRollingCount(11, successCount)) return;
        this.slow(tc.slowTime.removeWorkspaceFolder + tc.slowTime.rebuildFileCacheNoChanges + 100 + tc.slowTime.min);
        teApi.testsApi.fileCache.rebuildCache(""); // Don't 'await'
        await sleep(100);
        await testsApi.onWsFoldersChange({ // event will wait for previous fil cache build
            added: [],
            removed: [ wsf[0] ]
        });
        await waitForTeIdle(tc.waitTime.min); // awaiting onWsFoldersChange() should finish the event
        ++successCount;
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
