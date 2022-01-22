/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* tslint:disable */

//
// Documentation on https://mochajs.org/ for help.
//
import * as assert from "assert";
import * as path from "path";
import { tasks, Uri, workspace, WorkspaceFolder } from "vscode";
import { configuration } from "../../common/configuration";
import { activate } from "../helper";
import { TaskExplorerApi } from "../../extension";
import { AntTaskProvider } from "../../providers/ant";


let teApi: TaskExplorerApi;
let provider: AntTaskProvider;
let rootWorkspace: WorkspaceFolder;


suite("Ant tests", () =>
{

    setup(async () =>
    {
        teApi = await activate();
        provider = teApi.taskProviders.get("ant") as AntTaskProvider;
        assert(provider);
        rootWorkspace = (workspace.workspaceFolders ? workspace.workspaceFolders[0]: undefined) as WorkspaceFolder;
        assert(rootWorkspace, "        ✘ Workspace folder does not exist");
    });


    test("Ant utility function cases", async () =>
    {
        provider.readTasks();
        provider.getDocumentPosition(undefined, undefined);
        provider.getDocumentPosition("test", undefined);
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
        await tasks.fetchTasks({ type: "ant" });

        //
        // Remove path
        //
        await configuration.updateWs("pathToAnsicon", "");
        await tasks.fetchTasks({ type: "ant" });

        //
        // Disable Ansicon
        //
        await configuration.updateWs("pathToAnsicon", "ansicon\\x64\\ansicon.exe");
        await configuration.updateWs("enableAnsiconForAnt", false);
        await tasks.fetchTasks({ type: "ant" });

        //
        // Remove path
        //
        await configuration.updateWs("pathToAnsicon", "ansicon\\x64\\ansicon.exe");
        await tasks.fetchTasks({ type: "ant" });

        //
        // Non-win32 case
        //
        const platform = process.platform;
        process.platform = "linux";
        provider.createTask("test", "test", rootWorkspace, Uri.file(path.join(process.cwd(), "build.xml")), []);
        process.platform = platform;

        //
        // Reset
        //
        await configuration.updateWs("pathToAnsicon", pathToAnsicon);
        await configuration.updateWs("enableAnsiconForAnt", enableAnsiconForAnt);
        await tasks.fetchTasks({ type: "ant" });
    });



    test("Ant reader", async () =>
    {
        const useAnt = configuration.get<boolean>("useAnt");

        //
        // Use Ant
        //
        await configuration.updateWs("useAnt", true);
        await teApi.explorerProvider?.invalidateTasksCache("ant");
        await tasks.fetchTasks({ type: "ant" });

        //
        // Don't use Ant, use o.g. custom parser
        //
        await configuration.updateWs("useAnt", false);
        await teApi.explorerProvider?.invalidateTasksCache("ant");
        await tasks.fetchTasks({ type: "ant" });

        //
        // Reset
        //
        await configuration.updateWs("useAnt", useAnt);
    });

});
