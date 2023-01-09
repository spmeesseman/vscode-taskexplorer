/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */

import { join } from "path";
import { activate, getTestsPath, sleep, testControl } from "../helper";
import { IExplorerApi, IFilesystemApi, ITaskExplorerApi } from "@spmeesseman/vscode-taskexplorer-types";
import { Uri, workspace } from "vscode";


let teApi: ITaskExplorerApi;
let fsApi: IFilesystemApi;
let explorer: IExplorerApi;
let testsPath: string;
let wsf1DirName: string;
let wsf2DirName: string;
let wsf3DirName: string;
let wsf4DirName: string;

suite("API Init and Tests", () =>
{
    suiteSetup(async function()
    {
        teApi = await activate(this);
        explorer = teApi.testsApi.explorer;
        fsApi = teApi.testsApi.fs;
        testsPath = getTestsPath(".");
        wsf1DirName = join(testsPath, "wsf1");
        await fsApi.createDir(wsf1DirName);
        wsf2DirName = join(testsPath, "wsf2");
        await fsApi.createDir(wsf2DirName);
        wsf3DirName = join(testsPath, "wsf3");
        await fsApi.createDir(wsf3DirName);
        wsf4DirName = join(testsPath, "wsf4");
        await fsApi.createDir(wsf4DirName);
    });


    suiteTeardown(async function()
    {
        await fsApi.deleteDir(join(testsPath, "wsf1"));
        await fsApi.deleteDir(join(testsPath, "wsf2"));
        await fsApi.deleteDir(join(testsPath, "wsf3"));
        await fsApi.deleteDir(join(testsPath, "wsf4"));
    });


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

/*
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
*/
/*
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
*/
/*

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
