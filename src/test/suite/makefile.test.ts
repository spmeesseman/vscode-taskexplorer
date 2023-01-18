/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* tslint:disable */

//
// Documentation on https://mochajs.org/ for help.
//

import { join } from "path";
import { expect } from "chai";
import { MakeTaskProvider } from "../../providers/make";
import { Uri, workspace, WorkspaceFolder } from "vscode";
import { IFilesystemApi, ITaskExplorerApi } from "@spmeesseman/vscode-taskexplorer-types";
import {
    activate, executeSettingsUpdate, exitRollingCount, focusExplorerView, getWsPath, suiteFinished, testControl,
    verifyTaskCount, waitForTeIdle
} from "../utils/utils";

const testsName = "make";
const startTaskCount = 8;

let teApi: ITaskExplorerApi;
let fsApi: IFilesystemApi;
let provider: MakeTaskProvider;
let dirName: string;
let fileUri: Uri;
let successCount = -1;


suite("Makefile Tests", () =>
{

    suiteSetup(async function()
    {
        ({ teApi, fsApi } = await activate(this));
        provider = teApi.providers[testsName] as MakeTaskProvider;
        dirName = getWsPath("tasks_test_");
        fileUri = Uri.file(join(dirName, "test_provider.sh"));
        ++successCount;
    });


    suiteTeardown(async function()
    {
        suiteFinished(this);
    });


	test("Activate Tree (Focus Explorer View)", async function()
	{
        if (exitRollingCount(0, successCount)) return;
        await focusExplorerView(this);
        ++successCount;
	});


    test("Document Position", async function()
    {
        if (exitRollingCount(1, successCount)) return;
        // provider.readTasks();
        let index = provider.getDocumentPosition(undefined, undefined);
        provider.getDocumentPosition("test", undefined);
        expect(index).to.equal(0, `test task position should be 0 (actual ${index}`);
        provider.getDocumentPosition(undefined, "test");
        const makefileContent = teApi.testsApi.fs.readFileSync(getWsPath("make\\makefile"));
        index = provider.getDocumentPosition("rule1", makefileContent);
        expect(index).to.equal(273, `rule1 task position should be 273 (actual ${index}`);
        index = provider.getDocumentPosition("rule2", makefileContent);
        expect(index).to.equal(306, `rule2 task position should be 306 (actual ${index}`);
        index = provider.getDocumentPosition("clean", makefileContent);
        expect(index).to.equal(401, `clean task position should be 401 (actual ${index}`);
        index = provider.getDocumentPosition("clean2", makefileContent);
        expect(index).to.equal(449, `clean2 task position should be 449 (actual ${index}`);
        index = provider.getDocumentPosition("clean3", makefileContent);
        expect(index).to.equal(730, `clean3 task position should be 730 (actual ${index}`);
        index = provider.getDocumentPosition("rule_does_not_exist", makefileContent);
        expect(index).to.equal(0, `rule_does_not_exist task position should be 0 (actual ${index}`);
        ++successCount;
    });


    test("Path to make", async function()
    {
        if (exitRollingCount(2, successCount)) return;
        this.slow(testControl.slowTime.config.pathToProgramsEvent * 4);
        const rootWorkspace = (workspace.workspaceFolders as WorkspaceFolder[])[0],
              filePath = getWsPath(join(testsName, "makefile")),
              fileUri = Uri.file(filePath);
        const pathToMake = teApi.config.get<string>("pathToPrograms." + testsName, "nmake");
        try {
            await executeSettingsUpdate("pathToPrograms." + testsName, "nmake");
            provider.createTask("test", "test", rootWorkspace, fileUri, []);
            await executeSettingsUpdate("pathToPrograms." + testsName, "make");
            provider.createTask("test", "test", rootWorkspace, fileUri, []);
            await executeSettingsUpdate("pathToPrograms." + testsName, undefined);
            provider.createTask("test", "test", rootWorkspace, fileUri, []);
        }
        catch (e) { throw e; }
        finally {
            await executeSettingsUpdate("pathToPrograms." + testsName, pathToMake);
        }
        ++successCount;
    });


    test("Start", async function()
    {
        if (exitRollingCount(3, successCount)) return;
        this.slow(testControl.slowTime.verifyTaskCount);
        await verifyTaskCount(testsName, startTaskCount);
        successCount++;
    });


    test("Disable", async function()
    {
        if (exitRollingCount(4, successCount)) return;
        this.slow(testControl.slowTime.config.enableEvent + testControl.slowTime.verifyTaskCount);
        await executeSettingsUpdate("enabledTasks." + testsName, false, testControl.waitTime.config.enableEvent);
        await verifyTaskCount(testsName, 0);
        successCount++;
    });


    test("Re-enable", async function()
    {
        if (exitRollingCount(5, successCount)) return;
        this.slow(testControl.slowTime.config.enableEvent + testControl.slowTime.verifyTaskCount);
        await executeSettingsUpdate("enabledTasks." + testsName, true, testControl.waitTime.config.enableEvent);
        await verifyTaskCount(testsName, startTaskCount);
        successCount++;
    });


    test("Create File", async function()
    {
        if (exitRollingCount(6, successCount)) return;
        this.slow(testControl.slowTime.fs.createFolderEvent + testControl.slowTime.verifyTaskCount);
        await fsApi.createDir(dirName);
        await fsApi.writeFile(
            fileUri.fsPath,
            "copy_dependencies                         :\n" +
            "   copy /y ..\\dep\\*.acm $(OUTPUT_DIRECTORY)\\bin\n" +
            "   copy /y ..\\dep\\*.exe $(OUTPUT_DIRECTORY)\\bin\n" +
            "   copy /y ..\\dep\\*.dll $(OUTPUT_DIRECTORY)\\bin\n" +
            "   copy /y ..\\doc\\*.pdf $(OUTPUT_DIRECTORY)\\doc\n" +
            "   copy /y ..\\doc\\history.txt $(OUTPUT_DIRECTORY)\doc\n" +
            "   copy /y ..\\dep\\te\\TER15.DLL $(OUTPUT_DIRECTORY)\\bin\n" +
            "clean_obj                                : $(OBJ_DIRECTORY)\n" +
            "   rd /q /s $(OBJ_DIRECTORY)  \n" +
            "clean                                    : $(OUTPUT_DIRECTORY)\n" +
            "   rd /q /s $(OUTPUT_DIRECTORY)\n"
        );
        await waitForTeIdle(testControl.waitTime.fs.createEvent);
        await verifyTaskCount(testsName, startTaskCount + 3);
        successCount++;
    });


    test("Delete File", async function()
    {
        if (exitRollingCount(7, successCount)) return;
        this.slow(testControl.slowTime.fs.deleteEvent + testControl.slowTime.verifyTaskCount);
        await fsApi.deleteFile(fileUri.fsPath);
        await waitForTeIdle(testControl.waitTime.fs.deleteEvent);
        await verifyTaskCount(testsName, startTaskCount);
        await fsApi.deleteDir(dirName);
        await waitForTeIdle(testControl.waitTime.fs.deleteEvent);
        successCount++;
    });


    test("Re-create File", async function()
    {
        if (exitRollingCount(8, successCount)) return;
        this.slow(testControl.slowTime.fs.createEvent + testControl.slowTime.fs.createFolderEvent + testControl.slowTime.verifyTaskCount);
        await fsApi.createDir(dirName);
        await waitForTeIdle(testControl.waitTime.fs.createFolderEvent);
        await fsApi.writeFile(
            fileUri.fsPath,
            "copy_dependencies                         :\n" +
            "   copy /y ..\\dep\\*.acm $(OUTPUT_DIRECTORY)\\bin\n" +
            "   copy /y ..\\dep\\*.exe $(OUTPUT_DIRECTORY)\\bin\n" +
            "   copy /y ..\\dep\\*.dll $(OUTPUT_DIRECTORY)\\bin\n" +
            "   copy /y ..\\doc\\*.pdf $(OUTPUT_DIRECTORY)\\doc\n" +
            "   copy /y ..\\doc\\history.txt $(OUTPUT_DIRECTORY)\doc\n" +
            "   copy /y ..\\dep\\te\\TER15.DLL $(OUTPUT_DIRECTORY)\\bin\n" +
            "clean_obj                                : $(OBJ_DIRECTORY)\n" +
            "   rd /q /s $(OBJ_DIRECTORY)  \n" +
            "clean                                    : $(OUTPUT_DIRECTORY)\n" +
            "   rd /q /s $(OUTPUT_DIRECTORY)\n"
        );
        await waitForTeIdle(testControl.waitTime.fs.createEvent);
        await verifyTaskCount(testsName, startTaskCount + 3);
        successCount++;
    });


    test("Delete Folder", async function()
    {
        if (exitRollingCount(9, successCount)) return;
        this.slow(testControl.slowTime.fs.deleteFoldereEvent + testControl.slowTime.verifyTaskCount);
        await fsApi.deleteDir(dirName);
        await waitForTeIdle(testControl.waitTime.fs.deleteEvent);
        await verifyTaskCount(testsName, startTaskCount);
        successCount++;
    });


});
