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
    activate, endRollingCount, executeSettingsUpdate, exitRollingCount, focusExplorerView, getWsPath,
    needsTreeBuild, sleep, suiteFinished, testControl as tc, verifyTaskCount, waitForTeIdle
} from "../utils/utils";

const testsName = "make";
const startTaskCount = 8;

let teApi: ITaskExplorerApi;
let fsApi: IFilesystemApi;
let provider: MakeTaskProvider;
let dirName: string;
let fileUri: Uri;


suite("Makefile Tests", () =>
{

    suiteSetup(async function()
    {
        ({ teApi, fsApi } = await activate(this));
        provider = teApi.providers[testsName] as MakeTaskProvider;
        dirName = getWsPath("tasks_test_");
        fileUri = Uri.file(join(dirName, "makefile"));
        endRollingCount(this);
    });


    suiteTeardown(async function()
    {
        suiteFinished(this);
    });


	test("Focus Tree View", async function()
	{
        if (exitRollingCount(this)) return;
        if (needsTreeBuild(true)) {
            await focusExplorerView(this);
        }
        endRollingCount(this);
	});


    test("Document Position", async function()
    {
        if (exitRollingCount(this)) return;
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
        endRollingCount(this);
    });


    test("Path to make", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.config.pathToProgramsEvent * 4);
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
        endRollingCount(this);
    });


    test("Start", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.taskCount.verify);
        await verifyTaskCount(testsName, startTaskCount);
        endRollingCount(this);
    });


    test("Disable", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.config.enableEvent + tc.slowTime.taskCount.verify);
        await executeSettingsUpdate("enabledTasks." + testsName, false, tc.waitTime.config.enableEvent);
        await verifyTaskCount(testsName, 0);
        endRollingCount(this);
    });


    test("Re-enable", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.config.enableEvent + tc.slowTime.taskCount.verify);
        await executeSettingsUpdate("enabledTasks." + testsName, true, tc.waitTime.config.enableEvent);
        await verifyTaskCount(testsName, startTaskCount);
        endRollingCount(this);
    });


    test("Create File", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.fs.createFolderEvent + tc.slowTime.fs.createFolderEvent + tc.slowTime.taskCount.verify);
        await fsApi.createDir(dirName);
        await waitForTeIdle(tc.waitTime.fs.createFolderEvent);
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
            "   rd /q /s $(OUTPUT_DIRECTORY)\n" +
            "   rd /q /s $(OBJ_DIRECTORY)  \n" +
            "clean                                    : $(OUTPUT_DIRECTORY)\n" + // cover duplicate
            "   rd /q /s $(OUTPUT_DIRECTORY)\n" +
            ".PHONY                                   : $(OUTPUT_DIRECTORY)\n" + // cover specialTargets
            "   rd /q /s $(OUTPUT_DIRECTORY)\n" +
            ".record.test                             : $(OUTPUT_DIRECTORY)\n" + // cover suffixRuleTargets
            "   console.write(\"test\")\n" +
            ".%SPECIAL                                : $(OUTPUT_DIRECTORY)\n" + // cover leading .
            "   console.write(\"special\")\n" +
            "%.done                                   : $(OUTPUT_DIRECTORY)\n" + // cover patternRuleTargets
            "   console.write(\"done\")\n"
        );
        await waitForTeIdle(tc.waitTime.fs.createEvent);
        await sleep(1000);
        await verifyTaskCount(testsName, startTaskCount + 3);
        endRollingCount(this);
    });


    test("Delete File", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.waitTime.fs.deleteFolderEvent + tc.slowTime.fs.deleteEvent + tc.slowTime.taskCount.verify);
        await fsApi.deleteFile(fileUri.fsPath);
        await waitForTeIdle(tc.waitTime.fs.deleteEvent);
        await verifyTaskCount(testsName, startTaskCount);
        await fsApi.deleteDir(dirName);
        await waitForTeIdle(tc.waitTime.fs.deleteFolderEvent);
        endRollingCount(this);
    });


    test("Re-create File", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.fs.createFolderEvent + tc.slowTime.fs.createEvent + tc.slowTime.taskCount.verify);
        await fsApi.createDir(dirName);
        await waitForTeIdle(tc.waitTime.fs.createFolderEvent);
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
            "   rd /q /s $(OUTPUT_DIRECTORY)\n" +
            "   rd /q /s $(OBJ_DIRECTORY)  \n" +
            "clean                                    : $(OUTPUT_DIRECTORY)\n" + // cover duplicate
            "   rd /q /s $(OUTPUT_DIRECTORY)\n" +
            ".PHONY                                   : $(OUTPUT_DIRECTORY)\n" + // cover specialTargets
            "   rd /q /s $(OUTPUT_DIRECTORY)\n" +
            ".record.test                             : $(OUTPUT_DIRECTORY)\n" + // cover suffixRuleTargets
            "   console.write(\"test\")\n" +
            ".%SPECIAL                                : $(OUTPUT_DIRECTORY)\n" + // cover leading .
            "   console.write(\"special\")\n" +
            "%.done                                   : $(OUTPUT_DIRECTORY)\n" + // cover patternRuleTargets
            "   console.write(\"done\")\n"
        );
        await waitForTeIdle(tc.waitTime.fs.createEvent);
        await verifyTaskCount(testsName, startTaskCount + 3);
        endRollingCount(this);
    });


    test("Delete Folder", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.fs.deleteFolderEvent + tc.slowTime.taskCount.verify);
        await fsApi.deleteDir(dirName);
        await waitForTeIdle(tc.waitTime.fs.deleteEvent);
        await verifyTaskCount(testsName, startTaskCount);
        endRollingCount(this);
    });


});
