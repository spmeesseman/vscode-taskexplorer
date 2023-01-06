/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* tslint:disable */

import * as assert from "assert";
import * as util from "../../lib/utils/utils";
import { tasks, Uri, workspace, WorkspaceFolder } from "vscode";
import { activate, executeSettingsUpdate, getWsPath, testControl, verifyTaskCount } from "../helper";
import { ITaskExplorerApi } from "@spmeesseman/vscode-taskexplorer-types";
import { AntTaskProvider } from "../../providers/ant";
import { IFilesystemApi } from "../../interface/fsApi";

const testsName = "ant";

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
        teApi = await activate(this);
        fsApi = teApi.testsApi.fs;
        provider = teApi.providers.get(testsName) as AntTaskProvider;
        rootWorkspace = (workspace.workspaceFolders as WorkspaceFolder[])[0];
        buildXmlFile = getWsPath("build.xml");
        buildXmlFileUri = Uri.file(buildXmlFile);
        buildFileXml = util.readFileSync(buildXmlFileUri.fsPath);
        await executeSettingsUpdate("useAnt", false);
    });


    suiteTeardown(async function()
    {
        await fsApi.writeFile(buildXmlFileUri.fsPath, buildFileXml);
    });


    test("Document Position", async function()
    {
        const xml = util.readFileSync(buildXmlFileUri.fsPath);
        provider.getDocumentPosition(undefined, undefined);
        provider.getDocumentPosition("test", undefined);
        provider.getDocumentPosition(undefined, "test");
        provider.getDocumentPosition("test_isnt_there", xml);
        const index = provider.getDocumentPosition("test-build2", xml);
        assert(index === 275, `test-build2 task position should be 275 (actual ${index}`);
    });


    test("Start", async function()
    {
        this.slow(testControl.slowTimeForVerifyTaskCount);
        // await teApi.explorer?.invalidateTasksCache(testsName);
        await verifyTaskCount("ant", 3);
    });


    test("Disable", async function()
    {
        this.slow(testControl.slowTimeForConfigEnableEvent + testControl.slowTimeForVerifyTaskCount);
        await executeSettingsUpdate("enabledTasks.ant", false);
        await teApi.waitForIdle(testControl.waitTimeForConfigEvent);
        await verifyTaskCount("ant", 0);
    });


    test("Re-enable", async function()
    {
        this.slow(testControl.slowTimeForConfigEnableEvent + testControl.slowTimeForVerifyTaskCount);
        await executeSettingsUpdate("enabledTasks.ant", true);
        await teApi.waitForIdle(testControl.waitTimeForConfigEvent);
        await verifyTaskCount("ant", 3);
    });


    test("Non-existent file", async function()
    {
        this.slow((testControl.slowTimeForConfigEvent * 2) + (testControl.slowTimeForCommandFast * 2));
        await provider.readUriTasks(Uri.file(getWsPath("build2.xml")), "");
        await executeSettingsUpdate("useAnt", true);
        await provider.readUriTasks(Uri.file(getWsPath("build2.xml")), "");
        await executeSettingsUpdate("useAnt", false);
    });


    test("Enable Ansicon", async function()
    {
        this.slow((testControl.slowTimeForConfigEvent * 5) + (testControl.slowTimeForCommandFast * 4));
        await executeSettingsUpdate("pathToPrograms.ansicon", "ansicon\\x64\\ansicon.exe");
        await executeSettingsUpdate("visual.enableAnsiconForAnt", true);
        provider.createTask("test", "test", rootWorkspace, buildXmlFileUri, []);
        await executeSettingsUpdate("pathToPrograms.ansicon", getWsPath("..\\tools\\ansicon\\x64\\ansicon.exe"));
        provider.createTask("test", "test", rootWorkspace, buildXmlFileUri, []);
        await executeSettingsUpdate("pathToPrograms.ansicon", getWsPath("..\\tools\\ansicon\\x64") + "\\");
        provider.createTask("test", "test", rootWorkspace, buildXmlFileUri, []);
        await executeSettingsUpdate("pathToPrograms.ansicon", getWsPath("..\\tools\\ansicon\\x64"));
        provider.createTask("test", "test", rootWorkspace, buildXmlFileUri, []);
    });


    test("Disable Ansicon", async function()
    {
        this.slow((testControl.slowTimeForConfigEvent * 3) + (testControl.slowTimeForCommandFast * 2));
        await executeSettingsUpdate("pathToPrograms.ansicon", getWsPath("..\\tools\\ansicon\\x64\\ansicon.exe"));
        await executeSettingsUpdate("visual.enableAnsiconForAnt", false);
        provider.createTask("test", "test", rootWorkspace, buildXmlFileUri, []);
        await executeSettingsUpdate("pathToPrograms.ansicon", getWsPath("..\\tools\\ansicon\\x64\\"));
        provider.createTask("test", "test", rootWorkspace, buildXmlFileUri, []);
    });


    test("Ansicon Path", async function()
    {
        this.slow(testControl.slowTimeForConfigEvent + testControl.slowTimeForCommandFast);
        await executeSettingsUpdate("pathToPrograms.ansicon", undefined);
        provider.createTask("test", "test", rootWorkspace, buildXmlFileUri, []);
    });


    test("Win32 Create Task", async function()
    {
        this.slow((testControl.slowTimeForConfigEvent * 2) + (testControl.slowTimeForCommandFast * 2));
        await executeSettingsUpdate("pathToPrograms.ant", getWsPath("..\\tools\\ant\\bin\\ant.bat"));
        provider.createTask("test", "test", rootWorkspace, buildXmlFileUri, []);
        await executeSettingsUpdate("pathToPrograms.ant", getWsPath("..\\tools\\ant\\bin\\ant"));
        provider.createTask("test", "test", rootWorkspace, buildXmlFileUri, []);
    });


    test("Ant Parser", async function()
    {
        this.slow((testControl.slowTimeForConfigEvent * 3) + (testControl.slowTimeForFetchTasksCommand * 2));
        await executeSettingsUpdate("pathToPrograms.ant", getWsPath("..\\tools\\ant\\bin\\ant.bat"));
        await runCheck(3, 2, 3, 2);
    });


    test("Ant Parser no default", async function()
    {
        this.slow((testControl.slowTimeForConfigEvent * 2)+ testControl.slowTimeForFsCreateEvent + (testControl.slowTimeForFetchTasksCommand * 2));
        await fsApi.writeFile(
            buildXmlFileUri.fsPath,
            '<?xml version="1.0"?>\n' +
            '<project basedir=".">\n' +
            '    <property name="testProp" value="test2" />\n' +
            "    <target name='test-build'></target>\n" +
            "</project>\n"
        );
        await runCheck(2, 1, 2, 1);
    });


    test("Ant Parser invalid target", async function()
    {
        this.slow((testControl.slowTimeForConfigEvent * 2) + testControl.slowTimeForFsCreateEvent + (testControl.slowTimeForFetchTasksCommand * 2));
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
        await runCheck(4, 3, 1, 0);
    });


    test("Ant Parser No Target", async function()
    {
        this.slow((testControl.slowTimeForConfigEvent * 2) + testControl.slowTimeForFsCreateEvent + (testControl.slowTimeForFetchTasksCommand * 2));
        await fsApi.writeFile(
            buildXmlFileUri.fsPath,
            '<?xml version="1.0"?>\n' +
            '<project basedir="." default="test2">\n' +
            '    <property name="testProp" value="test2" />\n' +
            "</project>\n"
        );
        await runCheck(1, 0, 1, 0);
    });


    test("Ant Parser No Project", async function()
    {
        this.slow((testControl.slowTimeForConfigEvent * 2)+ testControl.slowTimeForFsCreateEvent + (testControl.slowTimeForFetchTasksCommand * 2));
        await fsApi.writeFile(
            buildXmlFileUri.fsPath,
            '<?xml version="1.0"?>\n' +
            "<some_node>\n" +
            '    <property name="testProp" value="test2" />\n' +
            "</some_node>\n"
        );
        await runCheck(1, 0, 1, 0);
    });


    test("Ant Parser Invalid Xml", async function()
    {
        this.slow((testControl.slowTimeForConfigEvent * 2) + testControl.slowTimeForFsCreateEvent + (testControl.slowTimeForFetchTasksCommand * 2));
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
        await runCheck(1, 0, 1, 0);
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
async function runCheck(noAnt1: number, noAnt2: number, withAnt1: number, withAnt2: number, waitTime?: number)
{
    await teApi.waitForIdle(waitTime || testControl.waitTimeForFsModifyEvent);
    //
    // Don't use Ant
    //
    await executeSettingsUpdate("useAnt", false);
    let antTasks = await tasks.fetchTasks({ type: "ant" });
    assert(antTasks.length === noAnt1, `Did not read ${noAnt1} ant tasks(1)(actual ${antTasks ? antTasks.length : 0})`);
    antTasks = await provider.readUriTasks(buildXmlFileUri, "");
    assert(antTasks.length === noAnt2, `Did not read ${noAnt2} ant tasks (2)(actual ${antTasks ? antTasks.length : 0})`);
    //
    // Use Ant
    //
    await executeSettingsUpdate("useAnt", true);
    antTasks = await tasks.fetchTasks({ type: "ant" });
    assert(antTasks.length === withAnt1, `Did not read ${withAnt1} ant tasks (3)(actual ${antTasks ? antTasks.length : 0})`);
    antTasks = await provider.readUriTasks(buildXmlFileUri, "");
    assert(antTasks.length === withAnt2, `Did not read ${withAnt2} ant tasks (4)(actual ${antTasks ? antTasks.length : 0})`);
    //
    // Reset
    //
    await executeSettingsUpdate("useAnt", false);
}
