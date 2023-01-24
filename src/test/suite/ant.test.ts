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
    activate, executeSettingsUpdate, getWsPath, testControl as tc, verifyTaskCount, logErrorsAreFine, suiteFinished,
    exitRollingCount, waitForTeIdle, treeUtils, overrideNextShowInfoBox, endRollingCount, needsTreeBuild, testInvDocPositions
} from "../utils/utils";

const testsName = "ant";
const slowTimeforAntRunTasks = (tc.slowTime.fetchTasksCommand * 2) + (tc.slowTime.config.event * 2) +
                               (tc.slowTime.taskProviderReadUri * 2) + tc.slowTime.tasks.antParser;

let teApi: ITaskExplorerApi;
let fsApi: IFilesystemApi;
let provider: AntTaskProvider;
let rootWorkspace: WorkspaceFolder;
let buildXmlFile: string;
let buildXmlFileUri: Uri;
let buildFileXml: string;


suite("Ant Tests", () =>
{

    suiteSetup(async function()
    {
        if (exitRollingCount(this, true)) return;
        ({ teApi } = await activate(this));
        fsApi = teApi.testsApi.fs;
        provider = teApi.providers[testsName] as AntTaskProvider;
        rootWorkspace = (workspace.workspaceFolders as WorkspaceFolder[])[0];
        buildXmlFile = getWsPath("build.xml");
        buildXmlFileUri = Uri.file(buildXmlFile);
        buildFileXml = await fsApi.readFileAsync(buildXmlFileUri.fsPath);
        endRollingCount(this, true);
    });


    suiteTeardown(async function()
    {
        if (exitRollingCount(this, false, true)) return;
        await fsApi.writeFile(buildXmlFileUri.fsPath, buildFileXml);
        await executeSettingsUpdate("useAnt", false);
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


    test("Start", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.taskCount.verifyFirstCall);
        await verifyTaskCount("ant", 3);
        endRollingCount(this);
    });


    test("Document Position", async function()
    {
        if (exitRollingCount(this)) return;
        const xml = await fsApi.readFileAsync(buildXmlFileUri.fsPath);
        testInvDocPositions(provider);
        provider.getDocumentPosition("test_isnt_there", xml);
        let index = provider.getDocumentPosition("test-build", xml);
        expect(index).to.be.a("number").that.is.equal(104, `test-build2 task position should be 104 (actual ${index}`);
        index = provider.getDocumentPosition("test-build2", xml);
        expect(index).to.be.a("number").that.is.equal(275, `test-build2 task position should be 275 (actual ${index}`);
        endRollingCount(this);
    });


    test("Disable", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.config.enableEvent + tc.slowTime.taskCount.verify);
        await executeSettingsUpdate("enabledTasks.ant", false);
        await verifyTaskCount("ant", 0);
        endRollingCount(this);
    });


    test("Re-enable", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.config.enableEvent + tc.slowTime.taskCount.verify);
        await executeSettingsUpdate("enabledTasks.ant", true);
        await verifyTaskCount("ant", 3);
        endRollingCount(this);
    });


    test("Enable Ansicon", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow((tc.slowTime.config.event * 5) + (tc.slowTime.commandFast * 4));
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
        endRollingCount(this);
    });


    test("Disable Ansicon", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow((tc.slowTime.config.event * 3) + (tc.slowTime.commandFast * 2));
        await executeSettingsUpdate("pathToPrograms.ansicon", getWsPath("..\\tools\\ansicon\\x64\\ansicon.exe"));
        await executeSettingsUpdate("visual.enableAnsiconForAnt", false);
        provider.createTask("test", "test", rootWorkspace, buildXmlFileUri, []);
        await executeSettingsUpdate("pathToPrograms.ansicon", getWsPath("..\\tools\\ansicon\\x64\\"));
        provider.createTask("test", "test", rootWorkspace, buildXmlFileUri, []);
        endRollingCount(this);
    });


    test("Ansicon Path", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(tc.slowTime.config.event + tc.slowTime.commandFast);
        await executeSettingsUpdate("pathToPrograms.ansicon", undefined);
        provider.createTask("test", "test", rootWorkspace, buildXmlFileUri, []);
        await executeSettingsUpdate("pathToPrograms.ansicon", getWsPath("..\\tools\\ansicon\\x64\\ansicon.exe"));
        endRollingCount(this);
    });


    test("Win32 Create Task", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow((tc.slowTime.config.event * 2) + (tc.slowTime.commandFast * 2));
        await executeSettingsUpdate("pathToPrograms.ant", getWsPath("..\\tools\\ant\\bin\\ant.bat"));
        provider.createTask("test", "test", rootWorkspace, buildXmlFileUri, []);
        await executeSettingsUpdate("pathToPrograms.ant", getWsPath("..\\tools\\ant\\bin\\ant"));
        provider.createTask("test", "test", rootWorkspace, buildXmlFileUri, []);
        endRollingCount(this);
    });


    test("Ant Parser", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(slowTimeforAntRunTasks + tc.slowTime.config.pathToProgramsEvent);
        await executeSettingsUpdate("pathToPrograms.ant", getWsPath("..\\tools\\ant\\bin\\ant.bat"));
        await runCheck(3, 2, 3, 2, false, false);
        endRollingCount(this);
    });


    test("Ant Parser No Default", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(slowTimeforAntRunTasks + tc.slowTime.fs.modifyEvent);
        await fsApi.writeFile(
            buildXmlFileUri.fsPath,
            '<?xml version="1.0"?>\n' +
            '<project basedir=".">\n' +
            '    <property name="testProp" value="test2" />\n' +
            "    <target name='test-build'></target>\n" +
            "</project>\n"
        );
        await waitForTeIdle(tc.waitTime.fs.modifyEvent);
        await runCheck(2, 1, 2, 1, false, false);
        endRollingCount(this);
    });


    test("Ant Parser Invalid Target", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(slowTimeforAntRunTasks + tc.slowTime.fs.modifyEvent);
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
        await waitForTeIdle(tc.waitTime.fs.modifyEvent);
        await runCheck(4, 3, 1, 0, true, false);
        endRollingCount(this);
    });


    test("Ant Parser No Target", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(slowTimeforAntRunTasks + tc.slowTime.fs.modifyEvent);
        await fsApi.writeFile(
            buildXmlFileUri.fsPath,
            '<?xml version="1.0"?>\n' +
            '<project basedir="." default="test2">\n' +
            '    <property name="testProp" value="test2" />\n' +
            "</project>\n"
        );
        await waitForTeIdle(tc.waitTime.fs.modifyEvent);
        await runCheck(1, 0, 1, 0, false, false);
        endRollingCount(this);
    });


    test("Ant Parser No Project", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(slowTimeforAntRunTasks + tc.slowTime.fs.modifyEvent);
        await fsApi.writeFile(
            buildXmlFileUri.fsPath,
            '<?xml version="1.0"?>\n' +
            "<some_node>\n" +
            '    <property name="testProp" value="test2" />\n' +
            "</some_node>\n"
        );
        await waitForTeIdle(tc.waitTime.fs.modifyEvent);
        await runCheck(1, 0, 1, 0, true, false);
        endRollingCount(this);
    });


    test("Ant Parser Invalid Xml", async function()
    {
        if (exitRollingCount(this)) return;
        this.slow(slowTimeforAntRunTasks + tc.slowTime.fs.modifyEvent);
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
        await waitForTeIdle(tc.waitTime.fs.modifyEvent);
        await runCheck(1, 0, 1, 0, true, true);
        endRollingCount(this);
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
}
