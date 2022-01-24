/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* tslint:disable */

//
// Documentation on https://mochajs.org/ for help.
//
import * as assert from "assert";
import * as path from "path";
import { tasks, Uri, workspace, WorkspaceFolder } from "vscode";
import { configuration } from "../../common/configuration";
import { activate, getWsPath, isReady, sleep } from "../helper";
import { TaskExplorerApi } from "../../extension";
import { AntTaskProvider } from "../../providers/ant";
import { properCase } from "../../common/utils";


let teApi: TaskExplorerApi;
let provider: AntTaskProvider;
let rootWorkspace: WorkspaceFolder;
let buildXmlFile: string;


suite("Ant Tests", () =>
{
    const testsName = "ant",
          testsNameProper = properCase(testsName);


    suiteSetup(async function()
    {
        teApi = await activate(this);
        assert(isReady(testsName) === true, "Setup failed");

        provider = teApi.taskProviders.get(testsName) as AntTaskProvider;
        rootWorkspace = (workspace.workspaceFolders as WorkspaceFolder[])[0];
        buildXmlFile = getWsPath("build.xml");
    });


    test("Document Position", async () =>
    {
        provider.getDocumentPosition(undefined, undefined);
        provider.getDocumentPosition("test", undefined);
        provider.getDocumentPosition(undefined, "test");
    });


    test("Start", async () =>
    {
        const cTasks = await tasks.fetchTasks({ type: testsName });
        assert(cTasks && cTasks.length === 3, `Did not read 3 ${testsName} tasks`);
    });


    test("Disable", async () =>
    {
        await configuration.updateWs(`enable${testsNameProper}`, false);
        await sleep(500);
        await teApi.explorerProvider?.invalidateTasksCache(testsName);
        await sleep(500);
        const antTasks = await tasks.fetchTasks({ type: testsName });
        assert(!antTasks || antTasks.length === 0, `Did not read 0 ${testsName} tasks (actual ${antTasks ? antTasks.length : 0})`);
    });


    test("Re-enable", async () =>
    {
        await configuration.updateWs(`enable${testsNameProper}`, true);
        await sleep(500);
        await teApi.explorerProvider?.invalidateTasksCache(testsName);
        const antTasks = await tasks.fetchTasks({ type: testsName });
        assert(antTasks && antTasks.length === 3, `Did not read 3 ${testsName} tasks (actual ${antTasks ? antTasks.length : 0})`);
    });


    test("Invalid file", async () =>
    {
        await configuration.updateWs("useAnt", false);
        await provider.readUriTasks(Uri.file(getWsPath("build2.xml")), "");
        await configuration.updateWs("useAnt", true);
        await provider.readUriTasks(Uri.file(getWsPath("build2.xml")), "");
        await configuration.updateWs("useAnt", false);
    });


    test("Ansicon", async () =>
    {
        //
        // Enable Ansicon
        //
        await configuration.updateWs("pathToAnsicon", "ansicon\\x64\\ansicon.exe");
        await configuration.updateWs("enableAnsiconForAnt", true);
        provider.createTask("test", "test", rootWorkspace, Uri.file(buildXmlFile), []);
        await configuration.updateWs("pathToAnsicon", getWsPath("..\\tools\\ansicon\\x64\\ansicon.exe"));
        provider.createTask("test", "test", rootWorkspace, Uri.file(buildXmlFile), []);
        await configuration.updateWs("pathToAnsicon", getWsPath("..\\tools\\ansicon\\x64\\"));
        provider.createTask("test", "test", rootWorkspace, Uri.file(buildXmlFile), []);
        await configuration.updateWs("pathToAnsicon", getWsPath("..\\tools\\ansicon\\x64"));
        provider.createTask("test", "test", rootWorkspace, Uri.file(buildXmlFile), []);

        //
        // Disable Ansicon
        //
        await configuration.updateWs("pathToAnsicon", getWsPath("..\\tools\\ansicon\\x64\\ansicon.exe"));
        await configuration.updateWs("enableAnsiconForAnt", false);
        provider.createTask("test", "test", rootWorkspace, Uri.file(buildXmlFile), []);
        await configuration.updateWs("pathToAnsicon", getWsPath("..\\tools\\ansicon\\x64\\"));
        provider.createTask("test", "test", rootWorkspace, Uri.file(buildXmlFile), []);
        await tasks.fetchTasks({ type: testsName });

        //
        // Remove path
        //
        await configuration.updateWs("pathToAnsicon", undefined);
        provider.createTask("test", "test", rootWorkspace, Uri.file(buildXmlFile), []);
        await tasks.fetchTasks({ type: testsName });

        //
        // Non-win32 case
        //
        // const platform = process.platform;
        // process.platform = "linux";
        // provider.createTask("test", "test", rootWorkspace, Uri.file(path.join(process.cwd(), "build.xml")), []);
        // process.platform = platform;
        await tasks.fetchTasks({ type: testsName });
    });



    test("Ant Parser", async () =>
    {
        const buildXmlFileUri = Uri.file(buildXmlFile);
        await configuration.updateWs("pathToAnt", getWsPath("..\\tools\\ant\\bin\\ant.bat"));

        //
        // Don't use Ant, use o.g. custom parser
        //
        await configuration.updateWs("useAnt", false);
        let antTasks = await tasks.fetchTasks({ type: "ant" });
        assert(antTasks.length === 3, `Did not read 3 ${testsName} tasks(1)(actual ${antTasks ? antTasks.length : 0})`);
        antTasks = await provider.readUriTasks(buildXmlFileUri, "");
        assert(antTasks.length === 2, `Did not read 2 ${testsName} tasks (2)(actual ${antTasks ? antTasks.length : 0})`);

        //
        // Use Ant
        //
        await configuration.updateWs("useAnt", true);
        antTasks = await tasks.fetchTasks({ type: "ant" });
        assert(antTasks.length === 3, `Did not read  3 ${testsName} tasks (3)(actual ${antTasks ? antTasks.length : 0})`);
        antTasks = await provider.readUriTasks(buildXmlFileUri, "");
        assert(antTasks.length === 2, `Did not read 2 ${testsName} tasks (4)(actual ${antTasks ? antTasks.length : 0})`);
        await configuration.updateWs("useAnt", false);
    });

});
