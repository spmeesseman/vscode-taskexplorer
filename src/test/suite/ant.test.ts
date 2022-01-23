/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* tslint:disable */

//
// Documentation on https://mochajs.org/ for help.
//
import * as assert from "assert";
import * as path from "path";
import { tasks, Uri, workspace, WorkspaceFolder } from "vscode";
import { configuration } from "../../common/configuration";
import { activate, isReady } from "../helper";
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
        provider = teApi.taskProviders.get("ant") as AntTaskProvider;
        rootWorkspace = (workspace.workspaceFolders ? workspace.workspaceFolders[0]: undefined) as WorkspaceFolder;
        assert(rootWorkspace, "        ✘ Workspace folder does not exist");
        await configuration.updateWs("pathToAnt", path.resolve(process.cwd(), "..\\..\\test-files\\ant\\bin\\ant.bat"));
        buildXmlFile = path.join(process.cwd(), "..\\..\\test-files\\build.xml");
    });


    test("Document Position", async () =>
    {
        // provider.readTasks();
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
        await configuration.update("pathToAnsicon", "ansicon\\x64\\ansicon.exe");
        await configuration.update("enableAnsiconForAnt", true);
        provider.createTask("test", "test", rootWorkspace, Uri.file(buildXmlFile), []);
        await configuration.update("pathToAnsicon", "..\\..\\test-files\\ansicon\\x64\\ansicon.exe");
        provider.createTask("test", "test", rootWorkspace, Uri.file(buildXmlFile), []);
        await configuration.update("pathToAnsicon", "..\\..\\test-files\\ansicon\\x64\\");
        provider.createTask("test", "test", rootWorkspace, Uri.file(buildXmlFile), []);
        await configuration.update("pathToAnsicon", "..\\..\\test-files\\ansicon\\x64");
        provider.createTask("test", "test", rootWorkspace, Uri.file(buildXmlFile), []);

        //
        // Disable Ansicon
        //
        await configuration.update("pathToAnsicon", "ansicon\\x64\\ansicon.exe");
        await configuration.update("enableAnsiconForAnt", false);
        provider.createTask("test", "test", rootWorkspace, Uri.file(buildXmlFile), []);
        await configuration.update("pathToAnsicon", "..\\..\\test-files\\ansicon\\x64\\ansicon.exe");
        provider.createTask("test", "test", rootWorkspace, Uri.file(buildXmlFile), []);
        await tasks.fetchTasks({ type: "ant" });

        //
        // Remove path
        //
        await configuration.update("pathToAnsicon", undefined);
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
        await configuration.update("pathToAnsicon", pathToAnsicon);
        await configuration.update("enableAnsiconForAnt", enableAnsiconForAnt);
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
