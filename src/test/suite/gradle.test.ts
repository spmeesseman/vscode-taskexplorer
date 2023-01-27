/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* tslint:disable */

import * as path from "path";
import { Uri } from "vscode";
import { expect } from "chai";
import { GradleTaskProvider } from "../../providers/gradle";
import { executeSettingsUpdate } from "../utils/commandUtils";
import { IFilesystemApi, ITaskExplorerApi } from "@spmeesseman/vscode-taskexplorer-types";
import {
    activate, endRollingCount, exitRollingCount, getWsPath, needsTreeBuild,
    suiteFinished, testControl as tc, testInvDocPositions, treeUtils, verifyTaskCount, waitForTeIdle
} from "../utils/utils";

const testsName = "gradle";
const startTaskCount = 2;

let teApi: ITaskExplorerApi;
let fsApi: IFilesystemApi;
let provider: GradleTaskProvider;
let dirName: string;
let fileUri: Uri;


suite("Gradle Tests", () =>
{

    suiteSetup(async function()
    {
        if (exitRollingCount(this, true)) return;
        ({ teApi, fsApi } = await activate(this));
        provider = teApi.providers[testsName] as GradleTaskProvider;
        dirName = getWsPath(".");
        fileUri = Uri.file(path.join(dirName, "test2.gradle"));
        endRollingCount(this, true);
    });

    suiteTeardown(async function()
    {
        if (exitRollingCount(this, false, true)) return;
        suiteFinished(this);
    });


    test("Enable (Off by Default)", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.config.enableEvent);
        await executeSettingsUpdate(`enabledTasks.${testsName}`, true, tc.waitTime.config.enableEvent);
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


    test("Document Position", async function()
    {
        if (exitRollingCount(this)) return;
        testInvDocPositions(provider);
        const docText = await fsApi.readFileAsync(path.join(dirName, "test.gradle"));
        expect(provider.getDocumentPosition("fatJar", docText)).to.be.greaterThan(0);
        expect(provider.getDocumentPosition("emptyTask", docText)).to.be.greaterThan(0);
        expect(provider.getDocumentPosition("fatJar2", docText)).to.be.equal(0);
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
        await executeSettingsUpdate(`enabledTasks.${testsName}`, false, tc.waitTime.config.enableEvent);
        await verifyTaskCount(testsName, 0);
        endRollingCount(this);
    });


    test("Re-enable", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.config.enableEvent + tc.slowTime.taskCount.verify);
        await executeSettingsUpdate(`enabledTasks.${testsName}`, true, tc.waitTime.config.enableEvent);
        await verifyTaskCount(testsName, startTaskCount);
        endRollingCount(this);
    });


    test("Create File", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.fs.createEvent + tc.slowTime.taskCount.verify);
        await fsApi.writeFile(
            fileUri.fsPath,
            "\ntask fatJar10(type: Jar) {\n" +
            "    manifest {}\n" +
            "    baseName = project.name + '-all'\n" +
            "}\n"
        );
        await waitForTeIdle(tc.waitTime.fs.createEvent);
        await verifyTaskCount(testsName, startTaskCount + 1);
        endRollingCount(this);
    });


    test("Add Task to File", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.fs.modifyEvent + tc.slowTime.taskCount.verify);
        await fsApi.writeFile(
            fileUri.fsPath,
            "\ntask fatJar10(type: Jar) {\n" +
            "    manifest {}\n" +
            "    baseName = project.name + '-all'\n" +
            "}\n" +
            "\ntask fatJar11(type: Jar) {\n" +
            "    manifest {}\n" +
            "    baseName = project.name + '-all'\n" +
            "}\n"
        );
        await waitForTeIdle(tc.waitTime.fs.modifyEvent);
        await verifyTaskCount(testsName, startTaskCount + 2);
        endRollingCount(this);
    });


    test("Remove Task from File", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.fs.deleteEvent + tc.slowTime.taskCount.verify);
        await fsApi.writeFile(
            fileUri.fsPath,
            "\ntask fatJar10(type: Jar) {\n" +
            "    manifest {}\n" +
            "    baseName = project.name + '-all'\n" +
            "}\n"
        );
        await waitForTeIdle(tc.waitTime.fs.modifyEvent);
        await verifyTaskCount(testsName, startTaskCount + 1);
        endRollingCount(this);
    });


    test("Delete File", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.fs.deleteEvent + tc.slowTime.taskCount.verify);
        await fsApi.deleteFile(fileUri.fsPath);
        await waitForTeIdle(tc.waitTime.fs.deleteEvent);
        await verifyTaskCount(testsName, startTaskCount);
        endRollingCount(this);
    });


    test("Disable (Default is OFF)", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.config.disableEvent + tc.slowTime.taskCount.verify);
        await executeSettingsUpdate(`enabledTasks.${testsName}`, false, tc.waitTime.config.disableEvent);
        await verifyTaskCount(testsName, 0);
        endRollingCount(this);
    });

});
