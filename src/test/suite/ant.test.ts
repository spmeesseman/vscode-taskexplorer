/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* tslint:disable */

//
// Documentation on https://mochajs.org/ for help.
//
import * as assert from "assert";
import * as path from "path";
import { tasks, Uri, workspace, WorkspaceFolder } from "vscode";
import { configuration } from "../../common/configuration";
import { activate, getWsPath, isReady } from "../helper";
import { TaskExplorerApi } from "../../extension";
import { AntTaskProvider } from "../../providers/ant";


let teApi: TaskExplorerApi;
let provider: AntTaskProvider;
let rootWorkspace: WorkspaceFolder;
let buildXmlFile: string;


suite("Ant Tests", () =>
{

    suiteSetup(async function()
    {
        teApi = await activate(this);
        assert(isReady("ant") === true, "Setup failed");
        //
        // Task provider
        //
        provider = teApi.taskProviders.get("ant") as AntTaskProvider;
        //
        // File path for create/remove
        //
        rootWorkspace = (workspace.workspaceFolders as WorkspaceFolder[])[0];
        //
        // Store / set initial settings
        //
        await configuration.updateWs("pathToAnt", path.resolve(process.cwd(), "..\\..\\test-files\\ant\\bin\\ant.bat"));
        buildXmlFile = path.join(process.cwd(), "..\\..\\test-files\\build.xml");
    });


    test("Document Position", async () =>
    {
        provider.getDocumentPosition(undefined, undefined);
        provider.getDocumentPosition("test", undefined);
        provider.getDocumentPosition(undefined, "test");
    });


    test("Ansicon", async () =>
    {
        const pathToAnsicon = configuration.get<string>("pathToAnsicon"),
              enableAnsiconForAnt = configuration.get<boolean>("enableAnsiconForAnt");

        //
        // Enable Ansicon
        //
        await configuration.updateWs("pathToAnsicon", "ansicon\\x64\\ansicon.exe");
        await configuration.updateWs("enableAnsiconForAnt", true);
        provider.createTask("test", "test", rootWorkspace, Uri.file(buildXmlFile), []);
        await configuration.updateWs("pathToAnsicon", "..\\..\\test-files\\ansicon\\x64\\ansicon.exe");
        provider.createTask("test", "test", rootWorkspace, Uri.file(buildXmlFile), []);
        await configuration.updateWs("pathToAnsicon", "..\\..\\test-files\\ansicon\\x64\\");
        provider.createTask("test", "test", rootWorkspace, Uri.file(buildXmlFile), []);
        await configuration.updateWs("pathToAnsicon", "..\\..\\test-files\\ansicon\\x64");
        provider.createTask("test", "test", rootWorkspace, Uri.file(buildXmlFile), []);

        //
        // Disable Ansicon
        //
        await configuration.updateWs("pathToAnsicon", "ansicon\\x64\\ansicon.exe");
        await configuration.updateWs("enableAnsiconForAnt", false);
        provider.createTask("test", "test", rootWorkspace, Uri.file(buildXmlFile), []);
        await configuration.updateWs("pathToAnsicon", "..\\..\\test-files\\ansicon\\x64\\ansicon.exe");
        provider.createTask("test", "test", rootWorkspace, Uri.file(buildXmlFile), []);
        await tasks.fetchTasks({ type: "ant" });

        //
        // Remove path
        //
        await configuration.updateWs("pathToAnsicon", undefined);
        provider.createTask("test", "test", rootWorkspace, Uri.file(buildXmlFile), []);
        await tasks.fetchTasks({ type: "ant" });

        //
        // Non-win32 case
        //
        // const platform = process.platform;
        // process.platform = "linux";
        // provider.createTask("test", "test", rootWorkspace, Uri.file(path.join(process.cwd(), "build.xml")), []);
        // process.platform = platform;

        //
        // Reset
        //
        await configuration.updateWs("pathToAnsicon", pathToAnsicon);
        await configuration.updateWs("enableAnsiconForAnt", enableAnsiconForAnt);
        await tasks.fetchTasks({ type: "ant" });
    });



    test("Ant reader", async () =>
    {
        //
        // Use Ant
        //
        await configuration.updateWs("useAnt", true);
        // await teApi.explorerProvider?.invalidateTasksCache("ant");
        // await tasks.fetchTasks({ type: "ant" });
        // antTasks = await provider.readUriTasks(Uri.file(buildXmlFile));
        // assert(antTasks.length === 2, "");
        // antTasks = await provider.readUriTasks(Uri.file(buildXmlFile), rootWorkspace);
        // assert(antTasks.length === 2, "");

        //
        // Don't use Ant, use o.g. custom parser
        //
        // await configuration.updateWs("useAnt", false);
        // await teApi.explorerProvider?.invalidateTasksCache("ant");
        // antTasks = await provider.readUriTasks(Uri.file(buildXmlFile), rootWorkspace);
        // assert(antTasks.length === 2, "");

        //
        // Reset
        //
        await configuration.updateWs("useAnt", false);
    });

});
