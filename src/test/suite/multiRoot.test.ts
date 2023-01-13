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
import { activate, getTestsPath, sleep, suiteFinished, testControl, treeUtils } from "../utils";
import { IExplorerApi, IFilesystemApi, ITaskExplorerApi, TaskExplorerTestsApi } from "@spmeesseman/vscode-taskexplorer-types";
import { Uri, WorkspaceFolder } from "vscode";


let teApi: ITaskExplorerApi;
let fsApi: IFilesystemApi;
let testsApi: TaskExplorerTestsApi;
let testsPath: string;
let wsf1DirName: string;
let wsf2DirName: string;
let wsf3DirName: string;
let wsf4DirName: string;
let wsf: WorkspaceFolder[];

suite("Multi-Root Workspace Tests", () =>
{
    suiteSetup(async function()
    {
        teApi = await activate(this);
        fsApi = teApi.testsApi.fs;
        testsApi = teApi.testsApi;
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
    });


    suiteTeardown(async function()
    {
        await fsApi.deleteDir(wsf1DirName);
        await fsApi.deleteDir(wsf2DirName);
        await fsApi.deleteDir(wsf3DirName);
        await fsApi.deleteDir(wsf4DirName);
        suiteFinished(this);
    });


    test("Build Tree (View Collapsed)", async function()
    {
        await treeUtils.refresh(this);
    });


    test("Mimic Add WS Folder (Cover Undefined Workspace)", async function()
    {   //  Mimic fileWatcher.onWsFoldersChange() (see note top of file)
        this.slow(testControl.slowTime.command);
        await teApi.testsApi.fileCache.addWsFolders(undefined);
        await teApi.waitForIdle(testControl.waitTime.command);
    });


    test("Mimic Add WS Folder 1", async function()
    {   //  Mimic fileWatcher.onWsFoldersChange() (see note top of file)
        this.slow(testControl.slowTime.addWorkspaceFolder);
        await testsApi.onWsFoldersChange({
            added: [ wsf[0] ],
            removed: []
        });
        await teApi.waitForIdle(testControl.waitTime.min); // awaiting onWsFoldersChange() should finish the event
    });


    test("Mimic Add WS Folders 2 and 3", async function()
    {   //  Mimic fileWatcher.onWsFoldersChange() (see note top of file)
        this.slow(testControl.slowTime.addWorkspaceFolder * 2);
        await testsApi.onWsFoldersChange({
            added: [ wsf[1], wsf[2] ],
            removed: []
        });
        await teApi.waitForIdle(testControl.waitTime.min); // awaiting onWsFoldersChange() should finish the event
    });


    test("Mimic Add WS Folder 4", async function()
    {   //  Mimic fileWatcher.onWsFoldersChange() (see note top of file)
        this.slow(testControl.slowTime.addWorkspaceFolder);
        await testsApi.onWsFoldersChange({
            added: [ wsf[3] ],
            removed: []
        });
        await teApi.waitForIdle(testControl.waitTime.min); // awaiting onWsFoldersChange() should finish the event
    });


    test("Mimic Remove WS Folder 1", async function()
    {   //  Mimic fileWatcher.onWsFoldersChange() (see note top of file)
        this.slow(testControl.slowTime.removeWorkspaceFolder);
        await testsApi.onWsFoldersChange({
            added: [],
            removed: [ wsf[0] ]
        });
        await teApi.waitForIdle(testControl.waitTime.min); // awaiting onWsFoldersChange() should finish the event
    });


    test("Mimic Remove WS Folder 2 and 3", async function()
    {   //  Mimic fileWatcher.onWsFoldersChange() (see note top of file)
        this.slow(testControl.slowTime.removeWorkspaceFolder * 2);
        await testsApi.onWsFoldersChange({
            added: [],
            removed: [ wsf[1], wsf[2] ]
        });
        await teApi.waitForIdle(testControl.waitTime.min); // awaiting onWsFoldersChange() should finish the event
    });


    test("Mimic Remove WS Folder 4", async function()
    {   //  Mimic fileWatcher.onWsFoldersChange() (see note top of file)
        this.slow(testControl.slowTime.removeWorkspaceFolder);
        await testsApi.onWsFoldersChange({
            added: [],
            removed: [ wsf[3] ]
        });
        await teApi.waitForIdle(testControl.waitTime.min); // awaiting onWsFoldersChange() should finish the event
    });


    test("Mimic Add WS Folder 1 (Cache Builder Busy)", async function()
    {   //  Mimic fileWatcher.onWsFoldersChange() (see note top of file)
        this.slow(testControl.slowTime.addWorkspaceFolder + testControl.slowTime.rebuildFileCacheCancel + 100);
        teApi.testsApi.fileCache.rebuildCache(""); // Don't 'await'
        await sleep(100);
        await testsApi.onWsFoldersChange({
            added: [ wsf[0] ],
            removed: []
        });
        await teApi.waitForIdle(); // awaiting onWsFoldersChange() should finish the event
    });


    test("Mimic Remove WS Folder 1 (Cache Builder Busy)", async function()
    {   //  Mimic fileWatcher.onWsFoldersChange() (see note top of file)
        this.slow(testControl.slowTime.removeWorkspaceFolder + testControl.slowTime.rebuildFileCacheCancel + 100);
        teApi.testsApi.fileCache.rebuildCache(""); // Don't 'await'
        await sleep(100);
        await testsApi.onWsFoldersChange({
            added: [],
            removed: [ wsf[0] ]
        });
        await teApi.waitForIdle(); // awaiting onWsFoldersChange() should finish the event
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
        this.slow(testControl.slowTime.addWorkspaceFolderEmpty);
        console.log("file: " + wsf1DirName);
        console.log("file2: " + Uri.file(wsf1DirName).fsPath);
        console.log("file3: " + Uri.parse(wsf1DirName).fsPath);
        try {
            const success = workspace.updateWorkspaceFolders(1, null, {
                uri: Uri.file(wsf1DirName),
                name: "wsf1"
            });
            console.log("success: " + success);
            await teApi.waitForIdle(testControl.waitTime.addWorkspaceFolderEmpty);
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
        this.slow(testControl.slowTime.addWorkspaceFolderEmpty);
        workspace.updateWorkspaceFolders(1, null, {
            uri: Uri.file(wsDirName),
            name: "wsf2"
        });
        await teApi.waitForIdle(testControl.waitTime.addWorkspaceFolderEmpty);
    });


    test("Add Workspace Folder 3", async function()
    {
        this.slow(testControl.slowTime.addWorkspaceFolderEmpty);
        workspace.updateWorkspaceFolders(1, null, {
            uri: Uri.file(wsDirName),
            name: "wsf3"
        });
        await teApi.waitForIdle(testControl.waitTime.addWorkspaceFolderEmpty);
    });


    test("Add Workspace Folder 4", async function()
    {
        this.slow(testControl.slowTime.addWorkspaceFolderEmpty);
        const wsDirName = path.join(testsPath, "wsf4");
        await fsApi.createDir(wsDirName);
        workspace.updateWorkspaceFolders(1, null, {
            uri: Uri.file(wsDirName),
            name: "wsf4"
        });
        await teApi.waitForIdle(testControl.waitTime.addWorkspaceFolderEmpty);
    });


    test("Remove Workspace Folder 1", async function()
    {
        this.slow(testControl.slowTime.removeWorkspaceFolderEmpty);
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
        await teApi.waitForIdle(testControl.waitTime.removeWorkspaceFolderEmpty);
    });


    test("Remove Workspace Folder 2 and 3", async function()
    {
        this.slow(testControl.slowTime.removeWorkspaceFolderEmpty * 2);
        workspace.updateWorkspaceFolders(1, 1);
        await teApi.waitForIdle(testControl.waitTime.removeWorkspaceFolderEmpty);
        workspace.updateWorkspaceFolders(1, 1);
        await teApi.waitForIdle(testControl.waitTime.removeWorkspaceFolderEmpty);
    });


    test("Remove Workspace Folder 4", async function()
    {
        this.slow(testControl.slowTime.removeWorkspaceFolderEmpty);
        workspace.updateWorkspaceFolders(1, 1);
        await teApi.waitForIdle(testControl.waitTime.removeWorkspaceFolderEmpty);
    });
*/

});
