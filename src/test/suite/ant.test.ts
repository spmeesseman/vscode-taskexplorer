/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* tslint:disable */

import * as assert from "assert";
import { expect } from "chai";
import { tasks, Uri, workspace, WorkspaceFolder } from "vscode";
import { ITaskExplorerApi } from "@spmeesseman/vscode-taskexplorer-types";
import { AntTaskProvider } from "../../providers/ant";
import { IFilesystemApi } from "../../interface/IFilesystemApi";
import {
    activate, executeSettingsUpdate, getWsPath, testControl as tc, verifyTaskCount, logErrorsAreFine,
    suiteFinished, exitRollingCount, waitForTeIdle, treeUtils, overrideNextShowInfoBox
} from "../utils/utils";

const testsName = "ant";
const slowTimeforAntRunTasks = (tc.slowTime.fetchTasksCommand * 2) + (tc.slowTime.configEvent * 3) +
                               (tc.slowTime.taskProviderReadUri * 2) + tc.slowTime.tasks.antParser;

let teApi: ITaskExplorerApi;
let fsApi: IFilesystemApi;
let provider: AntTaskProvider;
let rootWorkspace: WorkspaceFolder;
let buildXmlFile: string;
let buildXmlFileUri: Uri;
let buildFileXml: string;
let successCount = -1;


suite("Ant Tests", () =>
{

    suiteSetup(async function()
    {
        ({ teApi } = await activate(this));
        fsApi = teApi.testsApi.fs;
        provider = teApi.providers[testsName] as AntTaskProvider;
        rootWorkspace = (workspace.workspaceFolders as WorkspaceFolder[])[0];
        buildXmlFile = getWsPath("build.xml");
        buildXmlFileUri = Uri.file(buildXmlFile);
        buildFileXml = await fsApi.readFileAsync(buildXmlFileUri.fsPath);
        await executeSettingsUpdate("useAnt", false);
        ++successCount;
    });


    suiteTeardown(async function()
    {
        await fsApi.writeFile(buildXmlFileUri.fsPath, buildFileXml);
        suiteFinished(this);
    });


    test("Build Tree (View Collapsed)", async function()
    {
        if (exitRollingCount(0, successCount)) return;
        await treeUtils.refresh(this);
        ++successCount;
    });


    test("Start", async function()
    {
        if (exitRollingCount(1, successCount)) return;
        this.slow(tc.slowTime.verifyTaskCountFirstCall);
        await verifyTaskCount("ant", 3);
        ++successCount;
    });


    test("Document Position", async function()
    {
        if (exitRollingCount(2, successCount)) return;
        const xml = await fsApi.readFileAsync(buildXmlFileUri.fsPath);
        provider.getDocumentPosition(undefined, undefined);
        provider.getDocumentPosition("test", undefined);
        provider.getDocumentPosition(undefined, "test");
        provider.getDocumentPosition("test_isnt_there", xml);
        const index = provider.getDocumentPosition("test-build2", xml);
        expect(index).to.be.a("number").that.is.equal(275, `test-build2 task position should be 275 (actual ${index}`);
        ++successCount;
    });


    test("Disable", async function()
    {
        if (exitRollingCount(3, successCount)) return;
        this.slow(tc.slowTime.configEnableEvent + tc.slowTime.verifyTaskCount);
        await executeSettingsUpdate("enabledTasks.ant", false);
        await waitForTeIdle(tc.waitTime.configEvent);
        await verifyTaskCount("ant", 0);
        ++successCount;
    });


    test("Re-enable", async function()
    {
        if (exitRollingCount(4, successCount)) return;
        this.slow(tc.slowTime.configEnableEvent + tc.slowTime.verifyTaskCount);
        await executeSettingsUpdate("enabledTasks.ant", true);
        await waitForTeIdle(tc.waitTime.configEvent);
        await verifyTaskCount("ant", 3);
        ++successCount;
    });


    test("Enable Ansicon", async function()
    {
        if (exitRollingCount(5, successCount)) return;
        this.slow((tc.slowTime.configEvent * 5) + (tc.slowTime.commandFast * 4));
        await executeSettingsUpdate("pathToPrograms.ansicon", "ansicon\\x64\\ansicon.exe");
        overrideNextShowInfoBox(undefined);
        await executeSettingsUpdate("visual.enableAnsiconForAnt", true);
        provider.createTask("test", "test", rootWorkspace, buildXmlFileUri, []);
        await executeSettingsUpdate("pathToPrograms.ansicon", getWsPath("..\\tools\\ansicon\\x64\\ansicon.exe"));
        provider.createTask("test", "test", rootWorkspace, buildXmlFileUri, []);
        await executeSettingsUpdate("pathToPrograms.ansicon", getWsPath("..\\tools\\ansicon\\x64") + "\\");
        provider.createTask("test", "test", rootWorkspace, buildXmlFileUri, []);
        await executeSettingsUpdate("pathToPrograms.ansicon", getWsPath("..\\tools\\ansicon\\x64"));
        provider.createTask("test", "test", rootWorkspace, buildXmlFileUri, []);
        ++successCount;
    });


    test("Disable Ansicon", async function()
    {
        if (exitRollingCount(6, successCount)) return;
        this.slow((tc.slowTime.configEvent * 3) + (tc.slowTime.commandFast * 2));
        await executeSettingsUpdate("pathToPrograms.ansicon", getWsPath("..\\tools\\ansicon\\x64\\ansicon.exe"));
        await executeSettingsUpdate("visual.enableAnsiconForAnt", false);
        provider.createTask("test", "test", rootWorkspace, buildXmlFileUri, []);
        await executeSettingsUpdate("pathToPrograms.ansicon", getWsPath("..\\tools\\ansicon\\x64\\"));
        provider.createTask("test", "test", rootWorkspace, buildXmlFileUri, []);
        ++successCount;
    });


    test("Ansicon Path", async function()
    {
        if (exitRollingCount(7, successCount)) return;
        this.slow(tc.slowTime.configEvent + tc.slowTime.commandFast);
        await executeSettingsUpdate("pathToPrograms.ansicon", undefined);
        provider.createTask("test", "test", rootWorkspace, buildXmlFileUri, []);
        await executeSettingsUpdate("pathToPrograms.ansicon", getWsPath("..\\tools\\ansicon\\x64\\ansicon.exe"));
        ++successCount;
    });


    test("Win32 Create Task", async function()
    {
        if (exitRollingCount(8, successCount)) return;
        this.slow((tc.slowTime.configEvent * 2) + (tc.slowTime.commandFast * 2));
        await executeSettingsUpdate("pathToPrograms.ant", getWsPath("..\\tools\\ant\\bin\\ant.bat"));
        provider.createTask("test", "test", rootWorkspace, buildXmlFileUri, []);
        await executeSettingsUpdate("pathToPrograms.ant", getWsPath("..\\tools\\ant\\bin\\ant"));
        provider.createTask("test", "test", rootWorkspace, buildXmlFileUri, []);
        ++successCount;
    });


    test("Ant Parser", async function()
    {
        if (exitRollingCount(9, successCount)) return;
        this.slow(slowTimeforAntRunTasks + tc.slowTime.configPathToProgramsEvent);
        await executeSettingsUpdate("pathToPrograms.ant", getWsPath("..\\tools\\ant\\bin\\ant.bat"));
        await runCheck(3, 2, 3, 2, false, false);
        ++successCount;
    });


    test("Ant Parser No Default", async function()
    {
        if (exitRollingCount(10, successCount)) return;
        this.slow(slowTimeforAntRunTasks + tc.slowTime.fsModifyEvent);
        await fsApi.writeFile(
            buildXmlFileUri.fsPath,
            '<?xml version="1.0"?>\n' +
            '<project basedir=".">\n' +
            '    <property name="testProp" value="test2" />\n' +
            "    <target name='test-build'></target>\n" +
            "</project>\n"
        );
        await waitForTeIdle(tc.waitTime.fsModifyEvent);
        await runCheck(2, 1, 2, 1, false, false);
        ++successCount;
    });


    test("Ant Parser Invalid Target", async function()
    {
        if (exitRollingCount(11, successCount)) return;
        this.slow(slowTimeforAntRunTasks + tc.slowTime.fsModifyEvent);
        await fsApi.writeFile(
            buildXmlFileUri.fsPath,
            '<?xml version="1.0"?>\n' +
            '<project basedir="." default="test2">\n' +
            "    <target name='test-build'></target>\n" +
            "    <target name='test-build2'></target>\n" +
            '    <target name="test4"></target>\n' +
            '    <target namee="test5"></target>\n' + // incorrectly spelled 'name' property
            "</project>\n"
        );
        await waitForTeIdle(tc.waitTime.fsModifyEvent);
        await runCheck(4, 3, 1, 0, true, false);
        ++successCount;
    });


    test("Ant Parser No Target", async function()
    {
        if (exitRollingCount(12, successCount)) return;
        this.slow(slowTimeforAntRunTasks + tc.slowTime.fsModifyEvent);
        await fsApi.writeFile(
            buildXmlFileUri.fsPath,
            '<?xml version="1.0"?>\n' +
            '<project basedir="." default="test2">\n' +
            '    <property name="testProp" value="test2" />\n' +
            "</project>\n"
        );
        await waitForTeIdle(tc.waitTime.fsModifyEvent);
        await runCheck(1, 0, 1, 0, false, false);
        ++successCount;
    });


    test("Ant Parser No Project", async function()
    {
        if (exitRollingCount(13, successCount)) return;
        this.slow(slowTimeforAntRunTasks + tc.slowTime.fsModifyEvent);
        await fsApi.writeFile(
            buildXmlFileUri.fsPath,
            '<?xml version="1.0"?>\n' +
            "<some_node>\n" +
            '    <property name="testProp" value="test2" />\n' +
            "</some_node>\n"
        );
        await waitForTeIdle(tc.waitTime.fsModifyEvent);
        await runCheck(1, 0, 1, 0, true, false);
        ++successCount;
    });


    test("Ant Parser Invalid Xml", async function()
    {
        if (exitRollingCount(14, successCount)) return;
        this.slow(slowTimeforAntRunTasks + tc.slowTime.fsModifyEvent);
        await fsApi.writeFile(
            buildXmlFileUri.fsPath,
            '<?xml version="1.0"?>\n' +
            '<project basedir="." default="test2">\n' +
            '    <property name="testProp" value="test2" />\n' +
            "    <target name='test-build'></target>\n" +
            '    <target name="test-build2"></target>\n' +
            '    <target name="test4"></target>\n' +
            '    <target namee="test5"</target>\n' + // incorrect XML test5"</
            "</project>\n"
        );
        await waitForTeIdle(tc.waitTime.fsModifyEvent);
        await runCheck(1, 0, 1, 0, true, true);
        ++successCount;
    });

});


/**
 * <x>2 shouldalways be 1 less than <x>2.  The single task in hello.xml is not in
 * the count for readUriTasks()
 *
 * @param noAnt1 # of tasks in fetchTasks() using xml2js parser
 * @param noAnt2 # of tasks in readUriTasks() using xml2js parser
 * @param withAnt1 # of tasks in fetchTasks() using ant parser
 * @param withAnt2 # of tasks in readUriTasks() using ant parser
 */
async function runCheck(noAnt1: number, noAnt2: number, withAnt1: number, withAnt2: number, antWillFail: boolean, xml2jsWillFail: boolean)
{   //
    // Don't use Ant
    //
    await executeSettingsUpdate("useAnt", false);
    let antTasks = await tasks.fetchTasks({ type: "ant" });
    assert(antTasks.length === noAnt1, `Did not read ${noAnt1} ant tasks(1)(actual ${antTasks ? antTasks.length : 0})`);
    antTasks = await provider.readUriTasks(buildXmlFileUri, "");
    assert(antTasks.length === noAnt2, `Did not read ${noAnt2} ant tasks (2)(actual ${antTasks ? antTasks.length : 0})`);
    logErrorsAreFine(xml2jsWillFail);
    //
    // Use Ant
    //
    await executeSettingsUpdate("useAnt", true);
    antTasks = await tasks.fetchTasks({ type: "ant" });
    assert(antTasks.length === withAnt1, `Did not read ${withAnt1} ant tasks (3)(actual ${antTasks ? antTasks.length : 0})`);
    antTasks = await provider.readUriTasks(buildXmlFileUri, "");
    assert(antTasks.length === withAnt2, `Did not read ${withAnt2} ant tasks (4)(actual ${antTasks ? antTasks.length : 0})`);
    logErrorsAreFine(antWillFail);
    //
    // Reset
    //
    await executeSettingsUpdate("useAnt", false);
}
